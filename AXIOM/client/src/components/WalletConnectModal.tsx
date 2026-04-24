import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ExclamationIcon } from '@heroicons/react/outline';
import { useNotificationHelpers } from './NotificationSystem';

interface WalletConnectModalProps {
  onConnect?: (address: string, provider?: ethers.providers.Web3Provider) => void;
  onDisconnect?: () => void;
}


const WalletConnectModal: React.FC<WalletConnectModalProps> = ({ onConnect, onDisconnect }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [address, setAddress] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState<boolean>(false);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const { showError, showSuccess } = useNotificationHelpers();
  
  // BSC Mainnet Chain ID
  const ARBITRUM_CHAIN_ID = 42161;
  
  // Initialize wallet connection on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem('swf-wallet-provider');
    if (savedProvider === 'injected') {
      connectWallet();
    }
  }, []);
  
  // Setup event listeners for wallet changes
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);
  
  // Handle account changes
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAddress(accounts[0]);
      if (onConnect && provider) {
        onConnect(accounts[0], provider);
      }
    }
  };
  
  // Handle chain changes
  const handleChainChanged = () => {
    window.location.reload();
  };
  
  // Check if connected to the correct network
  const checkNetwork = async (provider: ethers.providers.Web3Provider) => {
    const network = await provider.getNetwork();
    const isCorrectNetwork = network.chainId === ARBITRUM_CHAIN_ID;
    setIsWrongNetwork(!isCorrectNetwork);
    return isCorrectNetwork;
  };
  
  // Switch to Arbitrum One network
  const switchToArbitrum = async () => {
    if (!window.ethereum) return;
    
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xa4b1' }], // 0xa4b1 is Arbitrum One
      });
    } catch (error: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xa4b1',
                chainName: 'Arbitrum One',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://arb1.arbitrum.io/rpc'],
                blockExplorerUrls: ['https://arbiscan.io/'],
              },
            ],
          });
        } catch (addError) {
          console.error('Error adding Arbitrum One network:', addError);
        }
      } else {
        console.error('Error switching network:', error);
      }
    }
  };
  
  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      showError('Wallet Not Found', 'Please install MetaMask or another Web3 wallet to use this feature.');
      return;
    }
    
    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create ethers provider
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(web3Provider);
      
      // Check if on the correct network
      const isCorrectNetwork = await checkNetwork(web3Provider);
      
      // Save connection preference
      localStorage.setItem('swf-wallet-provider', 'injected');
      
      // Update state
      setAddress(accounts[0]);
      setIsConnected(true);
      
      // Notify parent component
      if (onConnect) {
        onConnect(accounts[0], web3Provider);
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };
  
  // Disconnect wallet
  const disconnectWallet = () => {
    localStorage.removeItem('swf-wallet-provider');
    setIsConnected(false);
    setAddress('');
    setProvider(null);
    
    if (onDisconnect) {
      onDisconnect();
    }
  };
  
  // Toggle dropdown
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.wallet-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Copy address to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(address);
    showSuccess('Success', 'Address copied to clipboard!');
  };
  
  return (
    <div className="wallet-connect-modal">
      {isConnected ? (
        <div className="wallet-dropdown relative">
          <button
            onClick={toggleDropdown}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
              isWrongNetwork
                ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200 border border-indigo-300'
            } transition-colors`}
          >
            {isWrongNetwork && (
              <ExclamationIcon className="h-5 w-5 text-red-500 mr-1" />
            )}
            <span>{formatAddress(address)}</span>
            <svg
              className={`h-4 w-4 transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'} transition-transform`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 p-2 z-10 animate-fade-in">
              <div className="py-1">
                {isWrongNetwork && (
                  <div className="px-4 py-2 text-sm text-red-700 bg-red-100 rounded-md mb-2">
                    <div className="font-medium">Wrong Network</div>
                    <p className="text-xs">Please switch to Arbitrum One</p>
                    <button
                      onClick={switchToArbitrum}
                      className="mt-1 w-full px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded-md text-xs transition-colors"
                    >
                      Switch to Arbitrum One
                    </button>
                  </div>
                )}
                
                <div className="px-4 py-2 text-sm">
                  <div className="font-medium text-gray-500">Connected Address</div>
                  <div className="font-mono text-xs text-gray-800 truncate">{address}</div>
                  <button
                    onClick={copyToClipboard}
                    className="mt-1 text-indigo-600 hover:text-indigo-800 text-xs flex items-center"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy Address
                  </button>
                </div>
                
                <div className="border-t border-gray-200 my-1"></div>
                
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 w-full text-left rounded-md transition-colors"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default WalletConnectModal;
