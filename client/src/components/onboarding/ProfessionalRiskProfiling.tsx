import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { Slider } from '../ui/slider';
import { 
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Target,
  Brain,
  Heart,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  Lightbulb,
  Calculator,
  Scale,
  Zap,
  Shield,
  Eye,
  Users,
  Building
} from 'lucide-react';
import { RiskProfile, RiskTolerance, RiskCapacity, BehavioralProfile, TimeHorizonAnalysis, LiquidityRequirements } from './types';
import { LoadingOverlay } from '../ui/loading-states';

interface ProfessionalRiskProfilingProps {
  data: Partial<RiskProfile>;
  clientInfo: {
    age: number;
    annualIncome: number;
    netWorth: number;
    dependents: number;
    employmentStatus: string;
  };
  onDataChange: (data: Partial<RiskProfile>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

// Risk profiling sections
type RiskSection = 'tolerance' | 'capacity' | 'behavioral' | 'time-horizon' | 'liquidity' | 'analysis' | 'review';

const RISK_SECTIONS = {
  'tolerance': { title: 'Risk Tolerance', icon: Heart, description: 'Your psychological comfort with investment volatility', questions: 12 },
  'capacity': { title: 'Risk Capacity', icon: Shield, description: 'Your financial ability to take investment risks', questions: 8 },
  'behavioral': { title: 'Behavioral Profile', icon: Brain, description: 'Understanding your investment behavior patterns', questions: 15 },
  'time-horizon': { title: 'Time Horizon', icon: Clock, description: 'Your investment timeframes for different goals', questions: 6 },
  'liquidity': { title: 'Liquidity Needs', icon: DollarSign, description: 'Your cash flow and liquidity requirements', questions: 5 },
  'analysis': { title: 'Risk Analysis', icon: Calculator, description: 'Comprehensive risk assessment results', questions: 0 },
  'review': { title: 'Review Profile', icon: CheckCircle, description: 'Review and confirm your risk profile', questions: 0 }
};

// Sophisticated risk tolerance questions
const TOLERANCE_QUESTIONS = [
  {
    id: 'portfolio_decline_comfort',
    type: 'scale',
    question: 'What is the maximum decline in your portfolio value you could tolerate before feeling compelled to sell?',
    description: 'This measures your comfort with short-term losses during market downturns.',
    options: [
      { value: 5, label: '5% - Very Conservative' },
      { value: 10, label: '10% - Conservative' },
      { value: 20, label: '20% - Moderate' },
      { value: 35, label: '35% - Aggressive' },
      { value: 50, label: '50% - Very Aggressive' }
    ],
    weight: 0.2
  },
  {
    id: 'sleep_at_night',
    type: 'slider',
    question: 'How well would you sleep if your portfolio lost 20% of its value in a month?',
    description: 'Rate from 1 (would not sleep at all) to 10 (would sleep perfectly well).',
    min: 1,
    max: 10,
    weight: 0.15
  },
  {
    id: 'volatility_preference',
    type: 'scenario',
    question: 'Which investment scenario would you prefer?',
    scenarios: [
      { 
        id: 'low_vol',
        title: 'Conservative Growth',
        description: 'Average return: 6% annually, volatility: ±5%',
        riskLevel: 2
      },
      { 
        id: 'medium_vol',
        title: 'Balanced Growth',
        description: 'Average return: 9% annually, volatility: ±12%',
        riskLevel: 5
      },
      { 
        id: 'high_vol',
        title: 'Aggressive Growth',
        description: 'Average return: 12% annually, volatility: ±20%',
        riskLevel: 8
      }
    ],
    weight: 0.18
  },
  {
    id: 'market_crash_reaction',
    type: 'multiple_choice',
    question: 'During a major market crash (30%+ decline), what would you most likely do?',
    options: [
      { value: 'panic_sell', label: 'Sell immediately to prevent further losses', score: 1 },
      { value: 'worry_hold', label: 'Hold but worry constantly about further declines', score: 3 },
      { value: 'hold_steady', label: 'Hold steady and wait for recovery', score: 6 },
      { value: 'buy_more', label: 'Buy more to take advantage of lower prices', score: 9 }
    ],
    weight: 0.25
  },
  {
    id: 'loss_aversion',
    type: 'comparative',
    question: 'How do you feel about gains versus losses?',
    comparison: {
      scenario_a: 'Guaranteed gain of $1,000',
      scenario_b: '50% chance of gaining $2,500, 50% chance of gaining nothing'
    },
    follow_up: {
      scenario_a: 'Guaranteed loss of $1,000',
      scenario_b: '50% chance of losing $2,500, 50% chance of losing nothing'
    },
    weight: 0.12
  }
];

// Risk capacity assessment questions
const CAPACITY_QUESTIONS = [
  {
    id: 'financial_cushion',
    type: 'calculated',
    question: 'How many months of living expenses do you have in emergency savings?',
    calculator: (value: number) => Math.min(value / 12, 1) * 10, // Normalize to 0-10 scale
    weight: 0.25
  },
  {
    id: 'income_stability',
    type: 'multiple_choice',
    question: 'How would you describe your income stability?',
    options: [
      { value: 'very_stable', label: 'Very stable - Government job, tenured professor, etc.', score: 9 },
      { value: 'stable', label: 'Stable - Large corporation, established business', score: 7 },
      { value: 'moderate', label: 'Moderately stable - Some variability but predictable', score: 5 },
      { value: 'variable', label: 'Variable - Commission-based, seasonal work', score: 3 },
      { value: 'unstable', label: 'Unstable - Startup, highly cyclical industry', score: 1 }
    ],
    weight: 0.2
  },
  {
    id: 'debt_to_income',
    type: 'calculated',
    question: 'What is your total monthly debt payments as a percentage of gross income?',
    calculator: (ratio: number) => Math.max(10 - (ratio * 0.2), 1), // Lower debt = higher capacity
    weight: 0.15
  },
  {
    id: 'investment_timeline',
    type: 'multiple_choice',
    question: 'When do you expect to need access to this money?',
    options: [
      { value: 'less_than_2', label: 'Less than 2 years', score: 1 },
      { value: '2_to_5', label: '2-5 years', score: 3 },
      { value: '5_to_10', label: '5-10 years', score: 6 },
      { value: '10_to_15', label: '10-15 years', score: 8 },
      { value: 'more_than_15', label: 'More than 15 years', score: 10 }
    ],
    weight: 0.2
  },
  {
    id: 'recovery_ability',
    type: 'multiple_choice',
    question: 'If you lost 50% of your investment, how long would it take to recover financially?',
    options: [
      { value: 'never', label: 'I would never recover - this is my only money', score: 1 },
      { value: 'many_years', label: 'Many years - would significantly impact lifestyle', score: 3 },
      { value: 'few_years', label: 'A few years - would be difficult but manageable', score: 6 },
      { value: 'quickly', label: 'Relatively quickly - I have other assets/income', score: 9 }
    ],
    weight: 0.2
  }
];

// Behavioral finance questions
const BEHAVIORAL_QUESTIONS = [
  {
    id: 'overconfidence_bias',
    type: 'self_assessment',
    question: 'How often do you believe your investment picks will outperform the market?',
    scale: { min: 1, max: 10, labels: { 1: 'Never', 10: 'Always' } },
    weight: 0.15
  },
  {
    id: 'herding_tendency',
    type: 'scenario',
    question: 'Your friends are all buying a popular stock that has risen 200% this year. What do you do?',
    options: [
      { value: 'follow_crowd', label: 'Buy it immediately - they must know something', score: 9 },
      { value: 'research_first', label: 'Research it first, then decide', score: 5 },
      { value: 'be_cautious', label: 'Be extra cautious of popular investments', score: 2 }
    ],
    weight: 0.12
  },
  {
    id: 'market_timing',
    type: 'multiple_choice',
    question: 'How often do you try to time the market (buy low, sell high)?',
    options: [
      { value: 'never', label: 'Never - I invest consistently regardless of market conditions', score: 1 },
      { value: 'rarely', label: 'Rarely - Only in extreme situations', score: 3 },
      { value: 'sometimes', label: 'Sometimes - When I see clear opportunities', score: 7 },
      { value: 'often', label: 'Often - I actively try to time my investments', score: 10 }
    ],
    weight: 0.18
  },
  {
    id: 'emotional_decisions',
    type: 'self_assessment',
    question: 'How often do your emotions influence your investment decisions?',
    scale: { min: 1, max: 10, labels: { 1: 'Never emotional', 10: 'Always emotional' } },
    weight: 0.2
  },
  {
    id: 'regret_avoidance',
    type: 'scenario',
    question: 'You bought a stock at $50. It drops to $30. What concerns you most?',
    options: [
      { value: 'further_loss', label: 'The possibility of further losses', score: 3 },
      { value: 'missed_warning', label: 'That you missed the warning signs', score: 7 },
      { value: 'others_judgment', label: 'What others will think of your decision', score: 9 },
      { value: 'opportunity_cost', label: 'The opportunity cost of not investing elsewhere', score: 5 }
    ],
    weight: 0.15
  }
];

export const ProfessionalRiskProfiling: React.FC<ProfessionalRiskProfilingProps> = ({
  data,
  clientInfo,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<RiskSection>('tolerance');
  const [progress, setProgress] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [calculatedProfile, setCalculatedProfile] = useState<RiskProfile | null>(null);

  // Initialize risk profile data
  const [riskProfile, setRiskProfile] = useState<Partial<RiskProfile>>({
    riskTolerance: {
      portfolioDeclineComfort: 0,
      sleepAtNightTest: 5,
      volatilityPreference: 'medium',
      lossAversion: 5,
      regretAvoidance: 5,
      marketCrashReaction: 'hold_steady',
      investmentTimeframe: 'long',
      riskRewardPreference: 'moderate'
    },
    riskCapacity: {
      financialCushion: 6,
      incomeStability: 5,
      debtToIncomeRatio: 0.3,
      ageBasedCapacity: 5,
      dependentsImpact: clientInfo.dependents,
      incomeReplaceability: 'medium',
      careerStageImpact: 5,
      alternativeIncomeStreams: 1
    },
    behavioralProfile: {
      overconfidenceBias: 5,
      herding: 5,
      anchoringBias: 5,
      recencyBias: 5,
      framingEffects: 5,
      tradingFrequency: 'medium',
      marketTimingAttempts: 'sometimes',
      emotionalDecisionMaking: 5,
      informationOverload: 5,
      patientInvestor: 5,
      disciplinedExecution: 5,
      adaptability: 5
    },
    overallRiskScore: 50,
    riskCategory: 'moderate',
    confidenceLevel: 0,
    recommendations: [],
    ...data
  });

  // Calculate risk score based on responses
  const calculateRiskScore = useCallback(() => {
    let toleranceScore = 0;
    let capacityScore = 0;
    let behavioralScore = 0;
    let totalWeight = 0;

    // Calculate tolerance score
    TOLERANCE_QUESTIONS.forEach(question => {
      const response = responses[question.id];
      if (response !== undefined) {
        let score = 0;
        switch (question.type) {
          case 'scale':
            score = response;
            break;
          case 'slider':
            score = response;
            break;
          case 'multiple_choice':
            const option = question.options.find(opt => opt.value === response);
            score = option ? option.score : 0;
            break;
        }
        toleranceScore += score * question.weight;
        totalWeight += question.weight;
      }
    });

    // Calculate capacity score based on financial metrics
    const ageCapacity = Math.max(1, 10 - Math.floor(clientInfo.age / 10));
    const incomeCapacity = Math.min(10, Math.log10(clientInfo.annualIncome / 10000) * 2);
    const netWorthCapacity = Math.min(10, Math.log10(clientInfo.netWorth / 10000) * 2);
    
    capacityScore = (ageCapacity + incomeCapacity + netWorthCapacity) / 3;

    // Calculate behavioral score
    BEHAVIORAL_QUESTIONS.forEach(question => {
      const response = responses[question.id];
      if (response !== undefined) {
        behavioralScore += response * question.weight;
      }
    });

    // Combine scores with different weights
    const finalScore = (
      toleranceScore * 0.4 +
      capacityScore * 0.4 +
      behavioralScore * 0.2
    );

    // Determine risk category
    let riskCategory: 'conservative' | 'moderate-conservative' | 'moderate' | 'moderate-aggressive' | 'aggressive';
    if (finalScore <= 2) riskCategory = 'conservative';
    else if (finalScore <= 4) riskCategory = 'moderate-conservative';
    else if (finalScore <= 6) riskCategory = 'moderate';
    else if (finalScore <= 8) riskCategory = 'moderate-aggressive';
    else riskCategory = 'aggressive';

    // Generate recommendations
    const recommendations = generateRecommendations(finalScore, toleranceScore, capacityScore, behavioralScore);

    const updatedProfile: RiskProfile = {
      ...riskProfile as RiskProfile,
      overallRiskScore: Math.round(finalScore * 10),
      riskCategory,
      confidenceLevel: Math.min(95, 60 + (Object.keys(responses).length * 2)),
      recommendations
    };

    setCalculatedProfile(updatedProfile);
    onDataChange(updatedProfile);
  }, [responses, clientInfo, riskProfile, onDataChange]);

  // Generate personalized recommendations
  const generateRecommendations = (overall: number, tolerance: number, capacity: number, behavioral: number): string[] => {
    const recommendations: string[] = [];

    if (tolerance < capacity - 1) {
      recommendations.push('Your risk capacity exceeds your tolerance. Consider gradual exposure to growth investments.');
    }
    if (capacity < tolerance - 1) {
      recommendations.push('Your risk tolerance exceeds your capacity. Focus on building financial stability first.');
    }
    if (behavioral > 7) {
      recommendations.push('Consider systematic investment approaches to reduce behavioral biases.');
    }
    if (overall >= 7) {
      recommendations.push('Suitable for growth-oriented portfolios with international diversification.');
    } else if (overall <= 3) {
      recommendations.push('Focus on capital preservation with income-generating investments.');
    }

    return recommendations;
  };

  // Handle response updates
  const updateResponse = (questionId: string, value: any) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  // Render tolerance assessment
  const renderToleranceSection = () => {
    const currentQuestion = TOLERANCE_QUESTIONS[currentQuestionIndex];
    if (!currentQuestion) return null;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">Risk Tolerance Assessment</h3>
          <p className="text-gray-600 mb-4">
            Question {currentQuestionIndex + 1} of {TOLERANCE_QUESTIONS.length}
          </p>
          <Progress value={(currentQuestionIndex / TOLERANCE_QUESTIONS.length) * 100} className="mb-6" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
            {currentQuestion.description && (
              <p className="text-gray-600 text-sm">{currentQuestion.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {currentQuestion.type === 'scale' && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => updateResponse(currentQuestion.id, option.value)}
                    className={`w-full p-4 text-left border rounded-lg transition-colors ${
                      responses[currentQuestion.id] === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'slider' && (
              <div className="space-y-4">
                <Slider
                  value={[responses[currentQuestion.id] || currentQuestion.min || 1]}
                  onValueChange={([value]) => updateResponse(currentQuestion.id, value)}
                  min={currentQuestion.min}
                  max={currentQuestion.max}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{currentQuestion.min}</span>
                  <span className="font-medium">
                    Current: {responses[currentQuestion.id] || currentQuestion.min || 1}
                  </span>
                  <span>{currentQuestion.max}</span>
                </div>
              </div>
            )}

            {currentQuestion.type === 'scenario' && (
              <div className="grid gap-4">
                {currentQuestion.scenarios?.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => updateResponse(currentQuestion.id, scenario.id)}
                    className={`p-4 text-left border rounded-lg transition-colors ${
                      responses[currentQuestion.id] === scenario.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium mb-1">{scenario.title}</div>
                    <div className="text-sm text-gray-600">{scenario.description}</div>
                    <div className="text-xs text-blue-600 mt-2">
                      Risk Level: {scenario.riskLevel}/10
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentQuestion.type === 'multiple_choice' && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => updateResponse(currentQuestion.id, option.value)}
                    className={`w-full p-4 text-left border rounded-lg transition-colors ${
                      responses[currentQuestion.id] === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={() => {
              if (currentQuestionIndex < TOLERANCE_QUESTIONS.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
              } else {
                setCurrentSection('capacity');
                setCurrentQuestionIndex(0);
              }
            }}
            disabled={responses[currentQuestion.id] === undefined}
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  };

  // Render analysis results
  const renderAnalysisSection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Your Risk Profile Analysis</h3>
        <p className="text-gray-600">
          Based on your responses, here's your comprehensive risk assessment
        </p>
      </div>

      {calculatedProfile && (
        <>
          {/* Overall Risk Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Overall Risk Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {calculatedProfile.overallRiskScore}/100
                </div>
                <div className={`text-lg font-semibold mb-2 ${
                  calculatedProfile.riskCategory === 'conservative' ? 'text-green-600' :
                  calculatedProfile.riskCategory === 'aggressive' ? 'text-red-600' :
                  'text-blue-600'
                }`}>
                  {calculatedProfile.riskCategory.charAt(0).toUpperCase() + calculatedProfile.riskCategory.slice(1)} Investor
                </div>
                <p className="text-gray-600">
                  Confidence Level: {calculatedProfile.confidenceLevel}%
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Risk Components Breakdown */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Heart className="w-4 h-4 mr-2" />
                  Risk Tolerance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((calculatedProfile.riskTolerance?.portfolioDeclineComfort || 0) * 10)}%
                  </div>
                  <p className="text-sm text-gray-600">
                    Comfort with volatility
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Shield className="w-4 h-4 mr-2" />
                  Risk Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((calculatedProfile.riskCapacity?.financialCushion || 0) * 10)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Financial ability
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-sm">
                  <Brain className="w-4 h-4 mr-2" />
                  Behavioral Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round((calculatedProfile.behavioralProfile?.emotionalDecisionMaking || 0) * 10)}
                  </div>
                  <p className="text-sm text-gray-600">
                    Decision-making style
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          {calculatedProfile.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2" />
                  Personalized Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {calculatedProfile.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="w-5 h-5 mr-3 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );

  // Calculate risk profile when moving to analysis
  useEffect(() => {
    if (currentSection === 'analysis') {
      calculateRiskScore();
    }
  }, [currentSection, calculateRiskScore]);

  // Update progress
  useEffect(() => {
    const sections = Object.keys(RISK_SECTIONS);
    const currentIndex = sections.indexOf(currentSection);
    setProgress((currentIndex / (sections.length - 1)) * 100);
  }, [currentSection]);

  // Main render
  return (
    <LoadingOverlay isLoading={isLoading} message="Analyzing your risk profile...">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-6 h-6 mr-2" />
                  Professional Risk Profiling
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Comprehensive assessment to determine your optimal investment strategy
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Section: {RISK_SECTIONS[currentSection].title}
                </p>
                <Progress value={progress} className="w-32 mt-2" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Section Navigation */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(RISK_SECTIONS) as RiskSection[]).map((section) => {
                const isActive = section === currentSection;
                const sectionInfo = RISK_SECTIONS[section];
                
                return (
                  <button
                    key={section}
                    onClick={() => setCurrentSection(section)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <sectionInfo.icon className="w-4 h-4 mr-2" />
                    {sectionInfo.title}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Current Section Content */}
        {currentSection === 'tolerance' && renderToleranceSection()}
        {currentSection === 'analysis' && renderAnalysisSection()}
        {/* Additional sections would be rendered here */}

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={onPrevious}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous Step
              </Button>
              <Button 
                onClick={onNext}
                disabled={!calculatedProfile}
              >
                Complete Risk Assessment
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </LoadingOverlay>
  );
};
