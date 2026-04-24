import React, { useEffect } from 'react';
import { Button } from '../ui/button';
import { useWallet } from '../../contexts/WalletContext';
import { useNavigate } from 'react-router-dom';

interface WalletConnectProps {
  onAuthSuccess?: () => void;
  variant?: 'default' | 'compact' | 'minimal';
  showUserInfo?: boolean;
}

export function WalletConnect({ 
  onAuthSuccess, 
  variant = 'default',
  showUserInfo = true 
}: WalletConnectProps) {
  // Use global wallet context instead of local state
  const {
    isConnected,
    account,
    isConnecting,
    isLoggedIn,
    userInfo,
    loginError,
    connectWallet,
    disconnectWallet,
    clearError
  } = useWallet();
  
  const navigate = useNavigate();

  // Call onAuthSuccess when user becomes logged in
  useEffect(() => {
    if (isLoggedIn && onAuthSuccess) {
      console.log('📢 WalletConnect: User logged in, calling onAuthSuccess callback...');
      setTimeout(() => onAuthSuccess(), 500); // Small delay to ensure state updates
    }
  }, [isLoggedIn, onAuthSuccess]);

  // Render different variants of the wallet connect component
  const renderVariant = () => {
    switch (variant) {
      case 'minimal':
        return renderMinimalVariant();
      case 'compact':
        return renderCompactVariant();
      default:
        return renderDefaultVariant();
    }
  };

  const renderMinimalVariant = () => {
    if (isConnected && isLoggedIn) {
      return (
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm text-green-600">
            {userInfo?.firstName || account.slice(0, 6) + '...'}
          </span>
        </div>
      );
    }

    if (isConnected && !isLoggedIn) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={clearError}
          className="text-xs"
        >
          Complete Auth
        </Button>
      );
    }

    return (
      <Button
        size="sm"
        onClick={connectWallet}
        disabled={isConnecting}
        className="text-xs"
      >
        {isConnecting ? 'Connecting...' : 'Connect'}
      </Button>
    );
  };

  const renderCompactVariant = () => {
    if (isConnected && isLoggedIn) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-green-800">
                ✅ Connected
              </div>
              <div className="text-xs text-green-600">
                {userInfo?.firstName || account.slice(0, 6) + '...' + account.slice(-4)}
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={disconnectWallet}
              className="text-xs"
            >
              Disconnect
            </Button>
          </div>
        </div>
      );
    }

    if (isConnected && !isLoggedIn) {
      return (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="text-sm font-medium text-orange-800 mb-2">
            🔐 Complete Authentication
          </div>
          {loginError && (
            <div className="text-xs text-red-600 mb-2">
              {loginError}
            </div>
          )}
          <div className="flex space-x-2">
            <Button
              size="sm"
              onClick={clearError}
              className="flex-1 text-xs"
            >
              Try Again
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={disconnectWallet}
              className="flex-1 text-xs"
            >
              Disconnect
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Button 
        onClick={connectWallet}
        disabled={isConnecting}
        className="w-full"
      >
        {isConnecting ? 'Connecting...' : '🔗 Connect Wallet'}
      </Button>
    );
  };

  const renderDefaultVariant = () => {
    if (isConnected && isLoggedIn) {
      return (
        <div className="flex flex-col space-y-3">
          <div className="text-sm text-gray-700 bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-green-800">
                  ✅ Wallet Connected
                </div>
                <div className="text-xs text-green-600">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={disconnectWallet}
                className="text-xs"
              >
                Disconnect
              </Button>
            </div>
          </div>
          
          {showUserInfo && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm">
                <div className="font-medium text-blue-800 mb-2">
                  🎉 Welcome, {userInfo?.firstName || 'Member'}!
                </div>
                <div className="text-xs text-blue-600 space-y-1">
                  <div>✓ Access to all platform features</div>
                  <div>✓ Wealth building pathways</div>
                  <div>✓ Community circles</div>
                  <div>✓ Your personal dashboard</div>
                </div>
                <Button 
                  size="sm"
                  className="mt-2 w-full bg-blue-500 hover:bg-blue-600"
                  onClick={() => {
                    // Only navigate if user is properly logged in
                    if (isLoggedIn && userInfo) {
                      // Use React Router navigate instead of window.location to ensure React dashboard
                      console.log('🎯 WalletConnect: Navigating to React dashboard...');
                      navigate('/dashboard');
                    } else {
                      alert('Please ensure your wallet is connected and account is set up first.');
                    }
                  }}
                >
                  Go to Your Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (isConnected && !isLoggedIn) {
      return (
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <div className="text-sm">
            <div className="font-medium text-blue-800 mb-2">
              🎉 Welcome to AXIOM Smart City!
            </div>
            <div className="text-xs text-blue-600 mb-3">
              Your wallet will be automatically linked to a new account. This secure process only takes a moment.
            </div>
            {loginError && (
              <div className="text-xs text-red-600 mb-3 p-2 bg-red-50 rounded">
                {loginError}
              </div>
            )}
            <Button 
              size="sm"
              className="w-full bg-blue-500 hover:bg-blue-600"
              onClick={clearError}
            >
              Complete Setup
            </Button>
            {loginError && loginError.includes('No account found') && (
              <div className="text-xs text-gray-500 mt-2">
                New to AXIOM? Your account will be created automatically when you sign the message.
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <Button 
          onClick={connectWallet}
          disabled={isConnecting}
          className="w-full bg-green-600 hover:bg-green-700 text-white cursor-pointer"
          style={{ pointerEvents: 'auto', position: 'relative', zIndex: 999 }}
        >
          {isConnecting ? 'Connecting...' : '🔗 Connect Advanced Wallet'}
        </Button>
        
        {loginError && (
          <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
            <div className="text-xs text-orange-600">
              {loginError}
            </div>
          </div>
        )}
        
        <div className="text-xs text-gray-500 text-center">
          Connect with MetaMask on Arbitrum One for full platform access
        </div>
      </div>
    );
  };

  return renderVariant();
}
