import "server-only";

import { z } from "zod";
import { query, table } from "@/lib/db";
import type { FormRecord, FormType } from "@/lib/types";

export const analyticsSchema = z.object({ startDate: z.iso.date(), endDate: z.iso.date(), type: z.enum(["FORM", "QUOTE"]) });
export type AnalyticsInput = { startDate: string; endDate: string; type: FormType };

export async function getAnalytics(input: AnalyticsInput) {
  const result = await query<FormRecord>(
    `SELECT f.*,concat_ws(' ',u.first_name,u.last_name) AS "creatorName" FROM ${table("form")} f LEFT JOIN ${table("user")} u ON u.id::text=f."createdBy" WHERE f.type=$1 AND f."createdAt">=$2::date AND f."createdAt"<($3::date+INTERVAL '1 day') ORDER BY f."createdAt" DESC`,
    [input.type, input.startDate, input.endDate],
  );
  const total = result.rows.reduce((sum, row) => sum + Number(row.final_amount), 0);
  const unique = new Set(result.rows.map((row) => row.customerEmail.toLowerCase())).size;
  return {
    rows: result.rows,
    numberOfSales: result.rows.length,
    totalSales: total,
    averageSale: result.rows.length ? total / result.rows.length : 0,
    uniqueCustomers: unique,
  };
}
