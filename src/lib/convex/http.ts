import "server-only";

import { z } from "zod";
import { ConvexHttpClient } from "convex/browser";
import type { HttpMutationOptions } from "convex/browser";
import type {
  ArgsAndOptions,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import type { PortfolioReportCreateArgs, UsageLogPaidCallArgs } from "@/lib/convex/api";
import { api } from "@/lib/convex/api";

const ConvexUrlSchema = z.string().url();

let cachedClient: ConvexHttpClient | null = null;

export function getConvexHttpClient(): ConvexHttpClient {
  if (cachedClient) return cachedClient;
  const parsed = ConvexUrlSchema.safeParse(process.env.NEXT_PUBLIC_CONVEX_URL);
  if (!parsed.success) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured");
  }
  cachedClient = new ConvexHttpClient(parsed.data);
  return cachedClient;
}

export async function convexQuery<Query extends FunctionReference<"query", "public">>(
  reference: Query,
  ...args: OptionalRestArgs<Query>
): Promise<FunctionReturnType<Query>> {
  return await getConvexHttpClient().query(reference, ...args);
}

export async function convexMutation<
  Mutation extends FunctionReference<"mutation", "public">,
>(
  reference: Mutation,
  ...args: ArgsAndOptions<Mutation, HttpMutationOptions>
): Promise<FunctionReturnType<Mutation>> {
  return await getConvexHttpClient().mutation(reference, ...args);
}

export async function logPaidCallServer(args: UsageLogPaidCallArgs): Promise<void> {
  try {
    await convexMutation(api.usageEvents.logPaidCall, args);
  } catch (err) {
    console.warn("Failed to log paid call:", err);
  }
}

export async function createPortfolioReportServer(args: PortfolioReportCreateArgs): Promise<{
  id: string;
  slug: string;
}> {
  return await convexMutation(api.portfolioReports.create, args);
}
