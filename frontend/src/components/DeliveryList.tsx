import type { Delivery } from "../types";

interface Props {
  deliveries: Delivery[];
}

const statusColors: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-400",
  assigned: "bg-blue-500/20 text-blue-400",
  in_transit: "bg-amber-500/20 text-amber-400",
  delivered: "bg-emerald-500/20 text-emerald-400",
  cancelled: "bg-red-500/20 text-red-400",
};

export default function DeliveryList({ deliveries }: Props) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold text-amber-400">配送履歴</h3>
      {deliveries.length === 0 && (
        <p className="text-sm text-slate-500">まだ配送依頼がありません</p>
      )}
      <div className="max-h-64 space-y-1 overflow-y-auto">
        {deliveries.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between rounded bg-slate-800 px-3 py-2 text-sm"
          >
            <span>
              #{d.id} | {d.user_id} | {d.payload_weight_kg}kg
            </span>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColors[d.status] ?? ""}`}>
              {d.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
