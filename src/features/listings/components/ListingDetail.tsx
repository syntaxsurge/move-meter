"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TryConsole } from "./TryConsole";

export function ListingDetail({ slug }: { slug: string }) {
  const listing = useQuery(api.listings.getBySlug, { slug });

  if (listing === undefined) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  if (!listing) {
    return <div className="text-sm text-muted-foreground">Listing not found.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{listing.title}</CardTitle>
          <CardDescription>{listing.summary}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>Category: {listing.category}</div>
          <div>Price: {listing.priceMove} MOVE / call</div>
          <div className="break-all font-mono">Base URL: {listing.baseUrl}</div>
        </CardContent>
      </Card>

      <TryConsole slug={slug} />
    </div>
  );
}
