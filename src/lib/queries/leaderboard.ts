import { many } from "@/lib/db/pool";
import type {
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardVehicleFilter,
  VehicleType,
} from "@/lib/types";

type Args = {
  period: LeaderboardPeriod;
  vehicle: LeaderboardVehicleFilter;
};

export async function fetchLeaderboard({
  period,
  vehicle,
}: Args): Promise<LeaderboardEntry[]> {
  const conditions: string[] = ["a.status = 'approved'"];
  const params: unknown[] = [];

  if (vehicle !== "all") {
    params.push(vehicle);
    conditions.push(`a.vehicle_type = $${params.length}`);
  }

  if (period === "today") {
    conditions.push("a.created_at::date = current_date");
  } else if (period === "last_hour") {
    conditions.push("a.created_at >= now() - interval '1 hour'");
  }

  const sql = `
    select
      a.user_id,
      coalesce(p.full_name, '—') as full_name,
      a.vehicle_type,
      sum(a.distance)::float as distance
    from activities a
    left join profiles p on p.id = a.user_id
    where ${conditions.join(" and ")}
    group by a.user_id, p.full_name, a.vehicle_type
  `;

  type Row = {
    user_id: string;
    full_name: string;
    vehicle_type: VehicleType;
    distance: number;
  };
  const rows = await many<Row>(sql, params);

  type Accumulator = {
    user_id: string;
    full_name: string;
    total_distance: number;
    vehicle_km: Record<string, number>;
  };

  const byUser = new Map<string, Accumulator>();
  for (const row of rows) {
    const existing = byUser.get(row.user_id);
    if (existing) {
      existing.total_distance += row.distance;
      existing.vehicle_km[row.vehicle_type] =
        (existing.vehicle_km[row.vehicle_type] ?? 0) + row.distance;
    } else {
      byUser.set(row.user_id, {
        user_id: row.user_id,
        full_name: row.full_name,
        total_distance: row.distance,
        vehicle_km: { [row.vehicle_type]: row.distance },
      });
    }
  }

  return Array.from(byUser.values())
    .map((u) => {
      const dominant_vehicle = (
        Object.entries(u.vehicle_km) as [VehicleType, number][]
      ).reduce<[VehicleType, number]>(
        (best, curr) => (curr[1] > best[1] ? curr : best),
        ["bicycle", 0],
      )[0];
      return {
        user_id: u.user_id,
        full_name: u.full_name,
        total_distance: u.total_distance,
        dominant_vehicle,
      };
    })
    .sort((a, b) => b.total_distance - a.total_distance);
}
