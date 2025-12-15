"use client";

import * as React from "react";
import { usePrivy } from "@privy-io/react-auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nextPath = React.useMemo(() => {
    const sp = searchParams.toString();
    return sp ? `${pathname}?${sp}` : pathname;
  }, [pathname, searchParams]);

  React.useEffect(() => {
    if (!ready) return;
    if (authenticated) return;
    router.replace(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }, [ready, authenticated, router, nextPath]);

  if (!ready) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!authenticated) return null;

  return <>{children}</>;
}
