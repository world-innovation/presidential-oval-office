"""Simulation endpoints — advance time, move drones, complete deliveries.

POST /api/simulation/tick  advances the simulation by one step:
  1. Move in-flight drones along their waypoints
  2. Complete flights that have reached their destination
  3. Return current system state
POST /api/simulation/seed  creates sample ports and drones for demo purposes
"""

import json
from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    DeliveryRequest,
    DeliveryStatus,
    Drone,
    DroneStatus,
    FlightPlan,
    FlightStatus,
    Port,
    PortStatus,
)
from ..schemas import DroneResponse, SimulationTickResponse, SystemStats
from ..ws.manager import manager

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

_tick_counter = 0


@router.post("/tick", response_model=SimulationTickResponse)
async def simulation_tick(db: Session = Depends(get_db)):
    global _tick_counter
    _tick_counter += 1

    active_plans = (
        db.query(FlightPlan)
        .filter(FlightPlan.status.in_([FlightStatus.PLANNED, FlightStatus.ACTIVE]))
        .all()
    )

    now = datetime.utcnow()
    completed_this_tick = 0

    for fp in active_plans:
        waypoints = json.loads(fp.waypoints_json)
        if not waypoints:
            continue

        drone = db.get(Drone, fp.drone_id)
        if drone is None:
            continue

        if fp.status == FlightStatus.PLANNED:
            fp.status = FlightStatus.ACTIVE
            drone.status = DroneStatus.IN_FLIGHT

        total_wps = len(waypoints)
        elapsed = (now - fp.departure_time).total_seconds()
        if total_wps > 1:
            dep_ts = datetime.fromisoformat(waypoints[0]["timestamp"])
            arr_ts = datetime.fromisoformat(waypoints[-1]["timestamp"])
            flight_dur = (arr_ts - dep_ts).total_seconds()
            if flight_dur > 0:
                progress = min(1.0, elapsed / flight_dur)
            else:
                progress = 1.0
        else:
            progress = 1.0

        wp_index = min(int(progress * (total_wps - 1)), total_wps - 1)
        wp = waypoints[wp_index]
        drone.current_lat = wp["latitude"]
        drone.current_lng = wp["longitude"]
        drone.current_alt = wp["altitude_m"]
        drone.battery_level = max(0, drone.battery_level - 0.5)

        if progress >= 1.0:
            last_wp = waypoints[-1]
            drone.current_lat = last_wp["latitude"]
            drone.current_lng = last_wp["longitude"]
            drone.current_alt = 0
            drone.status = DroneStatus.IDLE
            drone.battery_level = max(0, drone.battery_level - 1)
            fp.status = FlightStatus.COMPLETED

            delivery = db.get(DeliveryRequest, fp.delivery_id)
            if delivery:
                delivery.status = DeliveryStatus.DELIVERED
            completed_this_tick += 1

    db.commit()

    all_drones = db.query(Drone).all()
    active_count = (
        db.query(FlightPlan)
        .filter(FlightPlan.status == FlightStatus.ACTIVE)
        .count()
    )

    total_completed = (
        db.query(DeliveryRequest)
        .filter(DeliveryRequest.status == DeliveryStatus.DELIVERED)
        .count()
    )

    drone_responses = [DroneResponse.model_validate(d) for d in all_drones]

    await manager.broadcast({
        "event": "tick",
        "tick": _tick_counter,
        "active_flights": active_count,
        "drones": [d.model_dump(mode="json") for d in drone_responses],
    })

    return SimulationTickResponse(
        tick=_tick_counter,
        active_flights=active_count,
        drones=drone_responses,
        completed_deliveries=total_completed,
    )


@router.post("/seed")
def seed_data(db: Session = Depends(get_db)):
    """Create sample Tokyo-area ports and drones for demonstration."""
    if db.query(Port).count() > 0:
        return {"message": "Data already seeded"}

    ports_data = [
        ("東京駅ポート", 35.6812, 139.7671),
        ("渋谷ポート", 35.6580, 139.7016),
        ("新宿ポート", 35.6896, 139.6922),
        ("品川ポート", 35.6284, 139.7387),
        ("池袋ポート", 35.7295, 139.7109),
        ("お台場ポート", 35.6267, 139.7762),
        ("六本木ポート", 35.6627, 139.7307),
        ("秋葉原ポート", 35.6984, 139.7731),
    ]

    ports = []
    for name, lat, lng in ports_data:
        p = Port(name=name, latitude=lat, longitude=lng, capacity=3, status=PortStatus.ACTIVE)
        db.add(p)
        ports.append(p)
    db.flush()

    for i, port in enumerate(ports):
        for j in range(2):
            d = Drone(
                name=f"GK-{port.name[:2]}-{j+1:02d}",
                max_payload_kg=5.0,
                battery_level=100.0,
                current_lat=port.latitude,
                current_lng=port.longitude,
                current_alt=0,
                home_port_id=port.id,
                status=DroneStatus.IDLE,
            )
            db.add(d)

    db.commit()
    return {
        "message": "Seeded successfully",
        "ports": len(ports_data),
        "drones": len(ports_data) * 2,
    }


@router.get("/stats", response_model=SystemStats)
def system_stats(db: Session = Depends(get_db)):
    return SystemStats(
        total_ports=db.query(Port).count(),
        total_drones=db.query(Drone).count(),
        idle_drones=db.query(Drone).filter(Drone.status == DroneStatus.IDLE).count(),
        active_flights=db.query(FlightPlan)
        .filter(FlightPlan.status == FlightStatus.ACTIVE)
        .count(),
        pending_deliveries=db.query(DeliveryRequest)
        .filter(DeliveryRequest.status == DeliveryStatus.PENDING)
        .count(),
        completed_deliveries=db.query(DeliveryRequest)
        .filter(DeliveryRequest.status == DeliveryStatus.DELIVERED)
        .count(),
    )
