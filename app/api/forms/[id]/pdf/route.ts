import type { NextRequest } from "next/server";
import { fail, handleError } from "@/lib/api";
import { getDocument } from "@/lib/invoice";
import { generateAndPersistDocumentPdf } from "@/lib/pdf";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await params).id);
    const uuid = request.nextUrl.searchParams.get("uuid") || "";
    const type = request.nextUrl.searchParams.get("type") === "QUOTE" ? "QUOTE" : "FORM";
    const document = await getDocument(id, uuid, type);
    if (!document) return fail("Document not found", 404);
    const generated = await generateAndPersistDocumentPdf(document);
    return new Response(Uint8Array.from(generated.bytes).buffer, { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${generated.fileName}"`, "cache-control": "private, no-store" } });
  } catch (error) { return handleError(error); }
}
