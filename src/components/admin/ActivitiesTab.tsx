"use client";

import { useCallback, useEffect, useState } from "react";
import { VehicleGlyph } from "@/components/illustrations";
import {
  adminUpdateActivity,
  adminDeleteActivity,
} from "@/lib/actions/activities";
import type { VehicleType, ActivityStatus } from "@/lib/types";

type Row = {
  id: string;
  user_id: string;
  distance: number;
  vehicle_type: VehicleType;
  source: "on_site" | "remote";
  evidence_url: string | null;
  date_range: string | null;
  status: ActivityStatus;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
};

const VEHICLE_LABEL: Record<VehicleType, string> = {
  bicycle: "Bisiklet",
  skates: "Paten",
  skateboard: "Kaykay",
  running: "Koşu",
};

const STATUS_META: Record<ActivityStatus, { label: string; cls: string }> = {
  pending: { label: "Beklemede", cls: "bg-sun/15 text-amber-800" },
  approved: { label: "Onaylandı", cls: "bg-grass/30 text-grass-deep" },
  rejected: { label: "Reddedildi", cls: "bg-red-100 text-red-700" },
};

type Filter = {
  status: "all" | ActivityStatus;
  vehicle: "all" | VehicleType;
  source: "all" | "on_site" | "remote";
  search: string;
};

type Sort = "date_desc" | "date_asc" | "dist_desc" | "dist_asc";

export function ActivitiesTab({
  onGotoApprovals,
}: {
  onGotoApprovals?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>({
    status: "all",
    vehicle: "all",
    source: "all",
    search: "",
  });
  const [sort, setSort] = useState<Sort>("date_desc");
  const [editTarget, setEditTarget] = useState<Row | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/admin/activities", { cache: "no-store" });
    if (!res.ok) {
      setLoading(false);
      return;
    }
    setRows((await res.json()) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function handleDelete(id: string) {
    setBusyId(id);
    setError(null);
    const result = await adminDeleteActivity(id);
    if (result.error) {
      setError(result.error);
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      setDeleteConfirmId(null);
    }
    setBusyId(null);
  }

  const displayed = rows
    .filter((r) => {
      if (filter.status !== "all" && r.status !== filter.status) return false;
      if (filter.vehicle !== "all" && r.vehicle_type !== filter.vehicle)
        return false;
      if (filter.source !== "all" && r.source !== filter.source) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        const name = r.profiles?.full_name.toLowerCase() ?? "";
        const email = r.profiles?.email.toLowerCase() ?? "";
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === "date_desc")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sort === "date_asc")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      if (sort === "dist_desc") return b.distance - a.distance;
      return a.distance - b.distance;
    });

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-ink/50">Yükleniyor...</div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <input
          type="text"
          placeholder="İsim veya e-posta ara…"
          value={filter.search}
          onChange={(e) =>
            setFilter((f) => ({ ...f, search: e.target.value }))
          }
          className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sky/50 focus:ring-2 focus:ring-sky/20"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-ink/10 bg-white text-xs">
            {(
              [
                "all",
                "pending",
                "approved",
                "rejected",
              ] as (Filter["status"])[]
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilter((f) => ({ ...f, status: s }))}
                className={`px-2.5 py-1.5 font-medium transition ${filter.status === s ? "bg-ink text-white" : "text-ink/50 hover:text-ink"}`}
              >
                {s === "all"
                  ? "Tümü"
                  : STATUS_META[s as ActivityStatus].label}
              </button>
            ))}
          </div>

          <div className="flex overflow-hidden rounded-lg border border-ink/10 bg-white text-xs">
            {(
              [
                "all",
                "bicycle",
                "skates",
                "skateboard",
                "running",
              ] as (Filter["vehicle"])[]
            ).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setFilter((f) => ({ ...f, vehicle: v }))}
                className={`px-2.5 py-1.5 font-medium transition ${filter.vehicle === v ? "bg-ink text-white" : "text-ink/50 hover:text-ink"}`}
              >
                {v === "all" ? "Tümü" : VEHICLE_LABEL[v as VehicleType]}
              </button>
            ))}
          </div>

          <div className="flex overflow-hidden rounded-lg border border-ink/10 bg-white text-xs">
            {(["all", "on_site", "remote"] as Filter["source"][]).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setFilter((f) => ({ ...f, source: src }))}
                className={`px-2.5 py-1.5 font-medium transition ${filter.source === src ? "bg-ink text-white" : "text-ink/50 hover:text-ink"}`}
              >
                {src === "all"
                  ? "Kaynak"
                  : src === "on_site"
                    ? "Stant"
                    : "Uzaktan"}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-ink/10 bg-white px-2.5 py-1.5 text-xs font-medium text-ink/60 outline-none"
          >
            <option value="date_desc">Yeni → Eski</option>
            <option value="date_asc">Eski → Yeni</option>
            <option value="dist_desc">KM: Çok → Az</option>
            <option value="dist_asc">KM: Az → Çok</option>
          </select>

          <span className="text-xs text-ink/40">{displayed.length} kayıt</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
        {displayed.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink/40">
            Kayıt bulunamadı.
          </div>
        ) : (
          displayed.map((r, i) => (
            <div
              key={r.id}
              className={`grid grid-cols-[1fr_auto] items-start gap-3 px-4 py-3.5 sm:items-center sm:px-5 ${i > 0 ? "border-t border-ink/8" : ""}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {r.profiles?.full_name ?? "—"}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_META[r.status].cls}`}
                  >
                    {STATUS_META[r.status].label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink/45">
                  <span className="truncate">{r.profiles?.email}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="inline-block h-3 w-4">
                      <VehicleGlyph type={r.vehicle_type} color="currentColor" />
                    </span>
                    {VEHICLE_LABEL[r.vehicle_type]}
                  </span>
                  <span className="shrink-0">
                    {r.source === "on_site" ? "Stant" : "Uzaktan"}
                  </span>
                  <span className="shrink-0 font-heading font-semibold tabular-nums text-ink/60">
                    {r.distance.toFixed(1)} km
                  </span>
                  {r.date_range && (
                    <span className="shrink-0">{r.date_range}</span>
                  )}
                  <span className="shrink-0 tabular-nums">
                    {new Date(r.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {deleteConfirmId === r.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded-full border border-ink/20 px-2.5 py-1 text-xs font-medium text-ink/50 hover:bg-ink/5"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => handleDelete(r.id)}
                      className="rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {busyId === r.id ? "…" : "Sil"}
                    </button>
                  </>
                ) : (
                  <>
                    {r.status === "pending" && onGotoApprovals && (
                      <button
                        type="button"
                        onClick={onGotoApprovals}
                        className="rounded-full border border-sun/40 px-2.5 py-1 text-xs font-medium text-amber-700 transition hover:bg-sun/10"
                        title="Onay sayfasına git"
                      >
                        İncele →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditTarget(r)}
                      className="rounded-full border border-ink/15 p-1.5 text-ink/40 transition hover:border-sky/40 hover:text-sky-deep"
                      title="Düzenle"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(r.id)}
                      className="rounded-full border border-ink/15 p-1.5 text-ink/40 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      title="Sil"
                    >
                      <TrashIcon />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editTarget && (
        <EditActivityModal
          row={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => {
            setEditTarget(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function EditActivityModal({
  row,
  onClose,
  onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [distance, setDistance] = useState(String(row.distance));
  const [vehicleType, setVehicleType] = useState<VehicleType>(row.vehicle_type);
  const [status, setStatus] = useState<ActivityStatus>(row.status);
  const [dateRange, setDateRange] = useState(row.date_range ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const dist = Number(distance);
    if (isNaN(dist) || dist < 0) {
      setError("Geçerli bir mesafe gir.");
      return;
    }
    setSaving(true);
    setError(null);
    const result = await adminUpdateActivity(row.id, {
      distance: dist,
      vehicle_type: vehicleType,
      status,
      date_range: dateRange || null,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      onSaved();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-heading text-xl font-semibold">
          Aktivite Düzenle
        </h2>
        <p className="mb-4 text-sm text-ink/50">
          {row.profiles?.full_name ?? "—"} ·{" "}
          {new Date(row.created_at).toLocaleDateString("tr-TR")}
        </p>

        <div className="space-y-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
              Mesafe (km)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
              Araç tipi
            </span>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value as VehicleType)}
              className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
            >
              <option value="bicycle">Bisiklet</option>
              <option value="skates">Paten</option>
              <option value="skateboard">Kaykay</option>
              <option value="running">Koşu</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
              Durum
            </span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ActivityStatus)}
              className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
            >
              <option value="pending">Beklemede</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
            </select>
          </label>

          {row.source === "remote" && (
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                Tarih aralığı
              </span>
              <input
                type="text"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
                placeholder="örn. 15 Ocak – 17 Ocak"
              />
            </label>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink/60 transition hover:bg-ink/3 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex flex-1 items-center justify-center rounded-full bg-sky-deep py-2 text-sm font-semibold text-white transition hover:bg-sky-deep/85 disabled:bg-ink/20"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M11 2l3 3-8 8H3v-3L11 2z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="3,4 13,4" />
      <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M6 7v5M10 7v5" />
      <rect x="3" y="4" width="10" height="10" rx="1" />
    </svg>
  );
}
