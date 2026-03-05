import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import type { Port, Drone } from "../types";

const portIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const droneIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const idleIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Props {
  ports: Port[];
  drones: Drone[];
}

export default function DroneMap({ ports, drones }: Props) {
  const center: [number, number] = [35.68, 139.74];

  const flyingDrones = drones.filter(
    (d) => d.status === "in_flight" && d.current_lat != null && d.current_lng != null,
  );

  return (
    <MapContainer center={center} zoom={13} className="h-full w-full rounded-xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {ports.map((p) => (
        <Marker key={`port-${p.id}`} position={[p.latitude, p.longitude]} icon={portIcon}>
          <Popup>
            <strong>{p.name}</strong>
            <br />
            容量: {p.capacity} パッド
          </Popup>
        </Marker>
      ))}

      {drones
        .filter((d) => d.current_lat != null && d.current_lng != null)
        .map((d) => (
          <Marker
            key={`drone-${d.id}`}
            position={[d.current_lat!, d.current_lng!]}
            icon={d.status === "in_flight" ? droneIcon : idleIcon}
          >
            <Popup>
              <strong>{d.name}</strong>
              <br />
              状態: {d.status} | 高度: {d.current_alt.toFixed(0)}m
              <br />
              バッテリー: {d.battery_level.toFixed(0)}%
            </Popup>
          </Marker>
        ))}

      {flyingDrones.map((d) => {
        const home = ports.find((p) => p.id === d.home_port_id);
        if (!home) return null;
        return (
          <Polyline
            key={`line-${d.id}`}
            positions={[
              [home.latitude, home.longitude],
              [d.current_lat!, d.current_lng!],
            ]}
            color="#f59e0b"
            weight={2}
            dashArray="6"
          />
        );
      })}
    </MapContainer>
  );
}
