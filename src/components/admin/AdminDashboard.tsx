"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRealtime } from "@/lib/realtime/useRealtime";
import { PendingActivities } from "@/components/admin/PendingActivities";
import { EquipmentTable } from "@/components/admin/EquipmentTable";
import { OnSiteEntryModal } from "@/components/admin/OnSiteEntryModal";
import { ActivitiesTab } from "@/components/admin/ActivitiesTab";
import { VehicleGlyph } from "@/components/illustrations";
import { KosturanziLogo } from "@/components/ui/KosturanziLogo";
import { banUser, unbanUser, deleteUser } from "@/lib/actions/equipment";
import { adminCreateUser, adminUpdateUser } from "@/lib/actions/profile";
import type { VehicleType } from "@/lib/types";

type Tab = "overview" | "equipment" | "approvals" | "activities" | "log" | "users";
type TabIcon = "home" | "box" | "check" | "list" | "people" | "chart";

const TABS: { k: Tab; label: string; icon: TabIcon }[] = [
  { k: "overview", label: "Genel Bakış", icon: "home" },
  { k: "equipment", label: "Ekipman Takibi", icon: "box" },
  { k: "approvals", label: "Stant & Başvurular", icon: "check" },
  { k: "activities", label: "Aktiviteler", icon: "chart" },
  { k: "log", label: "Teslim Geçmişi", icon: "list" },
  { k: "users", label: "Kullanıcılar", icon: "people" },
];

const TAB_TITLE: Record<Tab, string> = {
  overview: "Genel Bakış",
  equipment: "Ekipman Takibi",
  approvals: "Stant & Başvurular",
  activities: "Tüm Aktiviteler",
  log: "Teslim Geçmişi",
  users: "Kullanıcılar",
};

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [onSiteOpen, setOnSiteOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const fetchPendingCount = useCallback(async () => {
    const res = await fetch("/api/admin/pending-count", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { count: number };
    setPendingCount(data.count);
  }, []);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);
  useRealtime("activities_changes", fetchPendingCount);

  function navTo(t: Tab) {
    setTab(t);
    setSidebarOpen(false);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-ink">
      <div className="flex flex-col items-start gap-2 px-4 py-6">
        <KosturanziLogo size="md" dark />
        <div className="text-[10px] text-white/40">Admin Paneli</div>
      </div>

      <nav className="flex-1 space-y-0.5 px-2">
        {TABS.map(({ k, label, icon }) => (
          <button
            key={k}
            type="button"
            onClick={() => navTo(k)}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[13px] transition-colors ${
              tab === k
                ? "bg-white/10 font-semibold text-white"
                : "font-normal text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2.5">
              <SideIcon name={icon} />
              {label}
            </span>
            {k === "approvals" && pendingCount > 0 && (
              <span className="rounded-full bg-sun px-1.5 py-0.5 text-[10px] font-bold leading-none text-ink tabular-nums">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-grass shadow-[0_0_0_3px_rgba(134,239,172,0.3)]" />
          <span className="text-[11px] text-white/50">Sistem aktif</span>
        </div>
        <Link
          href="/"
          className="block rounded-lg border border-white/10 px-3 py-2 text-[12px] text-white/50 transition-colors hover:text-white"
        >
          ← Ana sayfaya dön
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-paper">
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-200 lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-ink/10 bg-paper px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/8 lg:hidden"
              aria-label="Menü"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              {TAB_TITLE[tab]}
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setOnSiteOpen(true)}
            className="rounded-full bg-sky-deep px-3 py-1.5 text-sm font-semibold text-paper transition hover:bg-sky-deep/85"
          >
            + Stant Girişi
          </button>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {tab === "overview" && <OverviewTab gotoTab={navTo} />}
          {tab === "equipment" && <EquipmentTable />}
          {tab === "approvals" && <PendingActivities />}
          {tab === "activities" && (
            <ActivitiesTab onGotoApprovals={() => navTo("approvals")} />
          )}
          {tab === "log" && <LogTab />}
          {tab === "users" && <UsersTab />}
        </main>
      </div>

      <OnSiteEntryModal
        open={onSiteOpen}
        onClose={() => setOnSiteOpen(false)}
      />
    </div>
  );
}
type EquipStat = { free: number; total: number };

type OverviewData = {
  totalKm: number;
  participants: number;
  pendingCount: number;
  all: EquipStat;
  bicycle: EquipStat;
  skateboard: EquipStat;
  skates: EquipStat;
};

type PendingPreview = {
  id: string;
  name: string;
  distance: number;
  created_at: string;
};

type ActiveCheckout = {
  id: string;
  type: VehicleType;
  name: string;
  assigned_at: string | null;
};

function OverviewTab({ gotoTab }: { gotoTab: (t: Tab) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [recentPending, setRecentPending] = useState<PendingPreview[]>([]);
  const [activeCheckouts, setActiveCheckouts] = useState<ActiveCheckout[]>([]);

  const refetch = useCallback(async () => {
    const res = await fetch("/api/admin/overview", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as {
      totalKm: number;
      participants: number;
      pendingCount: number;
      all: EquipStat;
      bicycle: EquipStat;
      skates: EquipStat;
      skateboard: EquipStat;
      recentPending: PendingPreview[];
      activeCheckouts: ActiveCheckout[];
    };
    setData({
      totalKm: payload.totalKm,
      participants: payload.participants,
      pendingCount: payload.pendingCount,
      all: payload.all,
      bicycle: payload.bicycle,
      skates: payload.skates,
      skateboard: payload.skateboard,
    });
    setRecentPending(payload.recentPending);
    setActiveCheckouts(payload.activeCheckouts);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);
  useRealtime(["activities_changes", "equipments_changes"], refetch);

  if (!data) {
    return (
      <div className="py-12 text-center text-sm text-ink/50">Yükleniyor...</div>
    );
  }

  const equipUsed = data.all.total - data.all.free;
  const statCards: {
    v: string;
    suffix?: string;
    label: string;
    note?: string;
    urgent: boolean;
  }[] = [
    {
      v: data.totalKm.toFixed(1),
      suffix: "km",
      label: "Toplam mesafe",
      note: "onaylı aktiviteler",
      urgent: false,
    },
    {
      v: String(data.participants),
      label: "Aktif katılımcı",
      note: "kayıtlı sporcu",
      urgent: false,
    },
    {
      v: `${data.all.free}/${data.all.total}`,
      label: "Boş ekipman",
      note: `${equipUsed} dışarda`,
      urgent: false,
    },
    {
      v: String(data.pendingCount),
      label: "Onay bekleyen",
      note: data.pendingCount > 0 ? "aksiyon gerekiyor" : "temiz",
      urgent: data.pendingCount > 0,
    },
  ];

  const equipRows: {
    label: string;
    type: VehicleType;
    free: number;
    total: number;
  }[] = [
    { label: "Bisiklet", type: "bicycle", ...data.bicycle },
    { label: "Kaykay", type: "skateboard", ...data.skateboard },
    { label: "Paten", type: "skates", ...data.skates },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
              {c.label}
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <div className="font-heading text-2xl font-semibold tabular-nums text-ink sm:text-3xl">
                {c.v}
              </div>
              {c.suffix && (
                <div className="text-sm text-ink/40">{c.suffix}</div>
              )}
            </div>
            {c.note && (
              <div
                className={`mt-1.5 text-xs ${
                  c.urgent ? "font-semibold text-red-500" : "text-ink/40"
                }`}
              >
                {c.note}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-3">
          <div className="flex items-center justify-between">
            <div className="font-heading text-base font-semibold">
              Ekipman durumu
            </div>
            <button
              type="button"
              onClick={() => gotoTab("equipment")}
              className="text-xs text-ink/40 hover:text-ink"
            >
              Detaya git →
            </button>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {equipRows.map((r) => {
              const pct = r.total ? (r.free / r.total) * 100 : 0;
              return (
                <div
                  key={r.label}
                  className="rounded-xl border border-ink/8 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-4 w-6 text-ink/70">
                      <VehicleGlyph
                        type={r.type}
                        color="currentColor"
                        accent="#f59e0b"
                      />
                    </div>
                    <div className="text-[11px] font-semibold text-ink/40">
                      {r.label}
                    </div>
                  </div>
                  <div className="mt-2 font-heading text-2xl font-semibold tabular-nums">
                    {r.free}
                    <span className="text-sm font-medium text-ink/40">
                      /{r.total}
                    </span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink/8">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct < 25 ? "#e87d4a" : "#3ea76b",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="font-heading text-base font-semibold">
              Onay bekleyen
            </div>
            <button
              type="button"
              onClick={() => gotoTab("approvals")}
              className="text-xs text-ink/40 hover:text-ink"
            >
              Tümünü gör →
            </button>
          </div>
          {recentPending.length === 0 ? (
            <div className="mt-6 text-center text-sm text-ink/40">
              Bekleyen yok 🎉
            </div>
          ) : (
            <div className="mt-2 divide-y divide-ink/8">
              {recentPending.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-ink/40">{p.distance} km</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => gotoTab("approvals")}
                    className="rounded-lg border border-ink/15 px-2.5 py-1 text-xs font-medium transition hover:bg-ink/5"
                  >
                    İncele
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="font-heading text-base font-semibold">
            Aktif teslimler
          </div>
          <button
            type="button"
            onClick={() => gotoTab("log")}
            className="text-xs text-ink/40 hover:text-ink"
          >
            Geçmişe git →
          </button>
        </div>
        {activeCheckouts.length === 0 ? (
          <div className="mt-6 text-center text-sm text-ink/40">
            Şu an dışarda ekipman yok.
          </div>
        ) : (
          <div className="mt-2 divide-y divide-ink/8">
            {activeCheckouts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                <div className="h-4 w-6 shrink-0 text-ink/50">
                  <VehicleGlyph type={c.type} color="currentColor" />
                </div>
                <div className="min-w-0 flex-1 truncate text-sm font-medium">
                  {c.name}
                </div>
                <div className="shrink-0 text-xs tabular-nums text-ink/40">
                  {c.assigned_at
                    ? new Date(c.assigned_at).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}{" "}
                  teslim
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
type EquipRow = {
  id: string;
  type: string;
  status: string;
  code: string | null;
  assigned_at: string | null;
  returned_at: string | null;
  profiles: { full_name: string; email: string; phone: string } | null;
};

const TYPE_LABEL: Record<string, string> = {
  bicycle: "Bisiklet",
  skates: "Paten",
  skateboard: "Kaykay",
};

function LogTab() {
  const [rows, setRows] = useState<EquipRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/admin/equipment-log", { cache: "no-store" });
      if (res.ok) setRows((await res.json()) as EquipRow[]);
      setLoading(false);
    }
    load();
  }, []);

  const active = rows.filter((r) => r.status === "in_use");
  const returned = rows.filter((r) => r.returned_at && r.status !== "in_use");

  function fmt(ts: string | null) {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function duration(from: string | null, to: string | null) {
    if (!from || !to) return null;
    const mins = Math.round(
      (new Date(to).getTime() - new Date(from).getTime()) / 60000,
    );
    if (mins < 60) return `${mins} dk`;
    return `${Math.floor(mins / 60)} sa ${mins % 60} dk`;
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-ink/50">Yükleniyor...</div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-baseline gap-2">
          <h2 className="font-heading text-lg font-semibold">
            Aktif Teslimler
          </h2>
          {active.length > 0 && (
            <span className="text-sm text-ink/40">
              {active.length} ekipman dışarda
            </span>
          )}
        </div>
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
          {active.length === 0 ? (
            <div className="py-10 text-center text-sm text-ink/40">
              Şu an teslim edilen ekipman yok.
            </div>
          ) : (
            active.map((r, i) => (
              <div
                key={r.id}
                className={`grid gap-1 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:px-6 ${i > 0 ? "border-t border-ink/8" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded-full bg-sun/15 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {TYPE_LABEL[r.type] ?? r.type}
                  </span>
                  {r.code && (
                    <span className="font-mono text-[11px] font-semibold text-ink/50">
                      {r.code}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.profiles?.full_name ?? "—"}
                  </div>
                  {r.profiles?.phone && (
                    <div className="truncate text-[11px] text-ink/40">
                      {r.profiles.phone}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs tabular-nums text-ink/40">
                  {fmt(r.assigned_at)} teslim
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {returned.length > 0 && (
        <section>
          <h2 className="mb-3 font-heading text-lg font-semibold">
            İade Edilenler
          </h2>
          <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
            {returned.map((r, i) => (
              <div
                key={r.id}
                className={`grid gap-1 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-4 sm:px-6 ${i > 0 ? "border-t border-ink/8" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="shrink-0 rounded-full bg-grass/30 px-2 py-0.5 text-xs font-medium text-grass-deep">
                    {TYPE_LABEL[r.type] ?? r.type}
                  </span>
                  {r.code && (
                    <span className="font-mono text-[11px] font-semibold text-ink/50">
                      {r.code}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {r.profiles?.full_name ?? "—"}
                  </div>
                  {r.profiles?.phone && (
                    <div className="truncate text-[11px] text-ink/40">
                      {r.profiles.phone}
                    </div>
                  )}
                </div>
                <div className="text-right text-xs tabular-nums text-ink/40">
                  <div>{fmt(r.returned_at)} iade</div>
                  {duration(r.assigned_at, r.returned_at) && (
                    <div className="text-ink/30">
                      {duration(r.assigned_at, r.returned_at)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
type UserRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_banned: boolean;
  created_at: string;
  total_km: number;
};

function UsersTab() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);

  async function load() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (res.ok) {
      setUsers((await res.json()) as UserRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleBan(userId: string, ban: boolean) {
    setBusyId(userId);
    const result = ban ? await banUser(userId) : await unbanUser(userId);
    if (!result.error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_banned: ban } : u)),
      );
    }
    setBusyId(null);
  }

  async function handleDelete(userId: string) {
    setDeletingId(userId);
    const result = await deleteUser(userId);
    if (!result.error) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setDeleteConfirmId(null);
    }
    setDeletingId(null);
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q)
    );
  });

  if (loading) {
    return (
      <div className="py-12 text-center text-sm text-ink/50">Yükleniyor...</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="İsim, e-posta veya telefon ara…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm outline-none focus:border-sky/50 focus:ring-2 focus:ring-sky/20"
        />
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="shrink-0 rounded-full bg-grass-deep px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-grass-deep/85"
        >
          + Kullanıcı Ekle
        </button>
        <span className="shrink-0 text-xs text-ink/40">
          {filtered.length} kayıt
        </span>
      </div>

      {createOpen && (
        <CreateUserModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            load();
          }}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-sm text-ink/40">
            {search ? "Sonuç bulunamadı." : "Kayıtlı kullanıcı yok."}
          </div>
        ) : (
          filtered.map((u, i) => (
            <div
              key={u.id}
              className={`grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6 ${i > 0 ? "border-t border-ink/8" : ""} ${u.is_banned ? "bg-red-50/40" : ""}`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-semibold text-ink">
                    {u.full_name}
                  </span>
                  {u.is_banned && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                      Banlı
                    </span>
                  )}
                  {u.total_km > 0 && (
                    <span className="rounded-full bg-grass/20 px-2 py-0.5 text-[10px] font-bold text-grass-deep tabular-nums">
                      {u.total_km.toFixed(1)} km
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-ink/45">
                  <span>{u.email}</span>
                  <span>{u.phone}</span>
                  <span className="tabular-nums">
                    {new Date(u.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {deleteConfirmId === u.id ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(null)}
                      className="rounded-full border border-ink/20 px-2.5 py-1.5 text-xs font-medium text-ink/50 hover:bg-ink/5"
                    >
                      İptal
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === u.id}
                      onClick={() => handleDelete(u.id)}
                      className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {deletingId === u.id ? "…" : "Onayla, Sil"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditTarget(u)}
                      className="rounded-full border border-ink/15 p-1.5 text-ink/40 transition hover:border-sky/40 hover:text-sky-deep"
                      title="Düzenle"
                    >
                      <EditUserIcon />
                    </button>
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => handleBan(u.id, !u.is_banned)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                        u.is_banned
                          ? "border border-ink/20 text-ink/60 hover:bg-ink/5"
                          : "border border-red-200 text-red-600 hover:bg-red-50"
                      }`}
                    >
                      {busyId === u.id
                        ? "…"
                        : u.is_banned
                          ? "Banı Kaldır"
                          : "Banla"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(u.id)}
                      className="rounded-full border border-ink/15 p-1.5 text-ink/40 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      title="Kullanıcıyı sil"
                    >
                      <DeleteUserIcon />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {editTarget && (
        <EditUserModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setUsers((prev) =>
              prev.map((u) =>
                u.id === updated.id
                  ? { ...u, full_name: updated.full_name, phone: updated.phone }
                  : u,
              ),
            );
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserRow;
  onClose: () => void;
  onSaved: (updated: { id: string; full_name: string; phone: string }) => void;
}) {
  const [fullName, setFullName] = useState(user.full_name);
  const [phone, setPhone] = useState(user.phone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    const result = await adminUpdateUser(user.id, { fullName, phone });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onSaved({ id: user.id, full_name: fullName.trim(), phone: phone.trim() });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-heading text-xl font-semibold">
          Profil Düzenle
        </h2>
        <p className="mb-4 text-sm text-ink/50">{user.email}</p>

        <div className="space-y-3">
          <Field label="İsim Soyisim">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
              autoFocus
            />
          </Field>
          <Field label="Telefon">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
              placeholder="05XX XXX XX XX"
            />
          </Field>
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
            disabled={saving || !fullName.trim() || !phone.trim()}
            className="flex flex-1 items-center justify-center rounded-full bg-sky-deep py-2 text-sm font-semibold text-white transition hover:bg-sky-deep/85 disabled:bg-ink/20"
          >
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const result = await adminCreateUser({
      fullName,
      email,
      phone,
      equipmentNeed: "none",
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onCreated();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => !submitting && onClose()}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 font-heading text-xl font-semibold">
          Kullanıcı Ekle
        </h2>
        <p className="mb-4 text-sm text-ink/50">
          Etkinlik sırasında elle alınmış katılımcıyı sisteme kaydet.
        </p>

        <div className="space-y-3">
          <Field label="İsim Soyisim">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
              placeholder="örn. Ayşe Yılmaz"
              autoFocus
            />
          </Field>
          <Field label="E-posta">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
              placeholder="ornek@std.yildiz.edu.tr"
            />
          </Field>
          <Field label="Telefon">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-sm outline-none transition focus:border-sky"
              placeholder="05XX XXX XX XX"
            />
          </Field>
        </div>
        <p className="mt-2 text-xs text-ink/45">
          Ekipman talebini kullanıcı kendi giriş yaptığında seçer; gerekirse sen
          Stant Girişi'nden de aktivite ekleyebilirsin.
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink/60 transition hover:bg-ink/3 disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !fullName || !email || !phone}
            className="flex flex-1 items-center justify-center rounded-full bg-grass-deep py-2 text-sm font-semibold text-white transition hover:bg-grass-deep/85 disabled:bg-ink/20"
          >
            {submitting ? "Kaydediliyor…" : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-ink/50">
        {label}
      </span>
      {children}
    </label>
  );
}
function SideIcon({ name }: { name: TabIcon }) {
  const cls = "h-4 w-4 shrink-0 fill-none stroke-current";
  const p = {
    strokeWidth: 1.8 as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (name === "people")
    return (
      <svg viewBox="0 0 24 24" className={cls} {...p}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  if (name === "home")
    return (
      <svg viewBox="0 0 24 24" className={cls} {...p}>
        <path d="M3 11l9-8 9 8" />
        <path d="M5 10v10h14V10" />
      </svg>
    );
  if (name === "box")
    return (
      <svg viewBox="0 0 24 24" className={cls} {...p}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M3 11h18M9 7V4h6v3" />
      </svg>
    );
  if (name === "check")
    return (
      <svg viewBox="0 0 24 24" className={cls} {...p}>
        <path d="M9 11l3 3L20 6" />
        <path d="M21 12v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h11" />
      </svg>
    );
  if (name === "list")
    return (
      <svg viewBox="0 0 24 24" className={cls} {...p}>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <circle cx="4" cy="6" r="1" className="fill-current" />
        <circle cx="4" cy="12" r="1" className="fill-current" />
        <circle cx="4" cy="18" r="1" className="fill-current" />
      </svg>
    );
  if (name === "chart")
    return (
      <svg viewBox="0 0 24 24" className={cls} {...p}>
        <rect x="3" y="13" width="4" height="7" rx="1" />
        <rect x="10" y="8" width="4" height="12" rx="1" />
        <rect x="17" y="4" width="4" height="16" rx="1" />
      </svg>
    );
  return null;
}

function EditUserIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 2l3 3-8 8H3v-3L11 2z" />
    </svg>
  );
}

function DeleteUserIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 7a4 4 0 1 0-8 0" />
      <path d="M6 11v4" />
      <path d="M2 11h8" />
      <line x1="12" y1="10" x2="16" y2="14" />
      <line x1="16" y1="10" x2="12" y2="14" />
    </svg>
  );
}
