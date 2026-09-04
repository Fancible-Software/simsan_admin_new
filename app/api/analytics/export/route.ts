import ExcelJS from "exceljs";
import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { analyticsSchema, getAnalytics } from "@/lib/analytics";
import { fail, handleError } from "@/lib/api";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const input = analyticsSchema.parse({
      startDate: request.nextUrl.searchParams.get("startDate"),
      endDate: request.nextUrl.searchParams.get("endDate"),
      type: request.nextUrl.searchParams.get("type"),
    });
    const analytics = await getAnalytics(input);
    if (!analytics.rows.length) return fail("No records were found for the specified period", 404);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Simsan Fraser Maintenance";
    workbook.created = new Date();
    const sales = workbook.addWorksheet("Sales", { views: [{ state: "frozen", ySplit: 1 }] });
    sales.columns = [
      { header: "Date", key: "date", width: 16 }, { header: "Type", key: "type", width: 12 },
      { header: "Invoice Number", key: "invoiceNumber", width: 23 }, { header: "Customer", key: "customer", width: 28 },
      { header: "Email", key: "email", width: 32 }, { header: "Phone", key: "phone", width: 18 },
      { header: "Address", key: "address", width: 34 }, { header: "City", key: "city", width: 20 },
      { header: "Province", key: "province", width: 12 }, { header: "Postal Code", key: "postal", width: 14 },
      { header: "Subtotal", key: "subtotal", width: 14 }, { header: "Discount", key: "discount", width: 14 },
      { header: "Total", key: "total", width: 14 }, { header: "Created By", key: "createdBy", width: 24 },
    ];
    for (const row of analytics.rows) sales.addRow({ date: new Date(row.createdAt), type: row.type, invoiceNumber: row.invoiceNumber, customer: row.customerName, email: row.customerEmail, phone: row.customerPhone, address: row.customerAddress, city: row.customerCity, province: row.customerProvince, postal: row.customerPostalCode, subtotal: Number(row.total), discount: Number(row.discount), total: Number(row.final_amount), createdBy: row.creatorName });
    sales.autoFilter = { from: "A1", to: "N1" };
    sales.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sales.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF171914" } };
    ["K", "L", "M"].forEach((column) => { sales.getColumn(column).numFmt = '"$"#,##0.00'; });
    sales.getColumn("A").numFmt = "yyyy-mm-dd";

    const summary = workbook.addWorksheet("Analytics");
    summary.columns = [{ header: "Metric", key: "metric", width: 30 }, { header: "Value", key: "value", width: 24 }];
    summary.addRows([
      { metric: "From", value: input.startDate }, { metric: "To", value: input.endDate },
      { metric: "Record type", value: input.type === "FORM" ? "Invoices" : "Quotes" },
      { metric: "Number of sales", value: analytics.numberOfSales },
      { metric: "Total sales", value: analytics.totalSales }, { metric: "Average sale", value: analytics.averageSale },
      { metric: "Unique customers", value: analytics.uniqueCustomers },
    ]);
    summary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF171914" } };
    summary.getCell("B6").numFmt = '"$"#,##0.00';
    summary.getCell("B7").numFmt = '"$"#,##0.00';
    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `Report_Simsan_${input.startDate}_To_${input.endDate}.xlsx`;
    logger.info("analytics.exported", { actorId: auth.user?.id, type: input.type, recordCount: analytics.numberOfSales, fileName });
    return new Response(buffer, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${fileName}"`, "cache-control": "private, no-store" } });
  } catch (error) { return handleError(error); }
}
