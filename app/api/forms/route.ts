import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table, transaction } from "@/lib/db";
import { getDocument, sendDocumentEmails } from "@/lib/invoice";
import { logger } from "@/lib/logger";
import { canCreateForm, canViewForm } from "@/lib/permissions";
import type { FormRecord } from "@/lib/types";
import { formSchema } from "@/lib/validation";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request); if (auth.response) return auth.response;
    const type = request.nextUrl.searchParams.get("type") === "QUOTE" ? "QUOTE" : "FORM";
    if (!auth.user || !canViewForm(auth.user.roles, type)) {
      logger.warn("authorization.denied", { path: request.nextUrl.pathname, userId: auth.user?.id, reason: "document_list_forbidden", documentType: type });
      return fail("Administrator access required", 403);
    }
    const search = (request.nextUrl.searchParams.get("search") || request.nextUrl.searchParams.get("searchTerm") || "").trim();
    const skip = Math.max(0, Number(request.nextUrl.searchParams.get("skip") || 0));
    const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get("limit") || 10)));
    const where = search
      ? `f.type=$1 AND (f."customerName" ILIKE $2 OR f."customerEmail" ILIKE $2 OR coalesce(f."customerPhone",'') ILIKE $2 OR f."customerAddress" ILIKE $2 OR f."customerCity" ILIKE $2 OR f."customerPostalCode" ILIKE $2)`
      : `f.type=$1`;
    const values = search ? [type, `%${search}%`, skip, limit] : [type, skip, limit];
    const offsetIndex = search ? 3 : 2;
    const aggregateValues = search ? [type, `%${search}%`] : [type];
    const [rows, count, summaryResult] = await Promise.all([
      query<FormRecord>(
        `SELECT f.*,concat_ws(' ',u.first_name,u.last_name) AS "creatorName" FROM ${table("form")} f LEFT JOIN ${table("user")} u ON u.id::text=f."createdBy" WHERE ${where} ORDER BY f."formId" DESC OFFSET $${offsetIndex} LIMIT $${offsetIndex + 1}`,
        values,
      ),
      query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM ${table("form")} f WHERE ${where}`, aggregateValues),
      query<{ totalValue: string; averageValue: string; uniqueCustomers: string }>(
        `SELECT coalesce(SUM(f.final_amount::numeric),0)::text AS "totalValue",
                coalesce(AVG(f.final_amount::numeric),0)::text AS "averageValue",
                COUNT(DISTINCT lower(f."customerEmail"))::text AS "uniqueCustomers"
         FROM ${table("form")} f WHERE ${where}`,
        aggregateValues,
      ),
    ]);
    const total = Number(count.rows[0].count);
    const summary = summaryResult.rows[0];
    logger.info("forms.list_viewed", { actorId: auth.user.id, documentType: type, total, searchApplied: Boolean(search), skip, limit });
    return ok({
      rows: rows.rows,
      total,
      summary: {
        totalValue: Number(summary.totalValue) || 0,
        averageValue: Number(summary.averageValue) || 0,
        uniqueCustomers: Number(summary.uniqueCustomers) || 0,
      },
    });
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorized(request); if (auth.response || !auth.user) return auth.response;
    const input = formSchema.parse(await request.json());
    if (!canCreateForm(auth.user.roles, input.type)) {
      logger.warn("authorization.denied", { path: request.nextUrl.pathname, userId: auth.user.id, reason: "document_create_forbidden", documentType: input.type });
      return fail("Administrator access required", 403);
    }
    const form = await transaction(async (client) => {
      const inserted = await client.query<FormRecord>(
        `INSERT INTO ${table("form")} ("invoiceUuid",type,"customerName","invoiceNumber","customerEmail","customerPhone","customerAddress","customerPostalCode","customerCity","customerProvince","customerCountry",total,discount,discount_percent,is_taxable,final_amount,comment,"createdBy")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [randomUUID(), input.type, input.customerName, String(Date.now()), input.customerEmail, input.customerPhone, input.customerAddress, input.customerPostalCode, input.customerCity, input.customerProvince, input.customerCountry, String(input.total), String(input.discount), String(input.discount_percent), input.is_taxable, String(input.final_amount), input.comment, String(auth.user.id)],
      );
      for (const service of input.services) {
        await client.query(`INSERT INTO ${table("form_to_services")} ("formId","serviceId",price) VALUES ($1,$2,$3)`, [inserted.rows[0].formId, service.serviceId, String(service.price)]);
      }
      return inserted.rows[0];
    });
    const document = await getDocument(form.formId, form.invoiceUuid, form.type);
    if (document) {
      await sendDocumentEmails(document, request.nextUrl.origin);
    }
    logger.info("form.created", { actorId: auth.user.id, formId: form.formId, documentType: form.type, serviceCount: input.services.length });
    return ok(form, `${form.type === "FORM" ? "Invoice" : "Quote"} created`, 201);
  } catch (error) { return handleError(error); }
}
