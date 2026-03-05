from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./goki_room.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    min_altitude_m: float = 50.0
    max_altitude_m: float = 200.0
    altitude_layers: int = 4
    temporal_separation_sec: float = 30.0
    grid_cell_size_m: float = 100.0
    drone_speed_ms: float = 15.0
    max_payload_kg: float = 5.0
    port_default_capacity: int = 3
    landing_slot_duration_sec: float = 60.0


settings = Settings()
