"use client";

// MetaMask connection state. Wraps the injected EIP-1193 provider in an ethers
// BrowserProvider and exposes the signer/address/chainId that hooks rely on.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { BrowserProvider, type Eip1193Provider, type JsonRpcSigner } from "ethers";
import { TARGET_CHAIN_ID } from "@/lib/constants";

type Eip1193 = Eip1193Provider & {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193;
  }
}

export type WalletStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "wrong-network";

interface WalletState {
  status: WalletStatus;
  address: string | null;
  chainId: number | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
}

interface WalletContextValue extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: () => Promise<void>;
}

const DISCONNECTED: WalletState = {
  status: "disconnected",
  address: null,
  chainId: null,
  provider: null,
  signer: null,
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(DISCONNECTED);

  // Reads the current accounts and builds the connected state. No prompt — call
  // eth_requestAccounts first if the user hasn't authorized the site yet.
  const syncFromProvider = useCallback(async (eth: Eip1193) => {
    const provider = new BrowserProvider(eth);
    const accounts: string[] = await provider.send("eth_accounts", []);
    if (accounts.length === 0) {
      setState(DISCONNECTED);
      return;
    }
    const signer = await provider.getSigner();
    const chainId = Number((await provider.getNetwork()).chainId);
    setState({
      status: chainId === TARGET_CHAIN_ID ? "connected" : "wrong-network",
      address: accounts[0],
      chainId,
      provider,
      signer,
    });
  }, []);

  const connect = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) {
      console.warn("[wallet] No injected wallet found. Install MetaMask.");
      return;
    }
    setState((s) => ({ ...s, status: "connecting" }));
    try {
      await eth.request({ method: "eth_requestAccounts" });
      await syncFromProvider(eth);
    } catch (err) {
      console.warn("[wallet] connect rejected", err);
      setState(DISCONNECTED);
    }
  }, [syncFromProvider]);

  const disconnect = useCallback(() => setState(DISCONNECTED), []);

  const switchNetwork = useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    const hexChainId = "0x" + TARGET_CHAIN_ID.toString(16);
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hexChainId }],
      });
      await syncFromProvider(eth);
    } catch (err) {
      console.warn("[wallet] switch network failed", err);
    }
  }, [syncFromProvider]);

  // Silent reconnect on mount, plus account/chain change listeners.
  useEffect(() => {
    const eth = window.ethereum;
    if (!eth) return;
    void syncFromProvider(eth);
    if (!eth.on) return;

    const handleAccounts = () => void syncFromProvider(eth);
    const handleChain = () => void syncFromProvider(eth);
    eth.on("accountsChanged", handleAccounts);
    eth.on("chainChanged", handleChain);
    return () => {
      eth.removeListener?.("accountsChanged", handleAccounts);
      eth.removeListener?.("chainChanged", handleChain);
    };
  }, [syncFromProvider]);

  return (
    <WalletContext.Provider
      value={{ ...state, connect, disconnect, switchNetwork }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}
