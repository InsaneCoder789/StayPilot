import { NextResponse } from "next/server";

import { getDb } from "@/lib/db";
import { errorContext, logger, requestId } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = requestId(request);
  const startedAt = performance.now();

  try {
    await getDb().$queryRaw`SELECT 1`;
    const durationMs = Math.round(performance.now() - startedAt);
    logger.info("health.ready", { requestId: id, durationMs });
    return NextResponse.json(
      {
        status: "ready",
        service: "staypilot",
        version: process.env.npm_package_version ?? "unknown",
        database: "connected",
        timestamp: new Date().toISOString(),
        durationMs,
      },
      { headers: { "x-request-id": id, "cache-control": "no-store" } },
    );
  } catch (error) {
    logger.error("health.unavailable", { requestId: id, ...errorContext(error) });
    return NextResponse.json(
      { status: "unavailable", service: "staypilot", database: "disconnected", timestamp: new Date().toISOString() },
      { status: 503, headers: { "x-request-id": id, "cache-control": "no-store" } },
    );
  }
}
