import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useAccount, useBalance, useChainId, useDisconnect, useSwitchChain } from 'wagmi';
import { arbitrum } from 'viem/chains';
import { formatUnits } from 'viem';

interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  ethBalance: string;
  axmBalance: string;
  axmUsdValue: string;
}

interface SIWEState {
  isAuthenticated: boolean;
  authenticatedAddress: string | null;
  isAuthenticating: boolean;
  authError: string | null;
}

interface WalletContextType {
  walletState: WalletState;
  siweState: SIWEState;
  isConnecting: boolean;
  error: string | null;
  connectMetaMask: () => Promise<void>;
  connectInjected: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchToArbitrum: () => Promise<void>;
  updateBalances: () => Promise<void>;
  signInWithEthereum: () => Promise<boolean>;
  signOutSIWE: () => Promise<void>;
  checkSIWESession: () => Promise<void>;
}

const defaultWalletState: WalletState = {
  isConnected: false,
  address: null,
  chainId: null,
  isCorrectNetwork: false,
  ethBalance: '0',
  axmBalance: '0',
  axmUsdValue: '0'
};

const defaultSIWEState: SIWEState = {
  isAuthenticated: false,
  authenticatedAddress: null,
  isAuthenticating: false,
  authError: null
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

interface WalletProviderProps {
  children: ReactNode;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({ children }) => {
  const { address, isConnected, isConnecting: wagmiConnecting } = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  const { data: ethBalanceData } = useBalance({
    address: address as `0x${string}` | undefined,
    query: { enabled: !!address },
  });

  const [siweState, setSIWEState] = useState<SIWEState>(defaultSIWEState);
  const [error, setError] = useState<string | null>(null);
  const autoSiweAttemptedForRef = useRef<string | null>(null);
  const siweInProgressRef = useRef(false);
  const [axmBalance, setAxmBalance] = useState('0');

  const walletState: WalletState = {
    isConnected: !!isConnected && !!address,
    address: address || null,
    chainId: chainId || null,
    isCorrectNetwork: chainId === arbitrum.id,
    ethBalance: ethBalanceData ? parseFloat(formatUnits(ethBalanceData.value, ethBalanceData.decimals)).toFixed(4) : '0',
    axmBalance,
    axmUsdValue: '0'
  };

  const fetchAxmBalance = useCallback(async (addr: string) => {
    if (typeof window === 'undefined') return;
    try {
      const { ethers } = await import('ethers');
      const provider = (window as any).ethereum;
      if (!provider) return;
      const ethProvider = new ethers.BrowserProvider(provider);
      const AXM_ADDRESS = '0xBa5C3b7b1C43A922d8c4e5C45aB0C0352C4FCA5a';
      const AXM_ABI = ['function balanceOf(address) view returns (uint256)'];
      const contract = new ethers.Contract(AXM_ADDRESS, AXM_ABI, ethProvider);
      const balance = await contract.balanceOf(addr);
      setAxmBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error('AXM balance fetch error:', err);
      setAxmBalance('0');
    }
  }, []);

  useEffect(() => {
    if (isConnected && address) {
      fetchAxmBalance(address);
    } else {
      setAxmBalance('0');
    }
  }, [isConnected, address, fetchAxmBalance]);

  const checkSIWESession = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const { siweService } = await import('../../lib/services/SIWEService');
      const session = await siweService.getSession(true);
      setSIWEState(prev => ({
        ...prev,
        isAuthenticated: session.authenticated,
        authenticatedAddress: session.address
      }));
    } catch (err) {
      console.error('SIWE session check failed:', err);
    }
  }, []);

  useEffect(() => {
    checkSIWESession();
  }, [checkSIWESession]);

  useEffect(() => {
    if (!isConnected || !address) {
      autoSiweAttemptedForRef.current = null;
      return;
    }

    if (autoSiweAttemptedForRef.current === address) return;
    if (siweInProgressRef.current) return;

    const performAutoSIWE = async () => {
      siweInProgressRef.current = true;
      autoSiweAttemptedForRef.current = address;

      setSIWEState(prev => ({
        ...prev,
        isAuthenticating: true,
        authError: null
      }));

      try {
        const { siweService } = await import('../../lib/services/SIWEService');
        siweService.resetSigningState();

        const { ethers } = await import('ethers');
        const provider = (window as any).ethereum;
        if (!provider) throw new Error('No provider available');
        const ethProvider = new ethers.BrowserProvider(provider);
        const signer = await ethProvider.getSigner();

        const result = await siweService.signIn(
          signer,
          address,
          chainId || arbitrum.id
        );

        if (result.success) {
          setSIWEState({
            isAuthenticated: true,
            authenticatedAddress: result.address || address,
            isAuthenticating: false,
            authError: null
          });
        } else {
          setSIWEState(prev => ({
            ...prev,
            isAuthenticating: false,
            authError: result.error || 'Authentication failed'
          }));
        }
      } catch (siweErr: any) {
        console.error('SIWE auto sign-in error:', siweErr);
        setSIWEState(prev => ({
          ...prev,
          isAuthenticating: false,
          authError: siweErr.message || 'Signature request failed'
        }));
      } finally {
        siweInProgressRef.current = false;
      }
    };

    performAutoSIWE();
  }, [isConnected, address, chainId]);

  const signInWithEthereum = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if (!isConnected || !address) {
      setSIWEState(prev => ({ ...prev, authError: 'Please connect your wallet first' }));
      return false;
    }

    setSIWEState(prev => ({ ...prev, isAuthenticating: true, authError: null }));

    try {
      const { ethers } = await import('ethers');
      const { siweService } = await import('../../lib/services/SIWEService');
      const provider = (window as any).ethereum;
      if (!provider) throw new Error('No provider');
      const ethProvider = new ethers.BrowserProvider(provider);
      const signer = await ethProvider.getSigner();

      siweService.resetSigningState();
      const result = await siweService.signIn(signer, address, chainId || arbitrum.id);

      if (result.success) {
        setSIWEState({
          isAuthenticated: true,
          authenticatedAddress: result.address || address,
          isAuthenticating: false,
          authError: null
        });
        return true;
      } else {
        setSIWEState(prev => ({ ...prev, isAuthenticating: false, authError: result.error || 'Authentication failed' }));
        return false;
      }
    } catch (err: any) {
      console.error('SIWE sign-in error:', err);
      setSIWEState(prev => ({ ...prev, isAuthenticating: false, authError: err.message || 'Sign-in failed' }));
      return false;
    }
  };

  const signOutSIWE = async () => {
    if (typeof window === 'undefined') return;
    try {
      const { siweService } = await import('../../lib/services/SIWEService');
      await siweService.logout();
      setSIWEState(defaultSIWEState);
    } catch (err) {
      console.error('SIWE sign-out error:', err);
    }
  };

  const connectMetaMask = async () => {
    console.warn('Use the Access Platform button to connect');
  };

  const connectInjected = async () => {
    console.warn('Use the Access Platform button to connect');
  };

  const disconnect = async () => {
    try {
      wagmiDisconnect();
      await signOutSIWE();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  const switchToArbitrum = async () => {
    try {
      switchChain({ chainId: arbitrum.id });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to switch network');
      throw err;
    }
  };

  const updateBalances = async () => {
    if (address) {
      await fetchAxmBalance(address);
    }
  };

  const value: WalletContextType = {
    walletState,
    siweState,
    isConnecting: wagmiConnecting,
    error,
    connectMetaMask,
    connectInjected,
    disconnect,
    switchToArbitrum,
    updateBalances,
    signInWithEthereum,
    signOutSIWE,
    checkSIWESession
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export default WalletContext;
