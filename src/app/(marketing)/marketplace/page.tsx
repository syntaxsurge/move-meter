import { MarketplaceList } from "@/features/listings/components/MarketplaceList";

export default function MarketplacePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Marketplace</h1>
        <p className="text-sm text-muted-foreground">
          Discover pay-per-request APIs and tools built for Movement.
        </p>
      </div>
      <MarketplaceList />
    </main>
  );
}

