import { NextResponse } from "next/server";
import { many } from "@/lib/db/pool";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_banned: boolean;
  created_at: string;
  total_km: number | string | null;
};

export async function GET() {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await many<Row>(
    `select p.id, p.full_name, p.email, p.phone, p.is_banned, p.created_at,
            coalesce(km.total, 0)::float as total_km
       from profiles p
       left join (
         select user_id, sum(distance) as total
           from activities
          where status = 'approved'
          group by user_id
       ) km on km.user_id = p.id
      where p.role <> 'admin'
      order by p.created_at desc`,
  );
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      is_banned: r.is_banned,
      created_at: r.created_at,
      total_km: Number(r.total_km ?? 0),
    })),
  );
}
