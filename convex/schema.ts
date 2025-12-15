import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    privyDid: v.string(),
    movementAddress: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_privyDid", ["privyDid"])
    .index("by_movementAddress", ["movementAddress"]),

  listings: defineTable({
    providerDid: v.string(),
    title: v.string(),
    summary: v.string(),
    slug: v.string(),
    category: v.union(
      v.literal("defi"),
      v.literal("consumer"),
      v.literal("gaming"),
      v.literal("devex"),
      v.literal("x402")
    ),
    baseUrl: v.string(),
    priceMove: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active_createdAt", ["isActive", "createdAt"])
    .index("by_provider_createdAt", ["providerDid", "createdAt"]),

  paymentReceipts: defineTable({
    createdAt: v.number(),
    endpoint: v.string(),
    network: v.string(),
    payTo: v.string(),
    priceUsd: v.string(),
    payerWalletAddress: v.string(),
    payer: v.optional(v.string()),
    transaction: v.optional(v.string()),
    paymentResponseHeader: v.optional(v.string()),
    decodeError: v.optional(v.string()),
  }).index("by_payer_createdAt", ["payerWalletAddress", "createdAt"]),
});
