import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { getUpstashEnv } from "@/lib/env/upstash";

type LimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  source: "upstash" | "memory";
};

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000;

type WindowState = { windowStart: number; count: number };

let cachedUpstash: Ratelimit | null | undefined;
const memoryWindows = new Map<string, WindowState>();
let lastMemoryCleanupAt = 0;

function getUpstashRatelimit(): Ratelimit | null {
  if (cachedUpstash !== undefined) return cachedUpstash;

  const env = getUpstashEnv();
  if (!env) {
    cachedUpstash = null;
    return cachedUpstash;
  }

  cachedUpstash = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(DEFAULT_LIMIT, "60 s"),
    analytics: true,
    prefix: "move-meter",
  });

  return cachedUpstash;
}

function cleanupMemoryLimiter(now: number) {
  if (now - lastMemoryCleanupAt < DEFAULT_WINDOW_MS) return;
  lastMemoryCleanupAt = now;

  const minWindowStart = Math.floor((now - DEFAULT_WINDOW_MS * 2) / DEFAULT_WINDOW_MS) * DEFAULT_WINDOW_MS;
  for (const [key, state] of memoryWindows) {
    if (state.windowStart < minWindowStart) {
      memoryWindows.delete(key);
    }
  }
}

function limitInMemory(key: string, now: number): LimitResult {
  const windowStart = Math.floor(now / DEFAULT_WINDOW_MS) * DEFAULT_WINDOW_MS;
  const reset = windowStart + DEFAULT_WINDOW_MS;

  const prev = memoryWindows.get(key);
  if (!prev || prev.windowStart !== windowStart) {
    memoryWindows.set(key, { windowStart, count: 1 });
    cleanupMemoryLimiter(now);
    return {
      success: true,
      limit: DEFAULT_LIMIT,
      remaining: DEFAULT_LIMIT - 1,
      reset,
      source: "memory",
    };
  }

  const nextCount = prev.count + 1;
  memoryWindows.set(key, { windowStart, count: nextCount });
  cleanupMemoryLimiter(now);

  return {
    success: nextCount <= DEFAULT_LIMIT,
    limit: DEFAULT_LIMIT,
    remaining: Math.max(DEFAULT_LIMIT - nextCount, 0),
    reset,
    source: "memory",
  };
}

export async function rateLimitApi(key: string): Promise<LimitResult> {
  const upstash = getUpstashRatelimit();
  if (!upstash) return limitInMemory(key, Date.now());

  const { success, limit, remaining, reset } = await upstash.limit(key);
  return { success, limit, remaining, reset, source: "upstash" };
}
