"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { VehicleGlyph } from "@/components/illustrations";
import {
  decideActivity,
  returnEquipment,
  assignEquipment,
} from "@/lib/actions/activities";
import type { VehicleType, EquipmentVehicleType } from "@/lib/types";

type ActivityRow = {
  id: string;
  user_id: string;
  distance: number;
  vehicle_type: VehicleType;
  source: string;
  evidence_url: string | null;
  date_range: string | null;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
};

type EquipRow = {
  id: string;
  type: VehicleType;
  status: string;
  code: string | null;
  assigned_to: string | null;
};

const VEHICLE_LABEL: Record<string, string> = {
  bicycle: "Bisiklet",
  skates: "Paten",
  skateboard: "Kaykay",
  running: "Koşu",
};

const INITIAL_SHOW = 4;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

type ReturnTarget = {
  activityId: string;
  userId: string;
  vehicleType: VehicleType;
  userName: string;
};

type AssignTarget = {
  userId: string;
  vehicleType: VehicleType;
  userName: string;
};

export function PendingActivities() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [equipments, setEquipments] = useState<EquipRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [returnTarget, setReturnTarget] = useState<ReturnTarget | null>(null);
  const [returnKm, setReturnKm] = useState("");
  const [returning, setReturning] = useState(false);

  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [showAllWaiting, setShowAllWaiting] = useState(false);
  const [showAllRemote, setShowAllRemote] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function availableEquipmentFor(type: EquipmentVehicleType): EquipRow | null {
    return (
      equipments.find((e) => e.type === type && e.status === "available") ??
      null
    );
  }

  const refetch = useCallback(async () => {
    const [actsRes, equipsRes] = await Promise.all([
      fetch("/api/admin/activities/pending", { cache: "no-store" }),
      fetch("/api/equipments", { cache: "no-store" }),
    ]);

    if (!actsRes.ok) {
      setLoading(false);
      return;
    }
    const list = (await actsRes.json()) as ActivityRow[];
    setRows(list);

    if (equipsRes.ok) {
      const equipData = (await equipsRes.json()) as EquipRow[];
      setEquipments(equipData);
    }
    setLoading(false);

    // Evidence images stream through /api/files with built-in auth.
    setThumbs(
      Object.fromEntries(
        list
          .filter((r) => r.evidence_url)
          .map((r) => [r.id, `/api/files/${r.evidence_url}`] as const),
      ),
    );
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);
  useRealtime(
    ["activities_changes", "equipments_changes", "profiles_changes"],
    refetch,
  );

  async function updateStatus(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    const result = await decideActivity(id, status);
    if (result.error) setError(result.error);
    setBusyId(null);
    refetch();
  }

  async function handleReturn() {
    if (!returnTarget) return;
    const km = Number(returnKm);
    if (!km || km <= 0) return;
    setReturning(true);

    const equip = equipments.find(
      (e) =>
        e.assigned_to === returnTarget.userId &&
        e.type === returnTarget.vehicleType &&
        e.status === "in_use",
    );
    if (equip) {
      const result = await returnEquipment({
        equipmentId: equip.id,
        km,
        damaged: false,
      });
      if (result.error) setError(result.error);
    }

    setReturning(false);
    setReturnTarget(null);
    setReturnKm("");
    refetch();
  }

  async function handleAssignEquipment(equipmentId: string) {
    if (!assignTarget) return;
    setAssigning(true);
    const result = await assignEquipment({
      equipmentId,
      userId: assignTarget.userId,
    });
    setAssigning(false);
    if (result.error) {
      setError(result.error);
    }
    setAssignTarget(null);
    refetch();
  }

  const onSiteRows = rows.filter((r) => r.source === "on_site");
  const remoteRows = rows.filter((r) => r.source === "remote");

  const ridingRows = onSiteRows.filter((r) =>
    equipments.some(
      (e) =>
        e.assigned_to === r.user_id &&
        e.type === r.vehicle_type &&
        e.status === "in_use",
    ),
  );
  const waitingRows = onSiteRows.filter(
    (r) =>
      !equipments.some(
        (e) =>
          e.assigned_to === r.user_id &&
          e.type === r.vehicle_type &&
          e.status === "in_use",
      ),
  );

  const visibleWaiting = showAllWaiting
    ? waitingRows
    : waitingRows.slice(0, INITIAL_SHOW);
  const visibleRemote = showAllRemote
    ? remoteRows
    : remoteRows.slice(0, INITIAL_SHOW);

  const availableForAssign = assignTarget
    ? equipments.filter(
        (e) => e.type === assignTarget.vehicleType && e.status === "available",
      )
    : [];

  return (
    <section className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="font-heading text-base font-semibold tracking-tight text-ink">
            Stanttaki Katılımcılar
          </h3>
          <p className="mt-0.5 text-sm text-ink/50">
            Stanttayım butonuna basan, ekipman kullanan veya bekleyen
            katılımcılar.
          </p>
        </div>

        {loading ? (
          <Placeholder text="Yükleniyor..." />
        ) : onSiteRows.length === 0 ? (
          <Placeholder text="Aktif stant girişi yok." />
        ) : (
          <div className="space-y-2">
            {ridingRows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3.5 shadow-sm sm:px-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sun/10">
                  <div className="h-5 w-7 text-amber-700">
                    <VehicleGlyph
                      type={r.vehicle_type}
                      color="currentColor"
                      accent="#f59e0b"
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.profiles?.full_name ?? "—"}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink/50">
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sun/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 whitespace-nowrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-sun" />
                      Sürüyor
                    </span>
                    <span className="whitespace-nowrap">
                      {VEHICLE_LABEL[r.vehicle_type]}
                    </span>
                    <span>·</span>
                    <span className="whitespace-nowrap">
                      {timeAgo(r.created_at)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setReturnTarget({
                      activityId: r.id,
                      userId: r.user_id,
                      vehicleType: r.vehicle_type,
                      userName: r.profiles?.full_name ?? "—",
                    })
                  }
                  className="shrink-0 rounded-full bg-sky-deep px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-sky-deep/85"
                >
                  İade Al
                </button>
              </div>
            ))}

            {visibleWaiting.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3.5 shadow-sm sm:px-5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink/8">
                  <div className="h-5 w-7 text-ink/40">
                    <VehicleGlyph
                      type={r.vehicle_type}
                      color="currentColor"
                      accent="#f59e0b"
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.profiles?.full_name ?? "—"}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-ink/50">
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink/8 px-1.5 py-0.5 text-[10px] font-medium text-ink/60 whitespace-nowrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink/40" />
                      Ekipman bekliyor
                    </span>
                    <span className="whitespace-nowrap">
                      {VEHICLE_LABEL[r.vehicle_type]}
                    </span>
                    <span>·</span>
                    <span className="whitespace-nowrap">
                      {timeAgo(r.created_at)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAssignTarget({
                        userId: r.user_id,
                        vehicleType: r.vehicle_type,
                        userName: r.profiles?.full_name ?? "—",
                      })
                    }
                    className="rounded-full border border-sky/50 px-3 py-1.5 text-xs font-semibold text-sky-deep transition hover:bg-sky/10"
                  >
                    Ekipman Ata
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => updateStatus(r.id, "rejected")}
                    className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-medium text-ink/60 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    {busyId === r.id ? "…" : "Reddet"}
                  </button>
                </div>
              </div>
            ))}

            {!showAllWaiting && waitingRows.length > INITIAL_SHOW && (
              <button
                type="button"
                onClick={() => setShowAllWaiting(true)}
                className="w-full rounded-2xl border border-ink/10 bg-white py-3 text-sm font-medium text-ink/50 transition hover:bg-ink/3 hover:text-ink"
              >
                {waitingRows.length - INITIAL_SHOW} bekleyen daha →
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-heading text-base font-semibold tracking-tight text-ink">
            Uzaktan Başvurular
          </h3>
          <p className="mt-0.5 text-sm text-ink/50">
            Ekran görüntüsünü kontrol et — onaylanan kilometre liderlik
            tablosuna yansır.
          </p>
        </div>

        {loading ? (
          <Placeholder text="Yükleniyor..." />
        ) : remoteRows.length === 0 ? (
          <Placeholder text="Bekleyen uzaktan başvuru yok." />
        ) : (
          <div className="space-y-2">
            {visibleRemote.map((r) => {
              const thumb = thumbs[r.id];
              const isExpanded = expandedId === r.id;
              return (
                <div
                  key={r.id}
                  className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky/10">
                      <div className="h-5 w-7 text-sky-deep">
                        <VehicleGlyph
                          type={r.vehicle_type}
                          color="currentColor"
                          accent="#f59e0b"
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink">
                          {r.profiles?.full_name ?? "—"}
                        </span>
                        <span className="shrink-0 rounded-full bg-sky-deep/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-deep">
                          Uzaktan
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs text-ink/50">
                        <span className="font-heading font-semibold tabular-nums text-ink/70">
                          {r.distance.toFixed(1)} km
                        </span>
                        <span>·</span>
                        <span className="whitespace-nowrap">
                          {VEHICLE_LABEL[r.vehicle_type]}
                        </span>
                        <span>·</span>
                        <span className="whitespace-nowrap">
                          {timeAgo(r.created_at)}
                        </span>
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`h-4 w-4 shrink-0 text-ink/35 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-ink/8 px-4 pb-4 pt-3 sm:px-5">
                      {thumb ? (
                        <button
                          type="button"
                          onClick={() => setEvidenceUrl(thumb)}
                          className="group relative mb-3 block w-full overflow-hidden rounded-xl border border-ink/10"
                        >
                          <img
                            src={thumb}
                            alt="Aktivite kanıtı"
                            className="max-h-52 w-full object-cover"
                          />
                          <div className="absolute inset-0 grid place-items-center bg-black/0 transition group-hover:bg-black/30">
                            <span className="rounded-full bg-white/0 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition group-hover:bg-white/15 group-hover:opacity-100">
                              Büyüt
                            </span>
                          </div>
                        </button>
                      ) : (
                        <div className="mb-3 rounded-xl bg-ink/5 px-4 py-4 text-center text-xs text-ink/50">
                          {r.evidence_url
                            ? "Görsel yükleniyor..."
                            : "Kanıt yok"}
                        </div>
                      )}
                      {r.date_range && (
                        <p className="mb-3 text-xs text-ink/50">
                          {r.date_range}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(r.id, "approved")}
                          disabled={busyId === r.id}
                          className="flex-1 rounded-lg bg-grass-deep px-4 py-2 text-sm font-semibold text-paper transition hover:bg-grass-deep/85 disabled:bg-ink/20"
                        >
                          {busyId === r.id ? "…" : "✓ Onayla"}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(r.id, "rejected")}
                          disabled={busyId === r.id}
                          className="flex-1 rounded-lg border border-ink/20 px-4 py-2 text-sm font-medium text-ink/60 transition hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {!showAllRemote && remoteRows.length > INITIAL_SHOW && (
              <button
                type="button"
                onClick={() => setShowAllRemote(true)}
                className="w-full rounded-2xl border border-ink/10 bg-white py-3 text-sm font-medium text-ink/50 transition hover:bg-ink/3 hover:text-ink"
              >
                {remoteRows.length - INITIAL_SHOW} başvuru daha →
              </button>
            )}
          </div>
        )}
      </div>

      {returnTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            if (!returning) {
              setReturnTarget(null);
              setReturnKm("");
            }
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 font-heading text-xl font-semibold">
              Ekipman İadesi
            </h2>
            <p className="mb-4 text-sm text-ink/50">
              <span className="font-medium text-ink">
                {returnTarget.userName}
              </span>{" "}
              · {VEHICLE_LABEL[returnTarget.vehicleType]}
            </p>
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                Kaç km yaptı?
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={returnKm}
                onChange={(e) => setReturnKm(e.target.value)}
                className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky"
                placeholder="örn. 24.5"
                autoFocus
              />
            </label>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setReturnTarget(null);
                  setReturnKm("");
                }}
                disabled={returning}
                className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink/60 transition hover:bg-ink/3 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleReturn}
                disabled={returning || !returnKm || Number(returnKm) <= 0}
                className="flex flex-1 items-center justify-center rounded-full bg-sky-deep py-2 text-sm font-semibold text-white transition hover:bg-sky-deep/85 disabled:bg-ink/20"
              >
                {returning ? "Kaydediliyor…" : "Onayla ve İade Et"}
              </button>
            </div>
          </div>
        </div>
      )}

      {assignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !assigning && setAssignTarget(null)}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-sm flex-col rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 px-6 pb-3 pt-6">
              <h2 className="font-heading text-xl font-semibold">
                Ekipman Ata
              </h2>
              <p className="mt-1 text-sm text-ink/50">
                <span className="font-medium text-ink">
                  {assignTarget.userName}
                </span>{" "}
                için{" "}
                <span className="font-medium text-ink">
                  {VEHICLE_LABEL[assignTarget.vehicleType]}
                </span>{" "}
                seç
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-2">
              {availableForAssign.length === 0 ? (
                <div className="rounded-xl border border-ink/10 bg-ink/3 px-4 py-6 text-center text-sm text-ink/50">
                  Boşta {VEHICLE_LABEL[assignTarget.vehicleType]} yok.
                </div>
              ) : (
                <div className="space-y-2">
                  {availableForAssign.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      disabled={assigning}
                      onClick={() => handleAssignEquipment(e.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-left transition hover:border-sky/40 hover:bg-sky/5 disabled:opacity-50"
                    >
                      <div className="h-5 w-7 shrink-0 text-ink/70">
                        <VehicleGlyph
                          type={e.type}
                          color="currentColor"
                          accent="#f59e0b"
                        />
                      </div>
                      <span className="font-mono text-sm text-ink/50">
                        {e.code ?? e.id.slice(0, 8)}
                      </span>
                      <span className="ml-auto rounded-full bg-grass/30 px-2 py-0.5 text-xs font-medium text-grass-deep">
                        Boşta
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="shrink-0 px-6 pb-6 pt-3">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                disabled={assigning}
                className="w-full rounded-full border border-ink/20 py-2 text-sm font-medium text-ink/60 transition hover:bg-ink/3 disabled:opacity-50"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
      {evidenceUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setEvidenceUrl(null)}
        >
          <img
            src={evidenceUrl}
            alt="Aktivite kanıtı"
            className="max-h-full max-w-full rounded-xl shadow-2xl"
          />
        </div>
      )}
    </section>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white px-6 py-10 text-center text-sm text-ink/50">
      {text}
    </div>
  );
}
