export interface Port {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: string;
  created_at: string;
}

export interface Drone {
  id: number;
  name: string;
  status: string;
  battery_level: number;
  max_payload_kg: number;
  current_lat: number | null;
  current_lng: number | null;
  current_alt: number;
  home_port_id: number | null;
  created_at: string;
}

export interface Delivery {
  id: number;
  user_id: string;
  pickup_port_id: number;
  delivery_port_id: number;
  payload_weight_kg: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SystemStats {
  total_ports: number;
  total_drones: number;
  idle_drones: number;
  active_flights: number;
  pending_deliveries: number;
  completed_deliveries: number;
}

export interface SimulationTick {
  tick: number;
  active_flights: number;
  drones: Drone[];
  completed_deliveries: number;
}
