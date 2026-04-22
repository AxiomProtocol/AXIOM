'use client';
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface CircleWalletContextValue {
  isAvailable: boolean;
  isAuthenticated: boolean;
  walletAddress: string | null;
  walletId: string | null;
  loading: boolean;
  error: string | null;
  authenticate: () => Promise<string | null>;
  logout: () => void;
}

const CircleWalletContext = createContext<CircleWalletContextValue>({
  isAvailable: false,
  isAuthenticated: false,
  walletAddress: null,
  walletId: null,
  loading: false,
  error: null,
  authenticate: async () => null,
  logout: () => {},
});

export function useCircleWalletContext(): CircleWalletContextValue {
  return useContext(CircleWalletContext);
}

async function callWalletApi(action: string, params: Record<string, unknown> = {}): Promise<any> {
  const res = await fetch('/api/circle/wallets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error ?? 'Wallet API error');
  }
  const json = await res.json();
  return json?.data;
}

export function CircleWalletProvider({ children }: { children: ReactNode }) {
  const isAvailable = Boolean(process.env.NEXT_PUBLIC_CIRCLE_APP_CONFIGURED === 'true');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async (): Promise<string | null> => {
    setLoading(true);
    setError(null);
    try {
      await callWalletApi('createUser');
      const wallet = await callWalletApi('createWallet', { blockchains: ['ARB'] });
      const address: string = wallet?.address ?? null;
      setIsAuthenticated(true);
      setWalletAddress(address);
      setWalletId(wallet?.id ?? null);
      return address;
    } catch (err: any) {
      setError(err.message ?? 'Authentication failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setWalletAddress(null);
    setWalletId(null);
    setError(null);
  }, []);

  return (
    <CircleWalletContext.Provider
      value={{ isAvailable, isAuthenticated, walletAddress, walletId, loading, error, authenticate, logout }}
    >
      {children}
    </CircleWalletContext.Provider>
  );
}
