import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serverEnv } from "@/lib/env/server";
import { getX402ServerEnv } from "@/lib/env/x402";

export default function DemoPage() {
  let x402:
    | null
    | {
        network: string;
        payTo: string;
        priceUsd: string;
      } = null;

  try {
    const env = getX402ServerEnv();
    x402 = { network: env.X402_NETWORK, payTo: env.X402_PAY_TO_ADDRESS, priceUsd: env.X402_PRICE_USD };
  } catch {
    x402 = null;
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">MoveMeter Demo</h1>
        <p className="text-sm text-muted-foreground">
          A fast, judge-friendly flow to test Privy onboarding, Movement reads, and x402 pay-per-request.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1) Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Sign in with Privy to provision your embedded wallets. After signing in, use the tools under{" "}
            <code className="font-mono">/app</code>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/sign-in">Go to sign-in</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/wallet">Go to wallet</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2) Fund your Movement wallet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Use the Movement faucet to get testnet funds, then verify activity in the explorer.
          </p>
          <div className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">Movement network</div>
              <div className="font-mono text-xs">
                {serverEnv.MOVEMENT_NETWORK} (chainId {serverEnv.MOVEMENT_CHAIN_ID})
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Faucet</div>
              <a className="font-mono text-xs underline underline-offset-4" href={serverEnv.MOVEMENT_FAUCET_URL} target="_blank" rel="noreferrer">
                {serverEnv.MOVEMENT_FAUCET_URL}
              </a>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Explorer</div>
              <a className="font-mono text-xs underline underline-offset-4" href={serverEnv.MOVEMENT_EXPLORER_URL} target="_blank" rel="noreferrer">
                {serverEnv.MOVEMENT_EXPLORER_URL}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3) Fund your x402 payment wallet (USDC)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Paid endpoints use x402 (EVM Exact scheme). You’ll need test USDC for the payment network.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer">
                Open Circle faucet
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/app/meter-report">Open paid tools</Link>
            </Button>
          </div>
          {x402 ? (
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">x402 config</div>
              <div className="font-mono text-xs">
                {x402.priceUsd} · {x402.network} · {x402.payTo}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              x402 is not configured. Set <code className="font-mono">X402_PAY_TO_ADDRESS</code> in{" "}
              <code className="font-mono">.env.local</code> (or your deployment env).
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4) Run the demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Open <Link className="underline underline-offset-4" href="/app/meter-report">/app/meter-report</Link> and click{" "}
              <span className="font-medium">Pay &amp; Fetch Report</span>.
            </li>
            <li>
              Open <Link className="underline underline-offset-4" href="/app/portfolio">/app/portfolio</Link> to generate a shareable portfolio snapshot.
            </li>
            <li>
              Browse <Link className="underline underline-offset-4" href="/marketplace">/marketplace</Link> for provider listings.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Check Movement RPC + Indexer reachability via the health endpoint.
          </p>
          <Button asChild variant="outline">
            <Link href="/api/health">Open /api/health</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

