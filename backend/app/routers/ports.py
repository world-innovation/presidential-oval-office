from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Port
from ..schemas import PortCreate, PortResponse

router = APIRouter(prefix="/api/ports", tags=["ports"])


@router.get("", response_model=list[PortResponse])
def list_ports(db: Session = Depends(get_db)):
    return db.query(Port).all()


@router.post("", response_model=PortResponse, status_code=201)
def create_port(body: PortCreate, db: Session = Depends(get_db)):
    port = Port(**body.model_dump())
    db.add(port)
    db.commit()
    db.refresh(port)
    return port


@router.get("/{port_id}", response_model=PortResponse)
def get_port(port_id: int, db: Session = Depends(get_db)):
    port = db.get(Port, port_id)
    if port is None:
        raise HTTPException(status_code=404, detail="Port not found")
    return port
