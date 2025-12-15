import { MovementWalletCard } from "@/features/wallet/MovementWalletCard";

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <MovementWalletCard />
    </div>
  );
}
