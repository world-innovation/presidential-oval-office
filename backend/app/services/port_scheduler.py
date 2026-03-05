"""Port landing-slot scheduler — ensures safe, non-overlapping arrivals."""

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from ..config import settings
from ..models import LandingSlot, Port


def find_available_slot(
    db: Session,
    port_id: int,
    desired_time: datetime,
) -> datetime | None:
    """Find the earliest available landing slot at or after *desired_time*.

    Returns the start time of the available slot, or None if the port doesn't exist.
    """
    port = db.get(Port, port_id)
    if port is None:
        return None

    slot_duration = timedelta(seconds=settings.landing_slot_duration_sec)
    candidate = desired_time

    for _ in range(100):
        candidate_end = candidate + slot_duration
        overlapping = (
            db.query(LandingSlot)
            .filter(
                LandingSlot.port_id == port_id,
                LandingSlot.scheduled_start < candidate_end,
                LandingSlot.scheduled_end > candidate,
            )
            .count()
        )
        if overlapping < port.capacity:
            return candidate
        candidate = candidate + slot_duration

    return candidate


def reserve_slot(
    db: Session,
    port_id: int,
    flight_plan_id: int,
    start_time: datetime,
) -> LandingSlot:
    slot = LandingSlot(
        port_id=port_id,
        flight_plan_id=flight_plan_id,
        scheduled_start=start_time,
        scheduled_end=start_time + timedelta(seconds=settings.landing_slot_duration_sec),
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot
