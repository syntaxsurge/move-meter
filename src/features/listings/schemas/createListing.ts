import { z } from "zod";

export const listingCategorySchema = z.enum([
  "defi",
  "consumer",
  "gaming",
  "devex",
  "x402",
]);

export type ListingCategory = z.infer<typeof listingCategorySchema>;

export const createListingSchema = z.object({
  title: z.string().trim().min(3).max(60),
  summary: z.string().trim().min(20).max(280),
  category: listingCategorySchema,
  baseUrl: z
    .string()
    .trim()
    .url()
    .refine((u) => u.startsWith("https://"), {
      message: "baseUrl must start with https://",
    }),
  priceMove: z.coerce.number().finite().positive().max(10_000),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

