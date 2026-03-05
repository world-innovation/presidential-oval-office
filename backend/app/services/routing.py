"""Route calculation between ports using Haversine distance and waypoint generation."""

import math
from datetime import datetime, timedelta

from ..config import settings


def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance between two points in meters."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def bearing_degrees(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate initial bearing from point 1 to point 2 in degrees [0, 360)."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_lambda = math.radians(lng2 - lng1)

    x = math.sin(d_lambda) * math.cos(phi2)
    y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(d_lambda)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def altitude_for_bearing(bearing: float) -> float:
    """Assign altitude layer based on flight bearing to separate traffic by direction."""
    layer_span = (settings.max_altitude_m - settings.min_altitude_m) / settings.altitude_layers
    layer_index = int(bearing / (360 / settings.altitude_layers)) % settings.altitude_layers
    return settings.min_altitude_m + layer_index * layer_span + layer_span / 2


def generate_waypoints(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    altitude_m: float,
    departure_time: datetime,
) -> list[dict]:
    """Generate a list of waypoints along the straight-line path."""
    distance = haversine_distance_m(start_lat, start_lng, end_lat, end_lng)
    num_segments = max(2, int(distance / settings.grid_cell_size_m))
    flight_duration_sec = distance / settings.drone_speed_ms

    waypoints = []
    for i in range(num_segments + 1):
        t = i / num_segments
        lat = start_lat + t * (end_lat - start_lat)
        lng = start_lng + t * (end_lng - start_lng)
        timestamp = departure_time + timedelta(seconds=flight_duration_sec * t)
        waypoints.append({
            "latitude": round(lat, 7),
            "longitude": round(lng, 7),
            "altitude_m": altitude_m,
            "timestamp": timestamp.isoformat(),
        })
    return waypoints


def estimate_flight_duration_sec(
    start_lat: float, start_lng: float, end_lat: float, end_lng: float
) -> float:
    distance = haversine_distance_m(start_lat, start_lng, end_lat, end_lng)
    return distance / settings.drone_speed_ms
