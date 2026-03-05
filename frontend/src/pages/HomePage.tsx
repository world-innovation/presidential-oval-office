import type { SystemStats } from "../types";

interface Props {
  stats: SystemStats | null;
  onNavigate: (page: string) => void;
}

export default function HomePage({ stats, onNavigate }: Props) {
  return (
    <div className="px-4 pb-24 pt-6">
      {/* Hero */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-lg">
        <p className="mb-1 text-sm font-medium opacity-80">ドローン配送</p>
        <h2 className="mb-2 text-2xl font-bold">荷物を届けよう</h2>
        <p className="mb-4 text-sm opacity-90">
          最短数分で届くドローン配送。集荷ポートから配送先ポートへ、全自動で安全にお届けします。
        </p>
        <button
          onClick={() => onNavigate("new")}
          className="rounded-xl bg-white px-6 py-2.5 text-sm font-bold text-orange-600 shadow transition active:scale-95"
        >
          配送を依頼する
        </button>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="利用可能" value={stats.idle_drones} unit="機" color="text-emerald-400" />
          <StatCard label="飛行中" value={stats.active_flights} unit="機" color="text-amber-400" />
          <StatCard label="配送完了" value={stats.completed_deliveries} unit="件" color="text-blue-400" />
        </div>
      )}

      {/* Action Cards */}
      <h3 className="mb-3 text-sm font-semibold text-slate-400">クイックアクション</h3>
      <div className="space-y-3">
        <ActionCard
          icon="📦"
          title="新しい配送を依頼"
          desc="集荷・配送先を選んで荷物を送る"
          onClick={() => onNavigate("new")}
        />
        <ActionCard
          icon="📍"
          title="配送を追跡"
          desc="リアルタイムでドローンの位置を確認"
          onClick={() => onNavigate("tracking")}
        />
        <ActionCard
          icon="📋"
          title="配送履歴"
          desc="過去の配送記録を確認"
          onClick={() => onNavigate("history")}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <div className="rounded-xl bg-slate-800 p-3 text-center">
      <div className={`text-xl font-bold ${color}`}>
        {value}
        <span className="text-xs font-normal text-slate-400">{unit}</span>
      </div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: string;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl bg-slate-800 p-4 text-left transition active:bg-slate-700"
    >
      <span className="text-2xl">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-slate-200">{title}</div>
        <div className="text-xs text-slate-500">{desc}</div>
      </div>
      <svg className="h-5 w-5 shrink-0 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
