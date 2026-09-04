import { logger } from "@/lib/logger";

export function register() {
  logger.info("application.started", {
    environment: process.env.NODE_ENV || "development",
    runtime: process.env.NEXT_RUNTIME || "nodejs",
  });
}
