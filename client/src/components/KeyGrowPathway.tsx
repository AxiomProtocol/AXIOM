import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

// API helper functions
const API_BASE = '/api';

// Get auth token from localStorage
const getAuthToken = () => {
  try {
    const userData = localStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      return parsed.token;
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return null;
};

// API request helper with authentication
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};

// Enhanced error handling hook
const useApiError = () => {
  const [error, setError] = useState<string | null>(null);
  
  const handleError = useCallback((error: Error) => {
    console.error('API Error:', error);
    setError(error.message);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
};

// ===== TYPES AND INTERFACES =====

export interface ReadinessAssessment {
  creditScore: number;
  monthlyIncome: number;
  monthlyDebt: number;
  emergencyFund: number;
  monthlyExpenses: number;
  savingsRate: number;
  isFirstTimeBuyer: boolean;
  hasStableEmployment: boolean;
}

export interface MarketAnalysis {
  zipCode: string;
  averageHomePrice: number;
  averageRent: number;
  appreciationRate: number;
  downPaymentPercent: number;
  loanType: 'conventional' | 'fha' | 'va' | 'usda';
}

export interface SavingsTarget {
  targetHomePrice: number;
  downPaymentAmount: number;
  closingCosts: number;
  movingCosts: number;
  totalNeeded: number;
  currentSavings: number;
  monthlySavings: number;
  monthsToGoal: number;
}

export interface FinancialPreparation {
  creditImprovementPlan: string[];
  debtPayoffStrategy: 'avalanche' | 'snowball';
  emergencyFundGoal: number;
  documentsNeeded: string[];
  monthsToPreApproval: number;
}

export interface PropertySearch {
  location: string;
  priceRange: { min: number; max: number };
  bedrooms: number;
  bathrooms: number;
  propertyType: 'house' | 'condo' | 'townhouse';
  savedProperties: any[];
  searchCriteria: any;
}

export interface RentToOwnOption {
  type: 'traditional' | 'lease-purchase' | 'seller-financing' | 'community-land-trust' | 'shared-equity';
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  requirements: string[];
}

export interface KeyGrowData {
  currentStep: number;
  readinessAssessment: Partial<ReadinessAssessment>;
  marketAnalysis: Partial<MarketAnalysis>;
  savingsTarget: Partial<SavingsTarget>;
  financialPreparation: Partial<FinancialPreparation>;
  propertySearch: Partial<PropertySearch>;
  selectedPathways: RentToOwnOption[];
  readinessScore: number;
  isComplete: boolean;
}

interface KeyGrowPathwayProps {
  isOpen: boolean;
  onClose: () => void;
  userGoal?: {
    targetAmount: number;
    timeframe: string;
  };
}

// ===== COMPONENT DEFINITIONS =====

// Progress Indicator
function ProgressIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = (currentStep / totalSteps) * 100;
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 mb-8">
      <div 
        className="bg-yellow-500 h-3 rounded-full transition-all duration-500" 
        style={{ width: `${progress}%` }}
      />
      <div className="text-center text-sm text-gray-600 mt-3">
        Step {currentStep} of {totalSteps}: {getStepName(currentStep)}
      </div>
    </div>
  );
}

function getStepName(step: number): string {
  const steps = [
    "Readiness Assessment",
    "Market Education", 
    "Savings Calculator",
    "Financial Preparation",
    "Property Search Setup",
    "Pathway Selection"
  ];
  return steps[step - 1] || "Unknown";
}

// Step 1: Readiness Assessment
function ReadinessAssessment({ 
  data, 
  onUpdate, 
  onNext 
}: { 
  data: Partial<ReadinessAssessment>; 
  onUpdate: (data: Partial<ReadinessAssessment>) => void; 
  onNext: () => void; 
}) {
  const [assessment, setAssessment] = useState<Partial<ReadinessAssessment>>(data);
  const [readinessScore, setReadinessScore] = useState(0);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [scoreLevel, setScoreLevel] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const { error, handleError, clearError } = useApiError();

  const updateAssessment = (field: keyof ReadinessAssessment, value: any) => {
    const updated = { ...assessment, [field]: value };
    setAssessment(updated);
    onUpdate(updated);
    
    // Clear previous error when user updates data
    clearError();
    
    // Calculate readiness score via API with debouncing
    if (updated.creditScore && updated.monthlyIncome) {
      calculateReadinessScoreAPI(updated);
    }
  };

  // API call to calculate readiness score
  const calculateReadinessScoreAPI = useCallback(async (data: Partial<ReadinessAssessment>) => {
    if (isCalculating) return; // Prevent multiple simultaneous calls
    
    setIsCalculating(true);
    try {
      const params = new URLSearchParams();
      
      if (data.creditScore) params.append('creditScore', data.creditScore.toString());
      if (data.monthlyIncome) params.append('monthlyIncome', data.monthlyIncome.toString());
      if (data.monthlyDebt) params.append('monthlyDebt', data.monthlyDebt.toString());
      if (data.emergencyFund) params.append('emergencyFund', data.emergencyFund.toString());
      if (data.monthlyExpenses) params.append('monthlyExpenses', data.monthlyExpenses.toString());
      if (data.savingsRate) params.append('savingsRate', data.savingsRate.toString());
      if (data.hasStableEmployment !== undefined) params.append('hasStableEmployment', data.hasStableEmployment.toString());

      const response = await apiRequest(`/keygrow/readiness-score?${params.toString()}`);
      
      if (response.success) {
        setReadinessScore(response.readinessScore);
        setRecommendations(response.recommendations || []);
        setScoreLevel(response.scoreLevel || '');
      }
    } catch (error) {
      handleError(error as Error);
      // Fallback to local calculation on error
      const score = calculateReadinessScoreLocal(data);
      setReadinessScore(score);
      setScoreLevel(score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'developing');
    } finally {
      setIsCalculating(false);
    }
  }, [isCalculating, handleError, clearError]);

  // Fallback local calculation (matches backend logic)
  const calculateReadinessScoreLocal = (data: Partial<ReadinessAssessment>) => {
    let score = 0;

    // Credit Score (30 points)
    if (data.creditScore) {
      if (data.creditScore >= 740) score += 30;
      else if (data.creditScore >= 670) score += 25;
      else if (data.creditScore >= 580) score += 15;
      else if (data.creditScore >= 500) score += 10;
      else score += 5;
    }

    // Debt-to-Income Ratio (25 points)
    if (data.monthlyIncome && data.monthlyIncome > 0 && (data.monthlyDebt || 0) >= 0) {
      const dti = ((data.monthlyDebt || 0) / data.monthlyIncome) * 100;
      if (dti <= 28) score += 25;
      else if (dti <= 36) score += 20;
      else if (dti <= 43) score += 15;
      else if (dti <= 50) score += 10;
      else score += 5;
    }

    // Emergency Fund (20 points)
    if ((data.emergencyFund || 0) >= 0 && data.monthlyExpenses && data.monthlyExpenses > 0) {
      const months = (data.emergencyFund || 0) / data.monthlyExpenses;
      if (months >= 6) score += 20;
      else if (months >= 3) score += 15;
      else if (months >= 1) score += 10;
      else score += 5;
    }

    // Savings Rate (15 points)
    if (data.savingsRate && data.savingsRate >= 0) {
      if (data.savingsRate >= 20) score += 15;
      else if (data.savingsRate >= 15) score += 12;
      else if (data.savingsRate >= 10) score += 10;
      else if (data.savingsRate >= 5) score += 7;
      else score += 3;
    }

    // Employment Stability (10 points)
    if (data.hasStableEmployment) score += 10;

    return Math.min(score, 100);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreDescription = (score: number, level: string) => {
    if (level === 'excellent') return "🎉 Excellent! You're ready to start your homeownership journey.";
    if (level === 'good') return "👍 Good progress! A few improvements will get you ready.";
    return "🌱 Getting started! Let's build a plan to improve your readiness.";
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Are You Ready for Homeownership?
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Let's evaluate your current financial position and create a personalized action plan.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Assessment Form */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Credit Score */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's your approximate credit score?
              </label>
              <select
                value={assessment.creditScore || ''}
                onChange={(e) => updateAssessment('creditScore', Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              >
                <option value="">Select range</option>
                <option value="800">Excellent (740+)</option>
                <option value="700">Good (670-739)</option>
                <option value="625">Fair (580-669)</option>
                <option value="550">Poor (500-579)</option>
                <option value="450">Very Poor (300-499)</option>
                <option value="0">I don't know</option>
              </select>
            </div>

            {/* Monthly Income */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly gross income (before taxes)
              </label>
              <Input
                type="number"
                placeholder="5000"
                value={assessment.monthlyIncome || ''}
                onChange={(e) => updateAssessment('monthlyIncome', Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Monthly Debt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly debt payments (credit cards, loans, etc.)
              </label>
              <Input
                type="number"
                placeholder="800"
                value={assessment.monthlyDebt || ''}
                onChange={(e) => updateAssessment('monthlyDebt', Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Monthly Expenses */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monthly living expenses (rent, utilities, food, etc.)
              </label>
              <Input
                type="number"
                placeholder="3000"
                value={assessment.monthlyExpenses || ''}
                onChange={(e) => updateAssessment('monthlyExpenses', Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Emergency Fund */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency fund amount
              </label>
              <Input
                type="number"
                placeholder="5000"
                value={assessment.emergencyFund || ''}
                onChange={(e) => updateAssessment('emergencyFund', Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Savings Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What percentage of income do you save monthly?
              </label>
              <Input
                type="number"
                placeholder="15"
                value={assessment.savingsRate || ''}
                onChange={(e) => updateAssessment('savingsRate', Number(e.target.value))}
                className="w-full"
                max="100"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assessment.isFirstTimeBuyer || false}
                  onChange={(e) => updateAssessment('isFirstTimeBuyer', e.target.checked)}
                  className="mr-3"
                />
                I am a first-time home buyer
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={assessment.hasStableEmployment || false}
                  onChange={(e) => updateAssessment('hasStableEmployment', e.target.checked)}
                  className="mr-3"
                />
                I have stable employment (2+ years same job/field)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="text-red-800 font-medium mb-2">⚠️ Calculation Error</div>
              <p className="text-red-600 text-sm">{error}</p>
              <button 
                onClick={clearError}
                className="text-red-600 text-sm underline mt-2 hover:text-red-800"
              >
                Dismiss
              </button>
            </CardContent>
          </Card>
        )}

        {/* Score and Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Your Homeownership Readiness Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              {isCalculating ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                  <div className="text-blue-600 text-sm">🔄 Analyzing your financial profile...</div>
                </div>
              ) : (
                <>
                  <div className={cn("text-6xl font-bold mb-2", getScoreColor(readinessScore))}>
                    {readinessScore}
                  </div>
                  <div className="text-lg text-gray-600 mb-4">
                    {getScoreDescription(readinessScore, scoreLevel)}
                  </div>
                  
                  {/* Visual Score Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
                    <div 
                      className={cn(
                        "h-4 rounded-full transition-all duration-500",
                        readinessScore >= 80 ? "bg-green-500" :
                        readinessScore >= 60 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ width: `${readinessScore}%` }}
                    />
                  </div>
                </>
              )}
            </div>

            {/* API-driven Recommendations */}
            {recommendations.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">📋 Your Personalized Action Plan:</h4>
                <div className="space-y-3">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-gray-700 text-sm leading-relaxed">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DTI Calculation Display */}
            {assessment.monthlyIncome && assessment.monthlyDebt && (
              <div className="mt-4 p-3 bg-blue-50 rounded-md">
                <div className="text-sm font-medium text-blue-800">
                  Your Debt-to-Income Ratio: {((assessment.monthlyDebt / assessment.monthlyIncome) * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-blue-600">
                  Lenders prefer DTI below 43% for conventional loans
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center">
        <Button 
          onClick={onNext}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold px-8 py-3"
          disabled={readinessScore === 0}
        >
          Continue to Market Analysis
        </Button>
      </div>
    </div>
  );
}

// Step 2: Market Education 
function MarketEducation({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}: { 
  data: Partial<MarketAnalysis>; 
  onUpdate: (data: Partial<MarketAnalysis>) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) {
  const [analysis, setAnalysis] = useState<Partial<MarketAnalysis>>(data);
  const [marketData, setMarketData] = useState<any>(null);

  const updateAnalysis = (field: keyof MarketAnalysis, value: any) => {
    const updated = { ...analysis, [field]: value };
    setAnalysis(updated);
    onUpdate(updated);
  };

  // Simulate market data lookup
  const fetchMarketData = async (zipCode: string) => {
    // In production, this would connect to real estate APIs
    // For now, simulate with realistic data
    const mockData = {
      zipCode,
      averageHomePrice: 350000 + Math.random() * 200000,
      averageRent: 1500 + Math.random() * 1000,
      appreciationRate: 2 + Math.random() * 6,
      neighborhoods: [
        { name: 'Downtown', avgPrice: 450000, walkScore: 85 },
        { name: 'Suburbs', avgPrice: 320000, walkScore: 45 },
        { name: 'Family District', avgPrice: 380000, walkScore: 60 },
      ]
    };
    setMarketData(mockData);
    updateAnalysis('averageHomePrice', mockData.averageHomePrice);
    updateAnalysis('averageRent', mockData.averageRent);
    updateAnalysis('appreciationRate', mockData.appreciationRate);
  };

  const calculateAffordability = () => {
    // Simple affordability calculation based on 28% rule
    const monthlyIncome = 5000; // This would come from previous step
    const maxMonthlyPayment = monthlyIncome * 0.28;
    const estimatedTaxesInsurance = 400; // Rough estimate
    const maxPrincipalInterest = maxMonthlyPayment - estimatedTaxesInsurance;
    
    // Assuming 6.5% interest rate, 30-year loan
    const monthlyRate = 0.065 / 12;
    const months = 30 * 12;
    const maxLoanAmount = maxPrincipalInterest * ((1 - Math.pow(1 + monthlyRate, -months)) / monthlyRate);
    
    return {
      maxMonthlyPayment,
      maxLoanAmount,
      maxHomePrice: maxLoanAmount / 0.8 // Assuming 20% down
    };
  };

  const affordability = calculateAffordability();

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Understanding Your Local Market
        </h2>
        <p className="text-lg text-gray-600">
          Knowledge is power when it comes to buying a home. Let's explore your local market.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Market Search */}
        <Card>
          <CardHeader>
            <CardTitle>Market Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What area are you interested in? (ZIP Code)
              </label>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="90210"
                  value={analysis.zipCode || ''}
                  onChange={(e) => updateAnalysis('zipCode', e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={() => analysis.zipCode && fetchMarketData(analysis.zipCode)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                >
                  Analyze
                </Button>
              </div>
            </div>

            {marketData && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-sm text-green-600 font-medium">Average Home Price</div>
                    <div className="text-2xl font-bold text-green-700">
                      ${marketData.averageHomePrice.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium">Average Rent</div>
                    <div className="text-2xl font-bold text-blue-700">
                      ${marketData.averageRent.toLocaleString()}/mo
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 font-medium">Historical Appreciation</div>
                  <div className="text-xl font-bold text-yellow-700">
                    {marketData.appreciationRate.toFixed(1)}% per year
                  </div>
                  <div className="text-xs text-yellow-600 mt-1">
                    Based on 10-year average
                  </div>
                </div>

                {/* Neighborhoods */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Popular Neighborhoods:</h4>
                  <div className="space-y-2">
                    {marketData.neighborhoods.map((neighborhood: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{neighborhood.name}</div>
                          <div className="text-sm text-gray-600">Walk Score: {neighborhood.walkScore}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${neighborhood.avgPrice.toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Loan Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred loan type
              </label>
              <select
                value={analysis.loanType || 'conventional'}
                onChange={(e) => updateAnalysis('loanType', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              >
                <option value="conventional">Conventional (5-20% down)</option>
                <option value="fha">FHA (3.5% down, easier qualification)</option>
                <option value="va">VA (0% down, veterans only)</option>
                <option value="usda">USDA (0% down, rural areas)</option>
              </select>
            </div>

            {/* Down Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target down payment percentage
              </label>
              <select
                value={analysis.downPaymentPercent || 20}
                onChange={(e) => updateAnalysis('downPaymentPercent', Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
              >
                <option value={5}>5% - Lower upfront cost, higher monthly payment</option>
                <option value={10}>10% - Balanced approach</option>
                <option value={20}>20% - No PMI, lower monthly payment</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Affordability Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>What Can You Afford?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-lg text-gray-600 mb-4">
                  Based on 28% of gross income rule
                </div>
                
                <div className="bg-green-50 p-6 rounded-lg mb-4">
                  <div className="text-sm text-green-600 font-medium">Maximum Home Price</div>
                  <div className="text-3xl font-bold text-green-700 mb-2">
                    ${affordability.maxHomePrice.toLocaleString()}
                  </div>
                  <div className="text-sm text-green-600">
                    Monthly payment: ${affordability.maxMonthlyPayment.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Rent vs Buy Comparison */}
              {marketData && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Rent vs. Buy Analysis</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-sm text-blue-600 font-medium">Renting</div>
                      <div className="text-xl font-bold text-blue-700">
                        ${marketData.averageRent.toLocaleString()}/mo
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        + No maintenance costs<br/>
                        - No equity building
                      </div>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-600 font-medium">Buying</div>
                      <div className="text-xl font-bold text-green-700">
                        ${(affordability.maxMonthlyPayment).toLocaleString()}/mo
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        + Building equity<br/>
                        + Tax benefits
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Market Insights */}
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">💡 Market Insights</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Properties in this area appreciate {marketData && marketData.appreciationRate ? marketData.appreciationRate.toFixed(1) : '0'}% annually</li>
                  <li>• First-time buyer programs may offer down payment assistance</li>
                  <li>• Consider total monthly costs including HOA, taxes, insurance</li>
                  <li>• Budget 1-3% of home value annually for maintenance</li>
                </ul>
              </div>

              {/* Mortgage Payment Breakdown */}
              {analysis.averageHomePrice && analysis.downPaymentPercent && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Monthly Payment Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Principal & Interest:</span>
                      <span>${(affordability.maxMonthlyPayment * 0.7).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Property Taxes:</span>
                      <span>${(affordability.maxMonthlyPayment * 0.15).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insurance:</span>
                      <span>${(affordability.maxMonthlyPayment * 0.1).toLocaleString()}</span>
                    </div>
                    {analysis.downPaymentPercent && analysis.downPaymentPercent < 20 && (
                      <div className="flex justify-between">
                        <span>PMI:</span>
                        <span>${(affordability.maxMonthlyPayment * 0.05).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 font-semibold flex justify-between">
                      <span>Total:</span>
                      <span>${affordability.maxMonthlyPayment.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Assessment
        </Button>
        <Button 
          onClick={onNext}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          disabled={!analysis.zipCode}
        >
          Continue to Savings Calculator
        </Button>
      </div>
    </div>
  );
}

// Step 3: Savings Target Calculator
function SavingsCalculator({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}: { 
  data: Partial<SavingsTarget>; 
  onUpdate: (data: Partial<SavingsTarget>) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) {
  const [savings, setSavings] = useState<Partial<SavingsTarget>>(data);

  const updateSavings = (field: keyof SavingsTarget, value: any) => {
    const updated = { ...savings, [field]: value };
    setSavings(updated);
    onUpdate(updated);
    calculateTimeline(updated);
  };

  const calculateTimeline = (data: Partial<SavingsTarget>) => {
    if (data.totalNeeded && data.currentSavings !== undefined && data.monthlySavings && data.monthlySavings > 0) {
      const remaining = data.totalNeeded - data.currentSavings;
      const months = Math.ceil(remaining / data.monthlySavings);
      
      // Update state directly without calling updateSavings to avoid recursion
      const updated = { ...data, monthsToGoal: months };
      setSavings(updated);
      onUpdate(updated);
    }
  };

  // Auto-calculate costs when target home price changes
  useEffect(() => {
    if (savings.targetHomePrice) {
      const downPayment = savings.targetHomePrice * 0.2; // 20% default
      const closingCosts = savings.targetHomePrice * 0.03; // 3% estimate
      const movingCosts = 3000; // Fixed estimate
      const total = downPayment + closingCosts + movingCosts;
      
      setSavings(prev => ({
        ...prev,
        downPaymentAmount: downPayment,
        closingCosts,
        movingCosts,
        totalNeeded: total
      }));
      onUpdate({
        ...savings,
        downPaymentAmount: downPayment,
        closingCosts,
        movingCosts,
        totalNeeded: total
      });
    }
  }, [savings.targetHomePrice]);

  const getSavingsProgress = () => {
    if (!savings.currentSavings || !savings.totalNeeded) return 0;
    return Math.min((savings.currentSavings / savings.totalNeeded) * 100, 100);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Calculate Your Savings Target
        </h2>
        <p className="text-lg text-gray-600">
          Let's figure out exactly how much you need to save and create a realistic timeline.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Savings Calculator */}
        <Card>
          <CardHeader>
            <CardTitle>Target Home & Costs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target home price
              </label>
              <Input
                type="number"
                placeholder="350000"
                value={savings.targetHomePrice || ''}
                onChange={(e) => updateSavings('targetHomePrice', Number(e.target.value))}
                className="w-full"
              />
            </div>

            {savings.targetHomePrice && (
              <div className="space-y-4">
                {/* Cost Breakdown */}
                <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-gray-900">Cost Breakdown</h4>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Down Payment (20%):</span>
                    <span className="font-semibold">${savings.downPaymentAmount?.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Closing Costs (3%):</span>
                    <span className="font-semibold">${savings.closingCosts?.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Moving & Setup:</span>
                    <span className="font-semibold">${savings.movingCosts?.toLocaleString()}</span>
                  </div>
                  
                  <div className="border-t pt-3 flex justify-between text-lg">
                    <span className="font-semibold text-gray-900">Total Needed:</span>
                    <span className="font-bold text-green-600">${savings.totalNeeded?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Current Savings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current savings for home purchase
                  </label>
                  <Input
                    type="number"
                    placeholder="15000"
                    value={savings.currentSavings || ''}
                    onChange={(e) => updateSavings('currentSavings', Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Monthly Savings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How much can you save monthly?
                  </label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={savings.monthlySavings || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        updateSavings('monthlySavings', 0);
                      } else {
                        const numValue = Number(value);
                        if (!isNaN(numValue) && numValue >= 0) {
                          updateSavings('monthlySavings', numValue);
                        }
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline & Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Your Savings Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {savings.totalNeeded && savings.currentSavings !== undefined && (
              <div className="space-y-6">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Progress to Goal</span>
                    <span className="text-sm font-medium">{getSavingsProgress().toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-500 h-4 rounded-full transition-all duration-500"
                      style={{ width: `${getSavingsProgress()}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-gray-600">
                    <span>${savings.currentSavings?.toLocaleString()}</span>
                    <span>${savings.totalNeeded?.toLocaleString()}</span>
                  </div>
                </div>

                {/* Timeline Display */}
                {savings.monthsToGoal && (
                  <div className="text-center bg-blue-50 p-6 rounded-lg">
                    <div className="text-sm text-blue-600 font-medium mb-2">Time to Goal</div>
                    <div className="text-3xl font-bold text-blue-700 mb-2">
                      {Math.floor(savings.monthsToGoal / 12)} years {savings.monthsToGoal % 12} months
                    </div>
                    <div className="text-sm text-blue-600">
                      Saving ${savings.monthlySavings?.toLocaleString()}/month
                    </div>
                  </div>
                )}

                {/* Scenarios */}
                {savings.monthlySavings && savings.totalNeeded && savings.currentSavings !== undefined && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">What if scenarios:</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Save $200 more/month', extra: 200 },
                        { label: 'Save $500 more/month', extra: 500 },
                        { label: 'Consider 10% down payment', downPercent: 10 }
                      ].map((scenario, index) => {
                        let timelineDiff;
                        if (scenario.extra) {
                          const newMonthlySavings = savings.monthlySavings! + scenario.extra;
                          const remaining = savings.totalNeeded - savings.currentSavings;
                          const newMonths = Math.ceil(remaining / newMonthlySavings);
                          timelineDiff = savings.monthsToGoal! - newMonths;
                        } else if (scenario.downPercent && savings.targetHomePrice) {
                          const newDownPayment = savings.targetHomePrice * (scenario.downPercent / 100);
                          const newTotal = newDownPayment + savings.closingCosts! + savings.movingCosts!;
                          const remaining = newTotal - savings.currentSavings;
                          const newMonths = Math.ceil(remaining / savings.monthlySavings!);
                          timelineDiff = savings.monthsToGoal! - newMonths;
                        }

                        return (
                          <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">{scenario.label}</span>
                            <span className="text-sm font-semibold text-green-600">
                              -{timelineDiff} months
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Savings Tips */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">💰 Savings Tips</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li>• Set up automatic transfers to a dedicated home fund</li>
                    <li>• Consider high-yield savings accounts for better returns</li>
                    <li>• Look into first-time buyer assistance programs</li>
                    <li>• Track progress monthly to stay motivated</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Market Analysis
        </Button>
        <Button 
          onClick={onNext}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          disabled={!savings.targetHomePrice || !savings.monthlySavings}
        >
          Continue to Financial Preparation
        </Button>
      </div>
    </div>
  );
}

// Step 4: Financial Preparation
function FinancialPreparation({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}: { 
  data: Partial<FinancialPreparation>; 
  onUpdate: (data: Partial<FinancialPreparation>) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) {
  const [preparation, setPreparation] = useState<Partial<FinancialPreparation>>(data);

  const updatePreparation = (field: keyof FinancialPreparation, value: any) => {
    const updated = { ...preparation, [field]: value };
    setPreparation(updated);
    onUpdate(updated);
  };

  const creditImprovementStrategies = [
    "Pay all bills on time - payment history is 35% of your score",
    "Pay down credit card balances to below 30% utilization",
    "Don't close old credit cards - length of credit history matters",
    "Check credit reports for errors and dispute them",
    "Consider becoming an authorized user on someone's good account",
    "Limit new credit applications until after home purchase"
  ];

  const requiredDocuments = [
    "Last 2 years of tax returns",
    "Last 2 months of pay stubs",
    "Last 2 months of bank statements",
    "Employment verification letter",
    "List of assets and liabilities",
    "Gift letter if receiving down payment assistance",
    "Retirement account statements",
    "Documentation of other income sources"
  ];

  const getDebtPayoffTimeline = (strategy: 'avalanche' | 'snowball') => {
    // Mock calculation - in real app, this would use actual debt data
    const mockDebts = [
      { name: 'Credit Card 1', balance: 3000, rate: 18.99, minPayment: 75 },
      { name: 'Credit Card 2', balance: 1500, rate: 24.99, minPayment: 45 },
      { name: 'Student Loan', balance: 15000, rate: 6.5, minPayment: 180 }
    ];

    // Simplified calculation
    const totalDebt = mockDebts.reduce((sum, debt) => sum + debt.balance, 0);
    const totalMinPayments = mockDebts.reduce((sum, debt) => sum + debt.minPayment, 0);
    const extraPayment = 200; // Assume $200 extra per month
    
    const avgRate = strategy === 'avalanche' ? 
      mockDebts.reduce((sum, debt) => sum + (debt.rate * debt.balance), 0) / totalDebt :
      10; // Simplified for snowball

    // Very simplified timeline calculation
    const monthsToPayoff = Math.ceil(totalDebt / (totalMinPayments + extraPayment));
    return { months: monthsToPayoff, totalDebt, monthlyPayment: totalMinPayments + extraPayment };
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Get Your Finances Ready
        </h2>
        <p className="text-lg text-gray-600">
          Let's create an action plan to strengthen your financial position for homeownership.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Credit Improvement Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Credit Improvement Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3">🎯 Credit Score Goals</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>FHA Loan (3.5% down):</span>
                  <span className="font-semibold">580+</span>
                </div>
                <div className="flex justify-between">
                  <span>Conventional (5% down):</span>
                  <span className="font-semibold">620+</span>
                </div>
                <div className="flex justify-between">
                  <span>Best rates (20% down):</span>
                  <span className="font-semibold">740+</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Action Steps:</h4>
              <div className="space-y-3">
                {creditImprovementStrategies.map((strategy, index) => (
                  <label key={index} className="flex items-start">
                    <input
                      type="checkbox"
                      className="mt-1 mr-3"
                      onChange={(e) => {
                        const currentPlan = preparation.creditImprovementPlan || [];
                        if (e.target.checked) {
                          updatePreparation('creditImprovementPlan', [...currentPlan, strategy]);
                        } else {
                          updatePreparation('creditImprovementPlan', currentPlan.filter(s => s !== strategy));
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">{strategy}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">💡 Pro Tips</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Get free credit reports from annualcreditreport.com</li>
                <li>• Use apps like Credit Karma or Credit Sesame for monitoring</li>
                <li>• Be patient - credit improvement takes 3-6 months to show</li>
                <li>• Consider credit builder loans if starting from scratch</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Debt Payoff Strategy */}
        <Card>
          <CardHeader>
            <CardTitle>Debt Payoff Strategy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose your debt payoff method:
              </label>
              <div className="space-y-3">
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payoffStrategy"
                    value="avalanche"
                    checked={preparation.debtPayoffStrategy === 'avalanche'}
                    onChange={(e) => updatePreparation('debtPayoffStrategy', e.target.value as 'avalanche')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Debt Avalanche</div>
                    <div className="text-sm text-gray-600">
                      Pay minimums on all debts, put extra money toward highest interest rate debt.
                      <span className="text-green-600 font-medium"> Saves most money.</span>
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="payoffStrategy"
                    value="snowball"
                    checked={preparation.debtPayoffStrategy === 'snowball'}
                    onChange={(e) => updatePreparation('debtPayoffStrategy', e.target.value as 'snowball')}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">Debt Snowball</div>
                    <div className="text-sm text-gray-600">
                      Pay minimums on all debts, put extra money toward smallest balance first.
                      <span className="text-blue-600 font-medium"> Builds momentum.</span>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {preparation.debtPayoffStrategy && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-3">Your Debt Payoff Timeline</h4>
                {(() => {
                  const timeline = getDebtPayoffTimeline(preparation.debtPayoffStrategy);
                  return (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Estimated payoff time:</span>
                        <span className="font-semibold">{timeline.months} months</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total debt:</span>
                        <span className="font-semibold">${timeline.totalDebt.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Monthly payment:</span>
                        <span className="font-semibold">${timeline.monthlyPayment.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Emergency Fund Calculator */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target emergency fund (monthly expenses × 6)
              </label>
              <Input
                type="number"
                placeholder="18000"
                value={preparation.emergencyFundGoal || ''}
                onChange={(e) => updatePreparation('emergencyFundGoal', Number(e.target.value))}
                className="w-full"
              />
              {preparation.emergencyFundGoal && (
                <div className="mt-2 text-sm text-gray-600">
                  Save ${(preparation.emergencyFundGoal / 6).toLocaleString()}/month to build this in 6 months
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Preparation */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Approval Document Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Required Documents:</h4>
              <div className="space-y-2">
                {requiredDocuments.map((doc, index) => (
                  <label key={index} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-3"
                      onChange={(e) => {
                        const currentDocs = preparation.documentsNeeded || [];
                        if (e.target.checked) {
                          updatePreparation('documentsNeeded', [...currentDocs, doc]);
                        } else {
                          updatePreparation('documentsNeeded', currentDocs.filter(d => d !== doc));
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">{doc}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">📋 Document Tips</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• Organize documents in a dedicated folder</li>
                  <li>• Get recent documents closer to application time</li>
                  <li>• Keep digital copies backed up</li>
                  <li>• Be prepared to explain any unusual transactions</li>
                  <li>• Don't make large deposits without documentation</li>
                </ul>
              </div>

              {/* Timeline to Pre-Approval */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated months until ready for pre-approval:
                </label>
                <select
                  value={preparation.monthsToPreApproval || ''}
                  onChange={(e) => updatePreparation('monthsToPreApproval', Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Select timeline</option>
                  <option value={1}>1 month - Ready now</option>
                  <option value={3}>3 months - Minor improvements needed</option>
                  <option value={6}>6 months - Moderate preparation required</option>
                  <option value={12}>12 months - Significant work needed</option>
                  <option value={24}>2+ years - Major financial overhaul</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Savings Calculator
        </Button>
        <Button 
          onClick={onNext}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          disabled={!preparation.debtPayoffStrategy}
        >
          Continue to Property Search
        </Button>
      </div>
    </div>
  );
}

// Step 5: Property Search Integration
function PropertySearchSetup({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}: { 
  data: Partial<PropertySearch>; 
  onUpdate: (data: Partial<PropertySearch>) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) {
  const [search, setSearch] = useState<Partial<PropertySearch>>(data);

  const updateSearch = (field: keyof PropertySearch, value: any) => {
    const updated = { ...search, [field]: value };
    setSearch(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Set Up Your Property Search
        </h2>
        <p className="text-lg text-gray-600">
          Define your search criteria so we can help you find the perfect home when you're ready.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Search Criteria */}
        <Card>
          <CardHeader>
            <CardTitle>Search Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred location (city, neighborhood, or ZIP)
              </label>
              <Input
                type="text"
                placeholder="e.g., Austin, TX or 78701"
                value={search.location || ''}
                onChange={(e) => updateSearch('location', e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  placeholder="Min price"
                  value={search.priceRange?.min || ''}
                  onChange={(e) => updateSearch('priceRange', { 
                    ...search.priceRange, 
                    min: Number(e.target.value) 
                  })}
                />
                <Input
                  type="number"
                  placeholder="Max price"
                  value={search.priceRange?.max || ''}
                  onChange={(e) => updateSearch('priceRange', { 
                    ...search.priceRange, 
                    max: Number(e.target.value) 
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrooms
                </label>
                <select
                  value={search.bedrooms || ''}
                  onChange={(e) => updateSearch('bedrooms', Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Any</option>
                  <option value={1}>1+</option>
                  <option value={2}>2+</option>
                  <option value={3}>3+</option>
                  <option value={4}>4+</option>
                  <option value={5}>5+</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathrooms
                </label>
                <select
                  value={search.bathrooms || ''}
                  onChange={(e) => updateSearch('bathrooms', Number(e.target.value))}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-yellow-500 focus:border-yellow-500"
                >
                  <option value="">Any</option>
                  <option value={1}>1+</option>
                  <option value={2}>2+</option>
                  <option value={3}>3+</option>
                  <option value={4}>4+</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['house', 'condo', 'townhouse'].map((type) => (
                  <label key={type} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="propertyType"
                      value={type}
                      checked={search.propertyType === type}
                      onChange={(e) => updateSearch('propertyType', e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Property Search Tools</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3">🔍 Coming Soon</h4>
              <p className="text-sm text-blue-700 mb-3">
                We're building integrations with top real estate platforms to streamline your search:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Live property listings from MLS</li>
                <li>• Saved searches with email alerts</li>
                <li>• Neighborhood analysis tools</li>
                <li>• School district information</li>
                <li>• Commute time calculators</li>
              </ul>
            </div>

            {/* Mock Search Results */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Sample Properties in Your Area</h4>
              <div className="space-y-3">
                {[
                  { address: '123 Oak Street', price: 345000, beds: 3, baths: 2, sqft: 1500 },
                  { address: '456 Pine Avenue', price: 389000, beds: 4, baths: 2, sqft: 1750 },
                  { address: '789 Maple Drive', price: 425000, beds: 3, baths: 3, sqft: 1650 }
                ].map((property, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-gray-900">{property.address}</div>
                        <div className="text-sm text-gray-600">
                          {property.beds} bed • {property.baths} bath • {property.sqft.toLocaleString()} sqft
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">${property.price.toLocaleString()}</div>
                        <Button size="sm" variant="outline" className="mt-1">
                          Save
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Neighborhood Factors */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">📍 Location Factors to Consider</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• Commute time to work/family</li>
                <li>• School district ratings (if applicable)</li>
                <li>• Future development plans</li>
                <li>• Crime rates and safety</li>
                <li>• Access to amenities (shopping, healthcare)</li>
                <li>• Public transportation options</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Features Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Search Features (Coming Soon)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🎯</div>
              <h4 className="font-semibold text-gray-900 mb-2">Smart Matching</h4>
              <p className="text-sm text-gray-600">
                AI-powered recommendations based on your preferences and financial profile
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">📊</div>
              <h4 className="font-semibold text-gray-900 mb-2">Market Analysis</h4>
              <p className="text-sm text-gray-600">
                Real-time pricing trends and appreciation forecasts for each property
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h4 className="font-semibold text-gray-900 mb-2">Agent Network</h4>
              <p className="text-sm text-gray-600">
                Connect with vetted real estate agents who specialize in your price range
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Financial Preparation
        </Button>
        <Button 
          onClick={onNext}
          className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
          disabled={!search.location}
        >
          Continue to Pathway Options
        </Button>
      </div>
    </div>
  );
}

// Step 6: Rent-to-Own Pathway Options
function PathwayOptions({ 
  data, 
  onUpdate, 
  onNext, 
  onBack 
}: { 
  data: RentToOwnOption[]; 
  onUpdate: (data: RentToOwnOption[]) => void; 
  onNext: () => void; 
  onBack: () => void; 
}) {
  const [selectedPathways, setSelectedPathways] = useState<RentToOwnOption[]>(data);

  const pathwayOptions: RentToOwnOption[] = [
    {
      type: 'traditional',
      title: 'Traditional Rent-to-Own',
      description: 'Classic rent-to-own agreement where you rent with option to buy',
      pros: [
        'Test drive the home before buying',
        'Portion of rent may go toward purchase',
        'Time to improve credit and save',
        'Lock in purchase price today'
      ],
      cons: [
        'Higher monthly payments than typical rent',
        'Risk losing option fee if you don\'t buy',
        'Responsible for maintenance costs',
        'Limited inventory available'
      ],
      bestFor: 'Buyers who need time to improve credit or save for down payment',
      requirements: [
        'Option fee (typically 2-7% of home price)',
        'Proof of income',
        'Background check',
        'Agreement to maintain property'
      ]
    },
    {
      type: 'lease-purchase',
      title: 'Lease-Purchase Agreement',
      description: 'Legally binding agreement to purchase at end of lease term',
      pros: [
        'Guaranteed purchase (can\'t back out)',
        'Rent credits toward down payment',
        'Build equity while renting',
        'Protection from market price increases'
      ],
      cons: [
        'Must purchase even if circumstances change',
        'Still need financing at end of term',
        'Limited ability to walk away',
        'May pay above market rent'
      ],
      bestFor: 'Committed buyers who know they want the specific property',
      requirements: [
        'Strong commitment to purchase',
        'Stable income',
        'Good rental history',
        'Financial counseling recommended'
      ]
    },
    {
      type: 'seller-financing',
      title: 'Owner/Seller Financing',
      description: 'Property owner acts as the bank, you make payments directly to them',
      pros: [
        'Flexible down payment requirements',
        'Faster closing process',
        'No bank approval needed',
        'Negotiable terms'
      ],
      cons: [
        'Higher interest rates typically',
        'Shorter loan terms often',
        'Due diligence on seller required',
        'Limited legal protections'
      ],
      bestFor: 'Buyers with unique financial situations or credit challenges',
      requirements: [
        'Motivated seller willing to finance',
        'Down payment (amount negotiable)',
        'Property appraisal',
        'Legal documentation'
      ]
    },
    {
      type: 'community-land-trust',
      title: 'Community Land Trust',
      description: 'Nonprofit organization owns land, you own the house',
      pros: [
        'Permanently affordable housing',
        'Lower purchase prices',
        'Community support and education',
        'Protection from gentrification'
      ],
      cons: [
        'Limited appreciation potential',
        'Resale restrictions apply',
        'Geographic availability limited',
        'May have income requirements'
      ],
      bestFor: 'First-time buyers seeking long-term affordable homeownership',
      requirements: [
        'Income qualifications',
        'Homebuyer education completion',
        'Commitment to community',
        'Location must have CLT program'
      ]
    },
    {
      type: 'shared-equity',
      title: 'Shared Equity Programs',
      description: 'Government or nonprofit helps with down payment in exchange for equity share',
      pros: [
        'Significantly reduced down payment',
        'Lower monthly payments',
        'Government backing/support',
        'Path to full ownership'
      ],
      cons: [
        'Share appreciation with partner',
        'Strict income requirements',
        'Limited geographic availability',
        'Complex repayment terms'
      ],
      bestFor: 'First-time buyers in participating markets with moderate income',
      requirements: [
        'Income within specified limits',
        'First-time buyer status',
        'Homebuyer education',
        'Primary residence requirement'
      ]
    }
  ];

  const togglePathway = (pathway: RentToOwnOption) => {
    const isSelected = selectedPathways.some(p => p.type === pathway.type);
    let updated;
    
    if (isSelected) {
      updated = selectedPathways.filter(p => p.type !== pathway.type);
    } else {
      updated = [...selectedPathways, pathway];
    }
    
    setSelectedPathways(updated);
    onUpdate(updated);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Choose Your Path to Ownership
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Explore different routes to homeownership. Each path has unique benefits and requirements.
        </p>
      </div>

      <div className="grid gap-6">
        {pathwayOptions.map((pathway) => {
          const isSelected = selectedPathways.some(p => p.type === pathway.type);
          
          return (
            <Card 
              key={pathway.type}
              className={cn(
                "cursor-pointer transition-all duration-200",
                isSelected 
                  ? "border-yellow-500 bg-yellow-50 shadow-lg" 
                  : "border-gray-200 hover:border-yellow-500 hover:shadow-md"
              )}
              onClick={() => togglePathway(pathway)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {pathway.title}
                    </h3>
                    <p className="text-gray-600">{pathway.description}</p>
                  </div>
                  <div className={cn(
                    "ml-4 w-6 h-6 rounded-full border-2 flex items-center justify-center",
                    isSelected 
                      ? "border-yellow-500 bg-yellow-500" 
                      : "border-gray-300"
                  )}>
                    {isSelected && <span className="text-white text-sm">✓</span>}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Pros and Cons */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-green-700 mb-2">✅ Advantages</h4>
                      <ul className="space-y-1">
                        {pathway.pros.map((pro, index) => (
                          <li key={index} className="text-sm text-gray-700">• {pro}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-red-700 mb-2">⚠️ Considerations</h4>
                      <ul className="space-y-1">
                        {pathway.cons.map((con, index) => (
                          <li key={index} className="text-sm text-gray-700">• {con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Best For and Requirements */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-blue-700 mb-2">👤 Best For</h4>
                      <p className="text-sm text-gray-700">{pathway.bestFor}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-purple-700 mb-2">📋 Requirements</h4>
                      <ul className="space-y-1">
                        {pathway.requirements.map((req, index) => (
                          <li key={index} className="text-sm text-gray-700">• {req}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedPathways.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3">
              Your Selected Pathways ({selectedPathways.length})
            </h3>
            <div className="space-y-2">
              {selectedPathways.map((pathway) => (
                <div key={pathway.type} className="flex items-center justify-between">
                  <span className="text-green-700 font-medium">{pathway.title}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePathway(pathway);
                    }}
                    className="text-green-700 border-green-300 hover:bg-green-100"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-100 rounded-md">
              <p className="text-sm text-green-800">
                💡 We'll help you explore these pathways further and connect you with resources when you're ready to move forward.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources & Support</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">📚</div>
              <h4 className="font-semibold text-gray-900 mb-2">Education Center</h4>
              <p className="text-sm text-gray-600">
                Free courses on homebuying, credit repair, and financial planning
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">👥</div>
              <h4 className="font-semibold text-gray-900 mb-2">Support Community</h4>
              <p className="text-sm text-gray-600">
                Connect with others on similar journeys for advice and encouragement
              </p>
            </div>
            
            <div className="text-center">
              <div className="text-4xl mb-3">🏦</div>
              <h4 className="font-semibold text-gray-900 mb-2">Lender Network</h4>
              <p className="text-sm text-gray-600">
                Access to credit unions and community lenders with flexible programs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back to Property Search
        </Button>
        <Button 
          onClick={onNext}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold"
          disabled={selectedPathways.length === 0}
        >
          Complete KeyGrow Setup
        </Button>
      </div>
    </div>
  );
}

// Main KeyGrow Pathway Component
export default function KeyGrowPathway({ isOpen, onClose, userGoal }: KeyGrowPathwayProps) {
  const [keyGrowData, setKeyGrowData] = useState<KeyGrowData>({
    currentStep: 1,
    readinessAssessment: {},
    marketAnalysis: {},
    savingsTarget: {},
    financialPreparation: {},
    propertySearch: {},
    selectedPathways: [],
    readinessScore: 0,
    isComplete: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { error, handleError, clearError } = useApiError();

  // Check authentication status
  useEffect(() => {
    const token = getAuthToken();
    setIsAuthenticated(!!token);
  }, []);

  // Load progress from API on mount
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      loadProgress();
    } else if (isOpen && !isAuthenticated) {
      // Load from localStorage as fallback for unauthenticated users
      loadFromLocalStorage();
    }
  }, [isOpen, isAuthenticated]);

  // Load progress from backend API
  const loadProgress = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/keygrow/progress');
      
      if (response.success && response.progress) {
        const progress = response.progress;
        
        // Map API response to component state
        setKeyGrowData({
          currentStep: progress.currentStep || 1,
          readinessAssessment: {
            creditScore: progress.creditScore,
            monthlyIncome: progress.monthlyIncome,
            monthlyDebt: progress.monthlyDebt,
            emergencyFund: progress.emergencyFund,
            monthlyExpenses: progress.monthlyExpenses,
            savingsRate: progress.savingsRate,
            isFirstTimeBuyer: progress.isFirstTimeBuyer,
            hasStableEmployment: progress.hasStableEmployment
          },
          marketAnalysis: {
            zipCode: progress.targetZipCode,
            averageHomePrice: progress.targetHomePrice,
            downPaymentPercent: progress.downPaymentPercent,
            loanType: progress.loanType || 'conventional'
          },
          savingsTarget: {
            targetHomePrice: progress.targetHomePrice,
            currentSavings: 0, // TODO: Add to API if needed
            monthlySavings: 0 // TODO: Add to API if needed
          },
          financialPreparation: {},
          propertySearch: {
            location: progress.preferredLocation,
            priceRange: { 
              min: progress.priceRangeMin || 0, 
              max: progress.priceRangeMax || 1000000 
            },
            bedrooms: progress.bedrooms || 2,
            bathrooms: progress.bathrooms || 2,
            propertyType: progress.preferredPropertyType || 'house',
            savedProperties: [],
            searchCriteria: {}
          },
          selectedPathways: [],
          readinessScore: progress.readinessScore || 0,
          isComplete: progress.status === 'completed'
        });

        console.log('✅ KeyGrow progress loaded from API');
      } else {
        console.log('🆕 No existing progress found, starting fresh');
        // If userGoal is provided from onboarding, integrate it
        if (userGoal) {
          setKeyGrowData(prev => ({
            ...prev,
            savingsTarget: {
              ...prev.savingsTarget,
              targetHomePrice: userGoal.targetAmount,
              // Parse timeframe to months
              monthsToGoal: parseTimeframeToMonths(userGoal.timeframe)
            }
          }));
        }
      }
    } catch (error) {
      handleError(error as Error);
      console.log('⚠️ Failed to load from API, falling back to localStorage');
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback to localStorage for unauthenticated users
  const loadFromLocalStorage = () => {
    try {
      const savedData = localStorage.getItem('keyGrowData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setKeyGrowData(parsed);
        console.log('📱 KeyGrow data loaded from localStorage');
      } else if (userGoal) {
        // Integrate onboarding goal even for unauthenticated users
        setKeyGrowData(prev => ({
          ...prev,
          savingsTarget: {
            ...prev.savingsTarget,
            targetHomePrice: userGoal.targetAmount,
            monthsToGoal: parseTimeframeToMonths(userGoal.timeframe)
          }
        }));
      }
    } catch (error) {
      console.error('Error loading KeyGrow data from localStorage:', error);
    }
  };

  // Parse timeframe string to months
  const parseTimeframeToMonths = (timeframe: string): number => {
    if (timeframe.includes('6 months')) return 6;
    if (timeframe.includes('1 year')) return 12;
    if (timeframe.includes('2 years')) return 24;
    if (timeframe.includes('3 years')) return 36;
    if (timeframe.includes('5 years')) return 60;
    return 24; // Default to 2 years
  };

  // Save progress to API with debouncing
  const saveProgress = useCallback(async (data: KeyGrowData) => {
    if (!isAuthenticated) {
      // Fallback to localStorage for unauthenticated users
      try {
        localStorage.setItem('keyGrowData', JSON.stringify(data));
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
      return;
    }

    setIsSaving(true);
    try {
      // Map component state to API format
      const progressData = {
        currentStep: data.currentStep,
        status: data.isComplete ? 'completed' : 'in_progress',
        
        // Financial assessment data
        creditScore: data.readinessAssessment.creditScore,
        monthlyIncome: data.readinessAssessment.monthlyIncome,
        monthlyDebt: data.readinessAssessment.monthlyDebt,
        emergencyFund: data.readinessAssessment.emergencyFund,
        monthlyExpenses: data.readinessAssessment.monthlyExpenses,
        savingsRate: data.readinessAssessment.savingsRate,
        isFirstTimeBuyer: data.readinessAssessment.isFirstTimeBuyer,
        hasStableEmployment: data.readinessAssessment.hasStableEmployment,
        
        // Market analysis data
        targetZipCode: data.marketAnalysis.zipCode,
        targetHomePrice: data.savingsTarget.targetHomePrice || data.marketAnalysis.averageHomePrice,
        downPaymentPercent: data.marketAnalysis.downPaymentPercent,
        loanType: data.marketAnalysis.loanType,
        
        // Property preferences
        preferredLocation: data.propertySearch.location,
        priceRangeMin: data.propertySearch.priceRange?.min,
        priceRangeMax: data.propertySearch.priceRange?.max,
        bedrooms: data.propertySearch.bedrooms,
        bathrooms: data.propertySearch.bathrooms,
        preferredPropertyType: data.propertySearch.propertyType,
        
        // Onboarding integration
        onboardingGoalAmount: userGoal?.targetAmount,
        onboardingTimeframe: userGoal?.timeframe,
        onboardingPathType: 'keygrow'
      };

      const response = await apiRequest('/keygrow/progress', {
        method: 'POST',
        body: JSON.stringify(progressData)
      });

      if (response.success) {
        console.log('✅ KeyGrow progress saved to database');
      }
    } catch (error) {
      console.error('❌ Failed to save progress to API:', error);
      // Fallback to localStorage on API failure
      try {
        localStorage.setItem('keyGrowData', JSON.stringify(data));
        console.log('📱 Saved to localStorage as fallback');
      } catch (fallbackError) {
        console.error('Failed to save to localStorage fallback:', fallbackError);
      }
    } finally {
      setIsSaving(false);
    }
  }, [isAuthenticated, userGoal]);

  // Debounced save effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (isOpen) {
        saveProgress(keyGrowData);
      }
    }, 1000); // Save after 1 second of no changes

    return () => clearTimeout(timeoutId);
  }, [keyGrowData, isOpen, saveProgress]);

  const updateStep = (field: keyof KeyGrowData, data: any) => {
    setKeyGrowData(prev => ({ ...prev, [field]: data }));
  };

  const nextStep = () => {
    if (keyGrowData.currentStep < 6) {
      setKeyGrowData(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
    } else {
      // Complete the pathway
      setKeyGrowData(prev => ({ ...prev, isComplete: true }));
      onClose();
    }
  };

  const prevStep = () => {
    if (keyGrowData.currentStep > 1) {
      setKeyGrowData(prev => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  };

  const renderCurrentStep = () => {
    switch (keyGrowData.currentStep) {
      case 1:
        return (
          <ReadinessAssessment
            data={keyGrowData.readinessAssessment}
            onUpdate={(data) => updateStep('readinessAssessment', data)}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <MarketEducation
            data={keyGrowData.marketAnalysis}
            onUpdate={(data) => updateStep('marketAnalysis', data)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <SavingsCalculator
            data={keyGrowData.savingsTarget}
            onUpdate={(data) => updateStep('savingsTarget', data)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <FinancialPreparation
            data={keyGrowData.financialPreparation}
            onUpdate={(data) => updateStep('financialPreparation', data)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <PropertySearchSetup
            data={keyGrowData.propertySearch}
            onUpdate={(data) => updateStep('propertySearch', data)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 6:
        return (
          <PathwayOptions
            data={keyGrowData.selectedPathways}
            onUpdate={(data) => updateStep('selectedPathways', data)}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            🏠 KeyGrow: Your Path to Homeownership
          </h1>
          <Button variant="outline" onClick={onClose}>
            ✕
          </Button>
        </div>
        
        <div className="p-6">
          <ProgressIndicator currentStep={keyGrowData.currentStep} totalSteps={6} />
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
}
