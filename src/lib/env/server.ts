import "server-only";
import { z } from "zod";

const MovementNetworkSchema = z.enum(["testnet", "mainnet"]);

const DEFAULTS_BY_NETWORK = {
  testnet: {
    chainId: "250",
    fullnodeUrl: "https://testnet.movementnetwork.xyz/v1",
    indexerUrl: "https://hasura.testnet.movementnetwork.xyz/v1/graphql",
    faucetUrl: "https://faucet.movementnetwork.xyz/",
    explorerUrl: "https://explorer.movementnetwork.xyz/?network=bardock+testnet",
  },
  mainnet: {
    chainId: "126",
    fullnodeUrl: "https://full.mainnet.movementinfra.xyz/v1",
    indexerUrl: "https://indexer.mainnet.movementnetwork.xyz/v1/graphql",
    faucetUrl: "https://faucet.movementnetwork.xyz/",
    explorerUrl: "https://explorer.movementnetwork.xyz/?network=mainnet",
  },
} as const;

const ServerEnvSchema = z.object({
  MOVEMENT_NETWORK: MovementNetworkSchema.default("testnet"),
  MOVEMENT_CHAIN_ID: z.coerce.number().int().positive(),
  MOVEMENT_FULLNODE_URL: z.string().url(),
  MOVEMENT_INDEXER_URL: z.string().url(),
  MOVEMENT_FAUCET_URL: z.string().url(),
  MOVEMENT_EXPLORER_URL: z.string().url(),
  MOVEMENT_BASE_COIN_TYPE: z.string().min(1),
});

const movementNetworkParsed = MovementNetworkSchema.safeParse(process.env.MOVEMENT_NETWORK);
const movementNetwork = movementNetworkParsed.success ? movementNetworkParsed.data : "testnet";
const movementDefaults = DEFAULTS_BY_NETWORK[movementNetwork];

export const serverEnv = ServerEnvSchema.parse({
  MOVEMENT_NETWORK: movementNetwork,
  MOVEMENT_CHAIN_ID: process.env.MOVEMENT_CHAIN_ID ?? movementDefaults.chainId,
  MOVEMENT_FULLNODE_URL:
    process.env.MOVEMENT_FULLNODE_URL ?? movementDefaults.fullnodeUrl,
  MOVEMENT_INDEXER_URL:
    process.env.MOVEMENT_INDEXER_URL ?? movementDefaults.indexerUrl,
  MOVEMENT_FAUCET_URL:
    process.env.MOVEMENT_FAUCET_URL ?? movementDefaults.faucetUrl,
  MOVEMENT_EXPLORER_URL:
    process.env.MOVEMENT_EXPLORER_URL ?? movementDefaults.explorerUrl,
  MOVEMENT_BASE_COIN_TYPE:
    process.env.MOVEMENT_BASE_COIN_TYPE ?? "0x1::aptos_coin::AptosCoin",
});
