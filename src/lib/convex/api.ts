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
  },
} as const;

