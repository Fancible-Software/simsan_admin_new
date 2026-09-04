import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table, transaction } from "@/lib/db";
import { getDocument, sendDocumentEmails } from "@/lib/invoice";
import { logger } from "@/lib/logger";
import type { FormRecord, FormService } from "@/lib/types";
import { formSchema } from "@/lib/validation";

interface Context { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request); if (auth.response) return auth.response;
    const id = Number((await params).id);
    const [form, services] = await Promise.all([
      query<FormRecord>(`SELECT * FROM ${table("form")} WHERE "formId"=$1`, [id]),
      query<FormService>(`SELECT fs.*,s."serviceName" FROM ${table("form_to_services")} fs JOIN ${table("service")} s ON s."serviceId"=fs."serviceId" WHERE fs."formId"=$1 ORDER BY fs.id`, [id]),
    ]);
    if (!form.rows[0]) return fail("Record not found", 404);
    if (form.rows[0].type === "FORM" && auth.user?.roles !== "admin") return fail("Administrator access required", 403);
    return ok({ ...form.rows[0], services: services.rows });
  } catch (error) { return handleError(error); }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const id = Number((await params).id);
    const input = formSchema.parse(await request.json());
    const updated = await transaction(async (client) => {
      const result = await client.query<FormRecord>(
        `UPDATE ${table("form")} SET type=$1,"customerName"=$2,"customerEmail"=$3,"customerPhone"=$4,"customerAddress"=$5,"customerPostalCode"=$6,"customerCity"=$7,"customerProvince"=$8,"customerCountry"=$9,total=$10,discount=$11,discount_percent=$12,is_taxable=$13,final_amount=$14,comment=$15,"updatedAt"=NOW() WHERE "formId"=$16 RETURNING *`,
        [input.type, input.customerName, input.customerEmail, input.customerPhone, input.customerAddress, input.customerPostalCode, input.customerCity, input.customerProvince, input.customerCountry, String(input.total), String(input.discount), String(input.discount_percent), input.is_taxable, String(input.final_amount), input.comment, id],
      );
      if (!result.rows[0]) return null;
      await client.query(`DELETE FROM ${table("form_to_services")} WHERE "formId"=$1`, [id]);
      for (const service of input.services) await client.query(`INSERT INTO ${table("form_to_services")} ("formId","serviceId",price) VALUES ($1,$2,$3)`, [id, service.serviceId, String(service.price)]);
      return result.rows[0];
    });
    if (!updated) return fail("Record not found", 404);
    const document = await getDocument(updated.formId, updated.invoiceUuid, updated.type);
    if (document) await sendDocumentEmails(document, request.nextUrl.origin, true);
    logger.info("form.updated", { actorId: auth.user?.id, formId: id, documentType: updated.type, serviceCount: input.services.length });
    return ok(updated, "Record updated");
  } catch (error) { return handleError(error); }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const id = Number((await params).id);
    const result = await query(`DELETE FROM ${table("form")} WHERE "formId"=$1`, [id]);
    if (result.rowCount) logger.info("form.deleted", { actorId: auth.user?.id, formId: id });
    return result.rowCount ? ok(null, "Record deleted") : fail("Record not found", 404);
  } catch (error) { return handleError(error); }
}
