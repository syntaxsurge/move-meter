"use client";

import { useQuery } from "convex/react";
import { api } from "@/lib/convex/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportViewer({ slug }: { slug: string }) {
  const report = useQuery(api.portfolioReports.getBySlug, { slug });

  if (report === undefined) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-sm text-muted-foreground">Loading report…</div>
      </div>
    );
  }

  if (report === null) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="text-sm text-muted-foreground">Report not found.</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col gap-1">
            <span>MoveMeter Portfolio Report</span>
            <span className="text-sm font-normal text-muted-foreground">
              {report.address} • {new Date(report.generatedAt).toLocaleString()}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[70vh] overflow-auto rounded-md border bg-muted p-3 text-xs">
            {JSON.stringify(report.data, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

