import React, { useState, useEffect } from 'react';
import { 
  WalletIcon, 
  CashIcon, 
  CurrencyDollarIcon, 
  SwitchHorizontalIcon, 
  UserGroupIcon,
  CheckCircleIcon
} from '@heroicons/react/outline';

export interface Step {
  id: number;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'complete' | 'current' | 'upcoming';
}

interface StepProgressBannerProps {
  currentStep: number;
  walletConnected: boolean;
  onStepClick: (stepId: number) => void;
}

const StepProgressBanner: React.FC<StepProgressBannerProps> = ({
  currentStep,
  walletConnected,
  onStepClick
}) => {
  const [animating, setAnimating] = useState<boolean>(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [prevStep, setPrevStep] = useState<number>(1);

  // Initialize steps
  useEffect(() => {
    const initialSteps: Step[] = [
      {
        id: 1,
        name: 'Connect Wallet',
        description: 'Connect your wallet to access the platform',
        icon: <WalletIcon className="w-6 h-6" />,
        status: 'current' as const
      },
      {
        id: 2,
        name: 'Stake',
        description: 'Stake SWF tokens for rewards',
        icon: <CashIcon className="w-6 h-6" />,
        status: 'upcoming' as const
      },
      {
        id: 3,
        name: 'Add Liquidity',
        description: 'Provide liquidity to earn fees',
        icon: <CurrencyDollarIcon className="w-6 h-6" />,
        status: 'upcoming' as const
      },
      {
        id: 4,
        name: 'Swap',
        description: 'Exchange tokens efficiently',
        icon: <SwitchHorizontalIcon className="w-6 h-6" />,
        status: 'upcoming' as const
      },
      {
        id: 5,
        name: 'Govern',
        description: 'Participate in community governance',
        icon: <UserGroupIcon className="w-6 h-6" />,
        status: 'upcoming' as const
      }
    ];
    
    // Set initial status based on wallet connection
    if (walletConnected) {
      initialSteps[0].status = 'complete' as const;
      initialSteps[1].status = 'current' as const;
    }
    
    setSteps(initialSteps);
  }, [walletConnected]);

  // Update step status when currentStep changes
  useEffect(() => {
    if (currentStep === prevStep) return;
    
    setAnimating(true);

    // Wait for animation to finish
    const timer = setTimeout(() => {
      // Update step statuses based on current step
      const updatedSteps = steps.map(step => {
        if (step.id < currentStep) {
          return { ...step, status: 'complete' as const };
        } else if (step.id === currentStep) {
          return { ...step, status: 'current' as const };
        } else {
          return { ...step, status: 'upcoming' as const };
        }
      });
      
      setSteps(updatedSteps);
      setPrevStep(currentStep);
      setAnimating(false);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [currentStep, steps, prevStep]);

  // Handle step click
  const handleStepClick = (step: Step) => {
    // Only allow clicking on complete steps or the current step
    if (step.status === 'complete' || step.status === 'current') {
      onStepClick(step.id);
    }
  };

  // Get step status colors
  const getStepStatusStyles = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-indigo-600 text-white border-indigo-600';
      case 'current':
        return 'bg-white text-indigo-600 border-indigo-600';
      default:
        return 'bg-white text-gray-400 border-gray-300';
    }
  };

  // Get line status colors
  const getLineStatusStyles = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-indigo-600';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <div className={`step-progress-banner transition-opacity duration-300 ${animating ? 'opacity-50' : 'opacity-100'}`}>
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between w-full px-4 py-2 space-x-2 sm:space-x-4 md:space-x-6">
          {steps.map((step, stepIdx) => (
            <li key={step.id} className={`relative ${stepIdx === steps.length - 1 ? 'flex-1' : 'flex-1 flex'}`}>
              {/* Connecting line */}
              {stepIdx < steps.length - 1 && (
                <div className="absolute top-4 left-0 w-full flex items-center">
                  <div 
                    className={`h-0.5 flex-1 ${getLineStatusStyles(step.status)}`}
                    aria-hidden="true"
                  />
                </div>
              )}
              
              {/* Step button */}
              <div 
                className={`group relative flex flex-col items-center ${
                  step.status !== 'upcoming' ? 'cursor-pointer' : 'cursor-not-allowed'
                }`}
                onClick={() => handleStepClick(step)}
                aria-current={step.status === 'current' ? 'step' : undefined}
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors duration-300 ease-in-out transform group-hover:scale-110">
                  {/* Status icon */}
                  <span
                    className={`${getStepStatusStyles(step.status)} rounded-full flex items-center justify-center w-7 h-7 transition-colors duration-300`}
                  >
                    {step.status === 'complete' ? (
                      <CheckCircleIcon className="w-5 h-5" aria-hidden="true" />
                    ) : (
                      step.icon
                    )}
                  </span>
                </span>
                
                {/* Step label & description */}
                <div className="mt-1 flex flex-col items-center">
                  <span 
                    className={`text-xs font-medium ${step.status === 'upcoming' ? 'text-gray-400' : 'text-gray-900'}`}
                  >
                    {step.name}
                  </span>
                  
                  <span 
                    className="hidden sm:block text-xs text-gray-500 mt-0.5" 
                    data-testid={`step-description-${step.id}`}
                  >
                    {step.description}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default StepProgressBanner;
