"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { VehicleGlyph } from "@/components/illustrations";
import type {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardVehicleFilter,
  VehicleType,
} from "@/lib/types";

const VISIBLE_LIMIT = 10;

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "all", label: "Tüm Zamanlar" },
  { value: "today", label: "Bugün" },
  { value: "last_hour", label: "Son Saat" },
];

const VEHICLES: { value: LeaderboardVehicleFilter; label: string }[] = [
  { value: "all", label: "Hepsi" },
  { value: "bicycle", label: "Bisiklet" },
  { value: "skates", label: "Paten" },
  { value: "skateboard", label: "Kaykay" },
  { value: "running", label: "Koşu" },
];
function Podium({
  entries,
  vehicle,
  userId,
  rankChanges,
}: {
  entries: LeaderboardEntry[];
  vehicle: LeaderboardVehicleFilter;
  userId?: string;
  rankChanges: Map<string, "up" | "down" | "new">;
}) {
  if (entries.length < 3) return null;

  const podium = [
    { entry: entries[1], rank: 2, stepH: "h-16 sm:h-20" },
    { entry: entries[0], rank: 1, stepH: "h-24 sm:h-28" },
    { entry: entries[2], rank: 3, stepH: "h-12 sm:h-14" },
  ];

  return (
    <div className="mb-8 flex items-end gap-2.5 sm:gap-4">
      {podium.map(({ entry, rank, stepH }) => {
        const isFirst = rank === 1;
        const isMe = entry.user_id === userId;
        const changeType = rankChanges.get(entry.user_id);
        const vehicleToShow: VehicleType =
          vehicle !== "all" ? (vehicle as VehicleType) : entry.dominant_vehicle;

        return (
          <div
            key={entry.user_id}
            className="flex flex-1 flex-col items-stretch"
          >
            <div
              className={`flex w-full flex-col items-center justify-between overflow-hidden rounded-[22px] border transition-transform duration-300 hover:-translate-y-1 ${
                isFirst
                  ? "border-sun/40 bg-sun/10 shadow-[0_12px_32px_-12px_rgba(245,158,11,0.25)]"
                  : "border-ink/10 bg-white shadow-[0_8px_24px_-12px_rgba(26,26,26,0.12)]"
              } ${isMe ? "ring-2 ring-sky/50 ring-offset-1" : ""} ${
                changeType === "up"
                  ? "animate-rank-up"
                  : changeType === "down"
                    ? "animate-rank-down"
                    : changeType === "new"
                      ? "animate-rank-new"
                      : ""
              }`}
            >
              <div className="flex w-full flex-col items-center pb-4 pt-5 sm:pb-5 sm:pt-6">
                <div
                  className={`font-heading text-[32px] font-bold leading-none tabular-nums tracking-tighter sm:text-[40px] ${
                    isFirst
                      ? "text-sun"
                      : rank === 2
                        ? "text-ink/80"
                        : "text-ink/50"
                  }`}
                >
                  {rank}
                </div>
                {isMe && (
                  <div className="mt-1.5 rounded-full bg-sky/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-deep">
                    Sen
                  </div>
                )}
                <div className="mt-3 h-4 w-6 sm:h-5 sm:w-7">
                  <VehicleGlyph
                    type={vehicleToShow}
                    color={isFirst ? "var(--color-sun)" : "currentColor"}
                    accent="var(--color-sun)"
                  />
                </div>
                <div className="mt-2.5 w-full px-2 text-center font-heading text-[13px] font-semibold text-ink sm:text-[15px]">
                  {entry.full_name}
                </div>
                <div className="mt-1 font-heading text-[11px] font-medium tabular-nums text-ink/60 sm:text-[12px]">
                  {entry.total_distance.toFixed(1)} km
                </div>
              </div>

              <div
                className={`w-full ${stepH} ${
                  isFirst ? "bg-sun" : rank === 2 ? "bg-ink/15" : "bg-ink/8"
                }`}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function Leaderboard({ userId }: { userId?: string }) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const [vehicle, setVehicle] = useState<LeaderboardVehicleFilter>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankChanges, setRankChanges] = useState<
    Map<string, "up" | "down" | "new">
  >(new Map());
  const prevRanksRef = useRef<Map<string, number>>(new Map());
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    const res = await fetch(
      `/api/leaderboard?period=${period}&vehicle=${vehicle}`,
      { cache: "no-store" },
    );
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = (await res.json()) as LeaderboardEntry[];
    setEntries(data);
    setLoading(false);
  }, [period, vehicle]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);
  useRealtime("activities_changes", refetch);
  useEffect(() => {
    if (loading) return;
    const changes = new Map<string, "up" | "down" | "new">();
    entries.forEach((entry, i) => {
      const newRank = i + 1;
      const oldRank = prevRanksRef.current.get(entry.user_id);
      if (oldRank === undefined) {
        if (prevRanksRef.current.size > 0) changes.set(entry.user_id, "new");
      } else if (newRank < oldRank) {
        changes.set(entry.user_id, "up");
      } else if (newRank > oldRank) {
        changes.set(entry.user_id, "down");
      }
    });
    prevRanksRef.current = new Map(entries.map((e, i) => [e.user_id, i + 1]));
    if (changes.size > 0) {
      setRankChanges(changes);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setRankChanges(new Map()), 1600);
    }
  }, [entries, loading]);

  const topEntries = entries.slice(0, VISIBLE_LIMIT);
  const max = topEntries[0]?.total_distance || 1;
  const hasPodium = !loading && topEntries.length >= 3;
  const listEntries = hasPodium ? topEntries.slice(3) : topEntries;
  const userEntry = userId
    ? (entries.find((e) => e.user_id === userId) ?? null)
    : null;
  const userRank = userEntry ? entries.indexOf(userEntry) + 1 : null;
  const userInTop = userRank !== null && userRank <= VISIBLE_LIMIT;

  return (
    <section
      id="leaderboard"
      className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mb-5 sm:mb-6">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-ink/60">
          Liderlik Tablosu
        </div>
        <h2 className="mt-1.5 font-heading text-[clamp(2rem,6vw,3rem)] font-semibold leading-none tracking-[-0.03em]">
          En çok kilometre yapanlar
        </h2>
      </div>
      <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
        <div className="flex gap-0.5 overflow-x-auto rounded-full border border-ink/10 bg-white p-1 shadow-[0_4px_12px_-4px_rgba(26,26,26,0.1)] sm:inline-flex sm:overflow-visible">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition sm:px-3.5 sm:text-[13px] ${
                period === p.value
                  ? "bg-ink text-paper"
                  : "text-ink/65 hover:bg-ink/5"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 overflow-x-auto rounded-full border border-ink/10 bg-white p-1 shadow-[0_4px_12px_-4px_rgba(26,26,26,0.1)] sm:inline-flex sm:overflow-visible">
          {VEHICLES.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => setVehicle(v.value)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-medium transition sm:px-3.5 sm:text-[13px] ${
                vehicle === v.value
                  ? "bg-ink text-paper"
                  : "text-ink/65 hover:bg-ink/5"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="skeleton h-15.5 rounded-[18px]"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      ) : topEntries.length === 0 ? (
        <div className="px-6 py-14 text-center text-sm text-ink/55">
          Henüz onaylı bir aktivite yok.
        </div>
      ) : (
        <>
          <Podium
            entries={topEntries}
            vehicle={vehicle}
            userId={userId}
            rankChanges={rankChanges}
          />
          {listEntries.length > 0 && (
            <div className="overflow-hidden rounded-[22px] border border-ink/10 bg-white shadow-[0_12px_32px_-16px_rgba(26,26,26,0.15)]">
              {listEntries.map((entry, i) => {
                const rank = hasPodium ? i + 4 : i + 1;
                const pct = (entry.total_distance / max) * 100;
                const vehicleToShow: VehicleType =
                  vehicle !== "all"
                    ? (vehicle as VehicleType)
                    : entry.dominant_vehicle;
                const isMe = entry.user_id === userId;
                const changeType = rankChanges.get(entry.user_id);

                return (
                  <div
                    key={entry.user_id}
                    className={`animate-slide-up relative px-4 py-3.5 sm:px-6 ${
                      i > 0 ? "border-t border-ink/5" : ""
                    } ${isMe ? "bg-sky-50/70" : ""}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {changeType && (
                      <span
                        className={`absolute left-0 top-0 bottom-0 w-0.75 rounded-r-full ${
                          changeType === "up"
                            ? "bg-grass-deep animate-rank-fade"
                            : changeType === "down"
                              ? "bg-red-400 animate-rank-fade"
                              : "bg-sky animate-rank-fade"
                        }`}
                      />
                    )}
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex w-7 shrink-0 items-center gap-1 sm:w-12">
                        <span className="font-heading text-2xl font-semibold leading-none tabular-nums tracking-[-0.04em] text-ink/35 sm:text-[28px]">
                          {rank}
                        </span>
                        {changeType === "up" && (
                          <span className="text-[10px] font-bold leading-none text-grass-deep">
                            ↑
                          </span>
                        )}
                        {changeType === "down" && (
                          <span className="text-[10px] font-bold leading-none text-red-400">
                            ↓
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate text-[15px] font-semibold sm:text-base">
                          {entry.full_name}
                          {isMe && (
                            <span className="shrink-0 rounded-full bg-sky/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-deep">
                              Sen
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="h-4 w-6 shrink-0 text-ink/50">
                        <VehicleGlyph
                          type={vehicleToShow}
                          color="currentColor"
                          accent="var(--color-sun)"
                        />
                      </div>
                      <div className="shrink-0 text-right font-heading text-lg font-semibold leading-none tabular-nums tracking-[-0.02em] sm:text-[22px]">
                        {entry.total_distance.toFixed(1)}{" "}
                        <span className="text-xs font-medium text-ink/55">
                          km
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/5 sm:h-2">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${isMe ? "bg-sky-deep" : "bg-grass-deep"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {!userInTop && userEntry && userId && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-ink/40">
                <div className="h-px flex-1 bg-ink/10" />
                <span>Senin sıralaman</span>
                <div className="h-px flex-1 bg-ink/10" />
              </div>
              <div className="overflow-hidden rounded-[22px] border border-sky/30 bg-sky-50/60 shadow-[0_4px_16px_-4px_rgba(96,165,250,0.2)]">
                {(() => {
                  const pct = (userEntry.total_distance / max) * 100;
                  const vehicleToShow: VehicleType =
                    vehicle !== "all"
                      ? (vehicle as VehicleType)
                      : userEntry.dominant_vehicle;
                  return (
                    <div className="px-4 py-3.5 sm:px-6">
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-7 shrink-0 font-heading text-2xl font-semibold leading-none tabular-nums tracking-[-0.04em] text-sky-deep/60 sm:w-12 sm:text-[28px]">
                          {userRank}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 truncate text-[15px] font-semibold sm:text-base">
                            {userEntry.full_name}
                            <span className="shrink-0 rounded-full bg-sky/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-deep">
                              Sen
                            </span>
                          </div>
                        </div>
                        <div className="h-4 w-6 shrink-0 text-sky-deep/50">
                          <VehicleGlyph
                            type={vehicleToShow}
                            color="currentColor"
                            accent="var(--color-sun)"
                          />
                        </div>
                        <div className="shrink-0 text-right font-heading text-lg font-semibold leading-none tabular-nums tracking-[-0.02em] text-sky-deep sm:text-[22px]">
                          {userEntry.total_distance.toFixed(1)}{" "}
                          <span className="text-xs font-medium text-sky-deep/55">
                            km
                          </span>
                        </div>
                      </div>
                      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-sky/15 sm:h-2">
                        <div
                          className="h-full rounded-full bg-sky-deep/60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
