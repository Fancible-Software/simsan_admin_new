import "server-only";

import { query, table } from "@/lib/db";
import { documentEmail } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import { sendMail } from "@/lib/mail";
import type { FormRecord, FormService } from "@/lib/types";

export interface DocumentData {
  form: FormRecord;
  services: FormService[];
  config: Record<string, string>;
  seller: string;
}

export async function getDocument(id: number, uuid: string, type: "FORM" | "QUOTE"): Promise<DocumentData | null> {
  const result = await query<FormRecord>(
    `SELECT f.*,concat_ws(' ',u.first_name,u.last_name) AS "creatorName"
     FROM ${table("form")} f LEFT JOIN ${table("user")} u ON u.id::text=f."createdBy"
     WHERE f."formId"=$1 AND f."invoiceUuid"::text=$2 AND f.type=$3`,
    [id, uuid, type],
  );
  const form = result.rows[0];
  if (!form) return null;
  const [services, configs] = await Promise.all([
    query<FormService>(
      `SELECT fs.id,fs."formId",fs."serviceId",fs.price,s."serviceName"
       FROM ${table("form_to_services")} fs JOIN ${table("service")} s ON s."serviceId"=fs."serviceId" WHERE fs."formId"=$1 ORDER BY fs.id`,
      [id],
    ),
    query<{ key: string; value: string }>(`SELECT key,value FROM ${table("configurations")}`),
  ]);
  return {
    form,
    services: services.rows,
    config: Object.fromEntries(configs.rows.map((item) => [item.key, item.value])),
    seller: form.creatorName || "Simsan Fraser Maintenance",
  };
}

export async function sendDocumentEmails(document: DocumentData, publicUrl: string, updated = false) {
  const label = document.form.type === "FORM" ? "Invoice" : "Quote";
  const subject = `${updated ? "Updated " : ""}${label} - Simsan Fraser Maintenance`;
  const configuredUrl = process.env.PUBLIC_APP_URL || process.env.BACKEND_URI || publicUrl;
  const normalizedPublicUrl = configuredUrl.replace(/\/api\/?$/, "").replace(/\/$/, "");
  const html = documentEmail(document, normalizedPublicUrl);
  const officeEmail = process.env.ADMIN_EMAIL || "simsanfrasermain@gmail.com";
  const recipients = [document.form.customerEmail, officeEmail].filter((value): value is string => Boolean(value));
  const uniqueRecipients = [...new Set(recipients.map((recipient) => recipient.toLowerCase()))];
  const results = await Promise.all(uniqueRecipients.map((to) => sendMail({ to, subject, html })));
  logger.info("document.email.completed", {
    formId: document.form.formId,
    documentType: document.form.type,
    recipientCount: uniqueRecipients.length,
    deliveredCount: results.filter(Boolean).length,
    updated,
  });
  return results;
}

export { documentEmail };
