import * as React from "react";
import { AuthGate } from "@/components/auth/AuthGate";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </React.Suspense>
  );
}
