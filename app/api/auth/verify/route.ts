import type { NextRequest } from "next/server";
import { z } from "zod";
import { fail, handleError, ok } from "@/lib/api";
import { requestUser } from "@/lib/auth";
import { query, table, transaction } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) return fail("Authentication required", 401);
    const { otp } = z.object({ otp: z.string().length(6) }).parse(await request.json());
    const match = await query<{ id: number }>(
      `SELECT id FROM ${table("user_verification")} WHERE "userIdId"=$1 AND token=$2 AND type='otp' AND "createdAt">NOW()-INTERVAL '15 minutes' ORDER BY id DESC LIMIT 1`,
      [user.id, otp],
    );
    if (!match.rows[0]) {
      logger.warn("auth.verification.failed", { userId: user.id, reason: "invalid_or_expired" });
      return fail("The code is invalid or expired", 400);
    }
    await transaction(async (client) => {
      await client.query(`UPDATE ${table("user")} SET is_verified=TRUE,verified_at=NOW(),"updatedAt"=NOW() WHERE id=$1`, [user.id]);
      await client.query(`DELETE FROM ${table("user_verification")} WHERE "userIdId"=$1`, [user.id]);
    });
    logger.info("auth.verification.succeeded", { userId: user.id });
    return ok(null, "Account verified");
  } catch (error) { return handleError(error); }
}
