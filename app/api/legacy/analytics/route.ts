import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { analyticsSchema, getAnalytics } from "@/lib/analytics";
import { handleError } from "@/lib/api";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const input = analyticsSchema.parse(await request.json());
    const analytics = await getAnalytics(input);
    return Response.json({ status: true, "Number Of Sales": analytics.numberOfSales, data: analytics.rows, "Total Sales in $": analytics.totalSales, "Average Sales in $": analytics.averageSale, "Number of Unique Customers": analytics.uniqueCustomers });
  } catch (error) { return handleError(error); }
}
