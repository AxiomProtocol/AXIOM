/**
 * ⚠️ DEPRECATED - LEGACY BSC/SWF WALLET HOOK ⚠️
 * 
 * This hook is for the OLD Binance Smart Chain (BSC) system.
 * The platform has migrated to Arbitrum One (Chain ID: 42161) with AXM token.
 * 
 * DO NOT USE THIS HOOK FOR NEW FEATURES.
 * 
 * Migration Status: NOT IN USE (verified grep search shows zero usages)
 * New Hook: Use WalletContext for Arbitrum One wallet management
 * 
 * This file is kept for historical reference only.
 * Deletion planned post-TGE deployment verification.
 */

import { useState, useEffect, useCallback } from 'react';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: string | null;
  isLoading: boolean;
  error: string | null;
}


export const useWallet = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    isLoading: false,
    error: null
  });

  // Connect to MetaMask
  const connectWallet = useCallback(async () => {
    if (!window.ethereum) {
      setWalletState(prev => ({
        ...prev,
        error: 'MetaMask not detected. Please install MetaMask browser extension.'
      }));
      return;
    }

    try {
      setWalletState(prev => ({ ...prev, isLoading: true, error: null }));

      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const address = accounts[0];
      
      // Get current chain ID
      const chainId = await window.ethereum.request({ 
        method: 'eth_chainId' 
      });

      // Switch to BSC Mainnet if not already
      const bscChainId = '0x38'; // BSC Mainnet
      if (chainId !== bscChainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: bscChainId }],
          });
        } catch (switchError: any) {
          // If the chain is not added, add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: bscChainId,
                chainName: 'BNB Smart Chain',
                nativeCurrency: {
                  name: 'BNB',
                  symbol: 'BNB',
                  decimals: 18,
                },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com/'],
              }],
            });
          }
        }
      }

      // Get SWF token balance
      const balance = await getSWFBalance(address);

      setWalletState({
        isConnected: true,
        address,
        balance,
        chainId: bscChainId,
        isLoading: false,
        error: null
      });

    } catch (error: any) {
      console.error('Wallet connection error:', error);
      setWalletState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect wallet'
      }));
    }
  }, []);

  // Get SWF token balance
  const getSWFBalance = async (address: string): Promise<string> => {
    try {
      const response = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address })
      });

      if (response.ok) {
        const data = await response.json();
        return data.balance || '0';
      }
      return '0';
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  };

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      balance: null,
      chainId: null,
      isLoading: false,
      error: null
    });
  }, []);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== walletState.address) {
          connectWallet();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [walletState.address, connectWallet, disconnectWallet]);

  return {
    ...walletState,
    connectWallet,
    disconnectWallet,
    getSWFBalance: (address: string) => getSWFBalance(address)
  };
};
