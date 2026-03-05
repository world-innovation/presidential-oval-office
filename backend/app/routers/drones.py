from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Drone, Port
from ..schemas import DroneCreate, DroneResponse

router = APIRouter(prefix="/api/drones", tags=["drones"])


@router.get("", response_model=list[DroneResponse])
def list_drones(db: Session = Depends(get_db)):
    return db.query(Drone).all()


@router.post("", response_model=DroneResponse, status_code=201)
def create_drone(body: DroneCreate, db: Session = Depends(get_db)):
    if body.home_port_id is not None:
        port = db.get(Port, body.home_port_id)
        if port is None:
            raise HTTPException(status_code=404, detail="Home port not found")

    drone = Drone(**body.model_dump())

    if drone.home_port_id is not None:
        port = db.get(Port, drone.home_port_id)
        if port:
            drone.current_lat = port.latitude
            drone.current_lng = port.longitude

    db.add(drone)
    db.commit()
    db.refresh(drone)
    return drone


@router.get("/{drone_id}", response_model=DroneResponse)
def get_drone(drone_id: int, db: Session = Depends(get_db)):
    drone = db.get(Drone, drone_id)
    if drone is None:
        raise HTTPException(status_code=404, detail="Drone not found")
    return drone
