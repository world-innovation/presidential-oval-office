"""Delivery request API — the main user-facing endpoint.

POST /api/deliveries triggers the full pipeline:
  1. Validate ports & payload
  2. Assign a drone (fleet service)
  3. Calculate route & altitude (routing service)
  4. Check airspace conflicts (airspace service) — auto-resolve if possible
  5. Reserve a landing slot (port scheduler)
  6. Persist flight plan and return result
"""

import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import (
    DeliveryRequest,
    DeliveryStatus,
    DroneStatus,
    FlightPlan,
    FlightStatus,
    Port,
)
from ..schemas import (
    DeliveryCreate,
    DeliveryDetailResponse,
    DeliveryResponse,
    FlightPlanResponse,
    Waypoint,
)
from ..services import airspace, fleet, port_scheduler, routing
from ..ws.manager import manager

router = APIRouter(prefix="/api/deliveries", tags=["deliveries"])


@router.get("", response_model=list[DeliveryResponse])
def list_deliveries(db: Session = Depends(get_db)):
    return db.query(DeliveryRequest).order_by(DeliveryRequest.created_at.desc()).all()


@router.post("", response_model=DeliveryResponse, status_code=201)
async def create_delivery(body: DeliveryCreate, db: Session = Depends(get_db)):
    pickup = db.get(Port, body.pickup_port_id)
    delivery_port = db.get(Port, body.delivery_port_id)
    if pickup is None or delivery_port is None:
        raise HTTPException(status_code=404, detail="Port not found")
    if body.pickup_port_id == body.delivery_port_id:
        raise HTTPException(status_code=400, detail="Pickup and delivery ports must differ")

    req = DeliveryRequest(**body.model_dump())
    db.add(req)
    db.flush()

    drone = fleet.find_best_drone(db, body.pickup_port_id, body.payload_weight_kg)
    if drone is None:
        db.commit()
        db.refresh(req)
        await manager.broadcast({
            "event": "delivery_created",
            "delivery_id": req.id,
            "status": req.status.value,
        })
        return req

    bearing = routing.bearing_degrees(
        pickup.latitude, pickup.longitude,
        delivery_port.latitude, delivery_port.longitude,
    )
    altitude = routing.altitude_for_bearing(bearing)

    departure = datetime.utcnow() + timedelta(seconds=10)
    waypoints = routing.generate_waypoints(
        pickup.latitude, pickup.longitude,
        delivery_port.latitude, delivery_port.longitude,
        altitude, departure,
    )

    conflicts = airspace.check_conflicts(db, waypoints)
    if conflicts:
        resolved, altitude = airspace.try_resolve_conflicts(db, waypoints, altitude)
        if resolved is None:
            db.commit()
            db.refresh(req)
            return req
        waypoints = resolved

    duration = routing.estimate_flight_duration_sec(
        pickup.latitude, pickup.longitude,
        delivery_port.latitude, delivery_port.longitude,
    )
    eta = departure + timedelta(seconds=duration)

    slot_time = port_scheduler.find_available_slot(db, body.delivery_port_id, eta)
    if slot_time is None:
        raise HTTPException(status_code=503, detail="No landing slots available")

    if slot_time > eta:
        delay = (slot_time - eta).total_seconds()
        departure = departure + timedelta(seconds=delay)
        waypoints = routing.generate_waypoints(
            pickup.latitude, pickup.longitude,
            delivery_port.latitude, delivery_port.longitude,
            altitude, departure,
        )
        eta = departure + timedelta(seconds=duration)

    fp = FlightPlan(
        drone_id=drone.id,
        delivery_id=req.id,
        waypoints_json=json.dumps(waypoints),
        altitude_m=altitude,
        departure_time=departure,
        estimated_arrival=eta,
        status=FlightStatus.PLANNED,
    )
    db.add(fp)
    db.flush()

    port_scheduler.reserve_slot(db, body.delivery_port_id, fp.id, slot_time)

    drone.status = DroneStatus.IN_FLIGHT
    req.status = DeliveryStatus.ASSIGNED

    db.commit()
    db.refresh(req)

    await manager.broadcast({
        "event": "delivery_assigned",
        "delivery_id": req.id,
        "drone_id": drone.id,
        "flight_plan_id": fp.id,
        "altitude_m": altitude,
    })

    return req


@router.get("/user/{user_id}", response_model=list[DeliveryDetailResponse])
def list_user_deliveries(user_id: str, db: Session = Depends(get_db)):
    """Return all deliveries for a specific user with enriched detail."""
    reqs = (
        db.query(DeliveryRequest)
        .filter(DeliveryRequest.user_id == user_id)
        .order_by(DeliveryRequest.created_at.desc())
        .all()
    )
    return [_build_detail(db, r) for r in reqs]


@router.get("/{delivery_id}", response_model=DeliveryResponse)
def get_delivery(delivery_id: int, db: Session = Depends(get_db)):
    req = db.get(DeliveryRequest, delivery_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return req


@router.get("/{delivery_id}/detail", response_model=DeliveryDetailResponse)
def get_delivery_detail(delivery_id: int, db: Session = Depends(get_db)):
    req = db.get(DeliveryRequest, delivery_id)
    if req is None:
        raise HTTPException(status_code=404, detail="Delivery not found")
    return _build_detail(db, req)


@router.get("/{delivery_id}/flight", response_model=FlightPlanResponse)
def get_flight_plan(delivery_id: int, db: Session = Depends(get_db)):
    fp = db.query(FlightPlan).filter(FlightPlan.delivery_id == delivery_id).first()
    if fp is None:
        raise HTTPException(status_code=404, detail="Flight plan not found")
    return fp


def _build_detail(db: Session, req: DeliveryRequest) -> DeliveryDetailResponse:
    from ..models import Drone

    pickup = db.get(Port, req.pickup_port_id)
    delivery_port = db.get(Port, req.delivery_port_id)
    fp = db.query(FlightPlan).filter(FlightPlan.delivery_id == req.id).first()

    drone = None
    waypoints: list[Waypoint] = []
    if fp:
        drone = db.get(Drone, fp.drone_id)
        raw = json.loads(fp.waypoints_json)
        waypoints = [Waypoint(**w) for w in raw]

    return DeliveryDetailResponse(
        id=req.id,
        user_id=req.user_id,
        pickup_port_id=req.pickup_port_id,
        delivery_port_id=req.delivery_port_id,
        pickup_port_name=pickup.name if pickup else "?",
        delivery_port_name=delivery_port.name if delivery_port else "?",
        pickup_lat=pickup.latitude if pickup else 0,
        pickup_lng=pickup.longitude if pickup else 0,
        delivery_lat=delivery_port.latitude if delivery_port else 0,
        delivery_lng=delivery_port.longitude if delivery_port else 0,
        payload_weight_kg=req.payload_weight_kg,
        status=req.status,
        created_at=req.created_at,
        updated_at=req.updated_at,
        drone_name=drone.name if drone else None,
        drone_battery=drone.battery_level if drone else None,
        drone_lat=drone.current_lat if drone else None,
        drone_lng=drone.current_lng if drone else None,
        drone_alt=drone.current_alt if drone else None,
        flight_altitude_m=fp.altitude_m if fp else None,
        flight_departure=fp.departure_time if fp else None,
        flight_eta=fp.estimated_arrival if fp else None,
        flight_status=fp.status if fp else None,
        waypoints=waypoints,
    )
