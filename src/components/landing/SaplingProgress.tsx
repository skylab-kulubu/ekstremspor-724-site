"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import type { LiveStats } from "@/lib/queries/stats";

const TR = (n: number) => n.toLocaleString("tr-TR");

const STAGES = [
  { key: "tohum", label: "Tohum", threshold: 0 },
  { key: "filiz", label: "Filiz", threshold: 25 },
  { key: "fidan", label: "Fidan", threshold: 50 },
  { key: "dal", label: "Dal", threshold: 75 },
  { key: "agac", label: "Ağaç", threshold: 100 },
];

const MILESTONES = [25, 50, 75];

export function SaplingProgress() {
  const [totalKm, setTotalKm] = useState(0);
  const [targetKm, setTargetKm] = useState(5000);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/stats", { cache: "no-store" });
    if (!res.ok) return;
    const s = (await res.json()) as LiveStats;
    setTotalKm(s.totalKm);
    setTargetKm(s.targetKm);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);
  useRealtime("activities_changes", refetch);

  const pct = Math.min(100, (totalKm / Math.max(targetKm, 1)) * 100);
  const reached = pct >= 100;
  const remaining = Math.max(0, Math.round(targetKm - totalKm));
  const currentStage = STAGES.reduce(
    (acc, s, i) => (pct >= s.threshold ? i : acc),
    0,
  );

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 sm:pt-14">
      <div
        className={`rounded-[22px] border bg-white p-5 shadow-[0_12px_32px_-16px_rgba(26,26,26,0.15)] transition-all sm:p-7 ${
          reached
            ? "border-grass-deep/30 ring-1 ring-grass-deep/15"
            : "border-ink/10"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-grass/30 text-grass-deep sm:h-12 sm:w-12">
              <LeafIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-ink/60">
                {reached ? "Hedef tamamlandı" : "Orman Hedefi"}
              </div>
              <h3 className="mt-1 font-heading text-lg font-semibold tracking-[-0.02em] sm:text-2xl">
                {reached ? "Ormanımız hazır" : "Birlikte bir orman kuruyoruz"}
              </h3>
              <p className="mt-1 text-[13px] leading-snug text-ink/60">
                {TR(Math.round(totalKm))} / {TR(targetKm)} km
                {" — "}
                {reached
                  ? "fidanlar dikildi, ormanımıza birlikte bir isim verelim"
                  : `birlikte ${TR(remaining)} km daha`}
              </p>
            </div>
          </div>
          <div className="shrink-0 rounded-full bg-grass-deep px-2.5 py-1 font-heading text-sm font-semibold tabular-nums text-white sm:px-3 sm:py-1.5">
            %{Math.round(pct)}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-2.5 sm:gap-3">
          <SeedIcon className="h-6 w-6 shrink-0 text-grass-deep/70 sm:h-7 sm:w-7" />
          <div className="relative h-3 flex-1 rounded-full bg-ink/[0.07]">
            <div
              className="h-full rounded-full bg-linear-to-r from-grass to-grass-deep transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
            {MILESTONES.map((m) => (
              <span
                key={m}
                className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                style={{
                  left: `${m}%`,
                  background:
                    pct >= m
                      ? "#ffffff"
                      : "color-mix(in oklab, var(--color-ink) 18%, transparent)",
                  boxShadow:
                    pct >= m ? "0 0 0 1px rgba(21,128,61,0.35)" : "none",
                }}
              />
            ))}
          </div>
          <TreeIcon
            className={`h-7 w-7 shrink-0 transition-colors duration-500 sm:h-8 sm:w-8 ${
              reached ? "text-grass-deep" : "text-ink/25"
            }`}
          />
        </div>

        <div className="mt-2.5 grid grid-cols-5">
          {STAGES.map((s, idx) => (
            <div
              key={s.key}
              className={`text-[9px] font-semibold uppercase tracking-[0.06em] sm:text-[11px] sm:tracking-[0.08em] ${
                idx === 0
                  ? "text-left"
                  : idx === STAGES.length - 1
                    ? "text-right"
                    : "text-center"
              } ${
                idx === currentStage
                  ? "text-grass-deep"
                  : idx < currentStage
                    ? "text-ink/55"
                    : "text-ink/30"
              }`}
            >
              {s.label}
            </div>
          ))}
        </div>

        {reached && (
          <div className="mt-5 flex flex-col gap-2.5 rounded-2xl border border-grass-deep/20 bg-grass/15 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-grass-deep text-white">
                <TreeIcon className="h-5 w-5" />
              </div>
              <div>
                <div className="font-heading text-[15px] font-semibold text-ink">
                  Ormanımıza bir isim verelim
                </div>
                <p className="mt-0.5 text-[12px] leading-relaxed text-ink/65">
                  {TR(targetKm)} km tamamlandı, fidanlar dikildi. Stand ekibinin
                  yönlendireceği oylama ile ormanın adını birlikte
                  belirleyeceğiz.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 20c0-9 6-15 15-15 0 9-6 15-15 15Z" />
      <path d="M5 20c4-7 8-10 12-12" />
    </svg>
  );
}

function SeedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 21v-7" />
      <path d="M12 14c0-3 2-5 5-5 0 3-2 5-5 5Z" />
      <path d="M12 14c0-3-2-5-5-5 0 3 2 5 5 5Z" />
    </svg>
  );
}

function TreeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 22v-5" />
      <path d="M12 3 6 12h12L12 3Z" />
      <path d="M12 9.5 7.5 17h9L12 9.5Z" />
    </svg>
  );
}
