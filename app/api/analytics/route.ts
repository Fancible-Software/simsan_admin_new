import type { NextRequest } from "next/server";
import { authorized } from "@/lib/api-auth";
import { handleError, ok } from "@/lib/api";
import { analyticsSchema, getAnalytics } from "@/lib/analytics";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const auth = await authorized(request, true); if (auth.response) return auth.response;
    const input = analyticsSchema.parse(await request.json());
    const result = await getAnalytics(input);
    logger.info("analytics.generated", { actorId: auth.user?.id, type: input.type, startDate: input.startDate, endDate: input.endDate, recordCount: result.numberOfSales });
    return ok(result);
  } catch (error) { return handleError(error); }
}
