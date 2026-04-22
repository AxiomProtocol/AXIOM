import { useState, useCallback } from 'react';

export interface CircleWalletState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  walletId: string | null;
  loading: boolean;
  error: string | null;
}

export interface UseCircleWalletReturn extends CircleWalletState {
  authenticate: () => Promise<string | null>;
  logout: () => void;
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

export function useCircleWallet(): UseCircleWalletReturn {
  const [state, setState] = useState<CircleWalletState>({
    isAuthenticated: false,
    walletAddress: null,
    walletId: null,
    loading: false,
    error: null,
  });

  const authenticate = useCallback(async (): Promise<string | null> => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      await callWalletApi('createUser');
      const wallet = await callWalletApi('createWallet', { blockchains: ['ARB'] });

      const address: string = wallet?.address ?? null;
      setState({
        isAuthenticated: true,
        walletAddress: address,
        walletId: wallet?.id ?? null,
        loading: false,
        error: null,
      });
      return address;
    } catch (err: any) {
      setState(s => ({ ...s, loading: false, error: err.message ?? 'Authentication failed' }));
      return null;
    }
  }, []);

  const logout = useCallback(() => {
    setState({
      isAuthenticated: false,
      walletAddress: null,
      walletId: null,
      loading: false,
      error: null,
    });
  }, []);

  return { ...state, authenticate, logout };
}
