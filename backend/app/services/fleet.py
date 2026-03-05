"""Fleet management — drone selection and status tracking."""

from sqlalchemy.orm import Session

from ..models import Drone, DroneStatus, Port
from .routing import haversine_distance_m


def find_best_drone(
    db: Session,
    pickup_port_id: int,
    payload_weight_kg: float,
) -> Drone | None:
    """Select the closest idle drone that can carry the payload."""
    port = db.get(Port, pickup_port_id)
    if port is None:
        return None

    idle_drones = (
        db.query(Drone)
        .filter(
            Drone.status == DroneStatus.IDLE,
            Drone.max_payload_kg >= payload_weight_kg,
            Drone.battery_level >= 20.0,
        )
        .all()
    )

    if not idle_drones:
        return None

    def distance_to_port(d: Drone) -> float:
        if d.current_lat is None or d.current_lng is None:
            return float("inf")
        return haversine_distance_m(d.current_lat, d.current_lng, port.latitude, port.longitude)

    return min(idle_drones, key=distance_to_port)


def update_drone_position(
    db: Session, drone_id: int, lat: float, lng: float, alt: float
) -> Drone | None:
    drone = db.get(Drone, drone_id)
    if drone is None:
        return None
    drone.current_lat = lat
    drone.current_lng = lng
    drone.current_alt = alt
    db.commit()
    db.refresh(drone)
    return drone
