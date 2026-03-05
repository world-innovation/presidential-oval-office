import { useCallback, useEffect, useState } from "react";
import { api } from "./api/client";
import HomePage from "./pages/HomePage";
import NewDeliveryPage from "./pages/NewDeliveryPage";
import TrackingPage from "./pages/TrackingPage";
import HistoryPage from "./pages/HistoryPage";
import type { Port, SystemStats } from "./types";

type Page = "home" | "new" | "tracking" | "history";

interface Props {
  onSwitchToAdmin: () => void;
}

export default function UserApp({ onSwitchToAdmin }: Props) {
  const [page, setPage] = useState<Page>("home");
  const [ports, setPorts] = useState<Port[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [trackingDeliveryId, setTrackingDeliveryId] = useState<number | null>(null);
  const userId = "user-1";

  const refreshData = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([api.getPorts(), api.getStats()]);
      setPorts(p);
      setStats(s);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const goToTracking = (deliveryId: number) => {
    setTrackingDeliveryId(deliveryId);
    setPage("tracking");
  };

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-slate-900">
      {/* Top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold text-amber-400">Goki-Room</h1>
          <p className="text-[10px] text-slate-500">ドローン配送</p>
        </div>
        <button
          onClick={onSwitchToAdmin}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-slate-700"
        >
          管制画面
        </button>
      </header>

      {/* Pages */}
      <main className="min-h-[calc(100vh-120px)]">
        {page === "home" && <HomePage stats={stats} onNavigate={(p) => setPage(p as Page)} />}
        {page === "new" && (
          <NewDeliveryPage
            ports={ports}
            userId={userId}
            onCreated={goToTracking}
            onBack={() => setPage("home")}
          />
        )}
        {page === "tracking" && (
          <TrackingPage
            userId={userId}
            initialDeliveryId={trackingDeliveryId}
            onBack={() => {
              setTrackingDeliveryId(null);
              setPage("home");
            }}
          />
        )}
        {page === "history" && (
          <HistoryPage
            userId={userId}
            onTrack={goToTracking}
            onBack={() => setPage("home")}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
        <div className="flex">
          <NavItem
            icon={<HomeIcon />}
            label="ホーム"
            active={page === "home"}
            onClick={() => setPage("home")}
          />
          <NavItem
            icon={<PlusIcon />}
            label="配送依頼"
            active={page === "new"}
            onClick={() => setPage("new")}
          />
          <NavItem
            icon={<MapIcon />}
            label="追跡"
            active={page === "tracking"}
            onClick={() => {
              setTrackingDeliveryId(null);
              setPage("tracking");
            }}
          />
          <NavItem
            icon={<ListIcon />}
            label="履歴"
            active={page === "history"}
            onClick={() => setPage("history")}
          />
        </div>
      </nav>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 transition ${
        active ? "text-amber-400" : "text-slate-500"
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function HomeIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}
