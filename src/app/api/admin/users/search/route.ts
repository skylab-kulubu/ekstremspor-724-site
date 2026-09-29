import { NextResponse, type NextRequest } from "next/server";
import { many } from "@/lib/db/pool";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json([]);

  const like = `%${q}%`;
  const rows = await many<{ id: string; full_name: string; email: string }>(
    `select id, full_name, email from profiles
      where full_name ilike $1 or email ilike $1
      order by created_at desc
      limit 8`,
    [like],
  );
  return NextResponse.json(rows);
}
