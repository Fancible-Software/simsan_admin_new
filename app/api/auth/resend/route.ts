import type { NextRequest } from "next/server";
import { randomInt } from "node:crypto";
import { fail, handleError, ok } from "@/lib/api";
import { requestUser } from "@/lib/auth";
import { query, table } from "@/lib/db";
import { otpEmail, sendMail } from "@/lib/mail";
import { logger } from "@/lib/logger";

async function resend(request: NextRequest) {
  try {
    const user = await requestUser(request);
    if (!user) return fail("Authentication required", 401);
    const otp = String(randomInt(100000, 1000000));
    await query(`INSERT INTO ${table("user_verification")} ("userIdId",token,type) VALUES ($1,$2,'otp')`, [user.id, otp]);
    const sent = await sendMail({ to: user.email, subject: "Your Simsan verification code", html: otpEmail(user.first_name, otp) });
    logger.info("auth.verification.resent", { userId: user.id, delivered: sent });
    return ok({ sent }, sent ? "A new code was sent" : "A new code was created; configure SMTP to deliver it");
  } catch (error) { return handleError(error); }
}

export const POST = resend;
export const GET = resend;
