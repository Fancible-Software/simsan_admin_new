import "server-only";

import nodemailer from "nodemailer";
import { campaignEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";

interface MailInput { to: string; subject: string; html: string }

function mailSettings() {
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const password = process.env.SMTP_PASSWORD || process.env.EMAIL_PWD;
  const host = process.env.SMTP_HOST || (user?.toLowerCase().endsWith("@gmail.com") ? "smtp.gmail.com" : undefined);
  return { host, user, password };
}

export function mailConfigured() {
  const { host, user, password } = mailSettings();
  return Boolean(host && user && password);
}

export async function sendMail(input: MailInput) {
  if (!mailConfigured()) {
    logger.warn("mail.skipped", { reason: "smtp_not_configured", subject: input.subject, recipient: input.to });
    return false;
  }
  try {
    const { host, user, password } = mailSettings();
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: process.env.SMTP_REQUIRE_TLS !== "false",
      auth: { user, pass: password },
    });
    const result = await transport.sendMail({ from: process.env.EMAIL_FROM || user, ...input });
    logger.info("mail.sent", { subject: input.subject, recipient: input.to, messageId: result.messageId });
    return true;
  } catch (error) {
    logger.error("mail.failed", error, { subject: input.subject, recipient: input.to });
    throw error;
  }
}

export function otpEmail(name: string, otp: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Verify your Simsan account</h2><p>Hello ${name},</p><p>Your verification code is:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${otp}</p><p>This code expires in 15 minutes.</p></div>`;
}

export { campaignEmail };
