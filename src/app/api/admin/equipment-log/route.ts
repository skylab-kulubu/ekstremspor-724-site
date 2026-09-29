import { NextResponse } from "next/server";
import { many } from "@/lib/db/pool";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: string;
  status: string;
  code: string | null;
  assigned_at: string | null;
  returned_at: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
};

export async function GET() {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const rows = await many<Row>(
    `select e.id, e.type, e.status, e.code,
            e.assigned_at, e.returned_at,
            p.full_name, p.email, p.phone
       from equipments e
       left join profiles p on p.id = e.assigned_to
      order by e.assigned_at desc nulls last`,
  );
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      code: r.code,
      assigned_at: r.assigned_at,
      returned_at: r.returned_at,
      profiles: r.full_name
        ? {
            full_name: r.full_name,
            email: r.email ?? "",
            phone: r.phone ?? "",
          }
        : null,
    })),
  );
}
