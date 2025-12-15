"use client";

import * as React from "react";
import { useCreateWallet, useWallets } from "@privy-io/react-auth";

function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

export function useEvmPaymentWallet() {
  const { ready: walletsReady, wallets } = useWallets();
  const { createWallet } = useCreateWallet();

  const [paymentWalletAddress, setPaymentWalletAddress] = React.useState<string | null>(null);
  const [creatingWallet, setCreatingWallet] = React.useState(false);
  const [walletError, setWalletError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!walletsReady) return;
    const addr = wallets.find((w) => isEvmAddress(w.address))?.address ?? null;
    if (addr) setPaymentWalletAddress(addr);
  }, [walletsReady, wallets]);

  async function ensurePaymentWallet(): Promise<string | null> {
    if (paymentWalletAddress) return paymentWalletAddress;
    if (creatingWallet) return null;

    setCreatingWallet(true);
    setWalletError(null);
    try {
      const wallet = await createWallet();
      if (!isEvmAddress(wallet.address)) {
        throw new Error("Created wallet is not an EVM address");
      }
      setPaymentWalletAddress(wallet.address);
      return wallet.address;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setWalletError(msg);
      return null;
    } finally {
      setCreatingWallet(false);
    }
  }

  return {
    walletsReady,
    paymentWalletAddress,
    creatingWallet,
    walletError,
    ensurePaymentWallet,
  } as const;
}

