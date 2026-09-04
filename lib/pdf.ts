import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { query, table } from "@/lib/db";
import type { DocumentData } from "@/lib/invoice";
import { logger } from "@/lib/logger";

const pageWidth = 612;
const pageHeight = 792;

export async function generateDocumentPdf(document: DocumentData) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = 730;
  const label = document.form.type === "FORM" ? "Invoice" : "Quote";

  const write = (text: string, size = 10, x = 52, strong = false, color = rgb(0.1, 0.11, 0.09)) => {
    page.drawText(text.replaceAll(/[^\x20-\x7E]/g, " "), { x, y, size, font: strong ? bold : regular, color });
    y -= size + 7;
  };
  const newPage = () => { page = pdf.addPage([pageWidth, pageHeight]); y = 735; };

  page.drawRectangle({ x: 0, y: 780, width: 205, height: 12, color: rgb(0.96, 0.32, 0.14) });
  page.drawRectangle({ x: 205, y: 780, width: 407, height: 12, color: rgb(0.08, 0.09, 0.07) });
  write(label.toUpperCase(), 30, 52, true);
  write(`#${document.form.invoiceNumber}`, 12, 52, true, rgb(0.96, 0.32, 0.14));
  write(new Date(document.form.createdAt).toLocaleDateString("en-CA"), 10);
  y -= 14;
  write(document.config.company_name || "Simsan Fraser Maintenance", 14, 52, true);
  write([document.config.company_address, document.config.company_city, document.config.company_zip].filter(Boolean).join(", "), 10);
  if (document.config.gst) write(`GST: ${document.config.gst}`, 10);
  write(`Prepared by ${document.seller}`, 10);
  y -= 14;
  write("BILL TO", 9, 52, true, rgb(0.96, 0.32, 0.14));
  write(document.form.customerName, 13, 52, true);
  write(document.form.customerEmail, 10);
  write(document.form.customerPhone || "", 10);
  write(`${document.form.customerAddress}, ${document.form.customerCity}, ${document.form.customerProvince} ${document.form.customerPostalCode}`, 10);
  y -= 20;
  write("SERVICES", 9, 52, true, rgb(0.96, 0.32, 0.14));
  for (const service of document.services) {
    if (y < 120) newPage();
    page.drawLine({ start: { x: 52, y: y - 4 }, end: { x: 560, y: y - 4 }, thickness: 0.5, color: rgb(0.84, 0.83, 0.79) });
    write(service.serviceName || "Service", 10, 52, true);
    page.drawText(`$${Number(service.price).toFixed(2)}`, { x: 485, y: y + 17, size: 10, font: bold });
  }
  y -= 18;
  const discounted = Number(document.form.total) - Number(document.form.discount);
  const tax = Number(document.form.final_amount) - discounted;
  write(`Subtotal: $${Number(document.form.total).toFixed(2)} CAD`, 11, 340, true);
  if (Number(document.form.discount) > 0) write(`Discount: -$${Number(document.form.discount).toFixed(2)} CAD`, 11, 340);
  if (document.form.is_taxable) write(`GST (5%): $${tax.toFixed(2)} CAD`, 11, 340);
  write(`Total: $${Number(document.form.final_amount).toFixed(2)} CAD`, 15, 340, true, rgb(0.96, 0.32, 0.14));
  if (document.form.comment) {
    y -= 18;
    write("NOTES", 9, 52, true, rgb(0.96, 0.32, 0.14));
    write(document.form.comment.slice(0, 250), 10);
  }
  return pdf.save();
}

export async function generateAndPersistDocumentPdf(document: DocumentData) {
  const bytes = await generateDocumentPdf(document);
  const fileName = `${document.form.type === "FORM" ? "invoice" : "quote"}-${document.form.invoiceNumber}.pdf`;
  let filePath: string;
  if (process.env.VERCEL) {
    filePath = `/api/forms/${document.form.formId}/pdf?uuid=${document.form.invoiceUuid}&type=${document.form.type}`;
  } else {
    const directory = process.env.INVOICE_OUTPUT_PATH
      ? path.resolve(/* turbopackIgnore: true */ process.env.INVOICE_OUTPUT_PATH)
      : path.join(process.cwd(), "public", "invoices");
    await mkdir(directory, { recursive: true });
    filePath = path.join(directory, fileName);
    await writeFile(filePath, bytes);
  }
  await query(`UPDATE ${table("form")} SET is_invoice_generated=TRUE,invoice_id=$1,invoice_path=$2,"updatedAt"=NOW() WHERE "formId"=$3`, [document.form.invoiceNumber, filePath, document.form.formId]);
  logger.info("document.pdf.generated", { formId: document.form.formId, documentType: document.form.type, fileName, bytes: bytes.length, storage: process.env.VERCEL ? "on_demand" : "filesystem" });
  return { bytes, fileName, filePath };
}
