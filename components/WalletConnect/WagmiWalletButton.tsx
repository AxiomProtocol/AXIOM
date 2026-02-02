'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { arbitrum } from 'wagmi/chains';

interface WagmiWalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

export function WagmiWalletButton({ onConnect, onDisconnect, className = '' }: WagmiWalletButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [siweError, setSiweError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address });

  useEffect(() => {
    setMounted(true);
    checkSession();
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      onConnect?.(address);
      if (chainId !== arbitrum.id) {
        switchChain?.({ chainId: arbitrum.id });
      }
    }
  }, [isConnected, address, chainId]);

  const checkSession = async () => {
    try {
      const res = await fetch('/api/auth/siwe/session');
      const data = await res.json();
      setIsAuthenticated(data.authenticated);
    } catch (e) {
      console.error('Session check failed:', e);
    }
  };

  const handleSiweSignIn = async () => {
    if (!address || !window.ethereum) return;

    setIsSigningIn(true);
    setSiweError(null);

    try {
      const nonceRes = await fetch('/api/auth/siwe/nonce');
      const { nonce } = await nonceRes.json();

      const { SiweMessage } = await import('siwe');
      const message = new SiweMessage({
        domain: window.location.host,
        address: address,
        statement: 'Sign in to Axiom Protocol to verify your wallet ownership.',
        uri: window.location.origin,
        version: '1',
        chainId: chainId,
        nonce: nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 5 * 60 * 1000).toISOString()
      });

      const messageToSign = message.prepareMessage();
      
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [
          `0x${Buffer.from(messageToSign).toString('hex')}`,
          address
        ]
      });

      const verifyRes = await fetch('/api/auth/siwe/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageToSign, signature })
      });

      const result = await verifyRes.json();

      if (verifyRes.ok && result.success) {
        setIsAuthenticated(true);
        setShowModal(false);
      } else {
        setSiweError(result.error || 'Verification failed');
      }
    } catch (e: any) {
      console.error('SIWE error:', e);
      setSiweError(e.message || 'Sign-in failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setIsAuthenticated(false);
    onDisconnect?.();
    fetch('/api/auth/siwe/logout', { method: 'POST' }).catch(() => {});
  };

  if (!mounted) return null;

  if (isConnected && address) {
    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
    const isWrongChain = chainId !== arbitrum.id;

    return (
      <div className={`wallet-connected ${className}`}>
        <div className="wallet-info">
          {isWrongChain ? (
            <button 
              onClick={() => switchChain?.({ chainId: arbitrum.id })}
              className="switch-network-btn"
            >
              Switch to Arbitrum
            </button>
          ) : (
            <>
              <span className="network-badge">Arbitrum</span>
              <span className="address">{shortAddress}</span>
              {!isAuthenticated && (
                <button 
                  onClick={handleSiweSignIn} 
                  disabled={isSigningIn}
                  className="sign-in-btn"
                >
                  {isSigningIn ? 'Signing...' : 'Sign In'}
                </button>
              )}
              {isAuthenticated && <span className="verified">✓</span>}
            </>
          )}
          <button onClick={handleDisconnect} className="disconnect-btn">
            Disconnect
          </button>
        </div>
        {siweError && <div className="siwe-error">{siweError}</div>}
        <style jsx>{`
          .wallet-connected {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .wallet-info {
            display: flex;
            align-items: center;
            gap: 8px;
            background: #f8fafc;
            padding: 8px 12px;
            border-radius: 10px;
            border: 1px solid #e2e8f0;
          }
          .network-badge {
            background: #dbeafe;
            color: #1d4ed8;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
          }
          .address {
            font-family: monospace;
            font-size: 12px;
            color: #475569;
          }
          .sign-in-btn {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            border: none;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
          }
          .sign-in-btn:disabled {
            opacity: 0.6;
            cursor: wait;
          }
          .verified {
            color: #10b981;
            font-size: 16px;
          }
          .disconnect-btn {
            background: white;
            color: #dc2626;
            border: 1px solid #fecaca;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
          }
          .disconnect-btn:hover {
            background: #fee2e2;
          }
          .switch-network-btn {
            background: #dc2626;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
          }
          .siwe-error {
            background: #fef2f2;
            color: #dc2626;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 11px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`connect-btn ${className}`}
        disabled={isPending}
      >
        {isPending ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Connect Wallet</h3>
              <button onClick={() => setShowModal(false)} className="close-btn">✕</button>
            </div>
            <div className="modal-body">
              {connectError && <div className="error">{connectError}</div>}
              <div className="connectors">
                <button
                  onClick={async () => {
                    try {
                      setConnectError(null);
                      await connect({ connector: injected() });
                      setShowModal(false);
                    } catch (e: any) {
                      setConnectError(e.message || 'Failed to connect');
                    }
                  }}
                  disabled={isPending}
                  className="connector-btn"
                >
                  🦊 MetaMask / Browser Wallet
                </button>
              </div>
              <p className="network-note">Network: Arbitrum One</p>
              <p className="help-note">Make sure MetaMask is installed and unlocked</p>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .connect-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .connect-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }
        .connect-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
        }
        .modal {
          background: white;
          border-radius: 16px;
          max-width: 400px;
          width: 90%;
          overflow: hidden;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #9ca3af;
        }
        .modal-body {
          padding: 20px;
        }
        .error {
          background: #fef2f2;
          color: #dc2626;
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-size: 13px;
        }
        .connectors {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .connector-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 14px 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .connector-btn:hover:not(:disabled) {
          background: #f1f5f9;
          border-color: #cbd5e1;
        }
        .connector-btn:disabled {
          opacity: 0.5;
          cursor: wait;
        }
        .network-note {
          text-align: center;
          color: #6b7280;
          font-size: 12px;
          margin-top: 16px;
          margin-bottom: 0;
        }
        .help-note {
          text-align: center;
          color: #9ca3af;
          font-size: 11px;
          margin-top: 8px;
          margin-bottom: 0;
        }
      `}</style>
    </>
  );
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
