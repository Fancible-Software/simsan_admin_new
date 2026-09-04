import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest, NextResponse } from "next/server";
import { query, table } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Role, User } from "@/lib/types";

export const SESSION_COOKIE = "simsan_session";
const SESSION_DAYS = Math.max(1, Number(process.env.SESSION_DAYS || 2));

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await query(
    `INSERT INTO ${table("admin_session")} (token_hash,user_id,expires_at) VALUES ($1,$2,NOW() + ($3 * INTERVAL '1 day'))`,
    [tokenHash(token), userId, SESSION_DAYS],
  );
  return token;
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession(token?: string) {
  if (token) await query(`DELETE FROM ${table("admin_session")} WHERE token_hash=$1`, [tokenHash(token)]);
}

async function userFromToken(token?: string | null): Promise<User | null> {
  if (!token) return null;
  const result = await query<User>(
    `SELECT u.id,u.first_name,u.last_name,u.email,u.mobile_no,u.roles,u.is_active,u.is_verified,u."createdBy",u."createdAt"
     FROM ${table("admin_session")} s JOIN ${table("user")} u ON u.id=s.user_id
     WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.is_deleted=0 AND u.is_active=1`,
    [tokenHash(token)],
  );
  return result.rows[0] || null;
}

export async function currentUser() {
  return userFromToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requestUser(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const token = request.cookies.get(SESSION_COOKIE)?.value || bearer || request.nextUrl.searchParams.get("token");
  return userFromToken(token);
}

export async function requireUser(role?: Role) {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (!user.is_verified) redirect("/verify");
  if (role && user.roles !== role) {
    logger.warn("authorization.page_denied", { userId: user.id, requiredRole: role, actualRole: user.roles });
    redirect("/admin/quotes");
  }
  return user;
}

export function canManage(user: User) {
  return user.roles === "admin";
}
