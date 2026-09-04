import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { deleteSession, SESSION_COOKIE } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const token = request.cookies.get(SESSION_COOKIE)?.value || (authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : undefined);
  await deleteSession(token);
  const response = NextResponse.json({ status: true });
  response.cookies.delete(SESSION_COOKIE);
  logger.info("auth.logout.completed", { hadSession: Boolean(token) });
  return response;
}
