"use client";

import * as React from "react";
import { usePrivy, type User, type WalletWithMetadata } from "@privy-io/react-auth";
import { useCreateWallet } from "@privy-io/react-auth/extended-chains";

type Props = {
  onReady?: (args: { movementAddress: string }) => void;
  children?: React.ReactNode | ((args: { movementAddress: string }) => React.ReactNode);
};

function getMovementWalletAddress(user: User | null): string | null {
  if (!user) return null;
  const wallets = user.linkedAccounts.filter(
    (a): a is WalletWithMetadata => a.type === "wallet"
  );
  const movementWallet = wallets.find((w) => w.chainType === "movement");
  return movementWallet?.address ?? null;
}

export function EnsureMovementWallet({ onReady, children }: Props) {
  const { ready, authenticated, user } = usePrivy();
  const { createWallet } = useCreateWallet();

  const existingAddress = React.useMemo(() => getMovementWalletAddress(user), [user]);
  const [movementAddress, setMovementAddress] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const creatingRef = React.useRef(false);

  React.useEffect(() => {
    if (!ready || !authenticated) return;
    if (movementAddress) return;

    if (existingAddress) {
      setMovementAddress(existingAddress);
      return;
    }

    if (creatingRef.current) return;
    creatingRef.current = true;

    void (async () => {
      try {
        const { wallet } = await createWallet({ chainType: "movement" });
        setMovementAddress(wallet.address);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        creatingRef.current = false;
      }
    })();
  }, [ready, authenticated, existingAddress, movementAddress, createWallet]);

  React.useEffect(() => {
    if (!movementAddress) return;
    onReady?.({ movementAddress });
  }, [movementAddress, onReady]);

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!authenticated) return null;

  if (error) {
    return (
      <div className="p-6">
        <div className="text-sm font-medium">Movement wallet setup failed</div>
        <pre className="mt-2 whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">
          {error}
        </pre>
      </div>
    );
  }

  if (!movementAddress) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Creating your Movement wallet…
      </div>
    );
  }

  if (typeof children === "function") return <>{children({ movementAddress })}</>;
  return <>{children}</>;
}
