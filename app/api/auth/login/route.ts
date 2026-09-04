import bcrypt from "bcryptjs";
import type { NextRequest } from "next/server";
import { fail, handleError, ok } from "@/lib/api";
import { createSession, setSessionCookie } from "@/lib/auth";
import { query, table } from "@/lib/db";
import type { User } from "@/lib/types";
import { loginSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const input = loginSchema.parse(await request.json());
    const result = await query<User & { password: string }>(
      `SELECT id,first_name,last_name,email,mobile_no,password,roles,is_active,is_verified,"createdBy","createdAt"
       FROM ${table("user")} WHERE lower(email)=$1 AND is_deleted=0 LIMIT 1`,
      [input.email],
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(input.password, user.password))) {
      logger.warn("auth.login.failed", { email: input.email, reason: "invalid_credentials" });
      return fail("Invalid email or password", 401);
    }
    if (!user.is_active) {
      logger.warn("auth.login.failed", { userId: user.id, reason: "inactive" });
      return fail("This account is inactive. Contact an administrator.", 403);
    }
    const token = await createSession(user.id);
    const { password: _, ...safeUser } = user;
    void _;
    const response = ok({ ...safeUser, token }, "Logged in successfully");
    setSessionCookie(response, token);
    logger.info("auth.login.succeeded", { userId: user.id, role: user.roles });
    return response;
  } catch (error) { return handleError(error); }
}
