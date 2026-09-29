import { NextResponse, type NextRequest } from "next/server";
import { fetchLeaderboard } from "@/lib/queries/leaderboard";
import type {
  LeaderboardPeriod,
  LeaderboardVehicleFilter,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const PERIODS: LeaderboardPeriod[] = ["all", "today", "last_hour"];
const VEHICLES: LeaderboardVehicleFilter[] = [
  "all",
  "bicycle",
  "skates",
  "skateboard",
  "running",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const periodParam = searchParams.get("period") ?? "all";
  const vehicleParam = searchParams.get("vehicle") ?? "all";

  const period = (PERIODS as string[]).includes(periodParam)
    ? (periodParam as LeaderboardPeriod)
    : "all";
  const vehicle = (VEHICLES as string[]).includes(vehicleParam)
    ? (vehicleParam as LeaderboardVehicleFilter)
    : "all";

  const data = await fetchLeaderboard({ period, vehicle });
  return NextResponse.json(data);
}
