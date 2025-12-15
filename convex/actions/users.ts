"use node";

import { v } from "convex/values";
import {
  actionGeneric,
  makeFunctionReference,
  type FunctionReference,
} from "convex/server";
import { getPrivyClient } from "./_privy";

function normalizeMovementAddress(input: string | undefined): string | undefined {
  if (!input) return undefined;
  const addr = input.trim().toLowerCase();
  if (!/^0x[0-9a-f]{1,64}$/.test(addr)) {
    throw new Error("movementAddress must be a valid Movement address (0x + hex)");
  }
  return addr;
}

const upsertInternalRef =
  makeFunctionReference<
    "mutation",
    { privyDid: string; movementAddress?: string },
    { id: string }
  >("users:upsertInternal") as unknown as FunctionReference<
    "mutation",
    "internal",
    { privyDid: string; movementAddress?: string },
    { id: string }
  >;

export const upsertCurrentUser = actionGeneric({
  args: { idToken: v.string(), movementAddress: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await getPrivyClient().users().get({ id_token: args.idToken });
    return await ctx.runMutation(upsertInternalRef, {
      privyDid: user.id,
      movementAddress: normalizeMovementAddress(args.movementAddress),
    });
  },
});

