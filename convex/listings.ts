import ipaddr from "ipaddr.js";
import { v } from "convex/values";
import { internalMutationGeneric, queryGeneric } from "convex/server";

const CategoryValidator = v.union(
  v.literal("defi"),
  v.literal("consumer"),
  v.literal("gaming"),
  v.literal("devex"),
  v.literal("x402")
);

function normalizeString(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

function assertStringLength(
  value: string,
  opts: { name: string; min: number; max: number }
): void {
  if (value.length < opts.min || value.length > opts.max) {
    throw new Error(
      `${opts.name} must be between ${opts.min} and ${opts.max} characters`
    );
  }
}

function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".lan")
  );
}

function assertSafeBaseUrl(input: string): URL {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("baseUrl must be a valid URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("baseUrl must start with https://");
  }

  if (url.username || url.password) {
    throw new Error("baseUrl must not include credentials");
  }

  if (url.hash) {
    throw new Error("baseUrl must not include a hash fragment");
  }

  if (isBlockedHostname(url.hostname)) {
    throw new Error("baseUrl hostname is not allowed");
  }

  if (ipaddr.isValid(url.hostname)) {
    const range = ipaddr.parse(url.hostname).range();
    if (
      range === "private" ||
      range === "loopback" ||
      range === "linkLocal" ||
      range === "uniqueLocal" ||
      range === "unspecified"
    ) {
      throw new Error("baseUrl must resolve to a public host");
    }
  }

  return url;
}

export const publicList = queryGeneric({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    return await ctx.db
      .query("listings")
      .withIndex("by_active_createdAt", (q) => q.eq("isActive", true))
      .order("desc")
      .take(limit);
  },
});

export const getBySlug = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const slug = normalizeString(args.slug).toLowerCase();
    return await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

export const listByProvider = queryGeneric({
  args: {
    providerDid: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    return await ctx.db
      .query("listings")
      .withIndex("by_provider_createdAt", (q) => q.eq("providerDid", args.providerDid))
      .order("desc")
      .take(limit);
  },
});

export const createInternal = internalMutationGeneric({
  args: {
    providerDid: v.string(),
    title: v.string(),
    summary: v.string(),
    slug: v.string(),
    category: CategoryValidator,
    baseUrl: v.string(),
    priceMove: v.number(),
  },
  handler: async (ctx, args) => {
    const title = normalizeString(args.title);
    const summary = normalizeString(args.summary);
    const slug = normalizeString(args.slug).toLowerCase();

    assertStringLength(title, { name: "title", min: 3, max: 60 });
    assertStringLength(summary, { name: "summary", min: 20, max: 280 });

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error("slug must be lowercase kebab-case");
    }
    if (slug.length < 3 || slug.length > 80) {
      throw new Error("slug must be between 3 and 80 characters");
    }

    if (!Number.isFinite(args.priceMove) || args.priceMove <= 0) {
      throw new Error("priceMove must be a positive number");
    }

    const url = assertSafeBaseUrl(args.baseUrl);
    const baseUrl = url.toString().replace(/\/+$/, "");

    const existing = await ctx.db
      .query("listings")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (existing) {
      throw new Error("Slug already exists");
    }

    const now = Date.now();
    const id = await ctx.db.insert("listings", {
      providerDid: args.providerDid,
      title,
      summary,
      slug,
      category: args.category,
      baseUrl,
      priceMove: args.priceMove,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { id, slug };
  },
});
