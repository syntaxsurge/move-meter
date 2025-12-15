"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { decodePaymentResponseHeader } from "@x402/core/http";
import { useX402Fetch } from "@privy-io/react-auth";
import { api } from "@/lib/convex/api";
import { MovementAddressSchema } from "@/lib/movement/validation";
import { EnsureMovementWallet } from "@/components/auth/EnsureMovementWallet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEvmPaymentWallet } from "@/features/x402/useEvmPaymentWallet";

type Props = {
  endpoint: string;
  network: string;
  payTo: string;
  priceUsd: string;
  maxValue: bigint;
};

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

type PortfolioReport = {
  address: string;
  balances: PortfolioBalance[];
  recentActivities: PortfolioActivity[];
  generatedAt: string;
};

type PortfolioResponse =
  | { ok: false; error: string; details?: string }
  | { ok: true; share: { slug: string }; report: PortfolioReport };

function getExplorerTxUrl(network: string, tx: string): string | null {
  if (!tx) return null;
  if (network === "eip155:84532") return `https://sepolia.basescan.org/tx/${tx}`;
  if (network === "eip155:8453") return `https://basescan.org/tx/${tx}`;
  return null;
}

export function PaidPortfolioReportCard(props: Props) {
  return (
    <EnsureMovementWallet>
      {({ movementAddress }) => <Inner {...props} movementAddress={movementAddress} />}
    </EnsureMovementWallet>
  );
}

function Inner({
  endpoint,
  network,
  payTo,
  priceUsd,
  maxValue,
  movementAddress,
}: Props & { movementAddress: string }) {
  const { wrapFetchWithPayment } = useX402Fetch();
  const {
    walletsReady,
    paymentWalletAddress,
    creatingWallet,
    walletError,
    ensurePaymentWallet,
  } = useEvmPaymentWallet();

  const recordReceipt = useMutation(api.payments.recordReceipt);

  const [address, setAddress] = React.useState(movementAddress);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<PortfolioResponse | null>(null);
  const [shareSlug, setShareSlug] = React.useState<string | null>(null);
  const [paymentTx, setPaymentTx] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const receipts = useQuery(
    api.payments.listReceiptsForWallet,
    paymentWalletAddress ? { payerWalletAddress: paymentWalletAddress } : "skip"
  );

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setShareSlug(null);
    setPaymentTx(null);

    try {
      const parsedAddress = MovementAddressSchema.safeParse(address);
      if (!parsedAddress.success) {
        throw new Error("Enter a valid Movement address (0x + hex)");
      }

      const payerWalletAddress = await ensurePaymentWallet();
      if (!payerWalletAddress) {
        throw new Error("No payment wallet available");
      }

      const fetchWithPayment = wrapFetchWithPayment({
        walletAddress: payerWalletAddress,
        fetch,
        maxValue,
      });

      const res = await fetchWithPayment(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address: parsedAddress.data, limit: 25 }),
      });

      const paymentResponseHeader =
        res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("X-PAYMENT-RESPONSE");

      if (paymentResponseHeader) {
        try {
          const settle = decodePaymentResponseHeader(paymentResponseHeader);
          if (settle.transaction) setPaymentTx(settle.transaction);
          if (settle.success) {
            await recordReceipt({
              endpoint,
              network: settle.network,
              payTo,
              priceUsd,
              payerWalletAddress,
              payer: settle.payer,
              transaction: settle.transaction,
              paymentResponseHeader,
            });
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          await recordReceipt({
            endpoint,
            network,
            payTo,
            priceUsd,
            payerWalletAddress,
            paymentResponseHeader,
            decodeError: msg,
          });
        }
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = (await res.json()) as PortfolioResponse;
      setResult(json);
      if (json.ok) setShareSlug(json.share.slug);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const explorerTxUrl = paymentTx ? getExplorerTxUrl(network, paymentTx) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>Premium Portfolio Report</span>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{priceUsd}</Badge>
            <Badge variant="outline">{network}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-sm text-muted-foreground">Endpoint</div>
            <code className="mt-1 block break-all rounded-md bg-muted px-3 py-2 text-xs">
              {endpoint}
            </code>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Pay to</div>
            <code className="mt-1 block break-all rounded-md bg-muted px-3 py-2 text-xs">
              {payTo}
            </code>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="portfolioAddress">Movement address</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="portfolioAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setAddress(movementAddress)}
              className="shrink-0"
            >
              Use my wallet
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Generates a paid report using Movement Indexer data, then stores a shareable snapshot.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={loading || !walletsReady}>
            {loading ? "Processing…" : "Pay & Generate"}
          </Button>

          <Button asChild variant="outline">
            <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer">
              Get testnet USDC
            </a>
          </Button>

          {paymentWalletAddress ? (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(paymentWalletAddress);
                } catch {
                  // no-op
                }
              }}
            >
              Copy payment wallet
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => void ensurePaymentWallet()}>
              {creatingWallet ? "Creating wallet…" : "Create payment wallet"}
            </Button>
          )}
        </div>

        {walletError ? <div className="text-sm text-destructive">Wallet error: {walletError}</div> : null}

        {explorerTxUrl ? (
          <div className="text-sm">
            Payment tx:{" "}
            <a className="underline underline-offset-4" href={explorerTxUrl} target="_blank" rel="noreferrer">
              {paymentTx}
            </a>
          </div>
        ) : paymentTx ? (
          <div className="text-sm">
            Payment tx: <span className="font-mono">{paymentTx}</span>
          </div>
        ) : null}

        {shareSlug ? (
          <div className="text-sm">
            Share link:{" "}
            <a className="underline underline-offset-4" href={`/r/${shareSlug}`}>
              /r/{shareSlug}
            </a>
          </div>
        ) : null}

        {error ? (
          <pre className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs text-destructive">
            {error}
          </pre>
        ) : null}

        {result ? (
          <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}

        <div>
          <div className="text-sm font-medium">Recent receipts</div>
          {paymentWalletAddress ? (
            receipts === undefined ? (
              <div className="mt-1 text-sm text-muted-foreground">Loading…</div>
            ) : receipts.length === 0 ? (
              <div className="mt-1 text-sm text-muted-foreground">No receipts yet.</div>
            ) : (
              <div className="mt-2 space-y-2">
                {receipts.slice(0, 5).map((r) => (
                  <div key={r._id} className="rounded-md border px-3 py-2 text-xs text-muted-foreground">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono">{r.transaction ?? "Unparsed receipt"}</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge>{r.priceUsd}</Badge>
                      <Badge variant="outline">{r.network}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="mt-1 text-sm text-muted-foreground">Create a wallet to see receipts.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

