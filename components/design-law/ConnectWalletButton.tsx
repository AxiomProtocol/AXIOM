import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface WalletState {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  balance: string;
  axmBalance: string;
}

const defaultWalletState: WalletState = {
  address: null,
  chainId: null,
  isConnected: false,
  balance: '0',
  axmBalance: '0',
};

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById('dl-wallet-modal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dl-wallet-modal-root';
      document.body.appendChild(el);
    }
    setPortalRoot(el);
    return () => {
      if (el && el.parentNode && !el.hasChildNodes()) {
        el.parentNode.removeChild(el);
      }
    };
  }, []);

  if (!portalRoot) return null;
  return createPortal(children, portalRoot);
}

interface ConnectWalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export function ConnectWalletButton({ onConnect, onDisconnect }: ConnectWalletButtonProps) {
  const [walletState, setWalletState] = useState<WalletState>(defaultWalletState);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (typeof window === 'undefined') return;

    let unsubscribe: (() => void) | undefined;

    const initWallet = async () => {
      try {
        const { walletService } = await import('../../lib/services/WalletService');
        setWalletState(walletService.getState() as WalletState);
        unsubscribe = walletService.subscribe((state: any) => {
          setWalletState(state as WalletState);
        });

        const { siweService } = await import('../../lib/services/SIWEService');
        const session = await siweService.getSession(true);
        setIsAuthenticated(session.authenticated);
      } catch (err) {
        console.error('Failed to initialize custody account service:', err);
      }
    };

    initWallet();
    return () => { if (unsubscribe) unsubscribe(); };
  }, []);

  const handleConnect = async (type: 'metamask' | 'injected') => {
    if (typeof window === 'undefined') return;
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('No compatible custody provider detected. Please install MetaMask.');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }

      const address = accounts[0];
      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      try {
        setIsAuthenticating(true);
        const { siweService } = await import('../../lib/services/SIWEService');
        siweService.resetSigningState();
        const result = await siweService.signIn(signer, address, chainId || 42161);
        if (result.success) {
          setIsAuthenticated(true);
        }
      } catch (siweErr: any) {
        console.error('Authentication error:', siweErr);
      } finally {
        setIsAuthenticating(false);
      }

      setShowModal(false);
      if (onConnect) onConnect(address);
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection declined. Please try again.');
      } else if (err.code === -32002) {
        setError('Connection pending. Please check your custody provider.');
      } else {
        setError(err.message || 'Failed to connect');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (typeof window === 'undefined') return;
    const { walletService } = await import('../../lib/services/WalletService');
    await walletService.disconnect();
    setIsAuthenticated(false);
    if (onDisconnect) onDisconnect();
  };

  const formatAddress = (address: string) =>
    `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.01) return '<0.01';
    return num.toFixed(2);
  };

  if (!mounted) {
    return (
      <button className="bg-dl-navy text-white px-5 py-2 text-sm font-medium">
        Access Platform
      </button>
    );
  }

  if (walletState.isConnected && walletState.address) {
    return (
      <div className="flex items-center gap-2">
        <div className="border border-dl-border px-3 py-1.5 flex items-center gap-3 bg-dl-bg">
          <span className={`text-xs font-medium px-2 py-0.5 ${walletState.chainId === 42161 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
            {walletState.chainId === 42161 ? 'Arb' : 'Wrong'}
          </span>
          <span className="border-l border-dl-border pl-3 flex gap-3">
            <span className="text-xs">
              <span className="text-dl-gray block text-[9px] uppercase">ETH</span>
              <span className="font-dl-mono text-xs font-semibold text-dl-gold">{formatBalance(walletState.balance)}</span>
            </span>
            <span className="text-xs">
              <span className="text-dl-gray block text-[9px] uppercase">AXM</span>
              <span className="font-dl-mono text-xs font-semibold text-dl-gold">{formatBalance(walletState.axmBalance)}</span>
            </span>
          </span>
          <span className="font-dl-mono text-xs text-dl-navy bg-dl-bg-alt border border-dl-border px-2 py-0.5">
            {formatAddress(walletState.address)}
          </span>
          {isAuthenticated && (
            <span className="text-dl-forest text-xs font-bold" title="Verified">V</span>
          )}
          <button
            onClick={handleDisconnect}
            className="text-xs text-dl-error border border-dl-error px-2 py-0.5 bg-dl-bg"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={isConnecting}
        className="bg-dl-navy text-white px-5 py-2 text-sm font-medium disabled:opacity-50"
      >
        {isConnecting ? 'Connecting...' : 'Access Platform'}
      </button>

      {showModal && mounted && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 px-4 z-[99999]"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-dl-bg border border-dl-border max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-dl-border pb-4 mb-4">
                <h2 className="font-dl-serif text-lg text-dl-navy">Access Axiom Platform</h2>
                <button onClick={() => setShowModal(false)} className="text-dl-gray text-lg">X</button>
              </div>

              <p className="text-sm text-dl-gray mb-4">
                Connect your custody account to access the Axiom Protocol on Arbitrum One.
              </p>

              {error && (
                <div className="border border-dl-error bg-red-50 text-dl-error text-xs p-3 mb-4">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 mb-4">
                <button
                  onClick={() => handleConnect('metamask')}
                  disabled={isConnecting}
                  className="border border-dl-border bg-dl-bg-alt px-4 py-3 text-left flex items-center gap-3 text-sm disabled:opacity-50"
                >
                  <span className="text-xl">M</span>
                  <div>
                    <div className="font-medium text-dl-navy">MetaMask</div>
                    <div className="text-xs text-dl-gray">Connect with MetaMask</div>
                  </div>
                </button>

                <button
                  onClick={() => handleConnect('injected')}
                  disabled={isConnecting}
                  className="border border-dl-border bg-dl-bg-alt px-4 py-3 text-left flex items-center gap-3 text-sm disabled:opacity-50"
                >
                  <span className="text-xl">B</span>
                  <div>
                    <div className="font-medium text-dl-navy">Browser Provider</div>
                    <div className="text-xs text-dl-gray">Connect with injected provider</div>
                  </div>
                </button>
              </div>

              <div className="border-t border-dl-border pt-3 flex gap-4 text-xs text-dl-gray">
                <span><strong>Network:</strong> Arbitrum One (42161)</span>
                <span><strong>Asset:</strong> AXM</span>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
