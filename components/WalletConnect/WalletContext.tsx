/**
 * Axiom Smart City - Wallet Context Provider
 * Global wallet state management for React components with SIWE authentication
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

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
  const [walletState, setWalletState] = useState<WalletState>(defaultWalletState);
  const [siweState, setSIWEState] = useState<SIWEState>(defaultSIWEState);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

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
    setMounted(true);
    
    const initWallet = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const { walletService } = await import('../../lib/services/WalletService');
        const { delegationService } = await import('../../lib/services/DelegationService');
        
        const mapServiceState = (serviceState: any): WalletState => ({
          isConnected: serviceState.isConnected || false,
          address: serviceState.address || null,
          chainId: serviceState.chainId || null,
          isCorrectNetwork: serviceState.chainId === 42161,
          ethBalance: serviceState.balance || '0',
          axmBalance: serviceState.axmBalance || '0',
          axmUsdValue: '0'
        });
        
        setWalletState(mapServiceState(walletService.getState()));
        
        const unsubscribe = walletService.subscribe((state: any) => {
          setWalletState(mapServiceState(state));
          
          if (state.isConnected && state.address) {
            const provider = walletService.getProvider();
            const signer = walletService.getSigner();
            
            if (provider && signer) {
              delegationService.initialize(provider, signer);
            }
          }
        });

        await checkSIWESession();

        return unsubscribe;
      } catch (err) {
        console.error('Failed to initialize wallet service:', err);
      }
    };

    initWallet();
  }, [checkSIWESession]);

  // Auto-trigger SIWE when wallet is connected but not authenticated
  useEffect(() => {
    console.log('🔍 Auto-SIWE check:', {
      mounted,
      isConnected: walletState.isConnected,
      address: walletState.address,
      isAuthenticated: siweState.isAuthenticated,
      isAuthenticating: siweState.isAuthenticating,
      authError: siweState.authError
    });
    
    const triggerSIWE = async () => {
      if (
        mounted &&
        walletState.isConnected && 
        walletState.address && 
        !siweState.isAuthenticated && 
        !siweState.isAuthenticating &&
        !siweState.authError
      ) {
        console.log('🔐 Auto-triggering SIWE for connected wallet:', walletState.address);
        
        setSIWEState(prev => ({
          ...prev,
          isAuthenticating: true,
          authError: null
        }));
        
        try {
          const { siweService } = await import('../../lib/services/SIWEService');
          
          const result = await siweService.signIn(
            null, // Will use window.ethereum directly
            walletState.address,
            walletState.chainId || 42161
          );
          
          console.log('🔐 Auto-SIWE result:', result.success ? 'Success' : result.error);
          
          if (result.success) {
            setSIWEState({
              isAuthenticated: true,
              authenticatedAddress: result.address || walletState.address,
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
        } catch (err: any) {
          console.error('Auto-SIWE error:', err);
          setSIWEState(prev => ({
            ...prev,
            isAuthenticating: false,
            authError: err.message || 'Signature request failed'
          }));
        }
      }
    };

    triggerSIWE();
  }, [mounted, walletState.isConnected, walletState.address, siweState.isAuthenticated, siweState.isAuthenticating, siweState.authError, walletState.chainId]);

  const signInWithEthereum = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    
    if (!walletState.isConnected || !walletState.address) {
      setSIWEState(prev => ({
        ...prev,
        authError: 'Please connect your wallet first'
      }));
      return false;
    }
    
    setSIWEState(prev => ({
      ...prev,
      isAuthenticating: true,
      authError: null
    }));
    
    try {
      const { walletService } = await import('../../lib/services/WalletService');
      const { siweService } = await import('../../lib/services/SIWEService');
      
      const signer = walletService.getSigner();
      if (!signer) {
        throw new Error('No signer available');
      }
      
      const result = await siweService.signIn(
        signer,
        walletState.address,
        walletState.chainId || 42161
      );
      
      if (result.success) {
        setSIWEState({
          isAuthenticated: true,
          authenticatedAddress: result.address || walletState.address,
          isAuthenticating: false,
          authError: null
        });
        return true;
      } else {
        setSIWEState(prev => ({
          ...prev,
          isAuthenticating: false,
          authError: result.error || 'Authentication failed'
        }));
        return false;
      }
    } catch (err: any) {
      console.error('SIWE sign-in error:', err);
      setSIWEState(prev => ({
        ...prev,
        isAuthenticating: false,
        authError: err.message || 'Sign-in failed'
      }));
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
    if (typeof window === 'undefined') return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const { WalletService } = await import('../../lib/services/WalletService');
      const walletInstance = WalletService.getInstance();
      
      const connectedAddress = await walletInstance.connectMetaMask();
      console.log('✅ Wallet connected, address:', connectedAddress);
      
      if (connectedAddress) {
        const { siweService } = await import('../../lib/services/SIWEService');
        const signer = walletInstance.getSigner();
        const state = walletInstance.getState();
        
        console.log('🔐 Starting SIWE sign-in, signer available:', !!signer);
        
        if (signer) {
          setSIWEState(prev => ({
            ...prev,
            isAuthenticating: true,
            authError: null
          }));
          
          try {
            console.log('📝 Requesting signature...');
            const result = await siweService.signIn(
              signer,
              connectedAddress,
              state.chainId || 42161
            );
            
            console.log('📝 Signature result:', result.success ? 'Success' : result.error);
            
            if (result.success) {
              setSIWEState({
                isAuthenticated: true,
                authenticatedAddress: result.address || connectedAddress,
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
            console.error('SIWE auto-sign error:', siweErr);
            setSIWEState(prev => ({
              ...prev,
              isAuthenticating: false,
              authError: siweErr.message || 'Signature request failed'
            }));
          }
        } else {
          console.error('❌ Signer not available after wallet connection');
        }
      }
    } catch (err: any) {
      console.error('❌ MetaMask connection error:', err);
      setError(err.message || 'Failed to connect MetaMask');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const connectInjected = async () => {
    if (typeof window === 'undefined') return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      const { WalletService } = await import('../../lib/services/WalletService');
      const walletInstance = WalletService.getInstance();
      
      const connectedAddress = await walletInstance.connectInjected();
      console.log('✅ Wallet connected (injected), address:', connectedAddress);
      
      if (connectedAddress) {
        const { siweService } = await import('../../lib/services/SIWEService');
        const signer = walletInstance.getSigner();
        const state = walletInstance.getState();
        
        console.log('🔐 Starting SIWE sign-in, signer available:', !!signer);
        
        if (signer) {
          setSIWEState(prev => ({
            ...prev,
            isAuthenticating: true,
            authError: null
          }));
          
          try {
            console.log('📝 Requesting signature...');
            const result = await siweService.signIn(
              signer,
              connectedAddress,
              state.chainId || 42161
            );
            
            console.log('📝 Signature result:', result.success ? 'Success' : result.error);
            
            if (result.success) {
              setSIWEState({
                isAuthenticated: true,
                authenticatedAddress: result.address || connectedAddress,
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
            console.error('SIWE auto-sign error:', siweErr);
            setSIWEState(prev => ({
              ...prev,
              isAuthenticating: false,
              authError: siweErr.message || 'Signature request failed'
            }));
          }
        } else {
          console.error('❌ Signer not available after wallet connection');
        }
      }
    } catch (err: any) {
      console.error('❌ Injected wallet connection error:', err);
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const { walletService } = await import('../../lib/services/WalletService');
      await walletService.disconnect();
      
      await signOutSIWE();
      
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    }
  };

  const switchToArbitrum = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const { walletService } = await import('../../lib/services/WalletService');
      await walletService.switchToArbitrum();
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to switch network');
      throw err;
    }
  };

  const updateBalances = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      const { walletService } = await import('../../lib/services/WalletService');
      await walletService.updateBalances();
    } catch (err: any) {
      console.error('Failed to update balances:', err);
    }
  };

  const value: WalletContextType = {
    walletState,
    siweState,
    isConnecting,
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
