"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  type TooltipContentProps as RechartsTooltipContentProps,
  type TooltipProps as RechartsTooltipProps,
} from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

const ChartConfigContext = React.createContext<ChartConfig | null>(null);

export function ChartContainer({
  config,
  className,
  children,
}: {
  config: ChartConfig;
  className?: string;
  children: React.ReactNode;
}) {
  const style = React.useMemo(() => {
    const vars: Record<string, string> = {};
    for (const [key, item] of Object.entries(config)) {
      vars[`--color-${key}`] = item.color;
    }
    return vars as React.CSSProperties;
  }, [config]);

  return (
    <ChartConfigContext.Provider value={config}>
      <div
        className={cn(
          "flex w-full items-center justify-center text-xs [&_.recharts-cartesian-grid-horizontal_line]:stroke-border [&_.recharts-cartesian-grid-vertical_line]:stroke-border [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-layer]:outline-none",
          className
        )}
        style={style}
      >
        <ResponsiveContainer>{children}</ResponsiveContainer>
      </div>
    </ChartConfigContext.Provider>
  );
}

export function ChartTooltip(props: RechartsTooltipProps<number, string>) {
  return <RechartsTooltip {...props} />;
}

export function ChartTooltipContent({
  active,
  label,
  payload,
}: Partial<RechartsTooltipContentProps<number, string>>) {
  const config = React.useContext(ChartConfigContext);
  if (!active || !payload?.length || !config) return null;

  return (
    <div className="rounded-md border bg-background p-2 shadow-sm">
      <div className="text-xs font-medium">{String(label ?? "")}</div>
      <div className="mt-1 space-y-1">
        {payload.map((p) => {
          const key = String(p.dataKey ?? p.name ?? "");
          const item = config[key];
          if (!item) return null;

          const value =
            typeof p.value === "number" && Number.isFinite(p.value) ? p.value : null;

          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-sm"
                  style={{ background: item.color }}
                  aria-hidden="true"
                />
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>
              <span className="font-mono text-xs">{value ?? "—"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
