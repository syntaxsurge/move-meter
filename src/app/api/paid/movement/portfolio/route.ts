import { randomUUID } from "crypto";
import { z } from "zod";
import { withX402 } from "@x402/next";
import { declareDiscoveryExtension } from "@x402/extensions/bazaar";
import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { getX402ServerEnv } from "@/lib/env/x402";
import type { PortfolioReportCreateArgs } from "@/lib/convex/api";
import { createPortfolioReportServer, logPaidCallServer } from "@/lib/convex/http";
import { movementIndexer } from "@/lib/movement/indexer";
import { MovementAddressSchema } from "@/lib/movement/validation";
import { rateLimitApi } from "@/lib/security/ratelimit";
import { getX402Server } from "@/lib/x402/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  address: MovementAddressSchema,
  limit: z.number().int().min(1).max(50).optional(),
});

type PortfolioBalance = {
  amount: string;
  assetType: string;
  metadata: null | {
    decimals: number | null;
    iconUri: string | null;
    name: string | null;
    projectUri: string | null;
    symbol: string | null;
  };
};

type PortfolioActivity = {
  transactionVersion: string;
  amount: string;
  assetType: string;
  type: string;
  transactionTimestamp: string;
};

export type PortfolioReport = {
  address: string;
  balances: PortfolioBalance[];
  recentActivities: PortfolioActivity[];
  generatedAt: string;
};

type PortfolioResponse =
  | {
      ok: false;
      error: string;
      details?: string;
    }
  | {
      ok: true;
      share: { slug: string };
      report: PortfolioReport;
    };

const GET_BALANCES = /* GraphQL */ `
  query GetAddressTokenBalances($owner_address: String!) {
    current_fungible_asset_balances(where: { owner_address: { _eq: $owner_address } }) {
      amount
      asset_type
      metadata {
        decimals
        icon_uri
        name
        project_uri
        symbol
      }
    }
  }
`;

const GET_HISTORY = /* GraphQL */ `
  query GetAddressTokenHistory($account_address: String!, $limit: Int!) {
    account_transactions(
      where: { account_address: { _eq: $account_address } }
      order_by: { transaction_version: desc }
      limit: $limit
    ) {
      transaction_version
      fungible_asset_activities {
        amount
        asset_type
        type
        transaction_timestamp
      }
    }
  }
`;

type BalancesResp = {
  current_fungible_asset_balances: Array<{
    amount: string;
    asset_type: string;
    metadata: null | {
      decimals: number | null;
      icon_uri: string | null;
      name: string | null;
      project_uri: string | null;
      symbol: string | null;
    };
  }>;
};

type HistoryResp = {
  account_transactions: Array<{
    transaction_version: string | number;
    fungible_asset_activities: Array<{
      amount: string;
      asset_type: string;
      type: string;
      transaction_timestamp: string;
    }>;
  }>;
};

async function handler(req: NextRequest): Promise<NextResponse<PortfolioResponse>> {
  const x402Env = getX402ServerEnv();

  const json = (await req.json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json<PortfolioResponse>(
      { ok: false, error: "Invalid request body" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const address = parsed.data.address.toLowerCase();
  const limit = parsed.data.limit ?? 25;

  let balances: BalancesResp;
  let history: HistoryResp;
  try {
    [balances, history] = await Promise.all([
      movementIndexer<BalancesResp>(GET_BALANCES, { owner_address: address }),
      movementIndexer<HistoryResp>(GET_HISTORY, { account_address: address, limit }),
    ]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    void logPaidCallServer({
      route: "/api/paid/movement/portfolio",
      network: x402Env.X402_NETWORK,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
      priceUsd: x402Env.X402_PRICE_USD,
      ok: false,
    });
    return NextResponse.json<PortfolioResponse>(
      { ok: false, error: "Failed to query Movement indexer", details: message },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  const balancesNormalized: PortfolioBalance[] = balances.current_fungible_asset_balances
    .map((b) => ({
      amount: b.amount,
      assetType: b.asset_type,
      metadata: b.metadata
        ? {
            decimals: b.metadata.decimals,
            iconUri: b.metadata.icon_uri,
            name: b.metadata.name,
            projectUri: b.metadata.project_uri,
            symbol: b.metadata.symbol,
          }
        : null,
    }))
    .slice(0, 200);

  const recentActivities: PortfolioActivity[] = history.account_transactions
    .flatMap((tx) =>
      tx.fungible_asset_activities.map((a) => ({
        transactionVersion: String(tx.transaction_version),
        amount: a.amount,
        assetType: a.asset_type,
        type: a.type,
        transactionTimestamp: a.transaction_timestamp,
      }))
    )
    .slice(0, limit);

  const report: PortfolioReport = {
    address,
    balances: balancesNormalized,
    recentActivities,
    generatedAt: new Date().toISOString(),
  };

  const dataToStore: PortfolioReportCreateArgs = {
    slug: randomUUID(),
    address,
    movementChainId: serverEnv.MOVEMENT_CHAIN_ID,
    generatedAt: Date.now(),
    data: report,
  };

  let stored: { id: string; slug: string } | null = null;
  let storeError: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      stored = await createPortfolioReportServer(dataToStore);
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("slug already exists") && attempt < 2) {
        dataToStore.slug = randomUUID();
        continue;
      }
      storeError = message;
      break;
    }
  }

  if (!stored) {
    void logPaidCallServer({
      route: "/api/paid/movement/portfolio",
      network: x402Env.X402_NETWORK,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
      priceUsd: x402Env.X402_PRICE_USD,
      ok: false,
    });
    return NextResponse.json<PortfolioResponse>(
      { ok: false, error: "Failed to save report", ...(storeError ? { details: storeError } : {}) },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  void logPaidCallServer({
    route: "/api/paid/movement/portfolio",
    network: x402Env.X402_NETWORK,
    payTo: x402Env.X402_PAY_TO_ADDRESS,
    priceUsd: x402Env.X402_PRICE_USD,
    ok: true,
  });

  return NextResponse.json<PortfolioResponse>(
    { ok: true, share: { slug: stored.slug }, report },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

let paidPostHandler: (request: NextRequest) => Promise<NextResponse<PortfolioResponse>>;
try {
  const x402Env = getX402ServerEnv();

  const bazaarDiscovery = declareDiscoveryExtension({
    bodyType: "json",
    input: { address: "0x1", limit: 25 },
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Movement address (0x...)" },
        limit: { type: "integer", minimum: 1, maximum: 50, default: 25 },
      },
      required: ["address"],
      additionalProperties: false,
    },
    output: {
      example: {
        ok: true,
        share: { slug: "2dd7a756-3d2c-4d18-a5cb-8eb9a25a3fd2" },
        report: {
          address: "0x1",
          balances: [],
          recentActivities: [],
          generatedAt: new Date().toISOString(),
        },
      },
    },
  } as unknown as Parameters<typeof declareDiscoveryExtension>[0]);

  const routeConfig = {
    accepts: {
      scheme: "exact",
      price: x402Env.X402_PRICE_USD,
      network: x402Env.X402_NETWORK as `${string}:${string}`,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
    },
    description: "MoveMeter paid endpoint: Movement portfolio report (balances + recent activity).",
    mimeType: "application/json",
    extensions: {
      ...bazaarDiscovery,
    },
  } as const;

  paidPostHandler = withX402<PortfolioResponse>(handler, routeConfig, getX402Server());
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  paidPostHandler = async () =>
    NextResponse.json(
      { ok: false, error: "x402 is not configured", details: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const fromForwarded = forwarded?.split(",")[0]?.trim();
  if (fromForwarded) return fromForwarded;
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = await rateLimitApi(`paid:movement-portfolio:${ip}`);
  if (!rate.success) {
    const resetMs = rate.reset < 10_000_000_000 ? rate.reset * 1000 : rate.reset;
    const retryAfter = Math.max(0, Math.ceil((resetMs - Date.now()) / 1000));

    return NextResponse.json<PortfolioResponse>(
      { ok: false, error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}),
        },
      }
    );
  }

  const validationJson = (await req.clone().json().catch(() => null)) as unknown;
  const parsed = BodySchema.safeParse(validationJson);
  if (!parsed.success) {
    return NextResponse.json<PortfolioResponse>(
      { ok: false, error: "Invalid request body" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  return paidPostHandler(req);
}
