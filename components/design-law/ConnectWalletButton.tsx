import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '../WalletConnect/WalletContext';

interface ConnectWalletButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export function ConnectWalletButton({ onConnect, onDisconnect }: ConnectWalletButtonProps) {
  const { walletState, siweState } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (walletState.isConnected && walletState.address && onConnect) {
      onConnect(walletState.address);
    }
    if (!walletState.isConnected && onDisconnect) {
      onDisconnect();
    }
  }, [walletState.isConnected, walletState.address]);

  if (!mounted) {
    return (
      <button className="bg-dl-navy text-white px-5 py-2 text-sm font-medium">
        Access Platform
      </button>
    );
  }

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted: rkMounted,
      }) => {
        const ready = rkMounted;
        const connected = ready && account && chain;

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              className="bg-dl-navy text-white px-5 py-2 text-sm font-medium"
            >
              {siweState.isAuthenticating ? 'Signing...' : 'Access Platform'}
            </button>
          );
        }

        const formatBalance = (bal: string | undefined) => {
          if (!bal) return '0';
          const num = parseFloat(bal);
          if (num === 0) return '0';
          if (num < 0.01) return '<0.01';
          return num.toFixed(2);
        };

        return (
          <div className="flex items-center gap-2">
            <div className="border border-dl-border px-3 py-1.5 flex items-center gap-3 bg-dl-bg">
              <button
                onClick={openChainModal}
                className={`text-xs font-medium px-2 py-0.5 ${
                  chain.id === 42161
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {chain.id === 42161 ? 'Arb' : chain.name || 'Wrong'}
              </button>
              <span className="border-l border-dl-border pl-3 flex gap-3">
                <span className="text-xs">
                  <span className="text-dl-gray block text-[9px] uppercase">ETH</span>
                  <span className="font-dl-mono text-xs font-semibold text-dl-gold">
                    {formatBalance(walletState.ethBalance)}
                  </span>
                </span>
                <span className="text-xs">
                  <span className="text-dl-gray block text-[9px] uppercase">AXM</span>
                  <span className="font-dl-mono text-xs font-semibold text-dl-gold">
                    {formatBalance(walletState.axmBalance)}
                  </span>
                </span>
              </span>
              <button
                onClick={openAccountModal}
                className="font-dl-mono text-xs text-dl-navy bg-dl-bg-alt border border-dl-border px-2 py-0.5"
              >
                {account.displayName}
              </button>
              {siweState.isAuthenticated && (
                <span className="text-dl-forest text-xs font-bold" title="Verified">V</span>
              )}
            </div>
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
