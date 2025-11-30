import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { 
  Bot,
  TrendingUp,
  PieChart,
  BarChart3,
  Target,
  Zap,
  Brain,
  Shield,
  DollarSign,
  Globe,
  Leaf,
  Star,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Download,
  Info,
  AlertTriangle,
  Lightbulb,
  Calculator,
  Award,
  Eye,
  Users,
  Building
} from 'lucide-react';
import { 
  PortfolioRecommendation, 
  AssetAllocation, 
  RiskMetrics, 
  PerformanceProjection,
  ImplementationPlan,
  ClientInformation,
  RiskProfile,
  InvestmentPreferences,
  FinancialGoal
} from './types';
import { LoadingOverlay, LoadingSpinner } from '../ui/loading-states';

interface AIPortfolioRecommendationsProps {
  clientInfo: ClientInformation;
  riskProfile: RiskProfile;
  investmentPreferences: InvestmentPreferences;
  financialGoals: FinancialGoal[];
  onRecommendationSelect: (recommendation: PortfolioRecommendation) => void;
  onPrevious: () => void;
  onComplete: () => void;
  isLoading?: boolean;
}

// Portfolio strategy templates
const PORTFOLIO_STRATEGIES = {
  conservative: {
    name: 'Capital Preservation',
    description: 'Focus on preserving capital with steady income generation',
    allocations: {
      stocks: { domestic: 20, international: 10, emerging: 0 },
      bonds: { government: 40, corporate: 20, international: 5 },
      realEstate: 3,
      alternatives: 0,
      cash: 2
    },
    expectedReturn: 0.04,
    expectedVolatility: 0.06,
    maxDrawdown: 0.08
  },
  'moderate-conservative': {
    name: 'Conservative Growth',
    description: 'Balanced approach with emphasis on stability',
    allocations: {
      stocks: { domestic: 35, international: 15, emerging: 5 },
      bonds: { government: 25, corporate: 15, international: 3 },
      realEstate: 7,
      alternatives: 2,
      cash: 3
    },
    expectedReturn: 0.06,
    expectedVolatility: 0.09,
    maxDrawdown: 0.12
  },
  moderate: {
    name: 'Balanced Growth',
    description: 'Balanced portfolio for long-term wealth building',
    allocations: {
      stocks: { domestic: 45, international: 20, emerging: 8 },
      bonds: { government: 15, corporate: 12, international: 5 },
      realEstate: 10,
      alternatives: 5,
      cash: 2
    },
    expectedReturn: 0.08,
    expectedVolatility: 0.12,
    maxDrawdown: 0.18
  },
  'moderate-aggressive': {
    name: 'Growth Focused',
    description: 'Growth-oriented with diversified risk exposure',
    allocations: {
      stocks: { domestic: 55, international: 25, emerging: 12 },
      bonds: { government: 8, corporate: 10, international: 5 },
      realEstate: 12,
      alternatives: 8,
      cash: 1
    },
    expectedReturn: 0.10,
    expectedVolatility: 0.15,
    maxDrawdown: 0.25
  },
  aggressive: {
    name: 'Maximum Growth',
    description: 'Aggressive growth strategy for long-term wealth accumulation',
    allocations: {
      stocks: { domestic: 65, international: 30, emerging: 18 },
      bonds: { government: 3, corporate: 5, international: 2 },
      realEstate: 15,
      alternatives: 12,
      cash: 0
    },
    expectedReturn: 0.12,
    expectedVolatility: 0.18,
    maxDrawdown: 0.35
  }
};

// AI analysis factors
const AI_FACTORS = {
  riskAlignment: { weight: 0.25, description: 'Risk tolerance and capacity alignment' },
  goalFitness: { weight: 0.20, description: 'Alignment with financial goals' },
  timeHorizon: { weight: 0.15, description: 'Investment timeline considerations' },
  diversification: { weight: 0.15, description: 'Portfolio diversification optimization' },
  costEfficiency: { weight: 0.10, description: 'Fee and tax optimization' },
  esgAlignment: { weight: 0.10, description: 'ESG preferences integration' },
  liquidityMatch: { weight: 0.05, description: 'Liquidity requirements alignment' }
};

export const AIPortfolioRecommendations: React.FC<AIPortfolioRecommendationsProps> = ({
  clientInfo,
  riskProfile,
  investmentPreferences,
  financialGoals,
  onRecommendationSelect,
  onPrevious,
  onComplete,
  isLoading = false
}) => {
  const [isGenerating, setIsGenerating] = useState(true);
  const [recommendations, setRecommendations] = useState<PortfolioRecommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<PortfolioRecommendation | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState('');

  // Generate AI-powered recommendations
  const generateRecommendations = useCallback(async () => {
    setIsGenerating(true);
    setAnalysisProgress(0);

    const steps = [
      'Analyzing client profile and risk tolerance...',
      'Evaluating financial goals and time horizons...',
      'Processing investment preferences and constraints...',
      'Optimizing asset allocation strategies...',
      'Generating performance projections...',
      'Finalizing personalized recommendations...'
    ];

    // Simulate AI analysis with realistic progress
    for (let i = 0; i < steps.length; i++) {
      setCurrentAnalysisStep(steps[i]);
      setAnalysisProgress((i / steps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Generate multiple portfolio recommendations
    const generatedRecommendations = generatePortfolioOptions();
    setRecommendations(generatedRecommendations);
    setSelectedRecommendation(generatedRecommendations[0]);
    setAnalysisProgress(100);
    setIsGenerating(false);
  }, [clientInfo, riskProfile, investmentPreferences, financialGoals]);

  // Generate portfolio options based on AI analysis
  const generatePortfolioOptions = (): PortfolioRecommendation[] => {
    const baseStrategy = PORTFOLIO_STRATEGIES[riskProfile.riskCategory];
    const recommendations: PortfolioRecommendation[] = [];

    // Primary recommendation (AI-optimized)
    const primaryRecommendation = createRecommendation(
      'AI-Optimized Portfolio',
      'Personalized portfolio optimized by artificial intelligence',
      baseStrategy,
      1.0
    );
    recommendations.push(primaryRecommendation);

    // Conservative alternative
    if (riskProfile.riskCategory !== 'conservative') {
      const conservativeStrategy = PORTFOLIO_STRATEGIES['moderate-conservative'];
      const conservativeRecommendation = createRecommendation(
        'Conservative Alternative',
        'Lower-risk option with focus on capital preservation',
        conservativeStrategy,
        0.8
      );
      recommendations.push(conservativeRecommendation);
    }

    // Growth alternative
    if (riskProfile.riskCategory !== 'aggressive') {
      const growthStrategy = PORTFOLIO_STRATEGIES['moderate-aggressive'];
      const growthRecommendation = createRecommendation(
        'Growth-Focused Alternative',
        'Higher-growth potential with increased risk tolerance',
        growthStrategy,
        1.2
      );
      recommendations.push(growthRecommendation);
    }

    return recommendations;
  };

  // Create a portfolio recommendation
  const createRecommendation = (
    name: string,
    description: string,
    baseStrategy: typeof PORTFOLIO_STRATEGIES.moderate,
    multiplier: number
  ): PortfolioRecommendation => {
    // Apply ESG preferences
    let adjustedAllocations = { ...baseStrategy.allocations };
    if (investmentPreferences.esgPreferences.importanceLevel !== 'not-important') {
      // Adjust for ESG preferences (simplified logic)
      adjustedAllocations.alternatives = Math.max(0, adjustedAllocations.alternatives - 2);
      adjustedAllocations.stocks.domestic += 1;
      adjustedAllocations.stocks.international += 1;
    }

    // Apply geographic preferences
    if (investmentPreferences.geographicPreferences) {
      const totalEquity = adjustedAllocations.stocks.domestic + 
                         adjustedAllocations.stocks.international + 
                         adjustedAllocations.stocks.emerging;
      
      adjustedAllocations.stocks.domestic = Math.round(totalEquity * 
        (investmentPreferences.geographicPreferences.domesticAllocation / 100));
      adjustedAllocations.stocks.international = Math.round(totalEquity * 
        (investmentPreferences.geographicPreferences.developedMarketsAllocation / 100));
      adjustedAllocations.stocks.emerging = Math.round(totalEquity * 
        (investmentPreferences.geographicPreferences.emergingMarketsAllocation / 100));
    }

    const assetAllocation: AssetAllocation = {
      name,
      description,
      allocations: adjustedAllocations,
      expectedReturn: baseStrategy.expectedReturn * multiplier,
      expectedVolatility: baseStrategy.expectedVolatility * Math.sqrt(multiplier),
      sharpeRatio: (baseStrategy.expectedReturn * multiplier) / (baseStrategy.expectedVolatility * Math.sqrt(multiplier)),
      maxDrawdown: baseStrategy.maxDrawdown * multiplier
    };

    const riskMetrics: RiskMetrics = {
      overallRiskScore: riskProfile.overallRiskScore,
      volatility: assetAllocation.expectedVolatility,
      betaToMarket: multiplier,
      correlationToMarket: 0.85,
      valueAtRisk: {
        oneDay: assetAllocation.expectedVolatility / Math.sqrt(252) * 2.33,
        oneMonth: assetAllocation.expectedVolatility / Math.sqrt(12) * 2.33,
        oneYear: assetAllocation.expectedVolatility * 2.33
      },
      expectedShortfall: assetAllocation.expectedVolatility * 2.33 * 1.3,
      downside: assetAllocation.expectedVolatility * 0.7
    };

    const performanceProjections: PerformanceProjection[] = [
      {
        timeHorizon: 10,
        scenarios: {
          optimistic: { return: assetAllocation.expectedReturn * 1.5, probability: 0.1 },
          expected: { return: assetAllocation.expectedReturn, probability: 0.8 },
          pessimistic: { return: assetAllocation.expectedReturn * 0.3, probability: 0.1 }
        },
        compoundedValue: {
          optimistic: Math.pow(1 + assetAllocation.expectedReturn * 1.5, 10),
          expected: Math.pow(1 + assetAllocation.expectedReturn, 10),
          pessimistic: Math.pow(1 + assetAllocation.expectedReturn * 0.3, 10)
        },
        probabilityOfSuccess: calculateGoalSuccessProbability(assetAllocation, financialGoals),
        confidenceInterval: {
          lower: assetAllocation.expectedReturn - assetAllocation.expectedVolatility,
          upper: assetAllocation.expectedReturn + assetAllocation.expectedVolatility
        }
      }
    ];

    const implementationPlan: ImplementationPlan = {
      phases: [
        {
          phase: 1,
          name: 'Initial Setup',
          description: 'Account opening and initial funding',
          duration: 3,
          actions: ['Complete account documentation', 'Fund initial investment', 'Set up automatic contributions'],
          requirements: ['Minimum initial investment of $10,000', 'Completed KYC documentation']
        },
        {
          phase: 2,
          name: 'Portfolio Construction',
          description: 'Build the recommended portfolio allocation',
          duration: 5,
          actions: ['Purchase core holdings', 'Implement diversification strategy', 'Set up rebalancing'],
          requirements: ['Market timing analysis', 'Cost-efficient execution']
        }
      ],
      totalImplementationTime: 7,
      minimumInvestment: 10000,
      suggestedInitialInvestment: 50000,
      fundingSchedule: {
        initialAmount: 50000,
        recurringAmount: 2000,
        frequency: 'monthly'
      },
      rebalancingStrategy: {
        method: 'threshold-based',
        frequency: 'quarterly',
        thresholds: { stocks: 5, bonds: 3, alternatives: 2 }
      }
    };

    return {
      id: Math.random().toString(36).substr(2, 9),
      clientId: 'client-' + Date.now(),
      createdDate: new Date().toISOString(),
      recommendedAllocation: assetAllocation,
      alternativeAllocations: [],
      riskMetrics,
      performanceProjections,
      strategyRationale: generateStrategyRationale(assetAllocation, riskProfile, investmentPreferences),
      keyFeatures: generateKeyFeatures(assetAllocation, investmentPreferences),
      assumptions: [
        'Long-term historical market returns continue',
        'Inflation averages 2.5% annually',
        'No major regulatory changes affect asset classes',
        'Rebalancing occurs as scheduled',
        'No major withdrawals during accumulation phase'
      ],
      implementation: implementationPlan,
      monitoringPlan: {
        reviewFrequency: 'quarterly',
        keyMetrics: ['Total return', 'Risk-adjusted return', 'Goal progress', 'Asset allocation drift'],
        alertThresholds: {
          performanceDeviation: 0.05,
          allocationDrift: 0.03,
          riskMetricChanges: 0.15
        },
        reportingSchedule: {
          performance: 'monthly',
          allocation: 'quarterly',
          riskAssessment: 'semi-annually',
          goalProgress: 'quarterly'
        },
        rebalancingTriggers: {
          allocationDrift: 0.05,
          timeInterval: 'quarterly',
          marketVolatility: 0.20,
          taxConsiderations: true
        }
      }
    };
  };

  // Calculate goal success probability
  const calculateGoalSuccessProbability = (allocation: AssetAllocation, goals: FinancialGoal[]): number => {
    if (goals.length === 0) return 0.8;
    
    // Simplified Monte Carlo-style calculation
    const averageTimeHorizon = goals.reduce((sum, goal) => sum + goal.timeHorizon, 0) / goals.length;
    const totalGoalAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const expectedGrowth = Math.pow(1 + allocation.expectedReturn, averageTimeHorizon);
    const volatilityAdjustment = allocation.expectedVolatility * 0.5;
    
    return Math.min(0.95, 0.5 + (expectedGrowth - volatilityAdjustment) * 0.1);
  };

  // Generate strategy rationale
  const generateStrategyRationale = (
    allocation: AssetAllocation, 
    riskProfile: RiskProfile, 
    preferences: InvestmentPreferences
  ): string => {
    const parts = [
      `This portfolio is designed for a ${riskProfile.riskCategory} investor with a risk score of ${riskProfile.overallRiskScore}/100.`,
      `The allocation balances growth potential with risk management through diversified exposure across asset classes.`
    ];

    if (preferences.esgPreferences.importanceLevel !== 'not-important') {
      parts.push(`ESG considerations have been integrated to align with your sustainability preferences.`);
    }

    if (allocation.expectedReturn > 0.08) {
      parts.push(`The growth-oriented allocation aims to maximize long-term wealth accumulation.`);
    } else {
      parts.push(`The conservative allocation prioritizes capital preservation with steady income generation.`);
    }

    return parts.join(' ');
  };

  // Generate key features
  const generateKeyFeatures = (allocation: AssetAllocation, preferences: InvestmentPreferences): string[] => {
    const features: string[] = [
      `Diversified across ${Object.keys(allocation.allocations).length} major asset classes`,
      `Expected annual return: ${(Number(allocation.expectedReturn * 100) || 0).toFixed(1)}%`,
      `Volatility: ${(Number(allocation.expectedVolatility * 100) || 0).toFixed(1)}%`,
      `Sharpe ratio: ${(Number(allocation.sharpeRatio) || 0).toFixed(2)}`
    ];

    if (preferences.esgPreferences.importanceLevel !== 'not-important') {
      features.push('ESG-aligned investment selection');
    }

    if (preferences.taxConsiderations.taxLossHarvesting) {
      features.push('Tax-loss harvesting optimization');
    }

    features.push('Automated rebalancing and monitoring');
    
    return features;
  };

  // Initialize recommendations generation
  useEffect(() => {
    generateRecommendations();
  }, [generateRecommendations]);

  // Render loading state
  if (isGenerating) {
    return (
      <LoadingOverlay isLoading={true} message={currentAnalysisStep}>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-6 h-6 mr-2" />
                AI Portfolio Analysis
              </CardTitle>
              <p className="text-gray-600">
                Our AI is analyzing your profile to generate personalized investment recommendations
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <LoadingSpinner size="lg" className="mb-4" />
                <Progress value={analysisProgress} className="mb-4" />
                <p className="text-gray-600">{currentAnalysisStep}</p>
              </div>
              
              {/* Analysis factors */}
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(AI_FACTORS).map(([factor, config]) => (
                  <div key={factor} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">{config.description}</span>
                    <span className="text-sm text-blue-600">{Math.round(config.weight * 100)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </LoadingOverlay>
    );
  }

  // Render recommendations
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bot className="w-6 h-6 mr-2" />
            AI-Powered Portfolio Recommendations
          </CardTitle>
          <p className="text-gray-600">
            Based on your profile, our AI has generated personalized investment strategies
          </p>
        </CardHeader>
      </Card>

      {/* Recommendations */}
      <div className="grid lg:grid-cols-3 gap-6">
        {recommendations.map((recommendation, index) => (
          <Card 
            key={recommendation.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedRecommendation?.id === recommendation.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedRecommendation(recommendation)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{recommendation.recommendedAllocation.name}</CardTitle>
                {index === 0 && (
                  <div className="flex items-center text-blue-600 bg-blue-100 px-2 py-1 rounded text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    AI Pick
                  </div>
                )}
              </div>
              <p className="text-gray-600 text-sm">{recommendation.recommendedAllocation.description}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-green-600">
                      {(Number(recommendation.recommendedAllocation.expectedReturn * 100) || 0).toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-600">Expected Return</p>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">
                      {(Number(recommendation.riskMetrics.volatility * 100) || 0).toFixed(1)}%
                    </div>
                    <p className="text-xs text-gray-600">Volatility</p>
                  </div>
                </div>

                {/* Asset allocation preview */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Asset Allocation:</p>
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span>Stocks</span>
                      <span>{recommendation.recommendedAllocation.allocations.stocks.domestic + 
                             recommendation.recommendedAllocation.allocations.stocks.international +
                             recommendation.recommendedAllocation.allocations.stocks.emerging}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bonds</span>
                      <span>{recommendation.recommendedAllocation.allocations.bonds.government + 
                             recommendation.recommendedAllocation.allocations.bonds.corporate +
                             recommendation.recommendedAllocation.allocations.bonds.international}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Alternatives</span>
                      <span>{recommendation.recommendedAllocation.allocations.realEstate + 
                             recommendation.recommendedAllocation.allocations.alternatives}%</span>
                    </div>
                  </div>
                </div>

                {/* Goal success probability */}
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Goal Success Rate</span>
                    <span className="text-sm font-bold text-green-600">
                      {Math.round(recommendation.performanceProjections[0].probabilityOfSuccess * 100)}%
                    </span>
                  </div>
                </div>

                {selectedRecommendation?.id === recommendation.id && (
                  <div className="flex items-center text-blue-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    <span className="text-sm font-medium">Selected</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed analysis of selected recommendation */}
      {selectedRecommendation && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Analysis: {selectedRecommendation.recommendedAllocation.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Strategy rationale */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <Lightbulb className="w-4 h-4 mr-2" />
                Strategy Rationale
              </h4>
              <p className="text-gray-700">{selectedRecommendation.strategyRationale}</p>
            </div>

            {/* Key features */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <Star className="w-4 h-4 mr-2" />
                Key Features
              </h4>
              <ul className="space-y-2">
                {selectedRecommendation.keyFeatures.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Implementation plan */}
            <div>
              <h4 className="font-semibold mb-2 flex items-center">
                <Calculator className="w-4 h-4 mr-2" />
                Implementation Plan
              </h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-1">Timeline:</p>
                  <p className="text-sm text-gray-600">{selectedRecommendation.implementation.totalImplementationTime} days</p>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Minimum Investment:</p>
                  <p className="text-sm text-gray-600">
                    ${selectedRecommendation.implementation.minimumInvestment.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between">
            <Button variant="outline" onClick={onPrevious}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={generateRecommendations}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button 
                onClick={() => {
                  if (selectedRecommendation) {
                    onRecommendationSelect(selectedRecommendation);
                    onComplete();
                  }
                }}
                disabled={!selectedRecommendation}
              >
                Accept Recommendation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
