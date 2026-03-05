import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import type { DeliveryDetail } from "../types";

interface Props {
  userId: string;
  onTrack: (id: number) => void;
  onBack: () => void;
}

const statusLabel: Record<string, string> = {
  pending: "待機中",
  assigned: "割当済",
  in_transit: "配送中",
  delivered: "完了",
  cancelled: "取消",
};

const statusColor: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-400",
  assigned: "bg-blue-500/20 text-blue-400",
  in_transit: "bg-amber-500/20 text-amber-400",
  delivered: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export default function HistoryPage({ userId, onTrack, onBack }: Props) {
  const [deliveries, setDeliveries] = useState<DeliveryDetail[]>([]);

  const refresh = useCallback(async () => {
    try {
      setDeliveries(await api.getUserDeliveries(userId));
    } catch {
      /* ignore */
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="px-4 pb-24 pt-6">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold">配送履歴</h2>
        <span className="ml-auto rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-400">
          {deliveries.length} 件
        </span>
      </div>

      {deliveries.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-2 text-slate-500">まだ配送履歴がありません</p>
        </div>
      )}

      <div className="space-y-3">
        {deliveries.map((d) => (
          <button
            key={d.id}
            onClick={() => onTrack(d.id)}
            className="w-full rounded-xl bg-slate-800 p-4 text-left transition active:bg-slate-700"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-bold">#{d.id}</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[d.status] ?? ""}`}
              >
                {statusLabel[d.status] ?? d.status}
              </span>
            </div>

            <div className="mb-2 flex items-center gap-2 text-sm">
              <span className="text-emerald-400">●</span>
              <span className="text-slate-300">{d.pickup_port_name}</span>
              <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-300">{d.delivery_port_name}</span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>⚖️ {d.payload_weight_kg} kg</span>
              {d.drone_name && <span>🚁 {d.drone_name}</span>}
              <span className="ml-auto">
                {new Date(d.created_at).toLocaleDateString("ja-JP")}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
