"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DevDashboardPage() {
  const { user } = usePrivy();
  const providerDid = user?.id;

  const listings = useQuery(
    api.listings.listByProvider,
    providerDid ? { providerDid, limit: 50 } : "skip"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Developer Dashboard</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/app/dev/new">Publish listing</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/marketplace">Marketplace</Link>
          </Button>
        </div>
      </div>

      {listings === undefined ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="text-sm text-muted-foreground">No listings yet.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((l) => (
            <Card key={l._id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2">
                  <Link className="underline underline-offset-4" href={`/marketplace/${l.slug}`}>
                    {l.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {l.priceMove} MOVE/call
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div className="line-clamp-2">{l.summary}</div>
                <div className="truncate font-mono">{l.baseUrl}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
