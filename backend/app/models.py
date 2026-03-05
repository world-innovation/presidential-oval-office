import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class PortStatus(str, enum.Enum):
    ACTIVE = "active"
    MAINTENANCE = "maintenance"
    CLOSED = "closed"


class DroneStatus(str, enum.Enum):
    IDLE = "idle"
    IN_FLIGHT = "in_flight"
    CHARGING = "charging"
    MAINTENANCE = "maintenance"


class DeliveryStatus(str, enum.Enum):
    PENDING = "pending"
    ASSIGNED = "assigned"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class FlightStatus(str, enum.Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    COMPLETED = "completed"
    ABORTED = "aborted"


class Port(Base):
    __tablename__ = "ports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=3)
    status: Mapped[PortStatus] = mapped_column(
        Enum(PortStatus), default=PortStatus.ACTIVE
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    drones: Mapped[list["Drone"]] = relationship(back_populates="home_port")
    landing_slots: Mapped[list["LandingSlot"]] = relationship(back_populates="port")


class Drone(Base):
    __tablename__ = "drones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[DroneStatus] = mapped_column(
        Enum(DroneStatus), default=DroneStatus.IDLE
    )
    battery_level: Mapped[float] = mapped_column(Float, default=100.0)
    max_payload_kg: Mapped[float] = mapped_column(Float, default=5.0)
    current_lat: Mapped[float] = mapped_column(Float, nullable=True)
    current_lng: Mapped[float] = mapped_column(Float, nullable=True)
    current_alt: Mapped[float] = mapped_column(Float, default=0.0)
    home_port_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("ports.id"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    home_port: Mapped[Port | None] = relationship(back_populates="drones")
    flight_plans: Mapped[list["FlightPlan"]] = relationship(back_populates="drone")


class DeliveryRequest(Base):
    __tablename__ = "delivery_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[str] = mapped_column(String(100), nullable=False)
    pickup_port_id: Mapped[int] = mapped_column(Integer, ForeignKey("ports.id"), nullable=False)
    delivery_port_id: Mapped[int] = mapped_column(Integer, ForeignKey("ports.id"), nullable=False)
    payload_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[DeliveryStatus] = mapped_column(
        Enum(DeliveryStatus), default=DeliveryStatus.PENDING
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    pickup_port: Mapped[Port] = relationship(foreign_keys=[pickup_port_id])
    delivery_port: Mapped[Port] = relationship(foreign_keys=[delivery_port_id])
    flight_plan: Mapped["FlightPlan | None"] = relationship(back_populates="delivery")


class FlightPlan(Base):
    __tablename__ = "flight_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    drone_id: Mapped[int] = mapped_column(Integer, ForeignKey("drones.id"), nullable=False)
    delivery_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("delivery_requests.id"), nullable=False
    )
    waypoints_json: Mapped[str] = mapped_column(Text, nullable=False)
    altitude_m: Mapped[float] = mapped_column(Float, nullable=False)
    departure_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    estimated_arrival: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[FlightStatus] = mapped_column(
        Enum(FlightStatus), default=FlightStatus.PLANNED
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    drone: Mapped[Drone] = relationship(back_populates="flight_plans")
    delivery: Mapped[DeliveryRequest] = relationship(back_populates="flight_plan")
    landing_slot: Mapped["LandingSlot | None"] = relationship(back_populates="flight_plan")


class LandingSlot(Base):
    __tablename__ = "landing_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    port_id: Mapped[int] = mapped_column(Integer, ForeignKey("ports.id"), nullable=False)
    flight_plan_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("flight_plans.id"), nullable=False
    )
    scheduled_start: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    port: Mapped[Port] = relationship(back_populates="landing_slots")
    flight_plan: Mapped[FlightPlan] = relationship(back_populates="landing_slot")
