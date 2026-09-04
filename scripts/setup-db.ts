import { ensureDatabase, pool } from "../lib/db";
import { logger } from "../lib/logger";

async function main() {
  await ensureDatabase();
  logger.info("database.setup.completed");
  await pool().end();
}

main().catch((error) => {
  logger.error("database.setup.failed", error);
  process.exitCode = 1;
});
