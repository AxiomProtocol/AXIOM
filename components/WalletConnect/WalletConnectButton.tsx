/**
 * Axiom Smart City - Wallet Connect Button Component
 * Dual-wallet support: MetaMask + WalletConnect 2.0
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { WalletState } from '../../lib/services/WalletService';

const defaultWalletState: WalletState = {
  address: null,
  chainId: null,
  provider: null,
  isConnected: false,
  balance: '0',
  axmBalance: '0'
};

function ModalPortal({ children }: { children: React.ReactNode }) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  
  useEffect(() => {
    let el = document.getElementById('wallet-modal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'wallet-modal-root';
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

interface WalletConnectButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

export const WalletConnectButton: React.FC<WalletConnectButtonProps> = ({
  onConnect,
  onDisconnect,
  className = ''
}) => {
  const [walletState, setWalletState] = useState<WalletState>(defaultWalletState);
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
        setWalletState(walletService.getState());
        unsubscribe = walletService.subscribe((state: WalletState) => {
          setWalletState(state);
        });
      } catch (err) {
        console.error('Failed to initialize wallet service:', err);
      }
    };
    
    initWallet();
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleConnectMetaMask = async () => {
    if (typeof window === 'undefined') return;
    setIsConnecting(true);
    setError(null);
    
    try {
      const { WalletService } = await import('../../lib/services/WalletService');
      const walletInstance = WalletService.getInstance();
      const address = await walletInstance.connectMetaMask();
      
      if (address) {
        console.log('✅ MetaMask wallet connected:', address);
        
        // Trigger SIWE signature request
        try {
          console.log('🔑 [MetaMask] Getting signer and state...');
          const { siweService } = await import('../../lib/services/SIWEService');
          const signer = walletInstance.getSigner();
          const state = walletInstance.getState();
          
          console.log('🔑 [MetaMask] Signer:', !!signer, 'signMessage:', typeof signer?.signMessage, 'State:', JSON.stringify(state));
          
          if (signer && typeof signer.signMessage === 'function') {
            console.log('📝 [MetaMask] Calling siweService.signIn...');
            const result = await siweService.signIn(
              signer,
              address,
              state.chainId || 42161
            );
            
            if (result.success) {
              console.log('✅ [MetaMask] SIWE authentication successful');
            } else {
              console.warn('⚠️ [MetaMask] SIWE authentication failed:', result.error);
            }
          } else {
            console.error('❌ [MetaMask] Signer not valid or signMessage not a function');
          }
        } catch (siweErr) {
          console.error('SIWE error:', siweErr);
          // Don't block wallet connection if SIWE fails
        }
        
        setShowModal(false);
        if (onConnect) {
          onConnect(address);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect MetaMask');
      console.error('MetaMask connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectInjected = async () => {
    if (typeof window === 'undefined') return;
    setIsConnecting(true);
    setError(null);
    
    try {
      const { WalletService } = await import('../../lib/services/WalletService');
      const walletInstance = WalletService.getInstance();
      const address = await walletInstance.connectInjected();
      
      if (address) {
        console.log('✅ Wallet connected (injected):', address);
        
        // Trigger SIWE signature request
        try {
          const { siweService } = await import('../../lib/services/SIWEService');
          const signer = walletInstance.getSigner();
          const state = walletInstance.getState();
          
          if (signer) {
            console.log('📝 Requesting SIWE signature...');
            const result = await siweService.signIn(
              signer,
              address,
              state.chainId || 42161
            );
            
            if (result.success) {
              console.log('✅ SIWE authentication successful');
            } else {
              console.warn('⚠️ SIWE authentication failed:', result.error);
            }
          }
        } catch (siweErr) {
          console.error('SIWE error:', siweErr);
          // Don't block wallet connection if SIWE fails
        }
        
        setShowModal(false);
        if (onConnect) {
          onConnect(address);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (typeof window === 'undefined') return;
    const { walletService } = await import('../../lib/services/WalletService');
    await walletService.disconnect();
    
    if (onDisconnect) {
      onDisconnect();
    }
  };
  
  if (!mounted) {
    return (
      <button className={`px-4 py-2 bg-amber-500 text-white rounded-lg font-medium ${className}`}>
        Connect Wallet
      </button>
    );
  }

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0';
    if (num < 0.01) return '<0.01';
    return num.toFixed(2);
  };

  if (walletState.isConnected && walletState.address) {
    return (
      <div className={`wallet-connected ${className}`}>
        <div className="wallet-info">
          <div className="network-indicator">
            {walletState.chainId === 42161 ? (
              <span className="network-badge arbitrum">Arb</span>
            ) : (
              <span className="network-badge wrong">Wrong</span>
            )}
          </div>
          
          <div className="balance-display">
            <div className="balance-item">
              <span className="balance-label">ETH</span>
              <span className="balance-value">{formatBalance(walletState.balance)}</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">AXM</span>
              <span className="balance-value">{formatBalance(walletState.axmBalance)}</span>
            </div>
          </div>
          
          <div className="address-display">
            <span className="wallet-icon">
              {walletState.provider === 'metamask' ? '🦊' : '🔗'}
            </span>
            <span className="address">{formatAddress(walletState.address)}</span>
          </div>
          
          <button 
            onClick={handleDisconnect}
            className="disconnect-btn"
          >
            <span className="disconnect-text-full">Disconnect</span>
            <span className="disconnect-text-short">✕</span>
          </button>
        </div>

        <style jsx>{`
          .wallet-connected {
            display: flex;
            align-items: center;
            flex-shrink: 0;
          }

          .wallet-info {
            display: flex;
            align-items: center;
            gap: 8px;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 10px;
            padding: 6px 10px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }

          @media (max-width: 767px) {
            .wallet-info {
              gap: 4px;
              padding: 4px 6px;
              border-radius: 8px;
            }
            
            .balance-display {
              display: none !important;
            }

            .network-badge {
              padding: 2px 5px !important;
              font-size: 9px !important;
            }

            .address-display {
              padding: 2px 6px !important;
            }

            .address {
              font-size: 10px !important;
            }

            .wallet-icon {
              font-size: 10px !important;
            }

            .disconnect-text-full {
              display: none;
            }

            .disconnect-text-short {
              display: inline;
            }

            .disconnect-btn {
              padding: 4px 8px !important;
              min-width: 24px;
            }
          }

          @media (min-width: 768px) {
            .disconnect-text-short {
              display: none;
            }

            .disconnect-text-full {
              display: inline;
            }
          }

          .network-indicator {
            display: flex;
            align-items: center;
          }

          .network-badge {
            padding: 3px 8px;
            border-radius: 5px;
            font-size: 10px;
            font-weight: 600;
          }

          .network-badge.arbitrum {
            background: #dbeafe;
            color: #1d4ed8;
          }

          .network-badge.wrong {
            background: #fee2e2;
            color: #dc2626;
          }

          .balance-display {
            display: flex;
            gap: 10px;
            border-left: 1px solid #e5e7eb;
            padding-left: 10px;
          }

          .balance-item {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }

          .balance-label {
            font-size: 9px;
            color: #6b7280;
            text-transform: uppercase;
          }

          .balance-value {
            font-size: 12px;
            font-weight: 600;
            color: #d97706;
          }

          .address-display {
            display: flex;
            align-items: center;
            gap: 4px;
            background: #fef3c7;
            padding: 3px 8px;
            border-radius: 5px;
          }

          .wallet-icon {
            font-size: 12px;
          }

          .address {
            font-family: monospace;
            font-size: 11px;
            color: #92400e;
            font-weight: 600;
          }

          .disconnect-btn {
            background: white;
            color: #dc2626;
            border: 1px solid #fecaca;
            padding: 3px 8px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 500;
            font-size: 11px;
            transition: all 0.2s ease;
          }

          .disconnect-btn:hover {
            background: #fee2e2;
            border-color: #dc2626;
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`connect-wallet-btn ${className}`}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>

      {showModal && mounted && (
        <ModalPortal>
          <div className="wallet-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="wallet-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Connect to Axiom</h2>
                <button 
                  className="close-btn"
                  onClick={() => setShowModal(false)}
                >
                  ✕
                </button>
              </div>

              <div className="modal-body">
                <p className="modal-description">
                  Connect your wallet to Axiom Smart City on Arbitrum One
                </p>

                {error && (
                  <div className="error-message">
                    {error}
                  </div>
                )}

                <div className="wallet-options">
                  <button
                    onClick={handleConnectMetaMask}
                    className="wallet-option metamask"
                    disabled={isConnecting}
                  >
                    <span className="wallet-icon">🦊</span>
                    <div className="wallet-details">
                      <div className="wallet-name">MetaMask</div>
                      <div className="wallet-desc">Connect with MetaMask</div>
                    </div>
                  </button>

                  <button
                    onClick={handleConnectInjected}
                    className="wallet-option injected"
                    disabled={isConnecting}
                  >
                    <span className="wallet-icon">🔗</span>
                    <div className="wallet-details">
                      <div className="wallet-name">Browser Wallet</div>
                      <div className="wallet-desc">Connect with injected wallet</div>
                    </div>
                  </button>
                </div>

                <div className="network-info">
                  <div className="info-badge">
                    <strong>Network:</strong> Arbitrum One (Chain ID: 42161)
                  </div>
                  <div className="info-badge">
                    <strong>Token:</strong> AXM
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}

      <style jsx>{`
        .connect-wallet-btn {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .connect-wallet-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
        }

        .connect-wallet-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
      
      <style jsx global>{`
        .wallet-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          z-index: 99999;
          animation: walletFadeIn 0.2s ease;
          padding: 80px 16px 20px 16px;
          overflow-y: auto;
        }

        @keyframes walletFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .wallet-modal {
          background: white;
          border-radius: 20px;
          max-width: 440px;
          width: 100%;
          padding: 0;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          animation: walletSlideUp 0.2s ease;
          margin-bottom: 20px;
        }

        @keyframes walletSlideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .wallet-modal .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
        }

        .wallet-modal .modal-header h2 {
          margin: 0;
          color: #111827;
          font-size: 20px;
          font-weight: 700;
        }

        .wallet-modal .close-btn {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .wallet-modal .close-btn:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .wallet-modal .modal-body {
          padding: 24px;
        }

        .wallet-modal .modal-description {
          color: #6b7280;
          text-align: center;
          margin: 0 0 20px 0;
          font-size: 14px;
        }

        .wallet-modal .error-message {
          background: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #fecaca;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .wallet-modal .wallet-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .wallet-modal .wallet-option {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .wallet-modal .wallet-option:hover:not(:disabled) {
          background: #fef3c7;
          border-color: #f59e0b;
        }

        .wallet-modal .wallet-option:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .wallet-modal .wallet-option .wallet-icon {
          font-size: 32px;
        }

        .wallet-modal .wallet-details {
          flex: 1;
          text-align: left;
        }

        .wallet-modal .wallet-name {
          font-size: 16px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 2px;
        }

        .wallet-modal .wallet-desc {
          font-size: 13px;
          color: #6b7280;
        }

        .wallet-modal .network-info {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .wallet-modal .info-badge {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          padding: 10px 14px;
          border-radius: 8px;
          color: #92400e;
          font-size: 13px;
        }

        .wallet-modal .info-badge strong {
          color: #78350f;
        }
      `}</style>
    </>
  );
};

export default WalletConnectButton;
