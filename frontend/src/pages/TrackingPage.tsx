import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { api } from "../api/client";
import type { DeliveryDetail } from "../types";

const droneIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const pickupIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const destIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface Props {
  userId: string;
  initialDeliveryId?: number | null;
  onBack: () => void;
}

const statusLabel: Record<string, string> = {
  pending: "待機中",
  assigned: "ドローン割当済",
  in_transit: "配送中",
  delivered: "配送完了",
  cancelled: "キャンセル",
};

const statusColor: Record<string, string> = {
  pending: "bg-orange-500",
  assigned: "bg-blue-500",
  in_transit: "bg-amber-500",
  delivered: "bg-emerald-500",
  cancelled: "bg-red-500",
};

export default function TrackingPage({ userId, initialDeliveryId, onBack }: Props) {
  const [deliveries, setDeliveries] = useState<DeliveryDetail[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(initialDeliveryId ?? null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.getUserDeliveries(userId);
      setDeliveries(data);
      if (selectedId === null && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch {
      /* ignore */
    }
  }, [userId, selectedId]);

  useEffect(() => {
    refresh();
    intervalRef.current = setInterval(refresh, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  const selected = deliveries.find((d) => d.id === selectedId) ?? null;

  return (
    <div className="flex h-full flex-col pb-20">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <button onClick={onBack} className="text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold">配送追跡</h2>
      </div>

      {/* Delivery Selector */}
      {deliveries.length > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {deliveries.map((d) => (
            <button
              key={d.id}
              onClick={() => setSelectedId(d.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                selectedId === d.id
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              #{d.id} {d.delivery_port_name}
            </button>
          ))}
        </div>
      )}

      {deliveries.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-slate-500">追跡できる配送がありません</p>
        </div>
      )}

      {selected && (
        <>
          {/* Map */}
          <div className="mx-4 overflow-hidden rounded-xl" style={{ height: "280px" }}>
            <MapContainer
              center={[
                (selected.pickup_lat + selected.delivery_lat) / 2,
                (selected.pickup_lng + selected.delivery_lng) / 2,
              ]}
              zoom={13}
              className="h-full w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[selected.pickup_lat, selected.pickup_lng]} icon={pickupIcon}>
                <Popup>{selected.pickup_port_name} (集荷)</Popup>
              </Marker>
              <Marker position={[selected.delivery_lat, selected.delivery_lng]} icon={destIcon}>
                <Popup>{selected.delivery_port_name} (配送先)</Popup>
              </Marker>

              {selected.waypoints.length > 0 && (
                <Polyline
                  positions={selected.waypoints.map((w) => [w.latitude, w.longitude])}
                  color="#f59e0b"
                  weight={3}
                  dashArray="8"
                />
              )}

              {selected.drone_lat != null && selected.drone_lng != null && (
                <Marker position={[selected.drone_lat, selected.drone_lng]} icon={droneIcon}>
                  <Popup>
                    {selected.drone_name}
                    <br />
                    高度: {selected.drone_alt?.toFixed(0)}m
                  </Popup>
                </Marker>
              )}
            </MapContainer>
          </div>

          {/* Status Card */}
          <div className="mx-4 mt-4 rounded-xl bg-slate-800 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-lg font-bold">配送 #{selected.id}</span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold text-white ${statusColor[selected.status] ?? "bg-slate-600"}`}
              >
                {statusLabel[selected.status] ?? selected.status}
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <InfoRow icon="🟢" label="集荷" value={selected.pickup_port_name} />
              <InfoRow icon="📍" label="配送先" value={selected.delivery_port_name} />
              <InfoRow icon="⚖️" label="重量" value={`${selected.payload_weight_kg} kg`} />
              {selected.drone_name && (
                <InfoRow icon="🚁" label="ドローン" value={selected.drone_name} />
              )}
              {selected.flight_altitude_m != null && (
                <InfoRow icon="📐" label="飛行高度" value={`${selected.flight_altitude_m.toFixed(1)} m`} />
              )}
              {selected.drone_battery != null && (
                <InfoRow icon="🔋" label="バッテリー" value={`${selected.drone_battery.toFixed(0)}%`} />
              )}
              {selected.flight_eta && (
                <InfoRow
                  icon="🕐"
                  label="到着予定"
                  value={new Date(selected.flight_eta).toLocaleTimeString("ja-JP")}
                />
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="mx-4 mt-4 rounded-xl bg-slate-800 p-4">
            <h4 className="mb-3 text-sm font-semibold text-slate-400">配送タイムライン</h4>
            <div className="space-y-3">
              <TimelineItem done label="配送依頼受付" time={selected.created_at} />
              <TimelineItem
                done={selected.status !== "pending"}
                label="ドローン割当"
                time={selected.status !== "pending" ? selected.created_at : undefined}
              />
              <TimelineItem
                done={selected.flight_status === "active" || selected.status === "delivered"}
                label="飛行開始"
                time={selected.flight_departure ?? undefined}
              />
              <TimelineItem
                done={selected.status === "delivered"}
                label="配送完了"
                time={selected.status === "delivered" ? selected.updated_at : undefined}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">
        {icon} {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function TimelineItem({
  done,
  label,
  time,
}: {
  done: boolean;
  label: string;
  time?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={`mt-0.5 h-3 w-3 shrink-0 rounded-full ${done ? "bg-emerald-400" : "bg-slate-600"}`}
      />
      <div className="flex-1">
        <span className={done ? "text-sm font-medium" : "text-sm text-slate-500"}>{label}</span>
        {time && (
          <span className="ml-2 text-xs text-slate-500">
            {new Date(time).toLocaleString("ja-JP")}
          </span>
        )}
      </div>
    </div>
  );
}
