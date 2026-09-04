import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { getDocument, sendDocumentEmails } from "@/lib/invoice";
import { logger } from "@/lib/logger";
import type { FormRecord } from "@/lib/types";

interface Context { params: Promise<{ id: string }> }

async function convert(request: NextRequest, { params }: Context, legacy = false) {
  try {
    const auth = await authorized(request, true);
    const id = Number((await params).id);
    if (auth.response && !legacy) return auth.response;
    const uuid = request.nextUrl.searchParams.get("uuid");
    const result = await query<FormRecord>(`UPDATE ${table("form")} SET type='FORM',"createdAt"=NOW(),"updatedAt"=NOW() WHERE "formId"=$1 AND type='QUOTE' ${legacy ? `AND "invoiceUuid"::text=$2` : ""} RETURNING *`, legacy ? [id, uuid] : [id]);
    const form = result.rows[0];
    if (!form) return fail("Quote not found", 404);
    const document = await getDocument(form.formId, form.invoiceUuid, "FORM");
    if (document) await sendDocumentEmails(document, request.nextUrl.origin);
    logger.info("form.quote_converted", { actorId: auth.user?.id, formId: id, legacy });
    return ok(form, "Quote converted to invoice");
  } catch (error) { return handleError(error); }
}

export async function POST(request: NextRequest, context: Context) { return convert(request, context); }
export async function GET(request: NextRequest, context: Context) { return convert(request, context, request.nextUrl.searchParams.get("legacy") === "true"); }
