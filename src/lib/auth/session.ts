import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { one, query } from "@/lib/db/pool";
import type { Profile } from "@/lib/types";

const SESSION_DAYS = 30;

export function sessionCookieName(): string {
  return process.env.SESSION_COOKIE_NAME ?? "extremspor_session";
}

// `Secure` is opt-in: browsers refuse Secure cookies over plain HTTP, so
// hard-coding it to NODE_ENV=='production' silently breaks localhost
// deployments served from `node server.js`. Default off; set
// SESSION_COOKIE_SECURE=true once you're terminating TLS in front.
function cookieSecure(): boolean {
  return process.env.SESSION_COOKIE_SECURE === "true";
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await query(
    "insert into sessions (token, user_id, expires_at) values ($1, $2, $3)",
    [token, userId, expires],
  );
  const jar = await cookies();
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/",
    expires,
  });
  return token;
}

export async function deleteCurrentSession(): Promise<void> {
  const jar = await cookies();
  const name = sessionCookieName();
  const token = jar.get(name)?.value;
  if (token) {
    await query("delete from sessions where token = $1", [token]);
  }
  jar.set(name, "", { path: "/", maxAge: 0 });
}

type CurrentUserRow = Profile;

export async function getCurrentUser(): Promise<Profile | null> {
  const jar = await cookies();
  const token = jar.get(sessionCookieName())?.value;
  if (!token) return null;

  // Single round-trip: validate, expire-check, and fetch profile.
  // We delete on the fly if the session is past expiry.
  const row = await one<CurrentUserRow>(
    `with s as (
        select user_id, expires_at from sessions where token = $1
     )
     select p.* from profiles p
     where p.id = (select user_id from s)
       and exists (select 1 from s where expires_at > now())`,
    [token],
  );

  if (!row) {
    // Clean up expired/invalid token. Best-effort, ignore errors.
    await query("delete from sessions where token = $1", [token]).catch(() => {});
    return null;
  }
  return row;
}

export async function requireUser(): Promise<Profile> {
  const u = await getCurrentUser();
  if (!u) throw new Error("unauthenticated");
  return u;
}

export async function requireAdmin(): Promise<Profile> {
  const u = await getCurrentUser();
  if (!u || u.role !== "admin") throw new Error("forbidden");
  return u;
}
