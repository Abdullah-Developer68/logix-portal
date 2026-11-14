import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getSql } from "@/db";

export interface RateLimitResult {
  allowed: boolean;
  retryAfter: number;
  count?: number;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 100);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 100);
  return "unknown";
}

export async function checkRateLimit(params: {
  key: string;
  limit: number;
  windowSeconds: number;
  failClosed?: boolean;
}): Promise<RateLimitResult> {
  const { key, limit, windowSeconds, failClosed = false } = params;

  try {
    const sql = getSql();
    const rows = await sql<{ count: number; retry_after: number }[]>`
      INSERT INTO portal_rate_limits (key, window_start, count)
      VALUES (${key}, now(), 1)
      ON CONFLICT (key) DO UPDATE
      SET count = CASE
            WHEN portal_rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
            THEN 1
            ELSE portal_rate_limits.count + 1
          END,
          window_start = CASE
            WHEN portal_rate_limits.window_start < now() - make_interval(secs => ${windowSeconds})
            THEN now()
            ELSE portal_rate_limits.window_start
          END
      RETURNING
        count,
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (window_start + make_interval(secs => ${windowSeconds}) - now())))
        )::int AS retry_after
    `;

    const row = rows[0];
    if (!row) {
      return failClosed
        ? { allowed: false, retryAfter: 60 }
        : { allowed: true, retryAfter: 0 };
    }

    if (row.count > limit) {
      return {
        allowed: false,
        retryAfter: Math.max(1, Number(row.retry_after) || windowSeconds),
        count: row.count,
      };
    }

    return { allowed: true, retryAfter: 0, count: row.count };
  } catch (err) {
    console.error("[RATE LIMIT DB ERROR]", err);
    if (failClosed) {
      return { allowed: false, retryAfter: 60 };
    }
    return { allowed: true, retryAfter: 0 };
  }
}

export function rateLimitResponse(retryAfter: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, retryAfter)),
      },
    },
  );
}
