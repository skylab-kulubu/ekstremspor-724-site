import { NextResponse } from "next/server";
import { one } from "@/lib/db/pool";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const row = await one<{ c: string }>(
    "select count(*)::text as c from activities where status = 'pending'",
  );
  return NextResponse.json({ count: Number(row?.c ?? 0) });
}
