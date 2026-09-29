"use server";

import { one, query, withTransaction } from "@/lib/db/pool";
import { requireAdmin } from "@/lib/auth/session";
import type { EquipmentVehicleType } from "@/lib/types";

const CODE_PREFIX: Record<EquipmentVehicleType, string> = {
  bicycle: "BSK",
  skates: "PTN",
  skateboard: "KYK",
};

async function adminOrError(): Promise<{ ok: true } | { error: string }> {
  try {
    await requireAdmin();
    return { ok: true };
  } catch {
    return { error: "Yetkin yok." };
  }
}

export async function addEquipment(
  type: EquipmentVehicleType,
  code?: string,
): Promise<{ error?: string }> {
  const auth = await adminOrError();
  if ("error" in auth) return auth;

  let finalCode = code?.trim() || null;
  if (!finalCode) {
    const row = await one<{ c: string }>(
      "select count(*)::text as c from equipments where type = $1",
      [type],
    );
    const n = Number(row?.c ?? 0) + 1;
    finalCode = `${CODE_PREFIX[type]}-${String(n).padStart(3, "0")}`;
  }

  try {
    await query(
      `insert into equipments (type, status, code)
         values ($1, 'available', $2)`,
      [type, finalCode],
    );
  } catch (e) {
    console.error("addEquipment failed:", e);
    return { error: "Ekipman eklenemedi." };
  }
  return {};
}

export async function deleteEquipment(id: string): Promise<{ error?: string }> {
  const auth = await adminOrError();
  if ("error" in auth) return auth;

  const row = await one<{ status: string }>(
    "select status from equipments where id = $1",
    [id],
  );
  if (row?.status === "in_use") {
    return { error: "Kullanımda olan ekipman silinemez." };
  }

  try {
    await query("delete from equipments where id = $1", [id]);
  } catch (e) {
    console.error("deleteEquipment failed:", e);
    return { error: "Ekipman silinemedi." };
  }
  return {};
}

export async function updateEquipmentCode(
  id: string,
  code: string,
): Promise<{ error?: string }> {
  const auth = await adminOrError();
  if ("error" in auth) return auth;
  try {
    await query("update equipments set code = $1 where id = $2", [
      code.trim() || null,
      id,
    ]);
  } catch (e) {
    console.error("updateEquipmentCode failed:", e);
    return { error: "Kod güncellenemedi." };
  }
  return {};
}

export async function setEquipmentStatus(
  id: string,
  status: "available" | "damaged",
): Promise<{ error?: string }> {
  const auth = await adminOrError();
  if ("error" in auth) return auth;
  try {
    await query(
      "update equipments set status = $1 where id = $2 and status <> 'in_use'",
      [status, id],
    );
  } catch (e) {
    console.error("setEquipmentStatus failed:", e);
    return { error: "Durum güncellenemedi." };
  }
  return {};
}

export async function banUser(userId: string): Promise<{ error?: string }> {
  const auth = await adminOrError();
  if ("error" in auth) return auth;
  try {
    await query(
      "update profiles set is_banned = true where id = $1 and role <> 'admin'",
      [userId],
    );
  } catch {
    return { error: "Kullanıcı banlanamadı." };
  }
  return {};
}

export async function unbanUser(userId: string): Promise<{ error?: string }> {
  const auth = await adminOrError();
  if ("error" in auth) return auth;
  try {
    await query("update profiles set is_banned = false where id = $1", [userId]);
  } catch {
    return { error: "Ban kaldırılamadı." };
  }
  return {};
}

export async function deleteUser(userId: string): Promise<{ error?: string }> {
  const auth = await adminOrError();
  if ("error" in auth) return auth;

  const row = await one<{ role: string }>(
    "select role from profiles where id = $1",
    [userId],
  );
  if (row?.role === "admin") return { error: "Admin kullanıcı silinemez." };

  try {
    await withTransaction(async (c) => {
      // Release any equipment they currently hold first to avoid stale FK refs.
      await c.query(
        `update equipments
            set status = 'available',
                assigned_to = null,
                returned_at = now()
          where assigned_to = $1 and status = 'in_use'`,
        [userId],
      );
      await c.query("delete from profiles where id = $1", [userId]);
    });
  } catch (e) {
    console.error("deleteUser failed:", e);
    return { error: "Kullanıcı silinemedi." };
  }
  return {};
}
