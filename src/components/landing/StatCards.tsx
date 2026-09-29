"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import type { LiveStats } from "@/lib/queries/stats";

const TR = (n: number) => n.toLocaleString("tr-TR");

export function StatCards() {
  const [stats, setStats] = useState<LiveStats | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/stats", { cache: "no-store" });
    if (!res.ok) return;
    setStats(await res.json());
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);
  useRealtime(["activities_changes", "equipments_changes"], refetch);

  const cards = [
    {
      v: stats ? TR(Math.round(stats.totalKm)) : "—",
      suffix: "km",
      label: "Toplam mesafe",
      sub: "tüm sporcular",
    },
    {
      v: stats ? TR(stats.participants) : "—",
      label: "Aktif katılımcı",
      sub: "onaylı aktivitesi olan",
    },
    {
      v: stats ? TR(stats.freeEquipment) : "—",
      label: "Boştaki ekipman",
      sub: "şu an müsait",
      live: true,
    },
    {
      v: stats ? TR(Math.round(stats.todayKm)) : "—",
      suffix: "km",
      label: "Bugünün toplamı",
      sub: "son 24 saat",
    },
  ];

  return (
    <section className="relative mx-auto -mt-14 w-full max-w-5xl px-4 sm:-mt-20 sm:px-6">
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-[18px] border border-white/80 bg-white px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_18px_40px_-16px_rgba(26,26,26,0.2),0_2px_8px_-2px_rgba(26,26,26,0.08)] transition hover:-translate-y-0.5 hover:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_26px_50px_-18px_rgba(26,26,26,0.25)] sm:rounded-[22px] sm:px-5 sm:py-5"
          >
            <div className="flex items-baseline gap-1.5">
              <div className="font-heading text-[32px] font-semibold leading-none tabular-nums tracking-[-0.03em] sm:text-[42px]">
                {c.v}
              </div>
              {c.suffix && (
                <div className="text-sm font-medium text-ink/55">
                  {c.suffix}
                </div>
              )}
            </div>
            <div className="mt-3 text-[12px] font-semibold sm:mt-3.5 sm:text-[13px]">
              {c.label}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink/55">
              {c.live && (
                <span className="h-1.5 w-1.5 rounded-full bg-grass-deep shadow-[0_0_0_3px_rgba(62,167,107,0.18)] animate-live-pulse" />
              )}
              {c.sub}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
