import { v } from "convex/values";
import { internalMutationGeneric, queryGeneric } from "convex/server";

function normalizeMovementAddress(input: string): string {
  const addr = input.trim().toLowerCase();
  if (!/^0x[0-9a-f]{1,64}$/.test(addr)) {
    throw new Error("movementAddress must be a valid Movement address (0x + hex)");
  }
  return addr;
}

export const getByPrivyDid = queryGeneric({
  args: { privyDid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_privyDid", (q) => q.eq("privyDid", args.privyDid))
      .unique();
  },
});

export const upsertInternal = internalMutationGeneric({
  args: { privyDid: v.string(), movementAddress: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_privyDid", (q) => q.eq("privyDid", args.privyDid))
      .unique();

    const movementAddress =
      args.movementAddress !== undefined
        ? normalizeMovementAddress(args.movementAddress)
        : undefined;

    if (existing) {
      const patch: { movementAddress?: string; updatedAt: number } = { updatedAt: now };
      if (movementAddress !== undefined) patch.movementAddress = movementAddress;
      await ctx.db.patch(existing._id, patch);
      return { id: existing._id };
    }

    const insert: {
      privyDid: string;
      createdAt: number;
      updatedAt: number;
      movementAddress?: string;
    } = {
      privyDid: args.privyDid,
      createdAt: now,
      updatedAt: now,
    };
    if (movementAddress !== undefined) insert.movementAddress = movementAddress;

    const id = await ctx.db.insert("users", insert);

    return { id };
  },
});
