import { CreateListingForm } from "@/features/listings/components/CreateListingForm";
import { serverEnv } from "@/lib/env/server";

export default function DevNewListingPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Publish</h1>
      <CreateListingForm
        defaultBaseUrl={serverEnv.MOVEMENT_FULLNODE_URL}
        faucetUrl={serverEnv.MOVEMENT_FAUCET_URL}
        explorerUrl={serverEnv.MOVEMENT_EXPLORER_URL}
      />
    </div>
  );
}

