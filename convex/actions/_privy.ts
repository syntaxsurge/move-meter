"use node";

import { PrivyClient } from "@privy-io/node";
import { z } from "zod";

let privyClient: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (privyClient) return privyClient;

  const parsed = z
    .object({
      PRIVY_APP_ID: z.string().min(1),
      PRIVY_APP_SECRET: z.string().min(1),
    })
    .safeParse({
      PRIVY_APP_ID: process.env.PRIVY_APP_ID,
      PRIVY_APP_SECRET: process.env.PRIVY_APP_SECRET,
    });

  if (!parsed.success) {
    throw new Error(
      "Missing PRIVY_APP_ID / PRIVY_APP_SECRET in Convex environment variables"
    );
  }

  privyClient = new PrivyClient({
    appId: parsed.data.PRIVY_APP_ID,
    appSecret: parsed.data.PRIVY_APP_SECRET,
  });

  return privyClient;
}

