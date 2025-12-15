"use client";

import * as React from "react";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import { EnsureMovementWallet } from "@/components/auth/EnsureMovementWallet";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();

  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app/dashboard";

  if (!ready) {
    return <div className="mx-auto max-w-md p-6 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-md space-y-6 p-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Continue with email or Google. A Movement wallet is created in-app via Privy.
          </p>
        </div>

        <Button className="w-full" size="lg" onClick={login}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <EnsureMovementWallet
      onReady={() => {
        router.replace(next);
      }}
    />
  );
}
