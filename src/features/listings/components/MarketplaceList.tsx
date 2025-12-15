"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function MarketplaceList() {
  const listings = useQuery(api.listings.publicList, { limit: 50 });

  if (listings === undefined) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Browse live listings published by providers.
        </div>
        <Button asChild variant="outline">
          <Link href="/app/dev/new">Publish a listing</Link>
        </Button>
      </div>

      {listings.length === 0 ? (
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
                  <Badge>{l.category}</Badge>
                </CardTitle>
                <CardDescription>{l.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div>Price: {l.priceMove} MOVE / call</div>
                <div className="truncate">
                  Base: <span className="font-mono">{l.baseUrl}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
