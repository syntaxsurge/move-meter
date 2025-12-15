"use client";

import * as React from "react";
import Link from "next/link";
import { useAction } from "convex/react";
import { useIdentityToken } from "@privy-io/react-auth";
import { api } from "@/lib/convex/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TryConsole({ slug }: { slug: string }) {
  const { identityToken } = useIdentityToken();
  const tryCall = useAction(api.actions.listings.tryCall);

  const [method, setMethod] = React.useState<"GET" | "POST">("GET");
  const [path, setPath] = React.useState<string>("");
  const [body, setBody] = React.useState<string>("{}");
  const [out, setOut] = React.useState<string>("");
  const [running, setRunning] = React.useState(false);

  async function onRun() {
    setOut("");
    if (!identityToken) {
      setOut("Sign in to use Try Console.");
      return;
    }

    setRunning(true);
    try {
      const res = await tryCall({
        idToken: identityToken,
        slug,
        method,
        path: path.trim() ? path.trim() : undefined,
        body: method === "POST" ? body : undefined,
      });
      setOut(JSON.stringify(res, null, 2));
    } catch (err) {
      setOut(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Try Console</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!identityToken ? (
          <div className="text-sm text-muted-foreground">
            Sign in to run requests.{" "}
            <Link
              className="underline underline-offset-4"
              href={`/sign-in?next=${encodeURIComponent(`/marketplace/${slug}`)}`}
            >
              Go to sign-in
            </Link>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="method">
            Method
          </label>
          <select
            id="method"
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
            value={method}
            onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
          </select>

          <label className="sr-only" htmlFor="path">
            Path
          </label>
          <Input
            id="path"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="Optional path, e.g. accounts/0x..."
          />
        </div>

        {method === "POST" ? (
          <div className="space-y-2">
            <div className="text-sm font-medium">JSON body</div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </div>
        ) : null}

        <Button onClick={onRun} disabled={running}>
          {running ? "Running…" : "Run"}
        </Button>

        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-md border bg-muted p-3 text-xs">
          {out || "—"}
        </pre>
      </CardContent>
    </Card>
  );
}
