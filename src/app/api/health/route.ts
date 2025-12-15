import { NextResponse } from "next/server";
import { serverEnv } from "@/lib/env/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkMovementFullnode(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkMovementIndexer(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: "query { __typename }" }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const [fullnodeOk, indexerOk] = await Promise.all([
    checkMovementFullnode(serverEnv.MOVEMENT_FULLNODE_URL),
    checkMovementIndexer(serverEnv.MOVEMENT_INDEXER_URL),
  ]);

  const ok = fullnodeOk && indexerOk;
  return NextResponse.json(
    {
      ok,
      movement: {
        network: serverEnv.MOVEMENT_NETWORK,
        chainId: serverEnv.MOVEMENT_CHAIN_ID,
        fullnodeUrl: serverEnv.MOVEMENT_FULLNODE_URL,
        indexerUrl: serverEnv.MOVEMENT_INDEXER_URL,
      },
      checks: { fullnodeOk, indexerOk },
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}

