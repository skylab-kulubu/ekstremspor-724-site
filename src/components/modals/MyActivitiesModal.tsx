"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { cancelActivity } from "@/lib/actions/activities";
import { VehicleGlyph } from "@/components/illustrations";
import type { Activity, ActivityStatus, VehicleType } from "@/lib/types";

type Props = {
  userId: string;
  open: boolean;
  onClose: () => void;
};

const VEHICLE_LABEL: Record<VehicleType, string> = {
  bicycle: "Bisiklet",
  skates: "Paten",
  skateboard: "Kaykay",
  running: "Koşu",
};

const STATUS_META: Record<
  ActivityStatus,
  { label: string; bg: string; text: string; dot: string }
> = {
  pending: {
    label: "Beklemede",
    bg: "bg-sun/10",
    text: "text-amber-800",
    dot: "bg-sun",
  },
  approved: {
    label: "Onaylandı",
    bg: "bg-grass/25",
    text: "text-grass-deep",
    dot: "bg-grass-deep",
  },
  rejected: {
    label: "Reddedildi",
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-500",
  },
};

type TabKey = "all" | "pending" | "approved";

const TABS: { k: TabKey; label: string }[] = [
  { k: "all", label: "Tümü" },
  { k: "pending", label: "Bekleyen" },
  { k: "approved", label: "Onaylı" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export function MyActivitiesModal({ userId: _userId, open, onClose }: Props) {
  const [tab, setTab] = useState<TabKey>("all");
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!open) return;
    const res = await fetch("/api/activities/mine", { cache: "no-store" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    setActivities((await res.json()) as Activity[]);
    setLoading(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    refetch();
  }, [open, refetch]);
  useRealtime("activities_changes", refetch);

  async function handleCancel(id: string) {
    if (cancellingId) return;
    setCancellingId(id);
    setError(null);
    const result = await cancelActivity(id);
    setCancellingId(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    await refetch();
  }

  if (!open) return null;

  const filtered = activities.filter((a) => {
    if (tab === "all") return true;
    if (tab === "pending") return a.status === "pending";
    if (tab === "approved") return a.status === "approved";
    return true;
  });

  const totalApprovedKm = activities
    .filter((a) => a.status === "approved")
    .reduce((s, a) => s + a.distance, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="my-activities-title"
      onClick={onClose}
    >
      <div
        className="modal-pop flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[22px] bg-paper shadow-[0_28px_72px_-16px_rgba(26,26,26,0.32)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink/8 bg-white px-6 py-4">
          <div>
            <h2
              id="my-activities-title"
              className="font-heading text-lg font-bold tracking-tight text-ink"
            >
              Aktivitelerim
            </h2>
            <p className="mt-0.5 text-[12px] text-ink/55">
              <span className="font-semibold text-ink">
                {totalApprovedKm.toFixed(1)} km
              </span>{" "}
              onaylı sürüş
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-ink/50 transition hover:bg-ink/5 hover:text-ink"
            aria-label="Kapat"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="3" y1="3" x2="13" y2="13" />
              <line x1="13" y1="3" x2="3" y2="13" />
            </svg>
          </button>
        </div>
        <div className="flex shrink-0 gap-1 border-b border-ink/8 bg-white px-4 py-2">
          {TABS.map((t) => {
            const count =
              t.k === "all"
                ? activities.length
                : activities.filter((a) =>
                    t.k === "pending"
                      ? a.status === "pending"
                      : a.status === "approved",
                  ).length;
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                type="button"
                onClick={() => setTab(t.k)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  active ? "bg-ink text-paper" : "text-ink/60 hover:bg-ink/5"
                }`}
              >
                {t.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                    active ? "bg-paper/20 text-paper" : "bg-ink/10 text-ink/55"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="py-10 text-center text-sm text-ink/45">
              Yükleniyor…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink/45">
              {tab === "pending"
                ? "Bekleyen talep yok."
                : tab === "approved"
                  ? "Onaylı sürüş yok."
                  : "Henüz aktivite yok."}
            </div>
          ) : (
            <ul className="space-y-2">
              {filtered.map((a) => {
                const meta = STATUS_META[a.status];
                const canCancel = a.status === "pending";
                const isCancelling = cancellingId === a.id;
                return (
                  <li
                    key={a.id}
                    className="rounded-2xl border border-ink/8 bg-white p-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-5 w-7 shrink-0 text-ink/65">
                        <VehicleGlyph
                          type={a.vehicle_type}
                          color="currentColor"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-heading text-base font-semibold tabular-nums text-ink">
                            {a.distance > 0 ? `${a.distance} km` : "—"}
                          </div>
                          <span
                            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.text}`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${meta.dot}`}
                            />
                            {meta.label}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-ink/50">
                          <div>
                            {VEHICLE_LABEL[a.vehicle_type]} ·{" "}
                            {a.source === "remote" ? "Uzaktan" : "Stantta"} ·{" "}
                            {timeAgo(a.created_at)}
                          </div>
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => handleCancel(a.id)}
                              disabled={isCancelling}
                              className="rounded-full border border-red-200 px-2.5 py-0.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-40"
                            >
                              {isCancelling ? "İptal ediliyor…" : "İptal et"}
                            </button>
                          )}
                        </div>
                        {a.date_range && (
                          <div className="mt-1 text-[11px] text-ink/40">
                            {a.date_range}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {error && (
            <p className="animate-slide-up mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
