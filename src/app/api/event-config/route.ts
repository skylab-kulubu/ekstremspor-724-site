import { NextResponse } from "next/server";
import { one } from "@/lib/db/pool";

export const dynamic = "force-dynamic";

export async function GET() {
  const row = await one(
    "select id, event_name, start_date, end_date, target_km, active_day, forest_name from event_config limit 1",
  );
  return NextResponse.json(row);
}
