import { NextResponse } from "next/server";
import { many } from "@/lib/db/pool";
import { getCurrentUser } from "@/lib/auth/session";
import type { Activity } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const rows = await many<Activity>(
    `select id, user_id, distance, vehicle_type, source,
            evidence_url, date_range, status, created_at
       from activities
      where user_id = $1
      order by created_at desc`,
    [user.id],
  );
  return NextResponse.json(rows);
}
