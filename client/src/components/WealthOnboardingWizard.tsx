import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { WalletConnect } from "./web3/wallet-connect";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import { Step3Integrated } from "./Step3Integrated";

// Types for the onboarding flow
export interface WealthPath {
  id: string;
  icon: string;
  title: string;
  description: string;
  detailedDescription: string;
  goals: WealthGoal[];
}

export interface WealthGoal {
  id: string;
  title: string;
  amount: number;
  timeframe: string;
  description: string;
}

export interface OnboardingData {
  selectedPath?: WealthPath;
  selectedGoal?: WealthGoal;
  customGoalAmount?: number;
  monthlyContribution: number;
  walletConnected: boolean;
}

interface WealthOnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void; // Callback when onboarding is completed
  initialPath?: string; // To start on a specific path from homepage
}

// Wealth-building paths with associated goals
const WEALTH_PATHS: WealthPath[] = [
  {
    id: 'beginner',
    icon: '🌱',
    title: "I'm New to Building Wealth",
    description: "Start with the basics. Learn how to make your first dollar work for you.",
    detailedDescription: "Perfect for building your first emergency fund and understanding how steady growth works. Start with any amount and learn the fundamentals.",
    goals: [
      { id: 'emergency1', title: 'Emergency Fund ($1,000)', amount: 1000, timeframe: '8-12 months', description: 'Cover unexpected expenses' },
      { id: 'emergency2', title: 'Emergency Fund ($5,000)', amount: 5000, timeframe: '2-3 years', description: 'Full 3-month expense buffer' },
      { id: 'emergency3', title: 'Emergency Fund ($10,000)', amount: 10000, timeframe: '3-5 years', description: '6-month safety net' },
    ]
  },
  {
    id: 'investment',
    icon: '📈',
    title: "I Want Better Returns",
    description: "Earn more than savings accounts. Safe growth with higher yields.",
    detailedDescription: "Focus on steady investment growth that beats inflation. Choose from conservative to aggressive strategies based on your risk tolerance.",
    goals: [
      { id: 'invest1', title: 'Conservative Growth (3-7%)', amount: 10000, timeframe: '2-3 years', description: 'Stable returns with lower risk' },
      { id: 'invest2', title: 'Balanced Portfolio (5-10%)', amount: 50000, timeframe: '5-7 years', description: 'Moderate risk for steady growth' },
      { id: 'invest3', title: 'Aggressive Growth (8-12%)', amount: 100000, timeframe: '8-12 years', description: 'Higher risk for maximum potential returns' },
    ]
  },
  {
    id: 'property',
    icon: '🏠',
    title: "I Want to Own Property",
    description: "Rent-to-own pathway. Build equity while you live in your future home.",
    detailedDescription: "Our KeyGrow program lets you start building equity from day one. Choose your future home and work toward ownership while living in it.",
    goals: [
      { id: 'property1', title: 'Down Payment ($20,000)', amount: 20000, timeframe: '2-3 years', description: 'Entry-level home purchase' },
      { id: 'property2', title: 'Down Payment ($50,000)', amount: 50000, timeframe: '4-6 years', description: 'Better neighborhood choice' },
      { id: 'property3', title: 'Down Payment ($100,000)', amount: 100000, timeframe: '7-10 years', description: 'Premium property access' },
    ]
  },
  {
    id: 'community',
    icon: '🤝',
    title: "I Want to Save with Others",
    description: "Join community savings circles. Achieve goals together, faster.",
    detailedDescription: "Connect with others who share your goals. Pool resources, share knowledge, and achieve milestones together in our community circles.",
    goals: [
      { id: 'community1', title: 'Savings Circle ($5,000)', amount: 5000, timeframe: '12-18 months', description: 'Join local savings group' },
      { id: 'community2', title: 'Group Investment ($25,000)', amount: 25000, timeframe: '3-4 years', description: 'Invest with community support' },
      { id: 'community3', title: 'Collective Goal ($100,000)', amount: 100000, timeframe: '5-8 years', description: 'Major community milestone' },
    ]
  },
  {
    id: 'education',
    icon: '🎓',
    title: "I Want to Learn First",
    description: "Start with education. Understand how money works before investing.",
    detailedDescription: "Access our comprehensive learning academy with interactive courses, calculators, and earn SWF tokens while you learn. Perfect for building confidence before making financial moves.",
    goals: [
      { id: 'learn1', title: 'Complete Basic Financial Literacy', amount: 0, timeframe: '2-4 weeks', description: 'Foundation knowledge to make smart decisions' },
      { id: 'learn2', title: 'Understand Investment Options', amount: 0, timeframe: '1-2 months', description: 'Learn different ways to grow money safely' },
      { id: 'learn3', title: 'Master Advanced Strategies', amount: 0, timeframe: '3-6 months', description: 'Advanced wealth-building techniques' },
    ]
  }
];

// Progress Bar Component
function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
      <div 
        className="bg-yellow-500 h-2 rounded-full transition-all duration-500" 
        style={{ width: `${progress}%` }}
      />
      <div className="text-center text-sm text-gray-500 mt-2">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}

// Path Selection Component
function PathSelection({ 
  onPathSelect, 
  selectedPath 
}: { 
  onPathSelect: (path: WealthPath) => void;
  selectedPath?: WealthPath;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Wealth-Building Path
        </h2>
        <p className="text-lg text-gray-600">
          Every journey starts with a single step. Which path resonates with you?
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-4">
        {WEALTH_PATHS.map((path) => (
          <Card 
            key={path.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-lg",
              selectedPath && selectedPath.id === path.id 
                ? "border-yellow-500 bg-yellow-50" 
                : "border-gray-200 hover:border-yellow-500"
            )}
            onClick={() => onPathSelect(path)}
          >
            <CardContent className="p-6">
              <div className="text-4xl mb-4">{path.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{path.title}</h3>
              <p className="text-gray-600 mb-4">{path.description}</p>
              <p className="text-sm text-gray-500">{path.detailedDescription}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {selectedPath && (
        <div className="text-center">
          <p className="text-green-600 font-medium">
            ✓ You selected: {selectedPath.title}
          </p>
        </div>
      )}
    </div>
  );
}

// Goal Selection Component
function GoalSelection({
  selectedPath,
  onGoalSelect,
  selectedGoal,
  customAmount,
  onCustomAmountChange
}: {
  selectedPath: WealthPath;
  onGoalSelect: (goal: WealthGoal | null) => void;
  selectedGoal?: WealthGoal;
  customAmount?: number;
  onCustomAmountChange: (amount: number) => void;
}) {
  const [isCustom, setIsCustom] = useState(false);

  const handleGoalClick = (goal: WealthGoal) => {
    setIsCustom(false);
    onGoalSelect(goal);
  };

  const handleCustomClick = () => {
    setIsCustom(true);
    onGoalSelect(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          What's Your Wealth-Building Goal?
        </h2>
        <p className="text-lg text-gray-600">
          Having a clear goal makes your journey more focused and achievable.
        </p>
      </div>
      
      <div className="grid gap-4">
        {selectedPath.goals.map((goal) => (
          <Card 
            key={goal.id}
            className={cn(
              "cursor-pointer transition-all duration-200 hover:shadow-md",
              selectedGoal?.id === goal.id 
                ? "border-yellow-500 bg-yellow-50" 
                : "border-gray-200 hover:border-yellow-500"
            )}
            onClick={() => handleGoalClick(goal)}
          >
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{goal.title}</h3>
                <p className="text-gray-600">{goal.description}</p>
                <p className="text-sm text-gray-500">Timeline: {goal.timeframe}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  ${goal.amount.toLocaleString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {/* Custom Amount Option */}
        <Card 
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md",
            isCustom 
              ? "border-yellow-500 bg-yellow-50" 
              : "border-gray-200 hover:border-yellow-500"
          )}
          onClick={handleCustomClick}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Custom Goal</h3>
                <p className="text-gray-600">Set your own target amount</p>
              </div>
              <div className="text-right">
                {isCustom ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-medium">$</span>
                    <Input
                      type="number"
                      value={customAmount || ''}
                      onChange={(e) => onCustomAmountChange(Number(e.target.value))}
                      placeholder="Enter amount"
                      className="w-32"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-blue-600">$?</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {(selectedGoal || (isCustom && customAmount)) && (
        <div className="text-center">
          <p className="text-green-600 font-medium">
            ✓ Goal set: $
            {selectedGoal 
              ? selectedGoal.amount.toLocaleString() 
              : customAmount?.toLocaleString()
            }
          </p>
        </div>
      )}
    </div>
  );
}

// Contribution Setup Component
function ContributionSetup({
  monthlyContribution,
  onContributionChange,
  goalAmount,
  selectedPath
}: {
  monthlyContribution: number;
  onContributionChange: (amount: number) => void;
  goalAmount: number;
  selectedPath: WealthPath;
}) {
  const calculateTimeToGoal = (monthly: number, goal: number, rate: number) => {
    // Handle edge cases to prevent NaN/Infinity
    if (goal <= 0 || monthly <= 0) return 0;
    if (rate === 0) return goal / monthly;
    
    const monthlyRate = rate / 12 / 100;
    const calculation = Math.log(1 + (goal * monthlyRate) / monthly) / Math.log(1 + monthlyRate);
    
    // Return 0 if calculation results in invalid number
    if (!isFinite(calculation) || isNaN(calculation)) return 0;
    return calculation;
  };

  const safeGrowthMonths = calculateTimeToGoal(monthlyContribution, goalAmount, 3);
  const betterGrowthMonths = calculateTimeToGoal(monthlyContribution, goalAmount, 7);

  const formatTimeframe = (months: number) => {
    // Handle edge cases
    if (!isFinite(months) || isNaN(months) || months <= 0) {
      return "Calculate after setting goal";
    }
    
    const years = Math.floor(months / 12);
    const remainingMonths = Math.floor(months % 12);
    
    if (years === 0) return `${remainingMonths} months`;
    if (remainingMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
    return `${years}y ${remainingMonths}m`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          How Much Can You Save Each Month?
        </h2>
        <p className="text-lg text-gray-600">
          Start with any amount. You can always adjust as your income grows.
        </p>
      </div>
      
      <Card className="bg-white">
        <CardContent className="p-6">
          <div className="mb-6">
            <label className="block text-lg font-medium text-gray-700 mb-4">
              Monthly Contribution: ${monthlyContribution}
            </label>
            <input
              type="range"
              min="50"
              max="1000"
              step="25"
              value={monthlyContribution}
              onChange={(e) => onContributionChange(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #F59E0B 0%, #F59E0B ${((monthlyContribution - 50) / (1000 - 50)) * 100}%, #E5E7EB ${((monthlyContribution - 50) / (1000 - 50)) * 100}%, #E5E7EB 100%)`
              }}
            />
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>$50</span>
              <span>$1,000</span>
            </div>
          </div>

          {goalAmount > 0 && (
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Time to Reach ${goalAmount.toLocaleString()}
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-lg font-semibold text-blue-600">Safe Growth (3%)</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {formatTimeframe(safeGrowthMonths)}
                  </div>
                  <div className="text-sm text-blue-600">Conservative estimate</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-lg font-semibold text-green-600">Better Growth (7%)</div>
                  <div className="text-2xl font-bold text-green-700">
                    {formatTimeframe(betterGrowthMonths)}
                  </div>
                  <div className="text-sm text-green-600">Growth-focused approach</div>
                </div>
              </div>
            </div>
          )}

          {goalAmount === 0 && (
            <div className="text-center mb-6 p-4 bg-yellow-50 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                💡 Ready to Start Building Wealth
              </h3>
              <p className="text-yellow-700">
                Your monthly contribution of ${monthlyContribution} will start growing from day one. 
                Set a specific goal in previous steps to see timeframe projections.
              </p>
            </div>
          )}

          <div className="bg-yellow-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">💡 Your Journey Starts Here</h4>
            <p className="text-sm text-gray-700">
              At ${monthlyContribution}/month, you're taking a meaningful step toward financial security. 
              Remember: the best time to start building wealth was yesterday. The second best time is today.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Wallet connection step removed - now handled in Getting Started Guide Step 3

// Main Wizard Component
export function WealthOnboardingWizard({ 
  isOpen, 
  onClose, 
  onComplete,
  initialPath 
}: WealthOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    monthlyContribution: 200,
    walletConnected: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const totalSteps = 3; // Removed wallet connection step

  // Initialize with path if provided
  useEffect(() => {
    if (initialPath) {
      const path = WEALTH_PATHS.find(p => p.id === initialPath);
      if (path) {
        setOnboardingData(prev => ({ ...prev, selectedPath: path }));
      }
    }
  }, [initialPath]);

  // Wallet connection logic removed - now handled in Getting Started Guide Step 3

  // Load existing onboarding data from backend when opening
  useEffect(() => {
    const loadOnboardingData = async () => {
      if (isOpen && isAuthenticated && user) {
        setIsLoading(true);
        try {
          const token = localStorage.getItem('auth_token');
          if (!token) return;

          const response = await fetch('/api/onboarding/status', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.onboarding) {
              setCurrentStep(data.onboarding.currentStep || 1);
              setOnboardingData(prev => ({
                ...prev,
                selectedPath: data.onboarding.selectedPath ? 
                  WEALTH_PATHS.find(p => p.id === data.onboarding.selectedPath) : undefined,
                selectedGoal: data.onboarding.selectedGoal,
                monthlyContribution: data.onboarding.monthlyContribution || 200,
                customGoalAmount: data.onboarding.onboardingData?.customGoalAmount
              }));
              console.log('✅ Loaded existing onboarding data:', data.onboarding);
            }
          }
        } catch (error) {
          console.error('❌ Error loading onboarding data:', error);
          // Fallback to localStorage for offline mode
          const saved = localStorage.getItem('wealth-onboarding-data');
          if (saved) {
            try {
              const data = JSON.parse(saved);
              setOnboardingData(prev => ({ ...prev, ...data }));
            } catch (e) {
              console.log('Could not load saved onboarding data from localStorage');
            }
          }
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadOnboardingData();
  }, [isOpen, isAuthenticated, user]);

  // Save progress to backend automatically when data changes
  const saveProgress = async () => {
    if (!isAuthenticated || !user || isSaving) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const progressData = {
        currentStep,
        completedSteps: Array.from({ length: currentStep - 1 }, (_, i) => i + 1),
        selectedPath: onboardingData.selectedPath?.id,
        selectedGoal: onboardingData.selectedGoal,
        monthlyContribution: onboardingData.monthlyContribution,
        onboardingData: {
          customGoalAmount: onboardingData.customGoalAmount
        }
      };

      const response = await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(progressData)
      });

      if (response.ok) {
        console.log('✅ Onboarding progress saved automatically');
      }
    } catch (error) {
      console.error('❌ Error saving onboarding progress:', error);
    } finally {
      setIsSaving(false);
    }

    // Also save to localStorage as backup
    localStorage.setItem('wealth-onboarding-data', JSON.stringify(onboardingData));
  };

  // Save progress when data changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen && onboardingData.selectedPath) {
        saveProgress();
      }
    }, 1000); // Debounce to avoid too many API calls

    return () => clearTimeout(timeoutId);
  }, [onboardingData, currentStep, isOpen]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    console.log('🎉 WealthOnboardingWizard: Starting completion process...');
    console.log('🔍 [DEBUG] onComplete callback provided:', !!onComplete);
    console.log('🔍 [DEBUG] onClose callback provided:', !!onClose);
    setIsSaving(true);
    
    try {
      if (isAuthenticated && user) {
        const token = localStorage.getItem('token');
        if (token) {
          // Save completion to backend
          const finalData = {
            selectedPath: onboardingData.selectedPath?.id,
            selectedGoal: onboardingData.selectedGoal,
            monthlyContribution: onboardingData.monthlyContribution,
            customGoalAmount: onboardingData.customGoalAmount,
            completedAt: new Date().toISOString()
          };

          const completeResponse = await fetch('/api/onboarding/complete', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ finalData })
          });

          // Also save as a user goal if they selected one
          if (onboardingData.selectedGoal || onboardingData.customGoalAmount) {
            const goalAmount = onboardingData.selectedGoal?.amount || onboardingData.customGoalAmount || 0;
            const goals = [{
              category: onboardingData.selectedPath?.id === 'property' ? 'home' : 
                       onboardingData.selectedPath?.id === 'investment' ? 'investment' : 
                       onboardingData.selectedPath?.id === 'education' ? 'education' :
                       onboardingData.selectedPath?.id === 'community' ? 'community' : 'other',
              title: onboardingData.selectedGoal?.title || `${onboardingData.selectedPath?.title} Goal`,
              description: onboardingData.selectedGoal?.description || `Wealth building goal for ${onboardingData.selectedPath?.title}`,
              targetAmount: goalAmount,
              currentAmount: 0,
              targetDate: new Date(Date.now() + (365 * 24 * 60 * 60 * 1000 * 3)).toISOString(), // 3 years from now
              priority: 'high',
              timeHorizon: 3,
              importance: 8,
              monthlyContribution: onboardingData.monthlyContribution,
              isActive: true
            }];

            await fetch('/api/onboarding/goals', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ goals })
            });

            console.log('✅ User goals saved to database');
          }

          if (completeResponse.ok) {
            console.log('✅ Onboarding completion saved to database');
          }
        }
      }
    } catch (error) {
      console.error('❌ Error completing onboarding:', error);
    } finally {
      setIsSaving(false);
    }
    
    // Save completion status to localStorage as backup
    localStorage.setItem('wealth-onboarding-completed', 'true');
    localStorage.setItem('wealth-onboarding-completion-date', new Date().toISOString());
    localStorage.setItem('wealth-onboarding-data', JSON.stringify(onboardingData));
    
    // Call the onComplete callback if provided
    if (onComplete) {
      onComplete();
    }
    
    // Close the wizard - no navigation needed as everything is integrated
    onClose();
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!onboardingData.selectedPath;
      case 2:
        return !!onboardingData.selectedGoal || !!onboardingData.customGoalAmount;
      case 3:
        return onboardingData.walletConnected && onboardingData.monthlyContribution >= 50;
      default:
        return false;
    }
  };

  const getGoalAmount = () => {
    return onboardingData.selectedGoal?.amount || onboardingData.customGoalAmount || 0;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-75">
      <div className="h-full w-full overflow-y-auto">
        <div className="min-h-full flex items-start justify-center p-2 pt-4 pb-8">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-w-[95vw] my-4">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Start Your Wealth Journey</h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {currentStep === 1 && (
            <PathSelection
              onPathSelect={(path) => setOnboardingData(prev => ({ ...prev, selectedPath: path }))}
              selectedPath={onboardingData.selectedPath}
            />
          )}

          {currentStep === 2 && onboardingData.selectedPath && (
            <GoalSelection
              selectedPath={onboardingData.selectedPath}
              onGoalSelect={(goal) => setOnboardingData(prev => ({ 
                ...prev, 
                selectedGoal: goal,
                customGoalAmount: undefined 
              }))}
              selectedGoal={onboardingData.selectedGoal}
              customAmount={onboardingData.customGoalAmount}
              onCustomAmountChange={(amount) => setOnboardingData(prev => ({ 
                ...prev, 
                customGoalAmount: amount,
                selectedGoal: undefined 
              }))}
            />
          )}

          {currentStep === 3 && (
            <Step3Integrated
              onboardingData={onboardingData}
              onDataChange={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
            />
          )}

          {/* Wallet connection removed - now handled in Getting Started Guide Step 3 */}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 md:px-6 py-4 border-t">
          <div className="flex flex-col sm:flex-row justify-between gap-3">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="w-full sm:w-auto"
            >
              Previous
            </Button>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSaving}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              {isSaving ? 'Saving...' : 'Save & Exit'}
            </Button>
            
{currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-yellow-500 hover:bg-yellow-600 text-black w-full sm:w-auto order-1 sm:order-2"
              >
                Next Step
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isSaving}
                className="bg-green-500 hover:bg-green-600 text-white w-full sm:w-auto order-1 sm:order-2"
              >
                {isSaving ? 'Completing...' : 'Complete & Verify'}
              </Button>
            )}
          </div>
        </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WealthOnboardingWizard;
