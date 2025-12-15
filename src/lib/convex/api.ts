import { makeFunctionReference } from "convex/server";

export type ListingCategory = "defi" | "consumer" | "gaming" | "devex" | "x402";

export type Listing = {
  _id: string;
  _creationTime: number;
  providerDid: string;
  title: string;
  summary: string;
  slug: string;
  category: ListingCategory;
  baseUrl: string;
  priceMove: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type TryCallResult = {
  ok: boolean;
  status: number;
  url: string;
  contentType: string | null;
  location: string | null;
  body: string;
};

export type PaymentReceipt = {
  _id: string;
  _creationTime: number;
  createdAt: number;
  endpoint: string;
  network: string;
  payTo: string;
  priceUsd: string;
  payerWalletAddress: string;
  payer?: string;
  transaction?: string;
  paymentResponseHeader?: string;
  decodeError?: string;
};

export type UsageLogPaidCallArgs = {
  route: string;
  network: string;
  payTo: string;
  priceUsd: string;
  ok: boolean;
};

export type UsageDailySummaryRow = {
  day: string;
  calls: number;
  okCalls: number;
  revenueUsd: number;
};

export type PortfolioReport = {
  _id: string;
  _creationTime: number;
  slug: string;
  address: string;
  movementChainId: number;
  generatedAt: number;
  data: unknown;
};

export type PortfolioReportCreateArgs = {
  slug: string;
  address: string;
  movementChainId: number;
  generatedAt: number;
  data: unknown;
};

export type User = {
  _id: string;
  _creationTime: number;
  privyDid: string;
  movementAddress?: string;
  createdAt: number;
  updatedAt: number;
};

export const api = {
  listings: {
    publicList: makeFunctionReference<"query", { limit?: number }, Listing[]>(
      "listings:publicList"
    ),
    getBySlug: makeFunctionReference<"query", { slug: string }, Listing | null>(
      "listings:getBySlug"
    ),
    listByProvider: makeFunctionReference<
      "query",
      { providerDid: string; limit?: number },
      Listing[]
    >("listings:listByProvider"),
  },
  actions: {
    listings: {
      createListing: makeFunctionReference<
        "action",
        {
          idToken: string;
          title: string;
          summary: string;
          category: ListingCategory;
          baseUrl: string;
          priceMove: number;
        },
        { id: string; slug: string }
      >("actions/listings:createListing"),
      tryCall: makeFunctionReference<
        "action",
        {
          idToken: string;
          slug: string;
          path?: string;
          method: "GET" | "POST";
          body?: string;
        },
        TryCallResult
      >("actions/listings:tryCall"),
    },
    users: {
      upsertCurrentUser: makeFunctionReference<
        "action",
        { idToken: string; movementAddress?: string },
        { id: string }
      >("actions/users:upsertCurrentUser"),
    },
  },
  payments: {
    recordReceipt: makeFunctionReference<
      "mutation",
      {
        endpoint: string;
        network: string;
        payTo: string;
        priceUsd: string;
        payerWalletAddress: string;
        payer?: string;
        transaction?: string;
        paymentResponseHeader?: string;
        decodeError?: string;
      },
      string
    >("payments:recordReceipt"),
    listReceiptsForWallet: makeFunctionReference<
      "query",
      { payerWalletAddress: string; limit?: number },
      PaymentReceipt[]
    >("payments:listReceiptsForWallet"),
  },
  usageEvents: {
    logPaidCall: makeFunctionReference<"mutation", UsageLogPaidCallArgs, null>(
      "usageEvents:logPaidCall"
    ),
    dailySummary: makeFunctionReference<
      "query",
      { days: number; route?: string },
      UsageDailySummaryRow[]
    >("usageEvents:dailySummary"),
  },
  portfolioReports: {
    create: makeFunctionReference<
      "mutation",
      PortfolioReportCreateArgs,
      { id: string; slug: string }
    >("portfolioReports:create"),
    getBySlug: makeFunctionReference<"query", { slug: string }, PortfolioReport | null>(
      "portfolioReports:getBySlug"
    ),
  },
  users: {
    getByPrivyDid: makeFunctionReference<"query", { privyDid: string }, User | null>(
      "users:getByPrivyDid"
    ),
  },
} as const;
