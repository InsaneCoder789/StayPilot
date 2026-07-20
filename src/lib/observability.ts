import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";
type Context = Record<string, unknown>;

function write(level: LogLevel, event: string, context: Context = {}) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "staypilot",
    event,
    ...context,
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (event: string, context?: Context) => write("info", event, context),
  warn: (event: string, context?: Context) => write("warn", event, context),
  error: (event: string, context?: Context) => write("error", event, context),
};

export function requestId(request: Request) {
  return request.headers.get("x-request-id")?.slice(0, 100) || randomUUID();
}

export function errorContext(error: unknown) {
  return error instanceof Error
    ? { errorName: error.name, errorMessage: error.message, stack: error.stack }
    : { errorMessage: String(error) };
}
