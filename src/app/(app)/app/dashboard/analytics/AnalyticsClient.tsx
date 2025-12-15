"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueChart } from "./components/RevenueChart";

export function AnalyticsClient() {
  const rows = useQuery(api.usageEvents.dailySummary, { days: 14 });

  if (rows === undefined) {
    return <div className="text-sm text-muted-foreground">Loading analytics…</div>;
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.calls += row.calls;
      acc.okCalls += row.okCalls;
      acc.revenueUsd += row.revenueUsd;
      return acc;
    },
    { calls: 0, okCalls: 0, revenueUsd: 0 }
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily paid calls and revenue across x402 routes.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Calls</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.calls}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Successful</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.okCalls}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue (USD)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {totals.revenueUsd.toFixed(2)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Last 14 days</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

