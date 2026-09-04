import type { NextRequest } from "next/server";
import { z } from "zod";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { getDocument } from "@/lib/invoice";
import { generateAndPersistDocumentPdf } from "@/lib/pdf";
import type { FormRecord } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(await request.json());
    const form = await query<FormRecord>(`SELECT * FROM ${table("form")} WHERE "formId"=$1`, [id]);
    if (!form.rows[0]) return fail("Document not found", 404);
    const document = await getDocument(id, form.rows[0].invoiceUuid, form.rows[0].type);
    if (!document) return fail("Document not found", 404);
    const generated = await generateAndPersistDocumentPdf(document);
    return ok({ invoice_id: form.rows[0].invoiceNumber, path: generated.filePath, file_name: generated.fileName }, "Document generated");
  } catch (error) { return handleError(error); }
}
