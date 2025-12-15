"use client";

import Link from "next/link";
import * as React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { logout } = usePrivy();

  return (
    <div className="min-h-dvh">
      <header className="border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            MoveMeter
          </Link>
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost">
              <Link href="/marketplace">Marketplace</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/meter-report">Meter Report</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/wallet">Wallet</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/app/dev/dashboard">Dev</Link>
            </Button>
            <Button variant="outline" onClick={logout}>
              Log out
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
