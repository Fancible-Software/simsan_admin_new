import type { NextRequest } from "next/server";
import { handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { contactSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

const attempts = new Map<string, { count: number; reset: number }>();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    const now = Date.now();
    const prior = attempts.get(ip);
    if (prior && prior.reset > now && prior.count >= 5) {
      logger.warn("contact.rate_limited", { ip });
      return Response.json({ status: false, message: "Too many requests" }, { status: 429 });
    }
    attempts.set(ip, prior && prior.reset > now ? { ...prior, count: prior.count + 1 } : { count: 1, reset: now + 15 * 60_000 });
    const input = contactSchema.parse(await request.json());
    await query(`INSERT INTO ${table("contact")} (name,email,phone,service,address,message) VALUES ($1,$2,$3,$4,$5,$6)`, [input.name, input.email, input.phone, input.service, input.address || null, input.message]);
    const officeEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (officeEmail) await sendMail({ to: officeEmail, subject: `[Lead] Contact from ${input.name}`, html: `<p>${input.message}</p><p>${input.name}<br>${input.email}<br>${input.phone}<br>${input.service}</p>` });
    logger.info("contact.created", { hasAddress: Boolean(input.address), service: input.service, notificationAttempted: Boolean(officeEmail) });
    return ok(null, "Thank you for contacting us. We will get back to you soon.");
  } catch (error) { return handleError(error); }
}
