import { NextResponse } from "next/server";
import { many } from "@/lib/db/pool";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user_id: string;
  distance: number;
  vehicle_type: string;
  source: string;
  evidence_url: string | null;
  date_range: string | null;
  status: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
};

export async function GET() {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rows = await many<Row>(
    `select a.id, a.user_id, a.distance, a.vehicle_type, a.source,
            a.evidence_url, a.date_range, a.status, a.created_at,
            p.full_name, p.email
       from activities a
       join profiles p on p.id = a.user_id
      order by a.created_at desc`,
  );
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      distance: r.distance,
      vehicle_type: r.vehicle_type,
      source: r.source,
      evidence_url: r.evidence_url,
      date_range: r.date_range,
      status: r.status,
      created_at: r.created_at,
      profiles: { full_name: r.full_name ?? "—", email: r.email ?? "" },
    })),
  );
}
