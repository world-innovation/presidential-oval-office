import json
from datetime import datetime, timedelta

from app.models import (
    DeliveryRequest,
    DeliveryStatus,
    Drone,
    DroneStatus,
    FlightPlan,
    FlightStatus,
    Port,
)
from app.services.airspace import check_conflicts


def test_no_conflict_when_empty(db):
    ts = datetime.utcnow().isoformat()
    waypoints = [
        {
            "latitude": 35.68,
            "longitude": 139.77,
            "altitude_m": 100,
            "timestamp": ts,
        },
    ]
    conflicts = check_conflicts(db, waypoints)
    assert conflicts == []


def _seed_flight(db, now):
    """Helper to create a port, drone, delivery, and active flight plan."""
    port = Port(name="P1", latitude=35.68, longitude=139.77, capacity=3)
    db.add(port)
    db.flush()

    drone = Drone(
        name="D1",
        current_lat=35.68,
        current_lng=139.77,
        status=DroneStatus.IN_FLIGHT,
        home_port_id=port.id,
    )
    db.add(drone)
    db.flush()

    req = DeliveryRequest(
        user_id="u1",
        pickup_port_id=port.id,
        delivery_port_id=port.id,
        payload_weight_kg=1.0,
        status=DeliveryStatus.ASSIGNED,
    )
    db.add(req)
    db.flush()

    existing_wp = [
        {
            "latitude": 35.68,
            "longitude": 139.77,
            "altitude_m": 100,
            "timestamp": now.isoformat(),
        },
    ]
    fp = FlightPlan(
        drone_id=drone.id,
        delivery_id=req.id,
        waypoints_json=json.dumps(existing_wp),
        altitude_m=100,
        departure_time=now,
        estimated_arrival=now + timedelta(minutes=5),
        status=FlightStatus.ACTIVE,
    )
    db.add(fp)
    db.commit()
    return fp


def test_conflict_detected(db):
    now = datetime.utcnow()
    _seed_flight(db, now)

    new_wp = [
        {
            "latitude": 35.68,
            "longitude": 139.77,
            "altitude_m": 100,
            "timestamp": now.isoformat(),
        },
    ]
    conflicts = check_conflicts(db, new_wp)
    assert len(conflicts) > 0


def test_no_conflict_different_altitude(db):
    now = datetime.utcnow()
    _seed_flight(db, now)

    new_wp = [
        {
            "latitude": 35.68,
            "longitude": 139.77,
            "altitude_m": 175,
            "timestamp": now.isoformat(),
        },
    ]
    conflicts = check_conflicts(db, new_wp)
    assert len(conflicts) == 0
