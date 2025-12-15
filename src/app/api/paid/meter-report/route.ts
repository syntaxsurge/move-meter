import { withX402 } from "@x402/next";
import { NextResponse, type NextRequest } from "next/server";
import { logPaidCallServer } from "@/lib/convex/http";
import { serverEnv } from "@/lib/env/server";
import { getX402ServerEnv } from "@/lib/env/x402";
import { getX402Server } from "@/lib/x402/server";

type MovementLedgerInfo = {
  chain_id: number;
  ledger_version: string;
  ledger_timestamp: string;
};

type MeterReportResponse =
  | {
      ok: false;
      error: string;
      status?: number;
      details?: string;
    }
  | {
      ok: true;
      movement: {
        chainId: number | null;
        ledgerVersion: string | null;
        ledgerTimestamp: string | null;
        fullnodeUrl: string;
      };
      x402: {
        network: string;
        payTo: string;
        priceUsd: string;
      };
    };

async function handler(): Promise<NextResponse<MeterReportResponse>> {
  const x402Env = getX402ServerEnv();
  const res = await fetch(serverEnv.MOVEMENT_FULLNODE_URL, { cache: "no-store" });

  if (!res.ok) {
    void logPaidCallServer({
      route: "/api/paid/meter-report",
      network: x402Env.X402_NETWORK,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
      priceUsd: x402Env.X402_PRICE_USD,
      ok: false,
    });
    return NextResponse.json<MeterReportResponse>(
      {
        ok: false,
        error: "Failed to fetch Movement fullnode ledger info",
        status: res.status,
      },
      { status: 502 }
    );
  }

  const ledger = (await res.json()) as Partial<MovementLedgerInfo>;

  void logPaidCallServer({
    route: "/api/paid/meter-report",
    network: x402Env.X402_NETWORK,
    payTo: x402Env.X402_PAY_TO_ADDRESS,
    priceUsd: x402Env.X402_PRICE_USD,
    ok: true,
  });

  return NextResponse.json<MeterReportResponse>({
    ok: true,
    movement: {
      chainId: ledger.chain_id ?? null,
      ledgerVersion: ledger.ledger_version ?? null,
      ledgerTimestamp: ledger.ledger_timestamp ?? null,
      fullnodeUrl: serverEnv.MOVEMENT_FULLNODE_URL,
    },
    x402: {
      network: x402Env.X402_NETWORK,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
      priceUsd: x402Env.X402_PRICE_USD,
    },
  });
}

let getHandler: (request: NextRequest) => Promise<NextResponse<MeterReportResponse>>;
try {
  const x402Env = getX402ServerEnv();
  const routeConfig = {
    accepts: {
      scheme: "exact",
      price: x402Env.X402_PRICE_USD,
      network: x402Env.X402_NETWORK as `${string}:${string}`,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
    },
    description: "MoveMeter paid report: live Movement testnet ledger snapshot.",
    mimeType: "application/json",
    extensions: {
      bazaar: {
        discoverable: true,
        category: "devtools",
        tags: ["movement", "x402", "status"],
      },
    },
  } as const;

  getHandler = withX402<MeterReportResponse>(handler, routeConfig, getX402Server());
} catch (err) {
  const message = err instanceof Error ? err.message : "Unknown error";
  getHandler = async () =>
    NextResponse.json(
      { ok: false, error: "x402 is not configured", details: message },
      { status: 500 }
    );
}

export const GET = getHandler;
