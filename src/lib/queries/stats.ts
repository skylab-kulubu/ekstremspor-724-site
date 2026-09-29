import { one } from "@/lib/db/pool";

export type LiveStats = {
  totalKm: number;
  participants: number;
  freeEquipment: number;
  todayKm: number;
  targetKm: number;
};

export async function fetchLiveStats(): Promise<LiveStats> {
  const row = await one<{
    total_km: string | null;
    participants: string | null;
    today_km: string | null;
    free_equipment: string | null;
    target_km: number | null;
  }>(`
    select
      (select coalesce(sum(distance), 0)::float from activities where status = 'approved') as total_km,
      (select count(distinct user_id) from activities where status = 'approved') as participants,
      (select coalesce(sum(distance), 0)::float from activities
         where status = 'approved' and created_at::date = current_date) as today_km,
      (select count(*) from equipments where status = 'available') as free_equipment,
      (select target_km from event_config limit 1) as target_km
  `);

  return {
    totalKm: Number(row?.total_km ?? 0),
    participants: Number(row?.participants ?? 0),
    todayKm: Number(row?.today_km ?? 0),
    freeEquipment: Number(row?.free_equipment ?? 0),
    targetKm: Number(row?.target_km ?? 5000),
  };
}
