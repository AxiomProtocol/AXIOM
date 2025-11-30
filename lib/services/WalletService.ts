/**
 * Axiom Smart City - Unified Wallet Service
 * Supports MetaMask SDK + WalletConnect 2.0
 * Network: Arbitrum One (Chain ID: 42161)
 */

import { ethers } from 'ethers';
import MetaMaskSDK from '@metamask/sdk';
import { NETWORK_CONFIG, CORE_CONTRACTS } from '../../shared/contracts';

export type WalletProvider = 'metamask' | 'walletconnect' | 'injected' | null;

export interface WalletState {
  address: string | null;
  chainId: number | null;
  provider: WalletProvider;
  isConnected: boolean;
  balance: string;
  axmBalance: string;
}

export class WalletService {
  private static instance: WalletService;
  private provider: any = null;
  private ethersProvider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private metamaskSDK: any = null;
  
  private state: WalletState = {
    address: null,
    chainId: null,
    provider: null,
    isConnected: false,
    balance: '0',
    axmBalance: '0'
  };

  private listeners: Set<(state: WalletState) => void> = new Set();

  private sdkInitialized = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeMetaMaskSDK();
    }
  }

  static getInstance(): WalletService {
    if (typeof window === 'undefined') {
      return null as any;
    }
    if (!WalletService.instance) {
      WalletService.instance = new WalletService();
    }
    return WalletService.instance;
  }

  /**
   * Initialize MetaMask SDK and check for existing connection
   */
  private initializeMetaMaskSDK() {
    if (typeof window === 'undefined' || this.sdkInitialized) return;
    
    try {
      const baseUrl = window.location.origin;
      this.metamaskSDK = new MetaMaskSDK({
        dappMetadata: {
          name: 'Axiom Smart City',
          url: window.location.href,
          iconUrl: `${baseUrl}/logo.png`
        },
        checkInstallationImmediately: false,
        enableAnalytics: false
      });
      this.sdkInitialized = true;
      console.log('✅ MetaMask SDK initialized');
      
      // Check for existing connection (auto-reconnect)
      this.checkExistingConnection();
    } catch (error) {
      console.error('❌ MetaMask SDK initialization error:', error);
    }
  }

  /**
   * Check for existing wallet connection (auto-reconnect from previous session)
   */
  private async checkExistingConnection() {
    if (typeof window === 'undefined') {
      console.log('❌ Auto-reconnect: Not in browser environment');
      return;
    }
    
    // Wait for window.ethereum to be available (MetaMask injects it async)
    let attempts = 0;
    while (!window.ethereum && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.ethereum) {
      console.log('ℹ️ Auto-reconnect: No wallet provider found after waiting');
      return;
    }
    
    try {
      // Use eth_accounts (doesn't prompt user, just checks if already connected)
      console.log('🔍 Checking for existing wallet connection...');
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      
      if (accounts && accounts.length > 0) {
        console.log('🔄 Found existing wallet connection:', accounts[0]);
        
        try {
          this.provider = window.ethereum;
          console.log('📦 Creating BrowserProvider...');
          this.ethersProvider = new ethers.BrowserProvider(window.ethereum);
          
          console.log('✍️ Getting signer...');
          this.signer = await this.ethersProvider.getSigner();
          
          const address = accounts[0];
          console.log('🌐 Getting network...');
          const network = await this.ethersProvider.getNetwork();
          const chainId = Number(network.chainId);
          console.log('📍 Network chain ID:', chainId);
          
          this.state = {
            address,
            chainId,
            provider: 'injected',
            isConnected: true,
            balance: '0',
            axmBalance: '0'
          };
          
          // Setup event listeners
          this.setupProviderListeners(window.ethereum);
          
          // Notify listeners IMMEDIATELY so React can update
          console.log('📢 Notifying listeners...');
          this.notifyListeners();
          
          // Fetch balances in background (don't block)
          this.updateBalances().catch(err => console.warn('Balance fetch error:', err));
          
          console.log('✅ Auto-reconnected to wallet:', address);
        } catch (innerError) {
          console.error('❌ Auto-reconnect inner error:', innerError);
        }
      } else {
        console.log('ℹ️ No existing wallet connection found');
      }
    } catch (error) {
      console.error('❌ Auto-reconnect check failed:', error);
    }
  }

  /**
   * Connect wallet using MetaMask
   */
  async connectMetaMask(): Promise<string> {
    try {
      console.log('🦊 Connecting MetaMask...');
      
      if (!this.metamaskSDK) {
        throw new Error('MetaMask SDK not initialized');
      }

      const provider = this.metamaskSDK.getProvider();
      
      if (!provider) {
        throw new Error('MetaMask provider not available');
      }

      // Request account access
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.provider = provider;
      this.ethersProvider = new ethers.BrowserProvider(provider);
      this.signer = await this.ethersProvider.getSigner();

      const address = accounts[0];
      const network = await this.ethersProvider.getNetwork();
      const chainId = Number(network.chainId);

      // Update state
      this.state = {
        address,
        chainId,
        provider: 'metamask',
        isConnected: true,
        balance: '0',
        axmBalance: '0'
      };

      // Switch to Arbitrum if needed
      if (chainId !== NETWORK_CONFIG.chainId) {
        await this.switchToArbitrum();
      }

      // Setup event listeners
      this.setupProviderListeners(provider);

      // Fetch balances
      await this.updateBalances();

      this.notifyListeners();
      console.log('✅ MetaMask connected:', address);
      
      return address;
    } catch (error: any) {
      console.error('❌ MetaMask connection error:', error);
      throw new Error(error.message || 'Failed to connect MetaMask');
    }
  }

  /**
   * Connect wallet using WalletConnect v2
   * Note: WalletConnect v2 (AppKit) is not implemented yet.
   * Use connectMetaMask() or connectInjected() instead.
   * 
   * Future implementation: Install @web3modal/wagmi and configure
   * WalletConnect v2 modal for 500+ wallet support.
   */
  async connectWalletConnect(): Promise<string> {
    throw new Error(
      'WalletConnect v2 not yet implemented. ' +
      'Please use MetaMask or another injected wallet provider. ' +
      'WalletConnect v2 support coming soon.'
    );
  }

  /**
   * Connect to injected provider (window.ethereum)
   */
  async connectInjected(): Promise<string> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('No Web3 wallet detected');
      }

      const provider = window.ethereum;
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      this.provider = provider;
      this.ethersProvider = new ethers.BrowserProvider(provider);
      this.signer = await this.ethersProvider.getSigner();

      const address = accounts[0];
      const network = await this.ethersProvider.getNetwork();
      const chainId = Number(network.chainId);

      this.state = {
        address,
        chainId,
        provider: 'injected',
        isConnected: true,
        balance: '0',
        axmBalance: '0'
      };

      if (chainId !== NETWORK_CONFIG.chainId) {
        await this.switchToArbitrum();
      }

      this.setupProviderListeners(provider);
      await this.updateBalances();
      this.notifyListeners();

      console.log('✅ Injected wallet connected:', address);
      return address;
    } catch (error: any) {
      console.error('❌ Injected wallet connection error:', error);
      throw new Error(error.message || 'Failed to connect wallet');
    }
  }

  /**
   * Switch to Arbitrum One network
   */
  async switchToArbitrum(): Promise<void> {
    try {
      if (!this.provider) {
        throw new Error('No provider connected');
      }

      console.log('🔄 Switching to Arbitrum One...');

      await this.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}` }]
      });

      console.log('✅ Switched to Arbitrum One');
    } catch (error: any) {
      // Chain not added, add it (error code 4902 means chain not found)
      if (error.code === 4902 || error.code === -32603) {
        try {
          console.log('⚠️ Arbitrum One not found in wallet, adding...');
          
          await this.provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${NETWORK_CONFIG.chainId.toString(16)}`,
              chainName: NETWORK_CONFIG.chainName,
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: [NETWORK_CONFIG.rpcUrl],
              blockExplorerUrls: [NETWORK_CONFIG.blockExplorer]
            }]
          });
          
          console.log('✅ Arbitrum One network added and switched');
          // wallet_addEthereumChain automatically switches to the added chain
          // No need to call switchToArbitrum again (prevent recursion)
        } catch (addError: any) {
          console.error('❌ Failed to add Arbitrum network:', addError);
          throw new Error('User rejected adding Arbitrum One network');
        }
      } else if (error.code === 4001) {
        // User rejected the request
        throw new Error('User rejected network switch');
      } else {
        // Unknown error
        throw new Error(error.message || 'Failed to switch network');
      }
    }
  }

  /**
   * Setup provider event listeners
   */
  private setupProviderListeners(provider: any) {
    if (!provider) return;

    // Account changed
    provider.on('accountsChanged', async (accounts: string[]) => {
      console.log('👤 Account changed:', accounts);
      
      if (accounts.length === 0) {
        await this.disconnect();
      } else {
        this.state.address = accounts[0];
        await this.updateBalances();
        this.notifyListeners();
      }
    });

    // Chain changed
    provider.on('chainChanged', async (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      console.log('⛓️ Chain changed:', newChainId);
      
      this.state.chainId = newChainId;
      
      if (newChainId !== NETWORK_CONFIG.chainId) {
        console.warn('⚠️ Wrong network! Expected Arbitrum One (42161)');
      }
      
      await this.updateBalances();
      this.notifyListeners();
    });

    // Disconnected
    provider.on('disconnect', () => {
      console.log('🔌 Provider disconnected');
      this.disconnect();
    });
  }

  /**
   * Update ETH and AXM balances
   */
  async updateBalances(): Promise<void> {
    try {
      if (!this.state.address || !this.ethersProvider) {
        return;
      }

      // Get ETH balance
      const ethBalance = await this.ethersProvider.getBalance(this.state.address);
      this.state.balance = ethers.formatEther(ethBalance);

      // Get AXM balance
      const axmBalance = await this.getAXMBalance(this.state.address);
      this.state.axmBalance = axmBalance;

      this.notifyListeners();
    } catch (error) {
      console.error('❌ Failed to update balances:', error);
    }
  }

  /**
   * Get AXM token balance
   */
  async getAXMBalance(address: string): Promise<string> {
    try {
      if (!this.ethersProvider) {
        return '0';
      }

      const axmContract = new ethers.Contract(
        CORE_CONTRACTS.AXM_TOKEN,
        ['function balanceOf(address) view returns (uint256)'],
        this.ethersProvider
      );

      const balance = await axmContract.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get AXM balance:', error);
      return '0';
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    console.log('🔌 Disconnecting wallet...');
    
    this.provider = null;
    this.ethersProvider = null;
    this.signer = null;
    
    this.state = {
      address: null,
      chainId: null,
      provider: null,
      isConnected: false,
      balance: '0',
      axmBalance: '0'
    };

    this.notifyListeners();
    console.log('✅ Wallet disconnected');
  }

  /**
   * Get current wallet state
   */
  getState(): WalletState {
    return { ...this.state };
  }

  /**
   * Subscribe to wallet state changes
   */
  subscribe(callback: (state: WalletState) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach(callback => callback(state));
  }

  /**
   * Get ethers signer for transactions
   */
  getSigner(): ethers.Signer | null {
    return this.signer;
  }

  /**
   * Get ethers provider
   */
  getProvider(): ethers.BrowserProvider | null {
    return this.ethersProvider;
  }

  /**
   * Send transaction
   */
  async sendTransaction(tx: ethers.TransactionRequest): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    return await this.signer.sendTransaction(tx);
  }

  /**
   * Sign message
   */
  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    return await this.signer.signMessage(message);
  }

  /**
   * Check if connected to Arbitrum One
   */
  isOnArbitrum(): boolean {
    return this.state.chainId === NETWORK_CONFIG.chainId;
  }
}

// Export lazy singleton getter
export const walletService = {
  getInstance: () => WalletService.getInstance(),
  getState: () => WalletService.getInstance()?.getState() ?? {
    address: null,
    chainId: null,
    provider: null,
    isConnected: false,
    balance: '0',
    axmBalance: '0'
  },
  subscribe: (listener: (state: WalletState) => void) => {
    const instance = WalletService.getInstance();
    if (instance) return instance.subscribe(listener);
    return () => {};
  },
  connectMetaMask: async () => WalletService.getInstance()?.connectMetaMask(),
  connectInjected: async () => WalletService.getInstance()?.connectInjected(),
  disconnect: async () => WalletService.getInstance()?.disconnect(),
  switchToArbitrum: async () => WalletService.getInstance()?.switchToArbitrum(),
  updateBalances: async () => WalletService.getInstance()?.updateBalances(),
  getProvider: () => WalletService.getInstance()?.getProvider() ?? null,
  getSigner: () => WalletService.getInstance()?.getSigner() ?? null
};

// TypeScript module augmentation for window.ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
