"use server";

import { revalidatePath } from "next/cache";
import { one, query, withTransaction } from "@/lib/db/pool";
import { getCurrentUser, requireAdmin } from "@/lib/auth/session";
import type { EquipmentNeed } from "@/lib/types";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function saveProfile(data: {
  fullName: string;
  phone: string;
  equipmentNeed: EquipmentNeed;
}): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Oturum bulunamadı. Lütfen tekrar giriş yap." };

  const role = getAdminEmails().includes(user.email.toLowerCase())
    ? "admin"
    : "user";

  try {
    await withTransaction(async (c) => {
      await c.query(
        `update profiles
            set full_name = $1,
                phone = $2,
                equipment_need = $3,
                role = $4
          where id = $5`,
        [data.fullName.trim(), data.phone.trim(), data.equipmentNeed, role, user.id],
      );

      if (data.equipmentNeed !== "none" && role !== "admin") {
        // Don't duplicate a pending on-site request for the same vehicle.
        const existing = await c.query(
          `select id from activities
            where user_id = $1
              and source = 'on_site'
              and status = 'pending'
              and vehicle_type = $2
            limit 1`,
          [user.id, data.equipmentNeed],
        );
        if (existing.rowCount === 0) {
          await c.query(
            `insert into activities (user_id, distance, vehicle_type, source, status)
                values ($1, 0, $2, 'on_site', 'pending')`,
            [user.id, data.equipmentNeed],
          );
        }
      }
    });
  } catch (e) {
    console.error("Profile save error:", e);
    return { error: "Profil kaydedilemedi. Bağlantıyı kontrol et." };
  }

  revalidatePath("/");
  return {};
}

export async function adminCreateUser(input: {
  fullName: string;
  email: string;
  phone: string;
  equipmentNeed: EquipmentNeed;
}): Promise<{ userId?: string; error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkin yok." };
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.fullName.trim();
  const phone = input.phone.trim();

  if (!fullName) return { error: "İsim zorunlu." };
  if (!email.includes("@")) return { error: "Geçerli bir e-posta gir." };
  if (!phone) return { error: "Telefon zorunlu." };

  const row = await one<{ id: string }>(
    `insert into profiles (full_name, email, phone, equipment_need, role)
       values ($1, $2, $3, $4, 'user')
       on conflict (email) do update
         set full_name = excluded.full_name,
             phone = excluded.phone,
             equipment_need = excluded.equipment_need
       returning id`,
    [fullName, email, phone, input.equipmentNeed],
  );
  if (!row) return { error: "Kullanıcı oluşturulamadı." };

  revalidatePath("/admin");
  return { userId: row.id };
}

export async function adminUpdateUser(
  userId: string,
  data: { fullName: string; phone: string },
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "Yetkin yok." };
  }

  const fullName = data.fullName.trim();
  const phone = data.phone.trim();
  if (!fullName) return { error: "İsim boş bırakılamaz." };
  if (!phone) return { error: "Telefon boş bırakılamaz." };

  try {
    await query(
      "update profiles set full_name = $1, phone = $2 where id = $3",
      [fullName, phone, userId],
    );
  } catch (e) {
    console.error("adminUpdateUser error:", e);
    return { error: "Profil güncellenemedi." };
  }
  return {};
}
