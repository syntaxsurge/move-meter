"use client";

import * as React from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useIdentityToken } from "@privy-io/react-auth";
import { api } from "@/lib/convex/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createListingSchema,
  type CreateListingInput,
  type ListingCategory,
} from "../schemas/createListing";

type Props = {
  defaultBaseUrl: string;
  faucetUrl: string;
  explorerUrl: string;
};

const categories: Array<{ value: ListingCategory; label: string }> = [
  { value: "x402", label: "x402" },
  { value: "devex", label: "DevEx" },
  { value: "defi", label: "DeFi" },
  { value: "consumer", label: "Consumer" },
  { value: "gaming", label: "Gaming" },
];

export function CreateListingForm({ defaultBaseUrl, faucetUrl, explorerUrl }: Props) {
  const { identityToken } = useIdentityToken();
  const createListing = useAction(api.actions.listings.createListing);

  const form = useForm<CreateListingInput>({
    resolver: zodResolver(createListingSchema),
    defaultValues: {
      title: "",
      summary: "",
      category: "x402",
      baseUrl: defaultBaseUrl,
      priceMove: 0.01,
    },
    mode: "onChange",
  });

  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ slug: string } | null>(null);

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: CreateListingInput) {
    setError(null);
    setResult(null);

    if (!identityToken) {
      setError("Missing Privy identity token. Make sure identity tokens are enabled in Privy.");
      return;
    }

    try {
      const res = await createListing({ idToken: identityToken, ...values });
      setResult({ slug: res.slug });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publish a Listing</CardTitle>
        <CardDescription>
          Create a marketplace listing backed by Convex. The Try Console calls your
          base URL from a server-side action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <a className="underline" href={faucetUrl} target="_blank" rel="noreferrer">
            Movement faucet
          </a>
          <span aria-hidden>·</span>
          <a className="underline" href={explorerUrl} target="_blank" rel="noreferrer">
            Explorer
          </a>
          <span aria-hidden>·</span>
          <Link className="underline" href="/marketplace">
            Marketplace
          </Link>
        </div>

        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Movement Wallet Insights API" {...form.register("title")} />
            {form.formState.errors.title ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.title.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              rows={4}
              placeholder="What does this endpoint do, who is it for, and why would someone pay per call?"
              {...form.register("summary")}
            />
            {form.formState.errors.summary ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.summary.message}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                {...form.register("category")}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              {form.formState.errors.category ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.category.message}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceMove">Price per call (MOVE)</Label>
              <Input
                id="priceMove"
                type="number"
                inputMode="decimal"
                step="0.0001"
                min={0}
                {...form.register("priceMove", { valueAsNumber: true })}
              />
              {form.formState.errors.priceMove ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.priceMove.message}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL (https)</Label>
            <Input id="baseUrl" placeholder="https://example.com/api" {...form.register("baseUrl")} />
            <p className="text-xs text-muted-foreground">
              Default: <span className="font-mono">{defaultBaseUrl}</span>
            </p>
            {form.formState.errors.baseUrl ? (
              <p className="text-sm text-destructive">
                {form.formState.errors.baseUrl.message}
              </p>
            ) : null}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Publishing…" : "Publish"}
          </Button>
        </form>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="rounded-md border bg-muted p-3 text-sm">
            Published! View it at{" "}
            <Link className="underline" href={`/marketplace/${result.slug}`}>
              /marketplace/{result.slug}
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
