"""Airspace conflict detection — prevents drone collisions using 4D reservation table.

Each active flight reserves grid cells (quantised lat/lng + altitude layer) at specific
time windows.  Before a new flight plan is approved the system checks every waypoint
against the reservation table for temporal overlap.
"""

import json
import math
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..config import settings
from ..models import FlightPlan, FlightStatus


def _grid_key(lat: float, lng: float, alt: float) -> tuple[int, int, int]:
    """Quantise a position into a discrete grid cell."""
    meters_per_deg_lat = 111_320
    meters_per_deg_lng = 111_320 * math.cos(math.radians(lat))
    gx = int(lng * meters_per_deg_lng / settings.grid_cell_size_m)
    gy = int(lat * meters_per_deg_lat / settings.grid_cell_size_m)
    gz = int((alt - settings.min_altitude_m) / (
        (settings.max_altitude_m - settings.min_altitude_m) / settings.altitude_layers
    ))
    return (gx, gy, gz)


def _build_reservation_table(
    db: Session, exclude_flight_id: int | None = None
) -> dict[tuple[int, int, int], list[tuple[datetime, datetime]]]:
    """Build a lookup of grid-cell → list of reserved time windows from active flights."""
    active_flights = (
        db.query(FlightPlan)
        .filter(FlightPlan.status.in_([FlightStatus.PLANNED, FlightStatus.ACTIVE]))
        .all()
    )

    table: dict[tuple[int, int, int], list[tuple[datetime, datetime]]] = {}
    sep = timedelta(seconds=settings.temporal_separation_sec)

    for fp in active_flights:
        if fp.id == exclude_flight_id:
            continue
        waypoints = json.loads(fp.waypoints_json)
        for wp in waypoints:
            key = _grid_key(wp["latitude"], wp["longitude"], wp["altitude_m"])
            ts = datetime.fromisoformat(wp["timestamp"])
            window = (ts - sep, ts + sep)
            table.setdefault(key, []).append(window)

    return table


def check_conflicts(
    db: Session,
    waypoints: list[dict],
    exclude_flight_id: int | None = None,
) -> list[dict]:
    """Return a list of conflict descriptions, empty if no conflicts."""
    table = _build_reservation_table(db, exclude_flight_id)
    conflicts = []

    for wp in waypoints:
        key = _grid_key(wp["latitude"], wp["longitude"], wp["altitude_m"])
        ts = datetime.fromisoformat(wp["timestamp"])
        reserved_windows = table.get(key, [])
        for win_start, win_end in reserved_windows:
            if win_start <= ts <= win_end:
                conflicts.append({
                    "waypoint": wp,
                    "grid_cell": key,
                    "conflicting_window": (win_start.isoformat(), win_end.isoformat()),
                })
                break

    return conflicts


def try_resolve_conflicts(
    db: Session,
    waypoints: list[dict],
    original_altitude: float,
) -> tuple[list[dict] | None, float]:
    """Attempt to resolve conflicts by shifting to a different altitude layer.

    Returns (resolved_waypoints, new_altitude) or (None, original_altitude) if unresolvable.
    """
    layer_span = (settings.max_altitude_m - settings.min_altitude_m) / settings.altitude_layers

    for layer_idx in range(settings.altitude_layers):
        alt = settings.min_altitude_m + layer_idx * layer_span + layer_span / 2
        if abs(alt - original_altitude) < 1.0:
            continue
        shifted = [{**wp, "altitude_m": alt} for wp in waypoints]
        if not check_conflicts(db, shifted):
            return shifted, alt

    return None, original_altitude
