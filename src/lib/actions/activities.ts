"use server";

import { one, query, withTransaction } from "@/lib/db/pool";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import { removeEvidence, saveEvidence } from "@/lib/storage/files";
import type {
  ActivityStatus,
  EquipmentVehicleType,
  VehicleType,
} from "@/lib/types";

type RequestResult =
  | { ok: true; replaced?: boolean; alreadyPending?: boolean }
  | { banned: true }
  | { activeVehicle: EquipmentVehicleType }
  | { existingRequest: { id: string; vehicle_type: EquipmentVehicleType } }
  | { error: string };

export async function requestOnSiteEquipment(
  vehicle: EquipmentVehicleType,
  options: { confirmReplaceExisting?: boolean } = {},
): Promise<RequestResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Oturum bulunamadı." };
  if (user.is_banned) return { banned: true };

  const activeEquip = await one<{ type: EquipmentVehicleType }>(
    "select type from equipments where assigned_to = $1 and status = 'in_use' limit 1",
    [user.id],
  );
  if (activeEquip) return { activeVehicle: activeEquip.type };

  const existing = await one<{ id: string; vehicle_type: EquipmentVehicleType }>(
    `select id, vehicle_type from activities
       where user_id = $1 and source = 'on_site' and status = 'pending'
       limit 1`,
    [user.id],
  );

  if (existing) {
    if (existing.vehicle_type === vehicle) {
      return { ok: true, alreadyPending: true };
    }
    if (!options.confirmReplaceExisting) {
      return { existingRequest: existing };
    }
    await query("delete from activities where id = $1", [existing.id]);
  }

  try {
    await withTransaction(async (c) => {
      await c.query(
        `insert into activities (user_id, distance, vehicle_type, source, status)
           values ($1, 0, $2, 'on_site', 'pending')`,
        [user.id, vehicle],
      );
      await c.query(
        `update profiles
            set equipment_need = $2,
                equipment_request_status = 'pending'
          where id = $1`,
        [user.id, vehicle],
      );
    });
  } catch (e) {
    console.error("requestOnSiteEquipment failed:", e);
    return { error: "Talep gönderilemedi." };
  }
  return { ok: true, replaced: !!existing };
}

export async function decideActivity(
  activityId: string,
  decision: "approved" | "rejected",
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkin yok." };
  }

  const activity = await one<{
    evidence_url: string | null;
    user_id: string;
    source: "on_site" | "remote";
  }>(
    "select evidence_url, user_id, source from activities where id = $1",
    [activityId],
  );
  if (!activity) return { error: "Aktivite bulunamadı." };

  try {
    if (decision === "rejected" && activity.evidence_url) {
      await removeEvidence(activity.evidence_url);
    }

    await withTransaction(async (c) => {
      if (decision === "rejected") {
        await c.query(
          "update activities set status = 'rejected', evidence_url = null where id = $1",
          [activityId],
        );
        if (activity.source === "on_site") {
          await c.query(
            "update profiles set equipment_request_status = 'rejected' where id = $1",
            [activity.user_id],
          );
        }
      } else {
        await c.query("update activities set status = 'approved' where id = $1", [
          activityId,
        ]);
      }
    });
  } catch (e) {
    console.error("decideActivity failed:", e);
    return { error: "Aktivite güncellenemedi." };
  }
  return {};
}

export async function adminUpdateActivity(
  activityId: string,
  data: {
    distance?: number;
    vehicle_type?: VehicleType;
    status?: ActivityStatus;
    date_range?: string | null;
  },
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkin yok." };
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  let i = 1;
  if (data.distance !== undefined) {
    sets.push(`distance = $${i++}`);
    params.push(data.distance);
  }
  if (data.vehicle_type !== undefined) {
    sets.push(`vehicle_type = $${i++}`);
    params.push(data.vehicle_type);
  }
  if (data.status !== undefined) {
    sets.push(`status = $${i++}`);
    params.push(data.status);
  }
  if (data.date_range !== undefined) {
    sets.push(`date_range = $${i++}`);
    params.push(data.date_range);
  }
  if (sets.length === 0) return {};

  params.push(activityId);
  try {
    await query(
      `update activities set ${sets.join(", ")} where id = $${i}`,
      params,
    );
  } catch (e) {
    console.error("adminUpdateActivity failed:", e);
    return { error: "Aktivite güncellenemedi." };
  }
  return {};
}

export async function adminDeleteActivity(
  activityId: string,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkin yok." };
  }

  const row = await one<{ evidence_url: string | null }>(
    "select evidence_url from activities where id = $1",
    [activityId],
  );
  if (row?.evidence_url) await removeEvidence(row.evidence_url);

  try {
    await query("delete from activities where id = $1", [activityId]);
  } catch (e) {
    console.error("adminDeleteActivity failed:", e);
    return { error: "Aktivite silinemedi." };
  }
  return {};
}

export async function cancelActivity(
  activityId: string,
): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Oturum bulunamadı." };

  const row = await one<{ user_id: string; status: ActivityStatus }>(
    "select user_id, status from activities where id = $1",
    [activityId],
  );
  if (!row) return { error: "Talep bulunamadı." };
  if (row.user_id !== user.id) {
    return { error: "Bu talebi iptal etme yetkin yok." };
  }
  if (row.status !== "pending") {
    return { error: "Sadece bekleyen talepler iptal edilebilir." };
  }

  try {
    await query("delete from activities where id = $1", [activityId]);
  } catch (e) {
    console.error("cancelActivity failed:", e);
    return { error: "Talep iptal edilemedi." };
  }
  return {};
}

// New: admin records a remote activity submitted via form-data (with file).
export async function submitRemoteActivity(
  formData: FormData,
): Promise<{ error?: string; ok?: true }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Oturum bulunamadı." };
  if (user.is_banned) return { error: "Hesabın askıya alındı." };

  const distance = Number(formData.get("distance"));
  const vehicle = String(formData.get("vehicle_type") ?? "") as VehicleType;
  const dateRange =
    (formData.get("date_range") as string | null)?.trim() || null;
  const kvkk = formData.get("kvkk") === "1";
  const file = formData.get("evidence");

  if (!kvkk) return { error: "KVKK onayı gerekli." };
  if (!Number.isFinite(distance) || distance <= 0 || distance >= 1000) {
    return { error: "Geçersiz mesafe." };
  }
  if (!["bicycle", "skates", "skateboard", "running"].includes(vehicle)) {
    return { error: "Geçersiz araç tipi." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Görsel gerekli." };
  }

  let stored;
  try {
    stored = await saveEvidence(user.id, file);
  } catch (e) {
    console.error("evidence save failed:", e);
    return { error: "Görsel yüklenemedi." };
  }

  try {
    await query(
      `insert into activities (user_id, distance, vehicle_type, source, evidence_url, date_range, status)
         values ($1, $2, $3, 'remote', $4, $5, 'pending')`,
      [user.id, distance, vehicle, stored.relativePath, dateRange],
    );
  } catch (e) {
    console.error("submitRemoteActivity insert failed:", e);
    await removeEvidence(stored.relativePath);
    return { error: "Aktivite kaydedilemedi." };
  }
  return { ok: true };
}

// Admin: stant girişi — directly inserts an approved activity.
export async function adminOnSiteEntry(input: {
  userId: string;
  distance: number;
  vehicle: VehicleType;
}): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkin yok." };
  }
  if (!Number.isFinite(input.distance) || input.distance <= 0) {
    return { error: "Geçersiz mesafe." };
  }
  if (!["bicycle", "skates", "skateboard", "running"].includes(input.vehicle)) {
    return { error: "Geçersiz araç tipi." };
  }
  try {
    await query(
      `insert into activities (user_id, distance, vehicle_type, source, status)
         values ($1, $2, $3, 'on_site', 'approved')`,
      [input.userId, input.distance, input.vehicle],
    );
  } catch (e) {
    console.error("adminOnSiteEntry failed:", e);
    return { error: "Kayıt eklenemedi." };
  }
  return {};
}

// Admin: combined return — approves the pending on-site activity with km
// and frees the equipment.
export async function returnEquipment(input: {
  equipmentId: string;
  km: number;
  damaged: boolean;
}): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkin yok." };
  }
  if (!Number.isFinite(input.km) || input.km <= 0) {
    return { error: "Geçerli bir km gir." };
  }
  try {
    await withTransaction(async (c) => {
      const eq = await c.query<{
        assigned_to: string | null;
        type: EquipmentVehicleType;
      }>(
        "select assigned_to, type from equipments where id = $1 for update",
        [input.equipmentId],
      );
      const row = eq.rows[0];
      if (!row) throw new Error("not_found");

      if (row.assigned_to) {
        const pending = await c.query<{ id: string }>(
          `select id from activities
             where user_id = $1
               and source = 'on_site'
               and status = 'pending'
               and vehicle_type = $2
             order by created_at desc
             limit 1`,
          [row.assigned_to, row.type],
        );
        if (pending.rowCount && pending.rowCount > 0 && pending.rows[0]) {
          await c.query(
            "update activities set distance = $1, status = 'approved' where id = $2",
            [input.km, pending.rows[0].id],
          );
        } else {
          // No pending on-site request — record a fresh approved on-site activity.
          await c.query(
            `insert into activities (user_id, distance, vehicle_type, source, status)
                values ($1, $2, $3, 'on_site', 'approved')`,
            [row.assigned_to, input.km, row.type],
          );
        }
        await c.query(
          "update profiles set equipment_request_status = 'fulfilled' where id = $1",
          [row.assigned_to],
        );
      }

      await c.query(
        `update equipments
            set status = $1,
                assigned_to = null,
                returned_at = now()
          where id = $2`,
        [input.damaged ? "damaged" : "available", input.equipmentId],
      );
    });
  } catch (e) {
    console.error("returnEquipment failed:", e);
    return { error: "İade işlemi tamamlanamadı." };
  }
  return {};
}

export async function assignEquipment(input: {
  equipmentId: string;
  userId: string;
}): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkin yok." };
  }
  try {
    await withTransaction(async (c) => {
      const upd = await c.query(
        `update equipments
            set status = 'in_use',
                assigned_to = $1,
                assigned_at = now(),
                returned_at = null
          where id = $2 and status = 'available'`,
        [input.userId, input.equipmentId],
      );
      if (upd.rowCount === 0) {
        throw new Error("not_available");
      }
      await c.query(
        "update profiles set equipment_request_status = 'fulfilled' where id = $1",
        [input.userId],
      );
    });
  } catch (e) {
    if (e instanceof Error && e.message === "not_available") {
      return { error: "Ekipman müsait değil." };
    }
    console.error("assignEquipment failed:", e);
    return { error: "Ekipman atanamadı." };
  }
  return {};
}
