"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { VehicleGlyph } from "@/components/illustrations";
import {
  addEquipment,
  deleteEquipment,
  updateEquipmentCode,
  setEquipmentStatus,
} from "@/lib/actions/equipment";
import { returnEquipment } from "@/lib/actions/activities";
import { EquipmentAssignModal } from "@/components/modals/EquipmentAssignModal";
import type { Equipment, EquipmentVehicleType } from "@/lib/types";

type Row = Equipment & { profiles: { full_name: string } | null };

const LABEL: Record<EquipmentVehicleType, string> = {
  bicycle: "Bisiklet",
  skates: "Paten",
  skateboard: "Kaykay",
};

const ORDER: EquipmentVehicleType[] = ["bicycle", "skates", "skateboard"];

const STATUS_META = {
  available: { label: "Boşta", cls: "bg-grass/30 text-grass-deep" },
  in_use: { label: "Kullanımda", cls: "bg-sun/15 text-amber-800" },
  damaged: { label: "Hasarlı", cls: "bg-red-100 text-red-700" },
};

export function EquipmentTable() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [returnTarget, setReturnTarget] = useState<Row | null>(null);
  const [returnKm, setReturnKm] = useState("");
  const [returnDamaged, setReturnDamaged] = useState(false);
  const [returning, setReturning] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<EquipmentVehicleType>("bicycle");
  const [addCode, setAddCode] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/equipments", { cache: "no-store" });
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
  useRealtime("equipments_changes", refetch);

  async function handleReturn() {
    if (!returnTarget) return;
    const km = Number(returnKm);
    if (!km || km <= 0) return;
    setReturning(true);

    const result = await returnEquipment({
      equipmentId: returnTarget.id,
      km,
      damaged: returnDamaged,
    });
    setReturning(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setReturnTarget(null);
    setReturnKm("");
    setReturnDamaged(false);
    refetch();
  }

  async function handleAdd() {
    setAddLoading(true);
    setError(null);
    const result = await addEquipment(addType, addCode.trim() || undefined);
    setAddLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAddOpen(false);
    setAddCode("");
    refetch();
  }

  async function saveCode(id: string) {
    setError(null);
    const result = await updateEquipmentCode(id, editVal);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditId(null);
    refetch();
  }

  async function toggleDamaged(id: string, current: "available" | "damaged") {
    setBusyId(id);
    setError(null);
    const result = await setEquipmentStatus(
      id,
      current === "available" ? "damaged" : "available",
    );
    setBusyId(null);
    if (result.error) setError(result.error);
    else refetch();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    setError(null);
    const result = await deleteEquipment(id);
    setDeletingId(null);
    if (result.error) setError(result.error);
    else refetch();
  }

  const grouped = rows.reduce<Record<EquipmentVehicleType, Row[]>>(
    (acc, r) => {
      acc[r.type].push(r);
      return acc;
    },
    { bicycle: [], skates: [], skateboard: [] },
  );

  return (
    <section className="space-y-5">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {ORDER.map((type) => {
          const items = grouped[type] ?? [];
          const avail = items.filter((r) => r.status === "available").length;
          const inUse = items.filter((r) => r.status === "in_use").length;
          const damaged = items.filter((r) => r.status === "damaged").length;
          const pct = items.length ? (avail / items.length) * 100 : 0;
          const low = items.length > 0 && pct < 25;
          return (
            <div
              key={type}
              className="relative overflow-hidden rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-3 -top-3 h-20 w-28 text-ink opacity-[0.05]"
              >
                <VehicleGlyph type={type} color="currentColor" />
              </div>
              <div className="flex items-start justify-between">
                <div className="h-7 w-11 text-ink">
                  <VehicleGlyph
                    type={type}
                    color="currentColor"
                    accent="#f59e0b"
                  />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                  {LABEL[type]}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1">
                <Breakdown value={avail} label="Boşta" tone="ok" />
                <Breakdown value={inUse} label="Dolu" tone="warn" />
                <Breakdown value={damaged} label="Hasarlı" tone="bad" />
                <Breakdown value={items.length} label="Toplam" tone="muted" />
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/8">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: low ? "#e87d4a" : "#15803d",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Ekipman Listesi
          </h2>
          <button
            type="button"
            onClick={() => {
              setAddOpen(true);
              setAddCode("");
              setAddType("bicycle");
              setError(null);
            }}
            className="flex items-center gap-1.5 rounded-full bg-sky-deep px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-deep/85"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="8" y1="3" x2="8" y2="13" />
              <line x1="3" y1="8" x2="13" y2="8" />
            </svg>
            Ekle
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-ink/10 bg-white px-6 py-12 text-center text-sm text-ink/50">
            Yükleniyor...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-ink/10 bg-white px-6 py-12 text-center text-sm text-ink/50">
            Henüz ekipman yok. "Ekle" butonuyla başlayın.
          </div>
        ) : (
          ORDER.map((type) => {
            const items = grouped[type] ?? [];
            if (items.length === 0) return null;
            const avail = items.filter((r) => r.status === "available").length;
            return (
              <div
                key={type}
                className="rounded-2xl border border-ink/10 bg-white"
              >
                <div className="flex items-center justify-between border-b border-ink/8 px-4 py-3 sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <div className="h-5 w-7 text-ink/70">
                      <VehicleGlyph
                        type={type}
                        color="currentColor"
                        accent="#f59e0b"
                      />
                    </div>
                    <div className="font-heading text-base font-semibold">
                      {LABEL[type]}
                    </div>
                  </div>
                  <div className="text-sm tabular-nums text-ink/50">
                    {avail} / {items.length} boşta
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {items.map((r, i) => {
                    const meta = STATUS_META[r.status];
                    const isEditing = editId === r.id;
                    const isBusy = busyId === r.id || deletingId === r.id;
                    return (
                      <div
                        key={r.id}
                        className={`flex min-w-[480px] items-center gap-3 px-4 py-3 sm:min-w-0 sm:px-6 ${i > 0 ? "border-t border-ink/8" : ""}`}
                      >
                        <div className="shrink-0">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                autoFocus
                                value={editVal}
                                onChange={(e) => setEditVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveCode(r.id);
                                  if (e.key === "Escape") setEditId(null);
                                }}
                                className="w-20 rounded-md border border-ink/20 px-1.5 py-0.5 font-mono text-xs outline-none focus:border-sky"
                              />
                              <button
                                type="button"
                                onClick={() => saveCode(r.id)}
                                className="text-grass-deep hover:text-grass-deep/70"
                              >
                                <svg
                                  viewBox="0 0 16 16"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <polyline points="2,8 6,12 14,4" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditId(null)}
                                className="text-ink/40 hover:text-ink/70"
                              >
                                <svg
                                  viewBox="0 0 16 16"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                >
                                  <line x1="3" y1="3" x2="13" y2="13" />
                                  <line x1="13" y1="3" x2="3" y2="13" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditId(r.id);
                                setEditVal(r.code ?? "");
                              }}
                              className="flex items-center gap-1 font-mono text-xs text-ink/60 hover:text-ink"
                              title="Kodu düzenle"
                            >
                              <span>
                                {r.code ?? (
                                  <span className="text-ink/40">
                                    {r.id.slice(0, 8)}
                                  </span>
                                )}
                              </span>
                              <svg
                                viewBox="0 0 16 16"
                                className="h-3 w-3 shrink-0 text-ink/25"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                              >
                                <path d="M11 2l3 3-8 8H3v-3L11 2z" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                        {r.status === "in_use" && r.profiles?.full_name ? (
                          <span className="min-w-0 flex-1 truncate text-sm text-ink/70">
                            {r.profiles.full_name}
                          </span>
                        ) : (
                          <span className="flex-1" />
                        )}
                        <div className="flex shrink-0 items-center gap-1.5">
                          {r.status === "available" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  setAssignTarget({
                                    id: r.id,
                                    label: LABEL[type],
                                  })
                                }
                                className="rounded-full bg-sky-deep px-3 py-1.5 text-xs font-medium text-white transition hover:bg-sky-deep/85"
                              >
                                Ata
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => toggleDamaged(r.id, "available")}
                                title="Hasarlı olarak işaretle"
                                className="rounded-full border border-sun/40 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition hover:bg-sun/10 disabled:opacity-40"
                              >
                                Hasar
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDelete(r.id)}
                                title="Sil"
                                className="rounded-full border border-ink/15 p-1.5 text-ink/40 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              >
                                <TrashIcon />
                              </button>
                            </>
                          )}

                          {r.status === "in_use" && (
                            <button
                              type="button"
                              onClick={() => {
                                setReturnTarget(r);
                                setReturnKm("");
                                setReturnDamaged(false);
                              }}
                              className="rounded-full border border-ink/20 px-3 py-1.5 text-xs font-medium transition hover:bg-ink/5"
                            >
                              İade Al
                            </button>
                          )}

                          {r.status === "damaged" && (
                            <>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => toggleDamaged(r.id, "damaged")}
                                className="rounded-full border border-grass-deep/30 px-2.5 py-1.5 text-xs font-medium text-grass-deep transition hover:bg-grass/15 disabled:opacity-40"
                              >
                                Düzelt
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDelete(r.id)}
                                title="Sil"
                                className="rounded-full border border-ink/15 p-1.5 text-ink/40 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                              >
                                <TrashIcon />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
      {addOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !addLoading && setAddOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-heading text-xl font-semibold">
              Ekipman Ekle
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                  Tür
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {ORDER.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAddType(t)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 text-xs font-medium transition ${addType === t ? "border-sky-deep bg-sky/10" : "border-ink/15 hover:border-sky/50"}`}
                    >
                      <div className="h-6 w-9">
                        <VehicleGlyph
                          type={t}
                          color="currentColor"
                          accent="#f59e0b"
                        />
                      </div>
                      {LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
                    Ekipman Kodu{" "}
                    <span className="font-normal normal-case text-ink/40">
                      (boş = otomatik)
                    </span>
                  </span>
                  <input
                    type="text"
                    value={addCode}
                    onChange={(e) => setAddCode(e.target.value)}
                    placeholder={
                      {
                        bicycle: "BSK-006",
                        skates: "PTN-005",
                        skateboard: "KYK-004",
                      }[addType]
                    }
                    className="mt-1.5 w-full rounded-xl border border-ink/15 px-3.5 py-2.5 font-mono text-sm outline-none transition focus:border-sky"
                  />
                </label>
              </div>
            </div>
            <div className="mt-5 flex gap-2.5">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                disabled={addLoading}
                className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink/60 transition hover:bg-ink/5 disabled:opacity-50"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={addLoading}
                className="flex flex-1 items-center justify-center rounded-full bg-sky-deep py-2 text-sm font-semibold text-white transition hover:bg-sky-deep/85 disabled:bg-ink/20"
              >
                {addLoading ? "Ekleniyor…" : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
      {assignTarget && (
        <EquipmentAssignModal
          open
          onClose={() => setAssignTarget(null)}
          equipmentId={assignTarget.id}
          equipmentLabel={assignTarget.label}
          onAssigned={refetch}
        />
      )}
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
              {returnTarget.profiles?.full_name && (
                <>
                  <span className="font-medium text-ink">
                    {returnTarget.profiles.full_name}
                  </span>{" "}
                  ·{" "}
                </>
              )}
              {LABEL[returnTarget.type]}
              {returnTarget.code && (
                <span className="ml-1.5 font-mono text-ink/40">
                  ({returnTarget.code})
                </span>
              )}
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
                className="w-full rounded-xl border border-ink/15 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-sky"
                placeholder="örn. 24.5"
                autoFocus
              />
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={returnDamaged}
                onChange={(e) => setReturnDamaged(e.target.checked)}
                className="h-4 w-4 rounded border-ink/20 accent-sky-deep"
              />
              <span className="text-sm text-ink/60">Ekipman hasarlı döndü</span>
            </label>
            <div className="mt-4 flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setReturnTarget(null);
                  setReturnKm("");
                  setReturnDamaged(false);
                }}
                disabled={returning}
                className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink/60 transition hover:bg-ink/5 disabled:opacity-50"
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
    </section>
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

function Breakdown({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "ok" | "warn" | "bad" | "muted";
}) {
  const color =
    tone === "ok"
      ? "text-grass-deep"
      : tone === "warn"
        ? "text-sun"
        : tone === "bad"
          ? "text-red-500"
          : "text-ink/40";
  return (
    <div>
      <div
        className={`font-heading text-xl font-semibold leading-none tabular-nums ${color}`}
      >
        {value}
      </div>
      <div className="mt-1 text-[11px] text-ink/40">{label}</div>
    </div>
  );
}
