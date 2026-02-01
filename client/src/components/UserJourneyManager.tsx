import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import IntroModal, { useFirstVisit } from './introModal';
import { 
  UserJourneyStep, 
  getCurrentStep, 
  isStepCompleted,
  setupWalletListeners
} from '../utils/userJourney';

interface UserJourneyManagerProps {
  children: React.ReactNode;
  walletProvider?: any;
}

/**
 * Manager component that handles the user's journey through the SWF platform
 * including intro modal display and automatic step triggering
 */
const UserJourneyManager: React.FC<UserJourneyManagerProps> = ({ 
  children, 
  walletProvider 
}) => {
  // Check if it's user's first visit to show intro modal
  const [isFirstVisit, markAsVisited] = useFirstVisit();
  const [showIntroModal, setShowIntroModal] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Initialize the manager on mount
  useEffect(() => {
    // TEMPORARILY DISABLED: Show intro modal on first visit
    // if (isFirstVisit) {
    //   setShowIntroModal(true);
    // }
    
    // Set up wallet connection listeners
    if (walletProvider) {
      setupWalletListeners(walletProvider);
    }
    
    // Set up journey step listeners
    const walletConnectedHandler = () => {
      // Auto-trigger navigation to staking after wallet connection
      if (location.pathname !== '/staking') {
        setTimeout(() => {
          navigate('/staking');
        }, 1000);
      }
    };
    
    const stakingCompletedHandler = () => {
      // Auto-trigger navigation to liquidity after first stake
      if (location.pathname !== '/liquidity') {
        setTimeout(() => {
          navigate('/liquidity');
        }, 1000);
      }
    };
    
    // Add event listeners
    document.addEventListener('swf-wallet-connected', walletConnectedHandler);
    document.addEventListener('swf-staking-completed', stakingCompletedHandler);
    
    // Clean up event listeners
    return () => {
      document.removeEventListener('swf-wallet-connected', walletConnectedHandler);
      document.removeEventListener('swf-staking-completed', stakingCompletedHandler);
    };
  }, [isFirstVisit, walletProvider, navigate, location.pathname]);
  
  // Handle closing the intro modal
  const handleCloseIntroModal = () => {
    setShowIntroModal(false);
    markAsVisited();
    
    // Only navigate to root if user is on home page and wallet not connected
    // Don't interfere with users trying to access specific pages like dashboard
    if (!isStepCompleted(UserJourneyStep.CONNECT_WALLET) && location.pathname === '/') {
      navigate('/');
    }
  };
  
  return (
    <>
      {/* Intro modal for first-time users */}
      <IntroModal 
        isOpen={showIntroModal} 
        onClose={handleCloseIntroModal} 
      />
      
      {/* Render children components */}
      {children}
    </>
  );
};

export default UserJourneyManager;
