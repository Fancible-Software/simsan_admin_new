import bcrypt from "bcryptjs";
import { randomInt } from "node:crypto";
import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table, transaction } from "@/lib/db";
import { otpEmail, sendMail } from "@/lib/mail";
import type { User } from "@/lib/types";
import { userSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const skip = Math.max(0, Number(request.nextUrl.searchParams.get("skip") || 0));
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 10)));
    const [rows, count] = await Promise.all([
      query<User>(`SELECT id,first_name,last_name,email,mobile_no,roles,is_verified,is_active,"createdBy","createdAt" FROM ${table("user")} WHERE is_deleted=0 ORDER BY id DESC OFFSET $1 LIMIT $2`, [skip, limit]),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table("user")} WHERE is_deleted=0`),
    ]);
    return ok({ rows: rows.rows, total: Number(count.rows[0].count) });
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response || !auth.user) return auth.response;
    const input = userSchema.parse(await request.json());
    const existing = await query(`SELECT id FROM ${table("user")} WHERE lower(email)=$1 OR mobile_no=$2 LIMIT 1`, [input.email, input.mobile_no]);
    if (existing.rowCount) return fail("Email or mobile number already exists", 409);
    const otp = String(randomInt(100000, 1000000));
    const newUser = await transaction(async (client) => {
      const created = await client.query<User>(
        `INSERT INTO ${table("user")} (first_name,last_name,email,mobile_no,password,roles,"createdBy") VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,first_name,last_name,email,mobile_no,roles,is_verified,is_active,"createdBy","createdAt"`,
        [input.first_name, input.last_name, input.email, input.mobile_no, await bcrypt.hash(input.password, 12), input.roles, `${auth.user.first_name} ${auth.user.last_name}`],
      );
      await client.query(`INSERT INTO ${table("user_verification")} ("userIdId",token,type) VALUES ($1,$2,'otp')`, [created.rows[0].id, otp]);
      return created.rows[0];
    });
    const sent = await sendMail({ to: newUser.email, subject: "Verify your Simsan account", html: otpEmail(newUser.first_name, otp) });
    logger.info("user.created", { actorId: auth.user.id, userId: newUser.id, role: newUser.roles, verificationEmailSent: sent });
    return ok({ user: newUser, verificationEmailSent: sent }, "User created", 201);
  } catch (error) { return handleError(error); }
}
