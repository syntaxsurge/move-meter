"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { decodePaymentResponseHeader } from "@x402/core/http";
import { useCreateWallet, useWallets, useX402Fetch } from "@privy-io/react-auth";
import { api } from "@/lib/convex/api";
import { MovementAddressSchema } from "@/lib/movement/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  endpoint: string;
  network: string;
  payTo: string;
  priceUsd: string;
  maxValue: bigint;
};

type MoveBalanceResponse =
  | {
      ok: false;
      error: string;
      status?: number;
      details?: string;
    }
  | {
      ok: true;
      address: string;
      chainId: number;
      fullnodeUrl: string;
      explorerUrl: string;
      faucetUrl: string;
      coin: {
        type: string;
        symbol: string;
        decimals: number;
      };
      balance: {
        raw: string;
        formatted: string;
      };
    };

function getExplorerTxUrl(network: string, tx: string): string | null {
  if (!tx) return null;
  if (network === "eip155:84532") return `https://sepolia.basescan.org/tx/${tx}`;
  if (network === "eip155:8453") return `https://basescan.org/tx/${tx}`;
  return null;
}

function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function PaidMoveBalanceCard({ endpoint, network, payTo, priceUsd, maxValue }: Props) {
  const { ready: walletsReady, wallets } = useWallets();
  const { createWallet } = useCreateWallet();
  const { wrapFetchWithPayment } = useX402Fetch();

  const recordReceipt = useMutation(api.payments.recordReceipt);

  const [payerWalletAddress, setPayerWalletAddress] = React.useState<string | null>(null);
  const [creatingWallet, setCreatingWallet] = React.useState(false);
  const [walletError, setWalletError] = React.useState<string | null>(null);

  const [movementAddress, setMovementAddress] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<MoveBalanceResponse | null>(null);
  const [paymentTx, setPaymentTx] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const receipts = useQuery(
    api.payments.listReceiptsForWallet,
    payerWalletAddress ? { payerWalletAddress } : "skip"
  );

  React.useEffect(() => {
    if (!walletsReady) return;
    const evm = wallets.find((w) => isEvmAddress(w.address));
    if (evm) setPayerWalletAddress(evm.address);
  }, [walletsReady, wallets]);

  async function ensurePaymentWallet(): Promise<string | null> {
    if (payerWalletAddress) return payerWalletAddress;
    if (creatingWallet) return null;

    setCreatingWallet(true);
    setWalletError(null);
    try {
      const wallet = await createWallet();
      if (!isEvmAddress(wallet.address)) {
        throw new Error("Created wallet is not an EVM address");
      }
      setPayerWalletAddress(wallet.address);
      return wallet.address;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setWalletError(msg);
      return null;
    } finally {
      setCreatingWallet(false);
    }
  }

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    setPaymentTx(null);

    try {
      const parsedAddress = MovementAddressSchema.safeParse(movementAddress);
      if (!parsedAddress.success) {
        throw new Error("Enter a valid Movement address (0x + hex)");
      }

      const walletAddress = await ensurePaymentWallet();
      if (!walletAddress) {
        throw new Error("No payment wallet available");
      }

      const fetchWithPayment = wrapFetchWithPayment({
        walletAddress,
        fetch,
        maxValue,
      });

      const url = `${endpoint}?address=${encodeURIComponent(parsedAddress.data)}`;
      const res = await fetchWithPayment(url, { method: "GET" });

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
              payerWalletAddress: walletAddress,
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
            payerWalletAddress: walletAddress,
            paymentResponseHeader,
            decodeError: msg,
          });
        }
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const json = (await res.json()) as MoveBalanceResponse;
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
          <span>Premium MOVE Balance</span>
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
          <Label htmlFor="movementAddress">Movement address</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="movementAddress"
              value={movementAddress}
              onChange={(e) => setMovementAddress(e.target.value)}
              placeholder="0x…"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="font-mono"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setMovementAddress("0x1")}
              className="shrink-0"
            >
              Use 0x1
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This calls Movement on-chain reads after a successful x402 payment.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={run} disabled={loading || !walletsReady}>
            {loading ? "Processing…" : "Pay & Fetch Balance"}
          </Button>

          <Button asChild variant="outline">
            <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer">
              Get testnet USDC
            </a>
          </Button>

          {payerWalletAddress ? (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(payerWalletAddress);
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

        {error ? (
          <pre className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs text-destructive">
            {error}
          </pre>
        ) : null}

        {result?.ok ? (
          <div className="rounded-md border bg-muted p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono">{result.address}</div>
              <div className="text-muted-foreground">chainId: {result.chainId}</div>
            </div>
            <div className="mt-2 text-lg font-medium">
              {result.balance.formatted} {result.coin.symbol}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Raw: <span className="font-mono">{result.balance.raw}</span>
            </div>
          </div>
        ) : result ? (
          <pre className="whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs text-destructive">
            {JSON.stringify(result, null, 2)}
          </pre>
        ) : null}

        <div>
          <div className="text-sm font-medium">Recent receipts</div>
          {payerWalletAddress ? (
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

