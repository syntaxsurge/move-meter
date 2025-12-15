import { NextResponse } from "next/server";
import { logPaidCallServer } from "@/lib/convex/http";
import { serverEnv } from "@/lib/env/server";
import { getX402ServerEnv } from "@/lib/env/x402";

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
  let x402Env: ReturnType<typeof getX402ServerEnv>;
  try {
    x402Env = getX402ServerEnv();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<MeterReportResponse>(
      { ok: false, error: "x402 is not configured", details: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  let res: Response;
  try {
    res = await fetch(serverEnv.MOVEMENT_FULLNODE_URL, { cache: "no-store" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    void logPaidCallServer({
      route: "/api/paid/meter-report",
      network: x402Env.X402_NETWORK,
      payTo: x402Env.X402_PAY_TO_ADDRESS,
      priceUsd: x402Env.X402_PRICE_USD,
      ok: false,
    });
    return NextResponse.json<MeterReportResponse>(
      { ok: false, error: "Failed to fetch Movement fullnode ledger info", details: message },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
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
        ...(text ? { details: text } : {}),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  const ledger = (await res.json().catch(() => ({}))) as Partial<MovementLedgerInfo>;

  void logPaidCallServer({
    route: "/api/paid/meter-report",
    network: x402Env.X402_NETWORK,
    payTo: x402Env.X402_PAY_TO_ADDRESS,
    priceUsd: x402Env.X402_PRICE_USD,
    ok: true,
  });

  return NextResponse.json<MeterReportResponse>(
    {
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
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export const GET = handler;
