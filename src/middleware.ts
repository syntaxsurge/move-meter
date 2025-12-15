import { paymentProxy } from "@x402/next";
import { NextResponse, type NextRequest } from "next/server";
import { getX402ServerEnv } from "@/lib/env/x402";
import { getX402Server } from "@/lib/x402/server";

let proxy:
  | null
  | ((req: NextRequest) => Promise<NextResponse<unknown>>);
let proxyInitError: string | null = null;

try {
  const x402Env = getX402ServerEnv();

  proxy = paymentProxy(
    {
      "/api/paid/meter-report": {
        accepts: {
          scheme: "exact",
          price: x402Env.X402_PRICE_USD,
          network: x402Env.X402_NETWORK as `${string}:${string}`,
          payTo: x402Env.X402_PAY_TO_ADDRESS,
        },
        description: "MoveMeter paid report: live Movement ledger snapshot.",
        mimeType: "application/json",
        extensions: {
          bazaar: {
            discoverable: true,
            category: "devtools",
            tags: ["movement", "x402", "status"],
          },
        },
      },
    },
    getX402Server()
  );
} catch (err) {
  proxy = null;
  proxyInitError = err instanceof Error ? err.message : "Unknown error";
}

export async function middleware(req: NextRequest) {
  if (!proxy) {
    return NextResponse.json(
      { ok: false, error: "x402 is not configured", details: proxyInitError },
      { status: 500 }
    );
  }

  return proxy(req);
}

export const config = {
  matcher: ["/api/paid/meter-report"],
};

