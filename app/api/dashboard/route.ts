import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { fail, handleError, ok } from "@/lib/api";
import { query, table } from "@/lib/db";
import { percentChange, resolveDashboardRange, type DashboardRange } from "@/lib/dashboard";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    let range: DashboardRange;
    try {
      range = resolveDashboardRange({
        preset: request.nextUrl.searchParams.get("range"),
        start: request.nextUrl.searchParams.get("start"),
        end: request.nextUrl.searchParams.get("end"),
      });
    } catch (error) {
      return fail(error instanceof Error ? error.message : "Invalid date range", 400);
    }
    if (range.preset === "all") {
      const earliest = await query<{ day: string }>(
        `SELECT to_char(coalesce(MIN("createdAt"),CURRENT_DATE),'YYYY-MM-DD') AS day FROM ${table("form")}`,
      );
      range = { ...resolveDashboardRange({ preset: "custom", start: earliest.rows[0].day, end: range.end }), preset: "all" };
    }

    const bucket = range.granularity;
    const bucketInterval = bucket === "day" ? "1 day" : bucket === "week" ? "1 week" : "1 month";
    const bounds = [range.start, range.end, range.previousStart, range.previousEnd];
    const [counts, trendResult, servicesResult, locationsResult, teamResult, recentResult] = await Promise.all([
      query<{
        activeServices: string; totalServices: string; verifiedUsers: string; invoices: string; revenue: string; quotes: string; quoteValue: string;
        averageInvoice: string; uniqueCustomers: string; returningCustomers: string; discounts: string; staleQuotes: string;
        previousInvoices: string; previousRevenue: string; previousQuotes: string; previousQuoteValue: string;
        allInvoices: string; allRevenue: string;
      }>(
        `WITH current_forms AS (
           SELECT * FROM ${table("form")} WHERE "createdAt">=$1::date AND "createdAt"<($2::date+INTERVAL '1 day')
         ), previous_forms AS (
           SELECT * FROM ${table("form")} WHERE "createdAt">=$3::date AND "createdAt"<($4::date+INTERVAL '1 day')
         ), current_customers AS (
           SELECT DISTINCT lower("customerEmail") AS email FROM current_forms WHERE type='FORM'
         ), lifetime_customers AS (
           SELECT lower("customerEmail") AS email,COUNT(*) AS invoice_count FROM ${table("form")} WHERE type='FORM' GROUP BY 1
         )
         SELECT
           (SELECT COUNT(*) FROM ${table("service")} WHERE "isActive"=1 AND "isDeleted"=FALSE)::text AS "activeServices",
           (SELECT COUNT(*) FROM ${table("service")} WHERE "isDeleted"=FALSE)::text AS "totalServices",
           (SELECT COUNT(*) FROM ${table("user")} WHERE is_deleted=0 AND is_verified=TRUE)::text AS "verifiedUsers",
           COUNT(*) FILTER (WHERE type='FORM')::text AS invoices,
           coalesce(SUM(final_amount::numeric) FILTER (WHERE type='FORM'),0)::text AS revenue,
           COUNT(*) FILTER (WHERE type='QUOTE')::text AS quotes,
           coalesce(SUM(final_amount::numeric) FILTER (WHERE type='QUOTE'),0)::text AS "quoteValue",
           coalesce(AVG(final_amount::numeric) FILTER (WHERE type='FORM'),0)::text AS "averageInvoice",
           COUNT(DISTINCT lower("customerEmail")) FILTER (WHERE type='FORM')::text AS "uniqueCustomers",
           (SELECT COUNT(*) FROM current_customers c JOIN lifetime_customers l USING(email) WHERE l.invoice_count>1)::text AS "returningCustomers",
           coalesce(SUM(discount::numeric) FILTER (WHERE type='FORM'),0)::text AS discounts,
           (SELECT COUNT(*) FROM ${table("form")} WHERE type='QUOTE' AND "createdAt"<CURRENT_DATE-INTERVAL '30 days')::text AS "staleQuotes",
           (SELECT COUNT(*) FROM previous_forms WHERE type='FORM')::text AS "previousInvoices",
           coalesce((SELECT SUM(final_amount::numeric) FROM previous_forms WHERE type='FORM'),0)::text AS "previousRevenue",
           (SELECT COUNT(*) FROM previous_forms WHERE type='QUOTE')::text AS "previousQuotes",
           coalesce((SELECT SUM(final_amount::numeric) FROM previous_forms WHERE type='QUOTE'),0)::text AS "previousQuoteValue",
           (SELECT COUNT(*) FROM ${table("form")} WHERE type='FORM')::text AS "allInvoices",
           coalesce((SELECT SUM(final_amount::numeric) FROM ${table("form")} WHERE type='FORM'),0)::text AS "allRevenue"
         FROM current_forms`,
        bounds,
      ),
      query<{ period: string; invoiceCount: string; quoteCount: string; revenue: string; quoteValue: string }>(
        `WITH buckets AS (
           SELECT generate_series(date_trunc('${bucket}',$1::date),date_trunc('${bucket}',$2::date),INTERVAL '${bucketInterval}') AS bucket
         )
         SELECT to_char(b.bucket,'YYYY-MM-DD') AS period,
           COUNT(f."formId") FILTER (WHERE f.type='FORM')::text AS "invoiceCount",
           COUNT(f."formId") FILTER (WHERE f.type='QUOTE')::text AS "quoteCount",
           coalesce(SUM(f.final_amount::numeric) FILTER (WHERE f.type='FORM'),0)::text AS revenue,
           coalesce(SUM(f.final_amount::numeric) FILTER (WHERE f.type='QUOTE'),0)::text AS "quoteValue"
         FROM buckets b LEFT JOIN ${table("form")} f ON f."createdAt">=GREATEST(b.bucket,$1::date) AND f."createdAt"<LEAST(b.bucket+INTERVAL '${bucketInterval}',$2::date+INTERVAL '1 day')
         GROUP BY b.bucket ORDER BY b.bucket`,
        [range.start, range.end],
      ),
      query<{ serviceId: number; name: string; invoiceCount: string; quoteCount: string; revenue: string }>(
        `SELECT s."serviceId",s."serviceName" AS name,
           COUNT(*) FILTER (WHERE f.type='FORM')::text AS "invoiceCount",
           COUNT(*) FILTER (WHERE f.type='QUOTE')::text AS "quoteCount",
           coalesce(SUM(fs.price::numeric) FILTER (WHERE f.type='FORM'),0)::text AS revenue
         FROM ${table("form_to_services")} fs JOIN ${table("form")} f ON f."formId"=fs."formId" JOIN ${table("service")} s ON s."serviceId"=fs."serviceId"
         WHERE f."createdAt">=$1::date AND f."createdAt"<($2::date+INTERVAL '1 day')
         GROUP BY s."serviceId",s."serviceName" ORDER BY (COUNT(*) FILTER (WHERE f.type='FORM')) DESC,coalesce(SUM(fs.price::numeric) FILTER (WHERE f.type='FORM'),0) DESC LIMIT 6`,
        [range.start, range.end],
      ),
      query<{ location: string; invoiceCount: string; quoteCount: string; revenue: string }>(
        `SELECT concat_ws(', ',NULLIF("customerCity",''),NULLIF("customerProvince",'')) AS location,
           COUNT(*) FILTER (WHERE type='FORM')::text AS "invoiceCount",
           COUNT(*) FILTER (WHERE type='QUOTE')::text AS "quoteCount",
           coalesce(SUM(final_amount::numeric) FILTER (WHERE type='FORM'),0)::text AS revenue
         FROM ${table("form")} WHERE "createdAt">=$1::date AND "createdAt"<($2::date+INTERVAL '1 day')
         GROUP BY "customerCity","customerProvince" ORDER BY coalesce(SUM(final_amount::numeric) FILTER (WHERE type='FORM'),0) DESC LIMIT 5`,
        [range.start, range.end],
      ),
      query<{ name: string; invoiceCount: string; quoteCount: string; revenue: string }>(
        `SELECT coalesce(NULLIF(concat_ws(' ',u.first_name,u.last_name),''),'Unknown') AS name,
           COUNT(*) FILTER (WHERE f.type='FORM')::text AS "invoiceCount",
           COUNT(*) FILTER (WHERE f.type='QUOTE')::text AS "quoteCount",
           coalesce(SUM(f.final_amount::numeric) FILTER (WHERE f.type='FORM'),0)::text AS revenue
         FROM ${table("form")} f LEFT JOIN ${table("user")} u ON u.id::text=f."createdBy"
         WHERE f."createdAt">=$1::date AND f."createdAt"<($2::date+INTERVAL '1 day')
         GROUP BY u.id,u.first_name,u.last_name ORDER BY coalesce(SUM(f.final_amount::numeric) FILTER (WHERE f.type='FORM'),0) DESC LIMIT 5`,
        [range.start, range.end],
      ),
      query<{ formId: number; type: "FORM" | "QUOTE"; customerName: string; customerCity: string; finalAmount: string; createdAt: string }>(
        `SELECT "formId",type,"customerName","customerCity",final_amount AS "finalAmount","createdAt"
         FROM ${table("form")} WHERE "createdAt">=$1::date AND "createdAt"<($2::date+INTERVAL '1 day') ORDER BY "createdAt" DESC LIMIT 7`,
        [range.start, range.end],
      ),
    ]);

    const number = (value: string) => Number(value) || 0;
    const row = counts.rows[0];
    const summary = {
      activeServices: number(row.activeServices), totalServices: number(row.totalServices), verifiedUsers: number(row.verifiedUsers), invoices: number(row.invoices),
      revenue: number(row.revenue), quotes: number(row.quotes), quoteValue: number(row.quoteValue), averageInvoice: number(row.averageInvoice),
      uniqueCustomers: number(row.uniqueCustomers), returningCustomers: number(row.returningCustomers), discounts: number(row.discounts),
      staleQuotes: number(row.staleQuotes), allInvoices: number(row.allInvoices), allRevenue: number(row.allRevenue),
    };
    const comparison = {
      invoices: percentChange(summary.invoices, number(row.previousInvoices)),
      revenue: percentChange(summary.revenue, number(row.previousRevenue)),
      quotes: percentChange(summary.quotes, number(row.previousQuotes)),
      quoteValue: percentChange(summary.quoteValue, number(row.previousQuoteValue)),
    };
    const trend = trendResult.rows.map((item) => ({
      period: item.period, day: item.period, invoiceCount: number(item.invoiceCount), count: number(item.invoiceCount),
      quoteCount: number(item.quoteCount), revenue: number(item.revenue), quoteValue: number(item.quoteValue),
    }));
    const data = {
      range, summary, comparison, trend,
      topServices: servicesResult.rows.map((item) => ({ ...item, invoiceCount: number(item.invoiceCount), quoteCount: number(item.quoteCount), revenue: number(item.revenue) })),
      topLocations: locationsResult.rows.map((item) => ({ ...item, invoiceCount: number(item.invoiceCount), quoteCount: number(item.quoteCount), revenue: number(item.revenue) })),
      team: teamResult.rows.map((item) => ({ ...item, invoiceCount: number(item.invoiceCount), quoteCount: number(item.quoteCount), revenue: number(item.revenue) })),
      recent: recentResult.rows,
      activeServices: summary.activeServices, invoices: summary.invoices, revenue: summary.revenue, verifiedUsers: summary.verifiedUsers,
    };
    logger.info("dashboard.viewed", { actorId: auth.user?.id, range: range.preset, startDate: range.start, endDate: range.end });
    return ok({ ...data, active_services_count: data.activeServices, feedback_count: data.invoices, revenue_count: data.revenue, verified_admin_count: data.verifiedUsers });
  } catch (error) { return handleError(error); }
}
