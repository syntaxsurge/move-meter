"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  paidUrl: string;
  method?: "GET" | "POST";
  jsonBodyExample?: Record<string, unknown>;
};

function toPrettyJson(input: unknown): string {
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return "{}";
  }
}

export function X402SnippetTabs({
  paidUrl,
  method = "POST",
  jsonBodyExample = { address: "0x1", limit: 25 },
}: Props) {
  const [active, setActive] = React.useState<"fetch" | "axios">("fetch");

  const prettyBody = toPrettyJson(jsonBodyExample);

  const fetchSnippet = `// pnpm add @x402/fetch @x402/evm viem
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
const client = new x402Client();
registerExactEvmScheme(client, { signer });

const fetchWithPayment = wrapFetchWithPayment(fetch, client);

const res = await fetchWithPayment("${paidUrl}", {
  method: "${method}",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(${prettyBody}),
});

if (!res.ok) throw new Error(await res.text());
console.log(await res.json());`;

  const axiosSnippet = `// pnpm add @x402/axios @x402/evm viem axios
import axios from "axios";
import { x402Client, withPaymentInterceptor } from "@x402/axios";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const signer = privateKeyToAccount(process.env.EVM_PRIVATE_KEY);
const client = new x402Client();
registerExactEvmScheme(client, { signer });

const api = withPaymentInterceptor(axios.create(), client);

const res = await api.request({
  url: "${paidUrl}",
  method: "${method}",
  headers: { "content-type": "application/json" },
  data: ${prettyBody},
});

console.log(res.data);`;

  const snippet = active === "fetch" ? fetchSnippet : axiosSnippet;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>Buyer snippets</span>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(snippet);
              } catch {
                // no-op
              }
            }}
          >
            Copy
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={active === "fetch" ? "default" : "outline"}
            onClick={() => setActive("fetch")}
          >
            @x402/fetch
          </Button>
          <Button
            type="button"
            variant={active === "axios" ? "default" : "outline"}
            onClick={() => setActive("axios")}
          >
            @x402/axios
          </Button>
        </div>
        <pre className="overflow-auto rounded-md border bg-muted p-3 text-xs">{snippet}</pre>
      </CardContent>
    </Card>
  );
}

