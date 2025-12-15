import { ListingDetail } from "@/features/listings/components/ListingDetail";

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <ListingDetail slug={slug} />
    </main>
  );
}
