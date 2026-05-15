'use client';
// =============================================================================
// useSuiWallet — lightweight client-side Sui wallet hook
//
// Detects installed Sui wallets via the Wallet Standard (navigator.wallets)
// and the legacy window.suiWallet shim. No @mysten/dapp-kit dependency.
// All code runs in the browser only — safe for Next.js pages with SSR.
//
// Supports: Sui Wallet, Martian, Ethos, Phantom (Sui), and any
// wallet implementing the Sui Wallet Standard.
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export interface SuiWalletAccount {
  address: string;
  label?: string;
}

export interface SuiWalletInfo {
  name: string;
  icon?: string;
}

export type SuiWalletStatus =
  | 'undetected'   // No Sui wallet extension found
  | 'detected'     // Wallet found, not yet connected
  | 'connecting'   // Connection in progress
  | 'connected'    // Connected and address available
  | 'disconnected' // User disconnected
  | 'error';       // Connection error

export interface SuiWalletState {
  status: SuiWalletStatus;
  address: string | null;
  accounts: SuiWalletAccount[];
  walletInfo: SuiWalletInfo | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isDetected: boolean;
}

// Low-level wallet adapter interface (Wallet Standard subset)
interface WalletAdapter {
  name: string;
  icon?: string;
  connect: () => Promise<{ accounts: Array<{ address: string; label?: string }> }>;
  disconnect?: () => Promise<void>;
}

function detectWallet(): WalletAdapter | null {
  if (typeof window === 'undefined') return null;

  const w = window as unknown as Record<string, unknown>;

  // 1. Sui Wallet Standard — wallets registered via navigator.wallets
  const navWallets = (navigator as unknown as Record<string, unknown>).wallets;
  if (navWallets && typeof (navWallets as { get?: unknown }).get === 'function') {
    const walletList = (navWallets as { get: () => unknown[] }).get();
    const suiWallet = walletList.find((wlt: unknown) => {
      const wallet = wlt as { chains?: string[]; features?: Record<string, unknown> };
      return (
        wallet.chains?.some((c) => c.startsWith('sui:')) &&
        (wallet.features?.['sui:signAndExecuteTransaction'] ||
          wallet.features?.['sui:signAndExecuteTransactionBlock'])
      );
    }) as WalletAdapter | undefined;
    if (suiWallet) return suiWallet;
  }

  // 2. Legacy window.suiWallet (Sui Wallet v1)
  if (w.suiWallet && typeof (w.suiWallet as Record<string, unknown>).connect === 'function') {
    const legacy = w.suiWallet as {
      connect: () => Promise<string[]>;
      disconnect?: () => Promise<void>;
      name?: string;
    };
    return {
      name: 'Sui Wallet',
      icon: undefined,
      connect: async () => {
        const accounts = await legacy.connect();
        return { accounts: accounts.map((a) => ({ address: a })) };
      },
      disconnect: legacy.disconnect?.bind(legacy),
    };
  }

  // 3. Martian Wallet (Sui)
  if (w.martian && typeof (w.martian as Record<string, unknown>).connect === 'function') {
    const martian = w.martian as {
      connect: () => Promise<{ address: string }>;
      disconnect?: () => Promise<void>;
    };
    return {
      name: 'Martian Wallet',
      icon: undefined,
      connect: async () => {
        const result = await martian.connect();
        return { accounts: [{ address: result.address }] };
      },
      disconnect: martian.disconnect?.bind(martian),
    };
  }

  return null;
}

export function useSuiWallet(): SuiWalletState {
  const [status, setStatus] = useState<SuiWalletStatus>('undetected');
  const [address, setAddress] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<SuiWalletAccount[]>([]);
  const [walletInfo, setWalletInfo] = useState<SuiWalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adapter, setAdapter] = useState<WalletAdapter | null>(null);

  // Detect wallet on mount (client-side only)
  useEffect(() => {
    // Give wallet extensions a moment to inject
    const timer = setTimeout(() => {
      const detected = detectWallet();
      if (detected) {
        setAdapter(detected);
        setWalletInfo({ name: detected.name, icon: detected.icon });
        setStatus('detected');
      } else {
        setStatus('undetected');
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const connect = useCallback(async () => {
    if (!adapter) {
      setError('No Sui wallet detected. Please install Sui Wallet or Martian.');
      setStatus('error');
      return;
    }
    setStatus('connecting');
    setError(null);
    try {
      const result = await adapter.connect();
      const connected = result.accounts ?? [];
      if (connected.length === 0) {
        throw new Error('Wallet returned no accounts');
      }
      setAccounts(connected);
      setAddress(connected[0].address);
      setStatus('connected');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wallet connection failed';
      setError(msg);
      setStatus('error');
    }
  }, [adapter]);

  const disconnect = useCallback(() => {
    adapter?.disconnect?.().catch(() => undefined);
    setAddress(null);
    setAccounts([]);
    setStatus(adapter ? 'detected' : 'undetected');
    setError(null);
  }, [adapter]);

  return {
    status,
    address,
    accounts,
    walletInfo,
    error,
    connect,
    disconnect,
    isConnected: status === 'connected',
    isDetected: status !== 'undetected',
  };
}
