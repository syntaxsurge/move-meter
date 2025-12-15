"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useX402Fetch } from "@privy-io/react-auth";
import { decodePaymentResponseHeader } from "@x402/core/http";
import { api } from "@/lib/convex/api";
import { useEvmPaymentWallet } from "@/features/x402/useEvmPaymentWallet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  endpoint: string;
  network: string;
  payTo: string;
  priceUsd: string;
  maxValue: bigint;
};

type MeterReport = {
  ok: boolean;
  movement?: {
    chainId: number | null;
    ledgerVersion: string | null;
    ledgerTimestamp: string | null;
    fullnodeUrl: string;
  };
  x402?: {
    network: string;
    payTo: string;
    priceUsd: string;
  };
  error?: string;
  details?: string;
};

function getExplorerTxUrl(network: string, tx: string): string | null {
  if (!tx) return null;
  if (network === "eip155:84532") return `https://sepolia.basescan.org/tx/${tx}`;
  if (network === "eip155:8453") return `https://basescan.org/tx/${tx}`;
  return null;
}

export function PaidMeterReportCard({
  endpoint,
  network,
  payTo,
  priceUsd,
  maxValue,
}: Props) {
  const { wrapFetchWithPayment } = useX402Fetch();
  const {
    walletsReady,
    paymentWalletAddress,
    creatingWallet,
    walletError,
    ensurePaymentWallet,
  } = useEvmPaymentWallet();

  const recordReceipt = useMutation(api.payments.recordReceipt);

  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<MeterReport | null>(null);
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
    setPaymentTx(null);

    try {
      const payerWalletAddress = await ensurePaymentWallet();
      if (!payerWalletAddress) {
        throw new Error("No payment wallet available");
      }

      const fetchWithPayment = wrapFetchWithPayment({
        walletAddress: payerWalletAddress,
        fetch,
        maxValue,
      });

      const res = await fetchWithPayment(endpoint, { method: "GET" });

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

      const json = (await res.json()) as MeterReport;
      setResult(json);
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
          <span>Paid endpoint</span>
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

        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={loading || !walletsReady}>
            {loading ? "Processing…" : "Pay & Fetch Report"}
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

        {walletError ? (
          <div className="text-sm text-destructive">Wallet error: {walletError}</div>
        ) : null}

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
                  <div
                    key={r._id}
                    className="rounded-md border px-3 py-2 text-xs text-muted-foreground"
                  >
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
            <div className="mt-1 text-sm text-muted-foreground">
              Create a wallet to see receipts.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
