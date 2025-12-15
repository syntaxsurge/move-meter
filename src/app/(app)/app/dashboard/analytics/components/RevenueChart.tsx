"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { UsageDailySummaryRow } from "@/lib/convex/api";

const chartConfig = {
  calls: { label: "Calls", color: "hsl(var(--chart-1))" },
  revenueUsd: { label: "Revenue (USD)", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export function RevenueChart({ rows }: { rows: UsageDailySummaryRow[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[320px] w-full">
      <BarChart data={rows} margin={{ left: 12, right: 12 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} />
        <YAxis yAxisId="left" tickLine={false} axisLine={false} width={32} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="calls" yAxisId="left" fill="var(--color-calls)" radius={4} />
        <Bar dataKey="revenueUsd" yAxisId="right" fill="var(--color-revenueUsd)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

