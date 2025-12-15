"use client";

import * as React from "react";
import { useAction } from "convex/react";
import { useIdentityToken, usePrivy } from "@privy-io/react-auth";
import { api } from "@/lib/convex/api";
import { getMovementWalletAddress } from "@/components/auth/EnsureMovementWallet";

export function SyncConvexUser() {
  const { ready, authenticated, user } = usePrivy();
  const { identityToken } = useIdentityToken();
  const upsertCurrentUser = useAction(api.actions.users.upsertCurrentUser);

  const movementAddress = React.useMemo(() => getMovementWalletAddress(user), [user]);
  const lastSyncedKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!ready || !authenticated) {
      lastSyncedKeyRef.current = null;
      return;
    }
    if (!identityToken) return;

    const key = `${identityToken}:${movementAddress ?? ""}`;
    if (lastSyncedKeyRef.current === key) return;
    lastSyncedKeyRef.current = key;

    void (async () => {
      try {
        await upsertCurrentUser({
          idToken: identityToken,
          movementAddress: movementAddress ?? undefined,
        });
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Failed to sync user to Convex", err);
        }
      }
    })();
  }, [ready, authenticated, identityToken, movementAddress, upsertCurrentUser]);

  return null;
}

