import { NextResponse, type NextRequest } from "next/server";
import { many } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  type: string;
  status: string;
  code: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  returned_at: string | null;
  assignee_name: string | null;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status"); // optional filter

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (status) {
    params.push(status);
    conditions.push(`e.status = $${params.length}`);
  }

  const sql = `
    select e.id, e.type, e.status, e.code, e.assigned_to,
           e.assigned_at, e.returned_at,
           p.full_name as assignee_name
      from equipments e
      left join profiles p on p.id = e.assigned_to
      ${conditions.length ? "where " + conditions.join(" and ") : ""}
      order by e.type, e.code nulls last
  `;
  const rows = await many<Row>(sql, params);
  // Shape kept compatible with the old supabase join: profiles: { full_name }
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      type: r.type,
      status: r.status,
      code: r.code,
      assigned_to: r.assigned_to,
      assigned_at: r.assigned_at,
      returned_at: r.returned_at,
      profiles: r.assignee_name ? { full_name: r.assignee_name } : null,
    })),
  );
}
