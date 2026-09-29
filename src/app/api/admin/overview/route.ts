import { NextResponse } from "next/server";
import { many, one } from "@/lib/db/pool";
import { getCurrentUser } from "@/lib/auth/session";
import type { VehicleType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const stat = await one<{
    total_km: string | null;
    participants: string | null;
    pending: string | null;
  }>(`
    select
      (select coalesce(sum(distance), 0)::float from activities where status = 'approved') as total_km,
      (select count(distinct user_id) from activities where status = 'approved') as participants,
      (select count(*) from activities where status = 'pending') as pending
  `);

  const equipStats = await many<{ type: string; status: string; n: string }>(
    "select type, status, count(*)::text as n from equipments group by type, status",
  );
  const stat3 = (t?: string) => {
    let free = 0;
    let total = 0;
    for (const e of equipStats) {
      if (t && e.type !== t) continue;
      total += Number(e.n);
      if (e.status === "available") free += Number(e.n);
    }
    return { free, total };
  };

  const recentPending = await many<{
    id: string;
    distance: number;
    created_at: string;
    full_name: string | null;
  }>(`
    select a.id, a.distance, a.created_at, p.full_name
      from activities a
      join profiles p on p.id = a.user_id
     where a.status = 'pending'
     order by a.created_at desc
     limit 3
  `);

  const activeCheckouts = await many<{
    id: string;
    type: VehicleType;
    assigned_at: string | null;
    full_name: string | null;
  }>(`
    select e.id, e.type, e.assigned_at, p.full_name
      from equipments e
      left join profiles p on p.id = e.assigned_to
     where e.status = 'in_use'
     order by e.assigned_at desc nulls last
     limit 5
  `);

  return NextResponse.json({
    totalKm: Number(stat?.total_km ?? 0),
    participants: Number(stat?.participants ?? 0),
    pendingCount: Number(stat?.pending ?? 0),
    all: stat3(),
    bicycle: stat3("bicycle"),
    skates: stat3("skates"),
    skateboard: stat3("skateboard"),
    recentPending: recentPending.map((p) => ({
      id: p.id,
      name: p.full_name ?? "—",
      distance: p.distance,
      created_at: p.created_at,
    })),
    activeCheckouts: activeCheckouts.map((c) => ({
      id: c.id,
      type: c.type,
      name: c.full_name ?? "—",
      assigned_at: c.assigned_at,
    })),
  });
}
