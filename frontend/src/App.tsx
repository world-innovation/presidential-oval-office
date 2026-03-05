import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api/client";
import DroneMap from "./components/DroneMap";
import DeliveryForm from "./components/DeliveryForm";
import DeliveryList from "./components/DeliveryList";
import StatsBar from "./components/StatsBar";
import type { Port, Drone, Delivery, SystemStats } from "./types";

export default function App() {
  const [ports, setPorts] = useState<Port[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [tick, setTick] = useState(0);
  const [autoTick, setAutoTick] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [p, d, del, s] = await Promise.all([
        api.getPorts(),
        api.getDrones(),
        api.getDeliveries(),
        api.getStats(),
      ]);
      setPorts(p);
      setDrones(d);
      setDeliveries(del);
      setStats(s);
      if (p.length > 0) setSeeded(true);
    } catch {
      /* ignore during initial load */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSeed = async () => {
    await api.seed();
    setSeeded(true);
    await refresh();
  };

  const handleTick = async () => {
    const result = await api.tick();
    setTick(result.tick);
    setDrones(result.drones);
    await refresh();
  };

  useEffect(() => {
    if (autoTick) {
      intervalRef.current = setInterval(async () => {
        try {
          const result = await api.tick();
          setTick(result.tick);
          setDrones(result.drones);
          const [del, s] = await Promise.all([api.getDeliveries(), api.getStats()]);
          setDeliveries(del);
          setStats(s);
        } catch {
          /* ignore */
        }
      }, 1500);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoTick]);

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-700 bg-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">Goki-Room</h1>
            <p className="text-sm text-slate-400">ドローン配送空域管理システム</p>
          </div>
          <div className="flex gap-3">
            {!seeded && (
              <button
                onClick={handleSeed}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium transition hover:bg-blue-500"
              >
                デモデータ生成
              </button>
            )}
            <button
              onClick={handleTick}
              className="rounded bg-slate-700 px-4 py-2 text-sm font-medium transition hover:bg-slate-600"
            >
              1 Tick 進む
            </button>
            <button
              onClick={() => setAutoTick(!autoTick)}
              className={`rounded px-4 py-2 text-sm font-medium transition ${
                autoTick
                  ? "bg-red-600 hover:bg-red-500"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              {autoTick ? "自動停止" : "自動再生"}
            </button>
          </div>
        </div>
      </header>

      <div className="p-4">
        <StatsBar stats={stats} tick={tick} />
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-4">
        <div className="lg:col-span-3" style={{ height: "500px" }}>
          <DroneMap ports={ports} drones={drones} />
        </div>

        <div className="space-y-4">
          <DeliveryForm ports={ports} onCreated={refresh} />
          <DeliveryList deliveries={deliveries} />
        </div>
      </div>
    </div>
  );
}
