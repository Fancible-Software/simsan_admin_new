import type { NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { requestUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

export async function authorized(request: NextRequest, adminOnly = false) {
  const user = await requestUser(request);
  if (!user) {
    logger.warn("authorization.denied", { path: request.nextUrl.pathname, reason: "missing_session" });
    return { response: fail("Authentication required", 401), user: null };
  }
  if (!user.is_verified) {
    logger.warn("authorization.denied", { path: request.nextUrl.pathname, userId: user.id, reason: "unverified" });
    return { response: fail("Account verification required", 403), user: null };
  }
  if (adminOnly && user.roles !== "admin") {
    logger.warn("authorization.denied", { path: request.nextUrl.pathname, userId: user.id, reason: "admin_required" });
    return { response: fail("Administrator access required", 403), user: null };
  }
  return { response: null, user };
}
