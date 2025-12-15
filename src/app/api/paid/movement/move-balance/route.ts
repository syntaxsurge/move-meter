import { withX402 } from "@x402/next";
import { NextResponse, type NextRequest } from "next/server";
import { logPaidCallServer } from "@/lib/convex/http";
import { serverEnv } from "@/lib/env/server";
import { getX402ServerEnv } from "@/lib/env/x402";
import { getMovementCoinBalance } from "@/lib/movement/balance";
import { MovementAddressSchema } from "@/lib/movement/validation";
import { getX402Server } from "@/lib/x402/server";

export const dynamic = "force-dynamic";

type MoveBalanceResponse =
  | {
      ok: false;
      error: string;
      status?: number;
      details?: string;
    }
  | {
      ok: true;
      address: string;
      chainId: number;
      fullnodeUrl: string;
      explorerUrl: string;
      faucetUrl: string;
      coin: {
        type: string;
        symbol: string;
        decimals: number;
      };
      balance: {
        raw: string;
        formatted: string;
      };
    };

async function handler(req: NextRequest): Promise<NextResponse<MoveBalanceResponse>> {
  const x402Env = getX402ServerEnv();
  const url = new URL(req.url);
  const addressParam = url.searchParams.get("address");
  const address = MovementAddressSchema.parse(addressParam);
  const coinType = serverEnv.MOVEMENT_BASE_COIN_TYPE;

  try {
    const bal = await getMovementCoinBalance({ address, coinType });
    void logPaidCallServer({
      route: "/api/paid/movement/move-balance",
      network: x402Env.X402_NETWORK,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
      priceUsd: x402Env.X402_PRICE_USD,
      ok: true,
    });
    return NextResponse.json<MoveBalanceResponse>(
      {
        ok: true,
        address,
        chainId: serverEnv.MOVEMENT_CHAIN_ID,
        fullnodeUrl: serverEnv.MOVEMENT_FULLNODE_URL,
        explorerUrl: serverEnv.MOVEMENT_EXPLORER_URL,
        faucetUrl: serverEnv.MOVEMENT_FAUCET_URL,
        coin: { type: coinType, symbol: bal.symbol, decimals: bal.decimals },
        balance: { raw: bal.raw.toString(), formatted: bal.formatted },
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    void logPaidCallServer({
      route: "/api/paid/movement/move-balance",
      network: x402Env.X402_NETWORK,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
      priceUsd: x402Env.X402_PRICE_USD,
      ok: false,
    });
    return NextResponse.json<MoveBalanceResponse>(
      { ok: false, error: "Failed to read MOVE balance from Movement fullnode", details: message },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}

let paidGetHandler: (request: NextRequest) => Promise<NextResponse<MoveBalanceResponse>>;
try {
  const x402Env = getX402ServerEnv();
  const routeConfig = {
    accepts: {
      scheme: "exact",
      price: x402Env.X402_PRICE_USD,
      network: x402Env.X402_NETWORK as `${string}:${string}`,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
    },
    description: "MoveMeter paid endpoint: MOVE balance lookup for a Movement address.",
    mimeType: "application/json",
    extensions: {
      bazaar: {
        discoverable: true,
        category: "data",
        tags: ["movement", "x402", "balance", "move"],
      },
    },
  } as const;

  paidGetHandler = withX402<MoveBalanceResponse>(handler, routeConfig, getX402Server());
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  paidGetHandler = async () =>
    NextResponse.json(
      { ok: false, error: "x402 is not configured", details: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const addressParam = url.searchParams.get("address");
  const parsed = MovementAddressSchema.safeParse(addressParam);
  if (!parsed.success) {
    return NextResponse.json<MoveBalanceResponse>(
      { ok: false, error: "Invalid address (expected 0x + hex)" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  return paidGetHandler(req);
}
