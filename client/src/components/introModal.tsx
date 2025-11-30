import React, { useState, useEffect } from 'react';
import { X, ArrowRight, Wallet, Coins, Building2, RefreshCw, Vote } from 'lucide-react';

interface IntroModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntroModal: React.FC<IntroModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [animate, setAnimate] = useState(false);

  // Define the steps in the introduction flow
  const steps = [
    {
      title: "Welcome to AXIOM Smart City",
      description: "America's first on-chain sovereign smart city economy. We'll guide you through 5 simple steps to participate in the future of digital-physical infrastructure.",
      icon: <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
        <img src="/axiom-logo.png" alt="AXIOM" className="w-12 h-12 rounded-full" />
      </div>
    },
    {
      title: "Step 1: Connect Your Wallet",
      description: "Connect your wallet to access AXIOM Smart City on Arbitrum One and manage your AXM tokens securely.",
      icon: <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
        <Wallet className="w-8 h-8 text-blue-600" />
      </div>
    },
    {
      title: "Step 2: Stake Your AXM Tokens",
      description: "Stake your AXM tokens in the AxiomStakingAndEmissionsHub to earn rewards while supporting the smart city ecosystem.",
      icon: <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
        <Coins className="w-8 h-8 text-green-600" />
      </div>
    },
    {
      title: "Step 3: Access Real Estate",
      description: "Participate in tokenized real estate, rent-to-own leases, and property investments on the Land & Asset Registry.",
      icon: <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center">
        <Building2 className="w-8 h-8 text-purple-600" />
      </div>
    },
    {
      title: "Step 4: Trade on the DEX",
      description: "Swap tokens and provide liquidity on the AxiomExchangeHub, our internal decentralized exchange.",
      icon: <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-orange-600" />
      </div>
    },
    {
      title: "Step 5: Participate in Governance",
      description: "Vote on proposals and help shape the future of America's first on-chain sovereign smart city.",
      icon: <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
        <Vote className="w-8 h-8 text-indigo-600" />
      </div>
    }
  ];

  // Reset to first step when modal is opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      // Start animation after a short delay
      setTimeout(() => setAnimate(true), 100);
    } else {
      setAnimate(false);
    }

    // Store that user has seen intro in local storage
    if (isOpen) {
      localStorage.setItem('axiom-intro-seen', 'true');
    }
  }, [isOpen]);

  // Advance to next step
  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setAnimate(false);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setAnimate(true);
      }, 300);
    } else {
      onClose();
    }
  };

  // Skip tutorial
  const skipTutorial = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden">
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Progress indicator */}
          <div className="flex mb-6 justify-center">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-6 mx-1 rounded-full ${
                  index <= currentStep ? 'bg-gradient-to-r from-yellow-500 to-orange-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Content */}
          <div className={`transition-opacity duration-300 ${animate ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex flex-col items-center text-center mb-6">
              {steps[currentStep].icon}
              <h2 className="text-xl font-bold mt-4 mb-2">{steps[currentStep].title}</h2>
              <p className="text-gray-600">{steps[currentStep].description}</p>
            </div>

            {/* Buttons */}
            <div className="flex justify-between mt-8">
              <button
                onClick={skipTutorial}
                className="text-gray-500 hover:text-gray-700"
              >
                Skip
              </button>
              <button
                onClick={nextStep}
                className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-white px-4 py-2 rounded-lg flex items-center"
              >
                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to check if it's the user's first visit
 * @returns {boolean} True if this is the first visit
 */
export const useFirstVisit = (): [boolean, () => void] => {
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  
  useEffect(() => {
    // Check if user has seen intro before
    const hasSeenIntro = localStorage.getItem('axiom-intro-seen');
    setIsFirstVisit(!hasSeenIntro);
  }, []);
  
  const markAsVisited = () => {
    localStorage.setItem('axiom-intro-seen', 'true');
    setIsFirstVisit(false);
  };
  
  return [isFirstVisit, markAsVisited];
};

export default IntroModal;
