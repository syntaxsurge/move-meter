import { v } from "convex/values";
import { mutationGeneric, queryGeneric } from "convex/server";

function normalizeSlug(input: string): string {
  return input.trim();
}

function normalizeMovementAddress(input: string): string {
  return input.trim().toLowerCase();
}

function assertMaxLength(value: string, opts: { name: string; max: number }) {
  if (value.length > opts.max) {
    throw new Error(`${opts.name} must be <= ${opts.max} characters`);
  }
}

function assertSlug(value: string) {
  if (value.length < 8 || value.length > 128) {
    throw new Error("slug must be between 8 and 128 characters");
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
    throw new Error("slug must be URL-safe (letters, numbers, '_' or '-')");
  }
}

function assertMovementAddress(value: string) {
  if (!/^0x[0-9a-f]{1,64}$/.test(value)) {
    throw new Error("address must be a 0x-prefixed Movement address");
  }
}

export const create = mutationGeneric({
  args: {
    slug: v.string(),
    address: v.string(),
    movementChainId: v.number(),
    generatedAt: v.number(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    const address = normalizeMovementAddress(args.address);

    assertMaxLength(slug, { name: "slug", max: 128 });
    assertMaxLength(address, { name: "address", max: 66 });

    assertSlug(slug);
    assertMovementAddress(address);

    if (!Number.isFinite(args.movementChainId) || args.movementChainId <= 0) {
      throw new Error("movementChainId must be a positive number");
    }
    if (!Number.isInteger(args.movementChainId)) {
      throw new Error("movementChainId must be an integer");
    }

    if (!Number.isFinite(args.generatedAt) || args.generatedAt <= 0) {
      throw new Error("generatedAt must be a positive number");
    }

    const existing = await ctx.db
      .query("portfolioReports")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) throw new Error("slug already exists");

    const id = await ctx.db.insert("portfolioReports", {
      slug,
      address,
      movementChainId: args.movementChainId,
      generatedAt: args.generatedAt,
      data: args.data,
    });

    return { id, slug };
  },
});

export const getBySlug = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = normalizeSlug(args.slug);
    if (!slug) return null;
    return await ctx.db
      .query("portfolioReports")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

