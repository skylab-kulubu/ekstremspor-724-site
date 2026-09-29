export type EquipmentVehicleType = "bicycle" | "skates" | "skateboard";
export type VehicleType = EquipmentVehicleType | "running";
export type EquipmentNeed = EquipmentVehicleType | "none";
export type Role = "user" | "admin";
export type ActivitySource = "on_site" | "remote";
export type ActivityStatus = "pending" | "approved" | "rejected";
export type EquipmentStatus = "available" | "in_use" | "damaged";
export type EquipmentRequestStatus =
  | "pending"
  | "fulfilled"
  | "rejected"
  | "not_needed";

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  password_hash: string | null;
  equipment_need: EquipmentNeed;
  equipment_request_status: EquipmentRequestStatus;
  is_banned: boolean;
  role: Role;
  created_at: string;
};

export type Equipment = {
  id: string;
  type: EquipmentVehicleType;
  status: EquipmentStatus;
  code: string | null;
  assigned_to: string | null;
  assigned_at: string | null;
  returned_at: string | null;
};

export type Activity = {
  id: string;
  user_id: string;
  distance: number;
  vehicle_type: VehicleType;
  source: ActivitySource;
  evidence_url: string | null;
  date_range: string | null;
  status: ActivityStatus;
  created_at: string;
};

export type EventConfig = {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  target_km: number;
  active_day: 1 | 2 | 3;
  forest_name: string | null;
};

export type LeaderboardPeriod = "all" | "today" | "last_hour";
export type LeaderboardVehicleFilter = "all" | VehicleType;

export type LeaderboardEntry = {
  user_id: string;
  full_name: string;
  total_distance: number;
  dominant_vehicle: VehicleType;
};

export type PublicProfile = Pick<Profile, "id" | "full_name" | "email">;
