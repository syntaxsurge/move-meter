import "server-only";

import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { getX402ServerEnv } from "@/lib/env/x402";

let cachedServer: x402ResourceServer | null = null;

export function getX402Server(): x402ResourceServer {
  if (cachedServer) return cachedServer;

  const env = getX402ServerEnv();
  const facilitatorClient = new HTTPFacilitatorClient({ url: env.X402_FACILITATOR_URL });

  const server = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(server, { networks: [env.X402_NETWORK as `${string}:${string}`] });

  cachedServer = server;
  return cachedServer;
}
