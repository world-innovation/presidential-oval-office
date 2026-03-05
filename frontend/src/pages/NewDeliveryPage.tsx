import { useState } from "react";
import { api } from "../api/client";
import type { Port } from "../types";

interface Props {
  ports: Port[];
  userId: string;
  onCreated: (deliveryId: number) => void;
  onBack: () => void;
}

type Step = "pickup" | "delivery" | "weight" | "confirm" | "done";

export default function NewDeliveryPage({ ports, userId, onCreated, onBack }: Props) {
  const [step, setStep] = useState<Step>("pickup");
  const [pickupId, setPickupId] = useState<number | null>(null);
  const [deliveryId, setDeliveryId] = useState<number | null>(null);
  const [weight, setWeight] = useState(1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultId, setResultId] = useState<number | null>(null);

  const pickupPort = ports.find((p) => p.id === pickupId);
  const deliveryPort = ports.find((p) => p.id === deliveryId);

  const handleSubmit = async () => {
    if (!pickupId || !deliveryId) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.createDelivery({
        user_id: userId,
        pickup_port_id: pickupId,
        delivery_port_id: deliveryId,
        payload_weight_kg: weight,
      });
      setResultId(res.id);
      setStep("done");
    } catch (err) {
      setError(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 pb-24 pt-6">
      {/* Header */}
      <button onClick={onBack} className="mb-4 flex items-center gap-1 text-sm text-slate-400">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        戻る
      </button>

      {/* Progress */}
      <div className="mb-6 flex items-center gap-2">
        {(["pickup", "delivery", "weight", "confirm"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                stepIndex(step) >= i
                  ? "bg-amber-500 text-white"
                  : "bg-slate-700 text-slate-500"
              }`}
            >
              {i + 1}
            </div>
            {i < 3 && (
              <div
                className={`h-0.5 w-6 ${stepIndex(step) > i ? "bg-amber-500" : "bg-slate-700"}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step: Pickup */}
      {step === "pickup" && (
        <div>
          <h2 className="mb-1 text-lg font-bold">集荷ポートを選択</h2>
          <p className="mb-4 text-sm text-slate-400">荷物を預けるポートを選んでください</p>
          <div className="space-y-2">
            {ports.map((p) => (
              <PortCard
                key={p.id}
                port={p}
                selected={pickupId === p.id}
                onSelect={() => setPickupId(p.id)}
              />
            ))}
          </div>
          <button
            disabled={!pickupId}
            onClick={() => setStep("delivery")}
            className="mt-4 w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}

      {/* Step: Delivery */}
      {step === "delivery" && (
        <div>
          <h2 className="mb-1 text-lg font-bold">配送先ポートを選択</h2>
          <p className="mb-4 text-sm text-slate-400">荷物を届けるポートを選んでください</p>
          <div className="space-y-2">
            {ports
              .filter((p) => p.id !== pickupId)
              .map((p) => (
                <PortCard
                  key={p.id}
                  port={p}
                  selected={deliveryId === p.id}
                  onSelect={() => setDeliveryId(p.id)}
                />
              ))}
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => setStep("pickup")}
              className="flex-1 rounded-xl bg-slate-700 py-3 font-bold transition"
            >
              戻る
            </button>
            <button
              disabled={!deliveryId}
              onClick={() => setStep("weight")}
              className="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition disabled:opacity-40"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* Step: Weight */}
      {step === "weight" && (
        <div>
          <h2 className="mb-1 text-lg font-bold">荷物の重さ</h2>
          <p className="mb-6 text-sm text-slate-400">0.1kg 〜 5.0kg まで対応</p>

          <div className="mb-2 text-center">
            <span className="text-5xl font-bold text-amber-400">{weight.toFixed(1)}</span>
            <span className="ml-1 text-xl text-slate-400">kg</span>
          </div>

          <input
            type="range"
            min="0.1"
            max="5.0"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="mb-6 w-full accent-amber-500"
          />

          <div className="flex gap-2">
            {[0.5, 1.0, 2.0, 3.0, 5.0].map((w) => (
              <button
                key={w}
                onClick={() => setWeight(w)}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
                  weight === w ? "bg-amber-500 text-slate-900" : "bg-slate-700"
                }`}
              >
                {w}kg
              </button>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep("delivery")}
              className="flex-1 rounded-xl bg-slate-700 py-3 font-bold transition"
            >
              戻る
            </button>
            <button
              onClick={() => setStep("confirm")}
              className="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <div>
          <h2 className="mb-4 text-lg font-bold">配送内容の確認</h2>

          <div className="mb-6 space-y-3 rounded-xl bg-slate-800 p-4">
            <ConfirmRow label="集荷" value={pickupPort?.name ?? ""} icon="🟢" />
            <div className="flex justify-center">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
            <ConfirmRow label="配送先" value={deliveryPort?.name ?? ""} icon="📍" />
            <hr className="border-slate-700" />
            <ConfirmRow label="重量" value={`${weight.toFixed(1)} kg`} icon="⚖️" />
            <ConfirmRow label="ユーザー" value={userId} icon="👤" />
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-red-500/20 p-3 text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep("weight")}
              className="flex-1 rounded-xl bg-slate-700 py-3 font-bold transition"
            >
              戻る
            </button>
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition disabled:opacity-50"
            >
              {loading ? "送信中..." : "配送を依頼"}
            </button>
          </div>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && resultId && (
        <div className="text-center">
          <div className="mb-4 text-6xl">✅</div>
          <h2 className="mb-2 text-xl font-bold text-emerald-400">配送依頼を受付しました</h2>
          <p className="mb-1 text-slate-400">配送番号</p>
          <p className="mb-6 text-3xl font-bold text-white">#{resultId}</p>
          <p className="mb-8 text-sm text-slate-500">
            ドローンが自動で割り当てられ、安全な経路で配送されます。
          </p>
          <button
            onClick={() => onCreated(resultId)}
            className="w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition"
          >
            配送を追跡する
          </button>
        </div>
      )}
    </div>
  );
}

function stepIndex(step: Step): number {
  return ["pickup", "delivery", "weight", "confirm", "done"].indexOf(step);
}

function PortCard({
  port,
  selected,
  onSelect,
}: {
  port: Port;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition ${
        selected
          ? "border-amber-500 bg-amber-500/10"
          : "border-transparent bg-slate-800"
      }`}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 text-lg">
        🏢
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold">{port.name}</div>
        <div className="text-xs text-slate-500">容量 {port.capacity} パッド</div>
      </div>
      {selected && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs text-white">
          ✓
        </div>
      )}
    </button>
  );
}

function ConfirmRow({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">
        {icon} {label}
      </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
