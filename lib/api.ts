import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "@/lib/logger";

export function ok(data: unknown = null, message = "Success", status = 200) {
  return NextResponse.json({ status: true, message, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ status: false, message, details }, { status });
}

export function handleError(error: unknown) {
  if (error instanceof ZodError) {
    logger.warn("api.validation_failed", { issues: error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.code })) });
    return fail("Please check the submitted fields.", 400, error.flatten());
  }
  logger.error("api.unhandled_error", error);
  const message = process.env.NODE_ENV === "production" ? "Unexpected server error" : error instanceof Error ? error.message : "Unexpected server error";
  return fail(message, 500);
}
