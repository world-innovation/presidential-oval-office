from datetime import datetime

from pydantic import BaseModel, Field

from .models import DeliveryStatus, DroneStatus, FlightStatus, PortStatus


class PortCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    capacity: int = Field(default=3, ge=1)


class PortResponse(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    capacity: int
    status: PortStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class DroneCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    max_payload_kg: float = Field(default=5.0, gt=0)
    home_port_id: int | None = None


class DroneResponse(BaseModel):
    id: int
    name: str
    status: DroneStatus
    battery_level: float
    max_payload_kg: float
    current_lat: float | None
    current_lng: float | None
    current_alt: float
    home_port_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DeliveryCreate(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=100)
    pickup_port_id: int
    delivery_port_id: int
    payload_weight_kg: float = Field(..., gt=0, le=5.0)


class DeliveryResponse(BaseModel):
    id: int
    user_id: str
    pickup_port_id: int
    delivery_port_id: int
    payload_weight_kg: float
    status: DeliveryStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class Waypoint(BaseModel):
    latitude: float
    longitude: float
    altitude_m: float
    timestamp: datetime


class FlightPlanResponse(BaseModel):
    id: int
    drone_id: int
    delivery_id: int
    altitude_m: float
    departure_time: datetime
    estimated_arrival: datetime
    status: FlightStatus
    created_at: datetime

    model_config = {"from_attributes": True}


class SimulationTickResponse(BaseModel):
    tick: int
    active_flights: int
    drones: list[DroneResponse]
    completed_deliveries: int


class DeliveryDetailResponse(BaseModel):
    id: int
    user_id: str
    pickup_port_id: int
    delivery_port_id: int
    pickup_port_name: str
    delivery_port_name: str
    pickup_lat: float
    pickup_lng: float
    delivery_lat: float
    delivery_lng: float
    payload_weight_kg: float
    status: DeliveryStatus
    created_at: datetime
    updated_at: datetime
    drone_name: str | None = None
    drone_battery: float | None = None
    drone_lat: float | None = None
    drone_lng: float | None = None
    drone_alt: float | None = None
    flight_altitude_m: float | None = None
    flight_departure: datetime | None = None
    flight_eta: datetime | None = None
    flight_status: FlightStatus | None = None
    waypoints: list[Waypoint] = []


class SystemStats(BaseModel):
    total_ports: int
    total_drones: int
    idle_drones: int
    active_flights: int
    pending_deliveries: int
    completed_deliveries: int
