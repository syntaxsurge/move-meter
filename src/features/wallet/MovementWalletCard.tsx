"use client";

import useSWR from "swr";
import { EnsureMovementWallet } from "@/components/auth/EnsureMovementWallet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BalanceRes = {
  address: string;
  chainId: number;
  coinType: string;
  symbol: string;
  decimals: number;
  balance: string;
  balanceFormatted: string;
  faucetUrl: string;
};

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as BalanceRes;
}

export function MovementWalletCard() {
  return (
    <EnsureMovementWallet>
      {({ movementAddress }) => <Inner movementAddress={movementAddress} />}
    </EnsureMovementWallet>
  );
}

function Inner({ movementAddress }: { movementAddress: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/movement/balance?address=${encodeURIComponent(movementAddress)}`,
    fetcher,
    { refreshInterval: 15_000 }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Movement Wallet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="text-sm text-muted-foreground">Address</div>
          <code className="mt-1 block break-all rounded-md bg-muted px-3 py-2 text-xs">
            {movementAddress}
          </code>
        </div>

        <div>
          <div className="text-sm text-muted-foreground">Balance</div>
          {isLoading && <div className="mt-1 text-sm text-muted-foreground">Loading…</div>}
          {error && (
            <div className="mt-1 text-sm text-destructive">Failed to load balance</div>
          )}
          {data && (
            <div className="mt-1 text-lg font-medium">
              {data.balanceFormatted} {data.symbol}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(movementAddress);
              } catch {
                // no-op
              }
            }}
          >
            Copy address
          </Button>

          {data?.faucetUrl ? (
            <Button asChild>
              <a href={data.faucetUrl} target="_blank" rel="noreferrer">
                Open faucet
              </a>
            </Button>
          ) : null}

          <Button variant="outline" onClick={() => mutate()}>
            Refresh
          </Button>
        </div>

        {data ? (
          <div className="text-xs text-muted-foreground">
            Chain id: {data.chainId}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
