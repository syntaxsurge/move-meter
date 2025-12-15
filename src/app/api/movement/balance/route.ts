import { NextRequest } from "next/server";
import { serverEnv } from "@/lib/env/server";
import { getMovementCoinBalance } from "@/lib/movement/balance";
import { MovementAddressSchema } from "@/lib/movement/validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const addressParam = searchParams.get("address");

  const parsed = MovementAddressSchema.safeParse(addressParam);
  if (!parsed.success) {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  const address = parsed.data;
  const coinType = serverEnv.MOVEMENT_BASE_COIN_TYPE;

  let balance;
  try {
    balance = await getMovementCoinBalance({ address, coinType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      { error: "Failed to fetch Movement balance", details: message },
      { status: 502 }
    );
  }

  return Response.json({
    address,
    chainId: serverEnv.MOVEMENT_CHAIN_ID,
    coinType,
    symbol: balance.symbol,
    decimals: balance.decimals,
    balance: balance.raw.toString(),
    balanceFormatted: balance.formatted,
    faucetUrl: serverEnv.MOVEMENT_FAUCET_URL,
  });
}
