import "server-only";
import { z } from "zod";

const ServerEnvSchema = z.object({
  MOVEMENT_CHAIN_ID: z.coerce.number().int().positive(),
  MOVEMENT_FULLNODE_URL: z.string().url(),
  MOVEMENT_FAUCET_URL: z.string().url(),
  MOVEMENT_EXPLORER_URL: z.string().url(),
  MOVEMENT_BASE_COIN_TYPE: z.string().min(1),
});

export const serverEnv = ServerEnvSchema.parse({
  MOVEMENT_CHAIN_ID: process.env.MOVEMENT_CHAIN_ID ?? "250",
  MOVEMENT_FULLNODE_URL:
    process.env.MOVEMENT_FULLNODE_URL ?? "https://testnet.movementnetwork.xyz/v1",
  MOVEMENT_FAUCET_URL:
    process.env.MOVEMENT_FAUCET_URL ?? "https://faucet.testnet.movementnetwork.xyz/",
  MOVEMENT_EXPLORER_URL:
    process.env.MOVEMENT_EXPLORER_URL ?? "https://explorer.testnet.movementnetwork.xyz/",
  MOVEMENT_BASE_COIN_TYPE:
    process.env.MOVEMENT_BASE_COIN_TYPE ?? "0x1::aptos_coin::AptosCoin",
});
