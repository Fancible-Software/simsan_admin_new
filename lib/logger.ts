export type LogFields = Record<string, unknown>;

function errorFields(error: unknown): LogFields {
  if (!(error instanceof Error)) return { error: String(error) };
  return {
    error: error.message,
    errorName: error.name,
    stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
  };
}

function write(level: "debug" | "info" | "warn" | "error", event: string, fields: LogFields = {}) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "simsan-admin",
    event,
    ...fields,
  });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else if (level === "debug") console.debug(record);
  else console.info(record);
}

export const logger = {
  debug: (event: string, fields?: LogFields) => write("debug", event, fields),
  info: (event: string, fields?: LogFields) => write("info", event, fields),
  warn: (event: string, fields?: LogFields) => write("warn", event, fields),
  error: (event: string, error: unknown, fields: LogFields = {}) => write("error", event, { ...fields, ...errorFields(error) }),
};
