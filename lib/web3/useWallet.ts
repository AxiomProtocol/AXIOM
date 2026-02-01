import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

const ARBITRUM_CHAIN_ID = 42161;
const ARBITRUM_CHAIN_ID_HEX = '0xa4b1';
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectChain: boolean;
  balance: string;
  isConnecting: boolean;
  error: string | null;
}

const initialState: WalletState = {
  isConnected: false,
  address: null,
  chainId: null,
  isCorrectChain: false,
  balance: '0',
  isConnecting: false,
  error: null
};

export function useWallet() {
  const [state, setState] = useState<WalletState>(initialState);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  const updateBalance = useCallback(async (address: string, prov: ethers.BrowserProvider) => {
    try {
      const balance = await prov.getBalance(address);
      setState(prev => ({ ...prev, balance: ethers.formatEther(balance) }));
    } catch (e) {
      console.error('Error fetching balance:', e);
    }
  }, []);

  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        const prov = new ethers.BrowserProvider(window.ethereum);
        const network = await prov.getNetwork();
        const chainId = Number(network.chainId);
        const sig = await prov.getSigner();
        
        setProvider(prov);
        setSigner(sig);
        
        setState({
          isConnected: true,
          address: accounts[0],
          chainId,
          isCorrectChain: chainId === ARBITRUM_CHAIN_ID,
          balance: '0',
          isConnecting: false,
          error: null
        });

        await updateBalance(accounts[0], prov);
      }
    } catch (e) {
      console.error('Error checking connection:', e);
    }
  }, [updateBalance]);

  useEffect(() => {
    checkConnection();

    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setState(initialState);
          setProvider(null);
          setSigner(null);
        } else {
          setState(prev => ({ ...prev, address: accounts[0] }));
          if (provider) {
            updateBalance(accounts[0], provider);
          }
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        const chainId = parseInt(chainIdHex, 16);
        setState(prev => ({
          ...prev,
          chainId,
          isCorrectChain: chainId === ARBITRUM_CHAIN_ID
        }));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [checkConnection, provider, updateBalance]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      setState(prev => ({ ...prev, error: 'Please install MetaMask to continue' }));
      return false;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const prov = new ethers.BrowserProvider(window.ethereum);
      const network = await prov.getNetwork();
      const chainId = Number(network.chainId);
      const sig = await prov.getSigner();

      setProvider(prov);
      setSigner(sig);

      setState({
        isConnected: true,
        address: accounts[0],
        chainId,
        isCorrectChain: chainId === ARBITRUM_CHAIN_ID,
        balance: '0',
        isConnecting: false,
        error: null
      });

      await updateBalance(accounts[0], prov);
      return true;
    } catch (e: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: e.message || 'Failed to connect wallet'
      }));
      return false;
    }
  }, [updateBalance]);

  const disconnect = useCallback(() => {
    setState(initialState);
    setProvider(null);
    setSigner(null);
  }, []);

  const switchToArbitrum = useCallback(async () => {
    if (!window.ethereum) return false;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_CHAIN_ID_HEX }]
      });
      return true;
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: ARBITRUM_CHAIN_ID_HEX,
              chainName: 'Arbitrum One',
              nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
              rpcUrls: [ARBITRUM_RPC],
              blockExplorerUrls: ['https://arbiscan.io']
            }]
          });
          return true;
        } catch (addError) {
          console.error('Error adding Arbitrum:', addError);
          return false;
        }
      }
      console.error('Error switching chain:', switchError);
      return false;
    }
  }, []);

  return {
    ...state,
    provider,
    signer,
    connect,
    disconnect,
    switchToArbitrum,
    refreshBalance: () => state.address && provider && updateBalance(state.address, provider)
  };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
