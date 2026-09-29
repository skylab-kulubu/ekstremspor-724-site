"use client";

import { useCallback, useEffect, useState } from "react";
import { VehicleGlyph } from "@/components/illustrations";
import { useRealtime } from "@/lib/realtime/useRealtime";
import type { EquipmentVehicleType } from "@/lib/types";

type Counts = Record<EquipmentVehicleType, { free: number; total: number }>;

const LABELS: Record<EquipmentVehicleType, string> = {
  bicycle: "bisiklet",
  skates: "paten",
  skateboard: "kaykay",
};

const EMPTY: Counts = {
  bicycle: { free: 0, total: 0 },
  skates: { free: 0, total: 0 },
  skateboard: { free: 0, total: 0 },
};

type EquipRow = { type: EquipmentVehicleType; status: string };

export function EquipmentBand() {
  const [counts, setCounts] = useState<Counts>(EMPTY);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/equipments", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as EquipRow[];
    const next: Counts = {
      bicycle: { free: 0, total: 0 },
      skates: { free: 0, total: 0 },
      skateboard: { free: 0, total: 0 },
    };
    for (const row of data) {
      const t = row.type;
      next[t].total += 1;
      if (row.status === "available") next[t].free += 1;
    }
    setCounts(next);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);
  useRealtime("equipments_changes", refetch);

  const totalFree =
    counts.bicycle.free + counts.skates.free + counts.skateboard.free;

  return (
    <div
      id="equipment"
      className="flex max-w-full flex-wrap items-center justify-center gap-x-1 gap-y-1 rounded-3xl border border-white/70 bg-white/85 px-2.5 py-2 shadow-[0_12px_36px_-10px_rgba(26,26,26,0.2)] backdrop-blur-md backdrop-saturate-150 sm:gap-1 sm:rounded-full sm:py-2 sm:pl-4 sm:pr-2"
    >
      <span className="inline-flex items-center gap-2 px-1.5 text-xs font-medium text-ink/75 sm:mr-2 sm:pr-2">
        <span
          className={`h-1.5 w-1.5 rounded-full animate-live-pulse ${
            totalFree > 0 ? "bg-grass-deep" : "bg-sun"
          }`}
        />
        Şu an stantta
      </span>
      {(["bicycle", "skates", "skateboard"] as EquipmentVehicleType[]).map(
        (t, i) => (
          <span key={t} className="flex items-center">
            {i > 0 && (
              <span className="mx-0.5 hidden h-4 w-px bg-ink/10 sm:block" />
            )}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 sm:px-3 ${
                counts[t].free === 0 ? "bg-sun/10" : ""
              }`}
            >
              <span className="block h-4 w-6 text-ink">
                <VehicleGlyph
                  type={t}
                  color="currentColor"
                  accent="var(--color-sun)"
                />
              </span>
              <span
                className={`font-heading text-lg font-semibold tabular-nums tracking-tight ${
                  counts[t].free === 0 ? "text-[#a3471f]" : "text-ink"
                }`}
              >
                {counts[t].free}
              </span>
              <span className="text-xs text-ink/60">{LABELS[t]}</span>
            </span>
          </span>
        ),
      )}
    </div>
  );
}
