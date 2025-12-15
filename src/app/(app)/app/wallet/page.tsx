import { MovementWalletCard } from "@/features/wallet/MovementWalletCard";

export default function WalletPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
      <MovementWalletCard />
    </div>
  );
}
