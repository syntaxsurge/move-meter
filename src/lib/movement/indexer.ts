import "server-only";

import { serverEnv } from "@/lib/env/server";

type GraphQLError = { message?: string };
type GraphQLResponse<T> = { data?: T; errors?: GraphQLError[] };

function createTimeoutSignal(timeoutMs: number): { signal: AbortSignal; cancel: () => void } {
  const timeoutFn = (AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }).timeout;
  if (typeof timeoutFn === "function") {
    return { signal: timeoutFn(timeoutMs), cancel: () => {} };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => clearTimeout(timeoutId) };
}

export async function movementIndexer<T>(
  query: string,
  variables: Record<string, unknown>,
  opts?: { timeoutMs?: number }
): Promise<T> {
  const { signal, cancel } = createTimeoutSignal(opts?.timeoutMs ?? 10_000);
  try {
    const res = await fetch(serverEnv.MOVEMENT_INDEXER_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Movement indexer HTTP ${res.status}: ${text}`);
    }

    const json = (await res.json()) as GraphQLResponse<T>;
    if (json.errors?.length) {
      throw new Error(
        json.errors.map((e) => e.message ?? "Unknown GraphQL error").join("; ")
      );
    }
    if (!json.data) throw new Error("Movement indexer returned no data");

    return json.data;
  } finally {
    cancel();
  }
}

