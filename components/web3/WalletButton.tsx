import React, { useState } from 'react';
import { useWallet } from '../../lib/web3/useWallet';

export default function WalletButton() {
  const { 
    isConnected, 
    address, 
    isCorrectChain, 
    isConnecting, 
    connect, 
    disconnect, 
    switchToArbitrum,
    error 
  } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        disabled={isConnecting}
        style={{
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
          color: '#111827',
          borderRadius: 8,
          fontWeight: 600,
          border: 'none',
          cursor: isConnecting ? 'wait' : 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        {isConnecting ? (
          <>
            <span style={{ width: 16, height: 16, border: '2px solid #111827', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            Connecting...
          </>
        ) : (
          <>
            <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Connect Wallet
          </>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
    );
  }

  if (!isCorrectChain) {
    return (
      <button
        onClick={switchToArbitrum}
        style={{
          padding: '10px 20px',
          background: '#ef4444',
          color: '#ffffff',
          borderRadius: 8,
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        Switch to Arbitrum
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          padding: '10px 16px',
          background: '#1f2937',
          color: '#ffffff',
          borderRadius: 8,
          fontWeight: 500,
          border: '1px solid #374151',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
        {formatAddress(address!)}
        <svg style={{ width: 14, height: 14, transform: showDropdown ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 8,
          background: '#1f2937',
          borderRadius: 8,
          border: '1px solid #374151',
          minWidth: 200,
          zIndex: 50,
          overflow: 'hidden'
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid #374151' }}>
            <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Connected to Arbitrum One</p>
            <p style={{ fontSize: 13, color: '#ffffff', fontFamily: 'monospace' }}>{address}</p>
          </div>
          <a
            href={`https://arbiscan.io/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              color: '#9ca3af',
              textDecoration: 'none',
              fontSize: 13
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#374151'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Arbiscan
          </a>
          <button
            onClick={() => { disconnect(); setShowDropdown(false); }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              color: '#ef4444',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'left'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#374151'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
