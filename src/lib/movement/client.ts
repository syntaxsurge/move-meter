import "server-only";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { serverEnv } from "@/lib/env/server";

const config = new AptosConfig({
  network: Network.CUSTOM,
  fullnode: serverEnv.MOVEMENT_FULLNODE_URL,
});

export const movement = new Aptos(config);
