import { useState } from "react";
import { api } from "../api/client";
import type { Port } from "../types";

interface Props {
  ports: Port[];
  onCreated: () => void;
}

export default function DeliveryForm({ ports, onCreated }: Props) {
  const [pickupId, setPickupId] = useState<number>(0);
  const [deliveryId, setDeliveryId] = useState<number>(0);
  const [weight, setWeight] = useState<number>(1.0);
  const [userId, setUserId] = useState("user-1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pickupId === 0 || deliveryId === 0) {
      setMessage("ポートを選択してください");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const res = await api.createDelivery({
        user_id: userId,
        pickup_port_id: pickupId,
        delivery_port_id: deliveryId,
        payload_weight_kg: weight,
      });
      setMessage(
        `配送 #${res.id} を作成しました (${res.status})`,
      );
      onCreated();
    } catch (err) {
      setMessage(`エラー: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-lg font-semibold text-amber-400">配送依頼</h3>

      <div>
        <label className="block text-sm text-slate-400">ユーザーID</label>
        <input
          type="text"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded bg-slate-700 px-3 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400">集荷ポート</label>
        <select
          value={pickupId}
          onChange={(e) => setPickupId(Number(e.target.value))}
          className="w-full rounded bg-slate-700 px-3 py-1.5 text-sm"
        >
          <option value={0}>-- 選択 --</option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-slate-400">配送先ポート</label>
        <select
          value={deliveryId}
          onChange={(e) => setDeliveryId(Number(e.target.value))}
          className="w-full rounded bg-slate-700 px-3 py-1.5 text-sm"
        >
          <option value={0}>-- 選択 --</option>
          {ports.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm text-slate-400">重量 (kg)</label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          max="5"
          value={weight}
          onChange={(e) => setWeight(Number(e.target.value))}
          className="w-full rounded bg-slate-700 px-3 py-1.5 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-amber-500 py-2 font-semibold text-slate-900 transition hover:bg-amber-400 disabled:opacity-50"
      >
        {loading ? "送信中..." : "配送を依頼"}
      </button>

      {message && <p className="text-sm text-emerald-400">{message}</p>}
    </form>
  );
}
