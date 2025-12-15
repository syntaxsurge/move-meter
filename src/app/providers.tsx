"use client";

import * as React from "react";
import { PrivyProvider } from "@privy-io/react-auth";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { clientEnv } from "@/lib/env/client";
import { SyncConvexUser } from "@/components/auth/SyncConvexUser";

const convex = new ConvexReactClient(clientEnv.NEXT_PUBLIC_CONVEX_URL);

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={clientEnv.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        loginMethods: ["email", "google"],
      }}
    >
      <ConvexProvider client={convex}>
        <SyncConvexUser />
        {children}
      </ConvexProvider>
    </PrivyProvider>
  );
}
