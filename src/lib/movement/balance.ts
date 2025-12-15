import "server-only";

import type { MoveStructId } from "@aptos-labs/ts-sdk";
import { z } from "zod";
import { formatUnits } from "viem";
import { movement } from "@/lib/movement/client";

const CoinInfoSchema = z.object({
  decimals: z.number().int().nonnegative(),
  symbol: z.string().min(1),
});

const CoinStoreSchema = z.object({
  coin: z.object({
    value: z.string().regex(/^\d+$/),
  }),
});

type CoinInfo = z.infer<typeof CoinInfoSchema>;

const coinInfoCache = new Map<string, CoinInfo>();

function isAptosNotFoundError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  return "status" in err && (err as { status: unknown }).status === 404;
}

export async function getMovementCoinInfo(coinType: string): Promise<CoinInfo> {
  const cached = coinInfoCache.get(coinType);
  if (cached) return cached;

  const coinInfoType = `0x1::coin::CoinInfo<${coinType}>` as unknown as MoveStructId;
  const resource = await movement.getAccountResource({
    accountAddress: "0x1",
    resourceType: coinInfoType,
  });

  const parsed = CoinInfoSchema.safeParse(resource.data);
  if (!parsed.success) {
    throw new Error("Unexpected Movement coin metadata response");
  }

  coinInfoCache.set(coinType, parsed.data);
  return parsed.data;
}

export async function getMovementCoinBalance(args: {
  address: string;
  coinType: string;
}): Promise<{
  symbol: string;
  decimals: number;
  raw: bigint;
  formatted: string;
}> {
  const { address, coinType } = args;
  const { symbol, decimals } = await getMovementCoinInfo(coinType);

  let raw: bigint | null = null;

  try {
    const [value] = await movement.view<[string]>({
      payload: {
        function: "0x1::coin::balance",
        typeArguments: [coinType],
        functionArguments: [address],
      },
    });
    raw = BigInt(value);
  } catch {
    raw = null;
  }

  if (raw === null) {
    const coinStoreType = `0x1::coin::CoinStore<${coinType}>` as unknown as MoveStructId;
    try {
      const coinStore = await movement.getAccountResource({
        accountAddress: address,
        resourceType: coinStoreType,
      });

      const parsed = CoinStoreSchema.safeParse(coinStore.data);
      if (!parsed.success) {
        throw new Error("Unexpected Movement balance response");
      }
      raw = BigInt(parsed.data.coin.value);
    } catch (err) {
      if (isAptosNotFoundError(err)) {
        raw = 0n;
      } else {
        throw new Error("Failed to fetch Movement coin balance");
      }
    }
  }

  return {
    symbol,
    decimals,
    raw,
    formatted: formatUnits(raw, decimals),
  };
}

