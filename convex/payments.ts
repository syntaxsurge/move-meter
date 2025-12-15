import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

function assertMaxLength(value: string | undefined, opts: { name: string; max: number }) {
  if (value === undefined) return;
  if (value.length > opts.max) {
    throw new Error(`${opts.name} must be <= ${opts.max} characters`);
  }
}

function assertEvmAddress(value: string, opts: { name: string }) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error(`${opts.name} must be a 0x-prefixed 20-byte hex address`);
  }
}

export const recordReceipt = mutationGeneric({
  args: {
    endpoint: v.string(),
    network: v.string(),
    payTo: v.string(),
    priceUsd: v.string(),
    payerWalletAddress: v.string(),
    payer: v.optional(v.string()),
    transaction: v.optional(v.string()),
    paymentResponseHeader: v.optional(v.string()),
    decodeError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertMaxLength(args.endpoint, { name: "endpoint", max: 200 });
    assertMaxLength(args.network, { name: "network", max: 32 });
    assertMaxLength(args.payTo, { name: "payTo", max: 42 });
    assertMaxLength(args.priceUsd, { name: "priceUsd", max: 32 });
    assertMaxLength(args.payerWalletAddress, { name: "payerWalletAddress", max: 42 });
    assertMaxLength(args.payer, { name: "payer", max: 42 });
    assertMaxLength(args.transaction, { name: "transaction", max: 100 });
    assertMaxLength(args.paymentResponseHeader, { name: "paymentResponseHeader", max: 10_000 });
    assertMaxLength(args.decodeError, { name: "decodeError", max: 1_000 });

    assertEvmAddress(args.payTo, { name: "payTo" });
    assertEvmAddress(args.payerWalletAddress, { name: "payerWalletAddress" });
    if (args.payer) assertEvmAddress(args.payer, { name: "payer" });

    const now = Date.now();
    return await ctx.db.insert("paymentReceipts", { createdAt: now, ...args });
  },
});

export const listReceiptsForWallet = queryGeneric({
  args: {
    payerWalletAddress: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    assertEvmAddress(args.payerWalletAddress, { name: "payerWalletAddress" });
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 100);
    return await ctx.db
      .query("paymentReceipts")
      .withIndex("by_payer_createdAt", (q) => q.eq("payerWalletAddress", args.payerWalletAddress))
      .order("desc")
      .take(limit);
  },
});

