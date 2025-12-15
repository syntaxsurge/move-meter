import { Suspense } from "react";
import { SignInClient } from "./SignInClient";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md p-6 text-sm text-muted-foreground">Loading…</div>}>
      <SignInClient />
    </Suspense>
  );
}
