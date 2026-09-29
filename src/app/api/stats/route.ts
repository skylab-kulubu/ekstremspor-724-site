import { NextResponse } from "next/server";
import { fetchLiveStats } from "@/lib/queries/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await fetchLiveStats());
}
