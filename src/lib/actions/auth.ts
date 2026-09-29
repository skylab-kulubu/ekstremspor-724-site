"use server";

import { one, query } from "@/lib/db/pool";
import { createSession, deleteCurrentSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function getAllowedDomains(): string[] {
  return (process.env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email);
}

function isAllowedStudentEmail(email: string): boolean {
  const domains = getAllowedDomains();
  if (domains.length === 0) return true;
  return domains.some((d) => email.endsWith("@" + d));
}

export async function checkEmail(
  email: string,
): Promise<{ mode: "student" } | { mode: "admin" } | { error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) {
    return { error: "Geçersiz e-posta adresi." };
  }

  if (isAdminEmail(normalized)) return { mode: "admin" };
  if (isAllowedStudentEmail(normalized)) return { mode: "student" };

  return {
    error:
      "Bu e-posta ile kayıt olunamıyor. Sadece izin verilen alan adından kayıt yapılabilir.",
  };
}

export async function signInStudent(
  email: string,
): Promise<{ ok?: true; error?: string }> {
  const normalized = email.trim().toLowerCase();

  if (isAdminEmail(normalized)) {
    return { error: "Bu adres admin hesabı. Lütfen şifre ile giriş yap." };
  }
  if (!isAllowedStudentEmail(normalized)) {
    return {
      error:
        "Bu e-posta ile kayıt olunamıyor. Sadece izin verilen alan adından kayıt yapılabilir.",
    };
  }

  // Find or stub a profile. We use a placeholder name/phone — onboarding
  // will overwrite both before the user can do anything else.
  const row = await one<{ id: string }>(
    `insert into profiles (full_name, email, phone, equipment_need, role)
       values ('', $1, '', 'none', 'user')
       on conflict (email) do update set email = excluded.email
       returning id`,
    [normalized],
  );
  if (!row) return { error: "Oturum oluşturulamadı." };

  await createSession(row.id);
  return { ok: true };
}

export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ ok?: true; error?: string }> {
  const normalized = email.trim().toLowerCase();
  if (!isAdminEmail(normalized)) {
    return { error: "Bu adres admin yetkisine sahip değil." };
  }
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return { error: "Admin şifresi yapılandırılmamış. Sistem yöneticisine başvur." };
  }

  // Ensure the admin profile exists and is flagged admin. Plain comparison
  // against ADMIN_PASSWORD is intentional — there's one shared admin secret
  // for the event, not per-user hashes. (Set ADMIN_PASSWORD to something
  // strong in production.)
  if (password.length === 0 || password !== expected) {
    // Defense in depth: if the row already has a per-user password_hash
    // set, verify against it before rejecting.
    const row = await one<{ password_hash: string | null }>(
      "select password_hash from profiles where email = $1",
      [normalized],
    );
    if (!(row?.password_hash && verifyPassword(password, row.password_hash))) {
      return { error: "Şifre hatalı." };
    }
  }

  const row = await one<{ id: string }>(
    `insert into profiles (full_name, email, phone, equipment_need, role)
       values ('Admin', $1, '-', 'none', 'admin')
       on conflict (email) do update
         set role = 'admin'
       returning id`,
    [normalized],
  );
  if (!row) return { error: "Oturum oluşturulamadı." };

  await createSession(row.id);
  return { ok: true };
}

export async function signOut(): Promise<void> {
  await deleteCurrentSession();
}

// Used by /api/auth route too — exported for tests.
export async function purgeExpiredSessions(): Promise<void> {
  await query("delete from sessions where expires_at < now()");
}
