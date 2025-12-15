import { NextRequest } from "next/server";
import type { MoveStructId } from "@aptos-labs/ts-sdk";
import { z } from "zod";
import { formatUnits } from "viem";
import { movement } from "@/lib/movement/client";
import { serverEnv } from "@/lib/env/server";

export const dynamic = "force-dynamic";

const AddressSchema = z.string().regex(/^0x[0-9a-fA-F]{1,64}$/);
const CoinInfoSchema = z.object({
  decimals: z.number().int().nonnegative(),
  symbol: z.string(),
});
const CoinStoreSchema = z.object({
  coin: z.object({
    value: z.string(),
  }),
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const addressParam = searchParams.get("address");

  const parsed = AddressSchema.safeParse(addressParam);
  if (!parsed.success) {
    return Response.json({ error: "Invalid address" }, { status: 400 });
  }

  const address = parsed.data;
  const coinType = serverEnv.MOVEMENT_BASE_COIN_TYPE;

  const coinInfoType = `0x1::coin::CoinInfo<${coinType}>` as unknown as MoveStructId;
  const coinStoreType = `0x1::coin::CoinStore<${coinType}>` as unknown as MoveStructId;

  let coinInfo;
  try {
    coinInfo = await movement.getAccountResource({
      accountAddress: "0x1",
      resourceType: coinInfoType,
    });
  } catch {
    return Response.json(
      { error: "Failed to fetch coin metadata" },
      { status: 502 }
    );
  }

  const coinStore = await movement
    .getAccountResource({
      accountAddress: address,
      resourceType: coinStoreType,
    })
    .catch(() => null);

  const coinInfoParsed = CoinInfoSchema.safeParse(coinInfo.data);
  if (!coinInfoParsed.success) {
    return Response.json(
      { error: "Unexpected coin metadata response" },
      { status: 502 }
    );
  }

  const { decimals, symbol } = coinInfoParsed.data;

  let raw = 0n;
  if (coinStore) {
    const coinStoreParsed = CoinStoreSchema.safeParse(coinStore.data);
    if (!coinStoreParsed.success) {
      return Response.json(
        { error: "Unexpected balance response" },
        { status: 502 }
      );
    }
    raw = BigInt(coinStoreParsed.data.coin.value);
  }

  return Response.json({
    address,
    chainId: serverEnv.MOVEMENT_CHAIN_ID,
    coinType,
    symbol,
    decimals,
    balance: raw.toString(),
    balanceFormatted: formatUnits(raw, decimals),
    faucetUrl: serverEnv.MOVEMENT_FAUCET_URL,
  });
}
