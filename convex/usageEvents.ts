import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

function assertMaxLength(value: string, opts: { name: string; max: number }) {
  if (value.length > opts.max) {
    throw new Error(`${opts.name} must be <= ${opts.max} characters`);
  }
}

function assertEvmAddress(value: string, opts: { name: string }) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${opts.name} must be a 0x-prefixed 20-byte hex address`);
  }
}

function toDayUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function usdToMicros(priceUsd: string): number {
  if (!priceUsd.startsWith("$")) {
    throw new Error("priceUsd must start with '$'");
  }
  const raw = priceUsd.slice(1);
  const [whole, frac = ""] = raw.split(".");
  if (!/^\d+$/.test(whole)) throw new Error("Invalid USD price");
  if (!/^\d*$/.test(frac)) throw new Error("Invalid USD price");
  if (frac.length > 6) throw new Error("USD price supports up to 6 decimals");
  const fracPadded = `${frac}000000`.slice(0, 6);

  const micros = Number(whole) * 1_000_000 + Number(fracPadded);
  if (!Number.isSafeInteger(micros)) throw new Error("USD price is too large");
  if (micros < 0) throw new Error("USD price must be positive");
  return micros;
}

export const logPaidCall = mutationGeneric({
  args: {
    route: v.string(),
    network: v.string(),
    payTo: v.string(),
    priceUsd: v.string(),
    ok: v.boolean(),
  },
  handler: async (ctx, args) => {
    assertMaxLength(args.route, { name: "route", max: 200 });
    assertMaxLength(args.network, { name: "network", max: 32 });
    assertMaxLength(args.payTo, { name: "payTo", max: 42 });
    assertMaxLength(args.priceUsd, { name: "priceUsd", max: 32 });

    assertEvmAddress(args.payTo, { name: "payTo" });

    const now = Date.now();
    const day = toDayUTC(now);
    const priceUsdMicros = usdToMicros(args.priceUsd);

    await ctx.db.insert("usageEvents", {
      createdAt: now,
      day,
      route: args.route,
      network: args.network,
      payTo: args.payTo,
      priceUsd: args.priceUsd,
      priceUsdMicros,
      ok: args.ok,
    });

    const revenueUsdMicrosToAdd = args.ok ? priceUsdMicros : 0;

    const dailyRows = await ctx.db
      .query("usageDaily")
      .withIndex("by_route_day", (q) => q.eq("route", args.route))
      .filter((q) => q.eq(q.field("day"), day))
      .take(10);

    const target = dailyRows[0] ?? null;
    if (target) {
      await ctx.db.patch(target._id, {
        calls: target.calls + 1,
        okCalls: target.okCalls + (args.ok ? 1 : 0),
        revenueUsdMicros: target.revenueUsdMicros + revenueUsdMicrosToAdd,
      });
    } else {
      await ctx.db.insert("usageDaily", {
        day,
        route: args.route,
        calls: 1,
        okCalls: args.ok ? 1 : 0,
        revenueUsdMicros: revenueUsdMicrosToAdd,
      });
    }

    return null;
  },
});

export const dailySummary = queryGeneric({
  args: {
    days: v.number(),
    route: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const days = Math.max(1, Math.min(args.days, 60));
    const now = Date.now();

    const rows: Array<{ day: string; calls: number; okCalls: number; revenueUsd: number }> =
      [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const day = d.toISOString().slice(0, 10);

      const dailyDocs = args.route
        ? await ctx.db
            .query("usageDaily")
            .withIndex("by_route_day", (q) => q.eq("route", args.route as string))
            .filter((q) => q.eq(q.field("day"), day))
            .collect()
        : await ctx.db.query("usageDaily").withIndex("by_day", (q) => q.eq("day", day)).collect();

      const calls = dailyDocs.reduce((sum, doc) => sum + doc.calls, 0);
      const okCalls = dailyDocs.reduce((sum, doc) => sum + doc.okCalls, 0);
      const revenueUsdMicros = dailyDocs.reduce((sum, doc) => sum + doc.revenueUsdMicros, 0);

      rows.push({ day, calls, okCalls, revenueUsd: revenueUsdMicros / 1_000_000 });
    }

    return rows;
  },
});
