import "server-only";

import { z } from "zod";

const X402ModeSchema = z.enum(["testnet", "mainnet"]);

const DEFAULTS_BY_MODE = {
  testnet: {
    facilitatorUrl: "https://x402.org/facilitator",
    network: "eip155:84532",
  },
  mainnet: {
    facilitatorUrl: "https://api.cdp.coinbase.com/platform/v2/x402",
    network: "eip155:8453",
  },
} as const;

const X402ServerEnvSchema = z.object({
  X402_MODE: X402ModeSchema.default("testnet"),
  X402_FACILITATOR_URL: z.string().url(),
  X402_NETWORK: z.string().regex(/^eip155:\d+$/),
  X402_PAY_TO_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  X402_PRICE_USD: z.string().regex(/^\$\d+(?:\.\d{1,6})?$/),
});

export type X402ServerEnv = z.infer<typeof X402ServerEnvSchema>;

let cached: X402ServerEnv | null = null;

export function getX402ServerEnv(): X402ServerEnv {
  if (cached) return cached;

  const modeParsed = X402ModeSchema.safeParse(process.env.X402_MODE);
  const mode = modeParsed.success ? modeParsed.data : "testnet";
  const defaults = DEFAULTS_BY_MODE[mode];

  const parsed = X402ServerEnvSchema.safeParse({
    X402_MODE: mode,
    X402_FACILITATOR_URL: process.env.X402_FACILITATOR_URL ?? defaults.facilitatorUrl,
    X402_NETWORK: process.env.X402_NETWORK ?? defaults.network,
    X402_PAY_TO_ADDRESS: process.env.X402_PAY_TO_ADDRESS,
    X402_PRICE_USD: process.env.X402_PRICE_USD ?? "$0.05",
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid x402 env:\n${issues}`);
  }

  cached = parsed.data;
  return cached;
}

export function usdToUsdcMicros(priceUsd: string): bigint {
  if (!priceUsd.startsWith("$")) {
    throw new Error("priceUsd must start with '$'");
  }
  const raw = priceUsd.slice(1);
  const [whole, frac = ""] = raw.split(".");
  if (!/^\d+$/.test(whole)) throw new Error("Invalid USD price");
  if (!/^\d*$/.test(frac)) throw new Error("Invalid USD price");
  if (frac.length > 6) throw new Error("USD price supports up to 6 decimals");
  const fracPadded = `${frac}000000`.slice(0, 6);
  return BigInt(whole) * 1_000_000n + BigInt(fracPadded);
}
