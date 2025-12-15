import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16">
      <h1 className="text-balance text-4xl font-semibold tracking-tight">
        MoveMeter
      </h1>
      <p className="mt-4 text-pretty text-muted-foreground">
        Usage-based billing rails on Movement. Sign in with Privy, get a Movement
        wallet, and fetch your on-chain balance.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/sign-in">Get started</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/app/dashboard">Open dashboard</Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href="/marketplace">Browse marketplace</Link>
        </Button>
      </div>
    </main>
  );
}
