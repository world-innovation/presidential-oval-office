import type { SystemStats } from "../types";

interface Props {
  stats: SystemStats | null;
  tick: number;
}

export default function StatsBar({ stats, tick }: Props) {
  if (!stats) return null;

  const items = [
    { label: "ポート", value: stats.total_ports, color: "text-blue-400" },
    { label: "全ドローン", value: stats.total_drones, color: "text-slate-300" },
    { label: "待機中", value: stats.idle_drones, color: "text-emerald-400" },
    { label: "飛行中", value: stats.active_flights, color: "text-amber-400" },
    { label: "配送待ち", value: stats.pending_deliveries, color: "text-orange-400" },
    { label: "配送完了", value: stats.completed_deliveries, color: "text-green-400" },
    { label: "Tick", value: tick, color: "text-purple-400" },
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg bg-slate-800 px-4 py-2 text-center">
          <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
          <div className="text-xs text-slate-400">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
