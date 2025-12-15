"use node";

import ipaddr from "ipaddr.js";
import slugify from "slugify";
import { v } from "convex/values";
import {
  actionGeneric,
  makeFunctionReference,
  type FunctionReference,
} from "convex/server";
import { lookup } from "node:dns/promises";
import { randomUUID } from "node:crypto";
import { getPrivyClient } from "./_privy";

const CategoryValidator = v.union(
  v.literal("defi"),
  v.literal("consumer"),
  v.literal("gaming"),
  v.literal("devex"),
  v.literal("x402")
);

const BLOCKED_IP_RANGES = new Set([
  "broadcast",
  "carrierGradeNat",
  "linkLocal",
  "loopback",
  "multicast",
  "private",
  "reserved",
  "uniqueLocal",
  "unspecified",
]);

const createInternalRef =
  makeFunctionReference<
    "mutation",
    {
      providerDid: string;
      title: string;
      summary: string;
      slug: string;
      category: "defi" | "consumer" | "gaming" | "devex" | "x402";
      baseUrl: string;
      priceMove: number;
    },
    { id: string; slug: string }
  >("listings:createInternal") as unknown as FunctionReference<
    "mutation",
    "internal",
    {
      providerDid: string;
      title: string;
      summary: string;
      slug: string;
      category: "defi" | "consumer" | "gaming" | "devex" | "x402";
      baseUrl: string;
      priceMove: number;
    },
    { id: string; slug: string }
  >;

const getBySlugRef = makeFunctionReference<
  "query",
  { slug: string },
  { isActive: boolean; baseUrl: string } | null
>("listings:getBySlug");

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

function assertPublicIp(ip: string): void {
  if (!ipaddr.isValid(ip)) return;
  const range = ipaddr.parse(ip).range();
  if (BLOCKED_IP_RANGES.has(range)) {
    throw new Error("Refusing to fetch from a non-public IP address");
  }
}

async function assertPublicHostname(hostname: string): Promise<void> {
  if (isBlockedHostname(hostname)) {
    throw new Error("Refusing to fetch from a non-public hostname");
  }

  if (ipaddr.isValid(hostname)) {
    assertPublicIp(hostname);
    return;
  }

  let results: Array<{ address: string }> = [];
  try {
    results = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    // If DNS resolution fails, fetch will fail anyway. Avoid blocking listing creation.
    return;
  }

  if (results.length === 0) return;
  for (const { address } of results) assertPublicIp(address);
}

function normalizePath(input: string | undefined): string {
  const raw = (input ?? "").trim();
  if (raw === "" || raw === "/") return "";
  if (raw.startsWith("//")) throw new Error("Invalid path");
  if (/^[A-Za-z][A-Za-z0-9+._-]*:/.test(raw)) throw new Error("Invalid path");
  const stripped = raw.replace(/^\/+/, "");
  if (stripped.split("/").some((seg) => seg === "..")) {
    throw new Error("Path must not contain '..'");
  }
  return stripped;
}

async function readResponseTextWithLimit(
  res: Response,
  opts: { maxBytes: number }
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";

  const decoder = new TextDecoder();
  let bytes = 0;
  let out = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    bytes += value.byteLength;
    if (bytes > opts.maxBytes) {
      throw new Error("Response exceeded maximum size");
    }
    out += decoder.decode(value, { stream: true });
  }

  out += decoder.decode();
  return out;
}

export const createListing = actionGeneric({
  args: {
    idToken: v.string(),
    title: v.string(),
    summary: v.string(),
    category: CategoryValidator,
    baseUrl: v.string(),
    priceMove: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getPrivyClient().users().get({ id_token: args.idToken });

    let baseUrl: URL;
    try {
      baseUrl = new URL(args.baseUrl);
    } catch {
      throw new Error("baseUrl must be a valid URL");
    }
    await assertPublicHostname(baseUrl.hostname);

    const baseSlug = slugify(args.title, { lower: true, strict: true, trim: true });
    if (!baseSlug) throw new Error("Invalid title");

    for (let attempt = 0; attempt < 3; attempt++) {
      const suffix = attempt === 0 ? "" : `-${randomUUID().slice(0, 8)}`;
      const slug = `${baseSlug}${suffix}`;
      try {
        return await ctx.runMutation(createInternalRef, {
          providerDid: user.id,
          title: args.title,
          summary: args.summary,
          slug,
          category: args.category,
          baseUrl: args.baseUrl,
          priceMove: args.priceMove,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Slug already exists") && attempt < 2) continue;
        throw err;
      }
    }

    throw new Error("Unable to allocate a unique slug");
  },
});

export const tryCall = actionGeneric({
  args: {
    idToken: v.string(),
    slug: v.string(),
    path: v.optional(v.string()),
    method: v.union(v.literal("GET"), v.literal("POST")),
    body: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getPrivyClient().users().get({ id_token: args.idToken });

    const listing = await ctx.runQuery(getBySlugRef, { slug: args.slug });
    if (!listing) throw new Error("Listing not found");
    if (!listing.isActive) throw new Error("Listing is inactive");

    const base = new URL(listing.baseUrl);
    const baseDir = listing.baseUrl.endsWith("/") ? listing.baseUrl : `${listing.baseUrl}/`;
    const normalizedPath = normalizePath(args.path);
    const target = new URL(normalizedPath, baseDir);

    if (target.origin !== base.origin) {
      throw new Error("Invalid path origin");
    }

    await assertPublicHostname(target.hostname);

    const headers: Record<string, string> = {};
    let body: string | undefined;

    if (args.method === "POST") {
      const raw = (args.body ?? "{}").trim();
      if (raw.length > 50_000) throw new Error("Request body is too large");
      try {
        body = JSON.stringify(JSON.parse(raw));
      } catch {
        throw new Error("Body must be valid JSON");
      }
      headers["content-type"] = "application/json";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch(target.toString(), {
        method: args.method,
        headers,
        body,
        redirect: "manual",
        signal: controller.signal,
      });

      const contentType = res.headers.get("content-type");
      const location = res.headers.get("location");
      const text = await readResponseTextWithLimit(res, { maxBytes: 250_000 });

      return {
        ok: res.ok,
        status: res.status,
        url: target.toString(),
        contentType,
        location,
        body: text,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
});
