import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
// Radio group functionality implemented inline
import { Slider } from '../ui/slider';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Shield, 
  Brain, 
  BarChart3,
  Clock,
  DollarSign,
  Heart,
  Zap,
  Target,
  Scale,
  Eye,
  Lightbulb,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  Calculator,
  PieChart
} from 'lucide-react';
import { RiskProfile, ClientInformation } from './types';

interface AdvancedRiskProfilingProps {
  data: Partial<RiskProfile>;
  clientInfo: ClientInformation;
  onDataChange: (data: Partial<RiskProfile>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

// Risk profiling sections
type RiskSection = 'tolerance' | 'capacity' | 'behavioral' | 'timeHorizon' | 'liquidity' | 'results';

const RISK_SECTIONS = {
  tolerance: { title: 'Risk Tolerance', icon: Heart, description: 'Your comfort with investment volatility' },
  capacity: { title: 'Risk Capacity', icon: Shield, description: 'Your financial ability to take risk' },
  behavioral: { title: 'Behavioral Profile', icon: Brain, description: 'Your investment behavior patterns' },
  timeHorizon: { title: 'Time Horizon', icon: Clock, description: 'Your investment timeframes for different goals' },
  liquidity: { title: 'Liquidity Needs', icon: DollarSign, description: 'Your need for accessible funds' },
  results: { title: 'Risk Assessment Results', icon: BarChart3, description: 'Your comprehensive risk profile' }
};

// Scenario-based risk tolerance questions
const RISK_SCENARIOS = [
  {
    id: 'market-crash',
    title: 'Market Crash Scenario',
    description: 'Your investment portfolio drops 30% in value during a market crash. What would you do?',
    options: [
      { value: 'panic-sell', label: 'Sell immediately to prevent further losses', score: 1 },
      { value: 'worry-hold', label: 'Hold but worry constantly about further losses', score: 2 },
      { value: 'hold-steady', label: 'Hold and wait for recovery', score: 3 },
      { value: 'buy-more', label: 'Buy more at lower prices', score: 4 }
    ]
  },
  {
    id: 'volatility-comfort',
    title: 'Portfolio Volatility',
    description: 'What is the maximum one-year loss you could tolerate without losing sleep?',
    options: [
      { value: '5-percent', label: '5% - I need stable, predictable returns', score: 1 },
      { value: '15-percent', label: '15% - Some volatility is acceptable', score: 2 },
      { value: '25-percent', label: '25% - I can handle moderate swings', score: 3 },
      { value: '35-percent', label: '35% or more - High volatility doesn\'t bother me', score: 4 }
    ]
  },
  {
    id: 'investment-timeframe',
    title: 'Investment Timeframe',
    description: 'When do you expect to start withdrawing money from your investments?',
    options: [
      { value: 'within-2-years', label: 'Within 2 years', score: 1 },
      { value: '2-to-5-years', label: '2 to 5 years', score: 2 },
      { value: '5-to-10-years', label: '5 to 10 years', score: 3 },
      { value: 'more-than-10-years', label: 'More than 10 years', score: 4 }
    ]
  },
  {
    id: 'risk-reward',
    title: 'Risk vs Reward Preference',
    description: 'Which investment scenario appeals to you most?',
    options: [
      { value: 'low-risk-low-return', label: '3% return with minimal risk of loss', score: 1 },
      { value: 'moderate-risk-moderate-return', label: '7% return with some risk of loss', score: 2 },
      { value: 'high-risk-moderate-return', label: '10% return with significant risk of loss', score: 3 },
      { value: 'very-high-risk-high-return', label: '15%+ return with high risk of major losses', score: 4 }
    ]
  }
];

// Behavioral finance questions
const BEHAVIORAL_QUESTIONS = [
  {
    id: 'overconfidence',
    title: 'Investment Overconfidence',
    question: 'How often do you believe you can predict market movements better than most investors?',
    scale: { min: 1, max: 10, labels: ['Never', 'Sometimes', 'Often', 'Always'] }
  },
  {
    id: 'herding',
    title: 'Following the Crowd',
    question: 'How likely are you to follow investment trends or popular investments?',
    scale: { min: 1, max: 10, labels: ['Never Follow', 'Rarely', 'Sometimes', 'Always Follow'] }
  },
  {
    id: 'loss-aversion',
    title: 'Loss Aversion',
    question: 'How much more does a $1,000 loss bother you compared to the joy of a $1,000 gain?',
    scale: { min: 1, max: 10, labels: ['Same Impact', 'Slightly More', 'Much More', 'Devastated by Losses'] }
  },
  {
    id: 'patience',
    title: 'Investment Patience',
    question: 'How patient are you with investments that take time to show results?',
    scale: { min: 1, max: 10, labels: ['Very Impatient', 'Somewhat Patient', 'Patient', 'Extremely Patient'] }
  },
  {
    id: 'emotional-decisions',
    title: 'Emotional Decision Making',
    question: 'How often do you make investment decisions based on emotions rather than analysis?',
    scale: { min: 1, max: 10, labels: ['Never', 'Rarely', 'Sometimes', 'Often'] }
  }
];

export const AdvancedRiskProfiling: React.FC<AdvancedRiskProfilingProps> = ({
  data,
  clientInfo,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<RiskSection>('tolerance');
  const [progress, setProgress] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<RiskSection>>(new Set());

  // Initialize risk profile data
  const [riskProfile, setRiskProfile] = useState<RiskProfile>({
    riskTolerance: {
      portfolioDeclineComfort: 15,
      sleepAtNightTest: 5,
      volatilityPreference: 'medium',
      lossAversion: 5,
      regretAvoidance: 5,
      marketCrashReaction: 'ignore',
      investmentTimeframe: 'long',
      riskRewardPreference: 'moderate'
    },
    riskCapacity: {
      financialCushion: 6,
      incomeStability: 7,
      debtToIncomeRatio: 0.3,
      ageBasedCapacity: 7,
      dependentsImpact: 5,
      incomeReplaceability: 'medium',
      careerStageImpact: 7,
      alternativeIncomeStreams: 1
    },
    behavioralProfile: {
      overconfidenceBias: 5,
      herding: 5,
      anchoringBias: 5,
      recencyBias: 5,
      framingEffects: 5,
      tradingFrequency: 'medium',
      marketTimingAttempts: 'rarely',
      emotionalDecisionMaking: 5,
      informationOverload: 5,
      patientInvestor: 7,
      disciplinedExecution: 7,
      adaptability: 7
    },
    timeHorizonAnalysis: {
      shortTerm: { years: 2, goalAmount: 20000, riskAllocation: 20 },
      mediumTerm: { years: 7, goalAmount: 100000, riskAllocation: 60 },
      longTerm: { years: 20, goalAmount: 500000, riskAllocation: 80 },
      goalBasedHorizons: []
    },
    liquidityRequirements: {
      emergencyFund: {
        current: clientInfo?.financial?.emergencyFund || 0,
        target: (clientInfo?.financial?.monthlyExpenses || 5000) * 6,
        monthsExpenses: 6
      },
      shortTermNeeds: [],
      cashFlowRequirements: {
        monthlyIncome: (clientInfo?.financial?.annualIncome || 0) / 12,
        monthlyExpenses: clientInfo?.financial?.monthlyExpenses || 0,
        seasonalVariations: false
      },
      liquidityPreference: 5
    },
    overallRiskScore: 0,
    riskCategory: 'moderate',
    confidenceLevel: 0,
    recommendations: [],
    ...data
  });

  // Calculate overall risk score
  const calculateRiskScore = useCallback(() => {
    const tolerance = riskProfile.riskTolerance;
    const capacity = riskProfile.riskCapacity;
    const behavioral = riskProfile.behavioralProfile;
    
    // Risk tolerance score (40% weight)
    const toleranceScore = (
      (tolerance.portfolioDeclineComfort / 40 * 10) * 0.3 +
      (tolerance.sleepAtNightTest) * 0.2 +
      (tolerance.volatilityPreference === 'low' ? 3 : tolerance.volatilityPreference === 'medium' ? 6 : 9) * 0.25 +
      ((11 - tolerance.lossAversion) / 10 * 10) * 0.25
    ) * 0.4;
    
    // Risk capacity score (35% weight)  
    const capacityScore = (
      capacity.financialCushion +
      capacity.incomeStability +
      capacity.ageBasedCapacity +
      (11 - capacity.dependentsImpact) +
      capacity.careerStageImpact
    ) / 5 * 0.35;
    
    // Behavioral score (25% weight)
    const behavioralScore = (
      behavioral.patientInvestor +
      behavioral.disciplinedExecution +
      ((11 - behavioral.emotionalDecisionMaking) / 10 * 10) +
      behavioral.adaptability
    ) / 4 * 0.25;
    
    const overallScore = toleranceScore + capacityScore + behavioralScore;
    
    // Determine risk category
    let category: 'conservative' | 'moderate-conservative' | 'moderate' | 'moderate-aggressive' | 'aggressive';
    if (overallScore <= 3) category = 'conservative';
    else if (overallScore <= 4.5) category = 'moderate-conservative';
    else if (overallScore <= 6.5) category = 'moderate';
    else if (overallScore <= 8) category = 'moderate-aggressive';
    else category = 'aggressive';
    
    const updatedProfile = {
      ...riskProfile,
      overallRiskScore: overallScore,
      riskCategory: category,
      confidenceLevel: Math.min(95, Math.max(60, 75 + (completedSections.size * 4)))
    };
    
    setRiskProfile(updatedProfile);
    onDataChange(updatedProfile);
  }, [riskProfile, completedSections.size, onDataChange]);

  // Update progress
  useEffect(() => {
    const totalSections = Object.keys(RISK_SECTIONS).length - 1; // Exclude results
    const progress = (completedSections.size / totalSections) * 100;
    setProgress(progress);
    
    if (completedSections.size > 0) {
      calculateRiskScore();
    }
  }, [completedSections, calculateRiskScore]);

  const updateRiskData = useCallback((section: keyof RiskProfile, updates: any) => {
    setRiskProfile(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as any),
        ...updates
      }
    }));
  }, []);

  const markSectionComplete = (section: RiskSection) => {
    setCompletedSections(prev => new Set([...prev, section]));
  };

  // Render Risk Tolerance Section
  const renderRiskTolerance = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Risk Tolerance Assessment</h3>
        <p className="text-gray-600">Help us understand your comfort level with investment volatility and potential losses.</p>
      </div>

      {/* Scenario-based questions */}
      {RISK_SCENARIOS.map((scenario) => (
        <Card key={scenario.id} className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="text-lg">{scenario.title}</CardTitle>
            <p className="text-gray-600">{scenario.description}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scenario.options.map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  className="flex items-start justify-start space-x-3 p-3 text-left h-auto"
                  onClick={() => updateRiskData('riskTolerance', { 
                    [scenario.id === 'market-crash' ? 'marketCrashReaction' : 
                     scenario.id === 'volatility-comfort' ? 'portfolioDeclineComfort' :
                     scenario.id === 'investment-timeframe' ? 'investmentTimeframe' :
                     'riskRewardPreference']: option.value 
                  })}
                >
                  <span className="flex-1">{option.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Sleep at night test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            Sleep at Night Test
          </CardTitle>
          <p className="text-gray-600">
            On a scale of 1-10, how well can you sleep at night when your investments are down?
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Slider
              value={[riskProfile.riskTolerance.sleepAtNightTest]}
              onValueChange={(value) => updateRiskData('riskTolerance', { sleepAtNightTest: value[0] })}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>1 - Can't sleep at all</span>
              <span className="font-medium">Current: {riskProfile.riskTolerance.sleepAtNightTest}/10</span>
              <span>10 - Sleep like a baby</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loss aversion scale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingDown className="w-5 h-5 mr-2 text-red-500" />
            Loss Sensitivity
          </CardTitle>
          <p className="text-gray-600">
            How much more do losses bother you compared to equivalent gains?
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Slider
              value={[riskProfile.riskTolerance.lossAversion]}
              onValueChange={(value) => updateRiskData('riskTolerance', { lossAversion: value[0] })}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>1 - Losses and gains feel the same</span>
              <span className="font-medium">Current: {riskProfile.riskTolerance.lossAversion}/10</span>
              <span>10 - Losses are devastating</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('tolerance'); setCurrentSection('capacity'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Risk Tolerance Assessment
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Risk Capacity Section
  const renderRiskCapacity = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Risk Capacity Assessment</h3>
        <p className="text-gray-600">Evaluating your financial ability to take investment risk based on your situation.</p>
      </div>

      {/* Automatically calculated metrics */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Calculator className="w-5 h-5 mr-2" />
            Automatically Calculated Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Financial Cushion (Emergency Fund)</Label>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(riskProfile.liquidityRequirements.emergencyFund.monthsExpenses)} months
                </div>
                <p className="text-sm text-gray-600">
                  ${riskProfile.liquidityRequirements.emergencyFund.current.toLocaleString()} emergency fund
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Debt-to-Income Ratio</Label>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {(Number(riskProfile.riskCapacity.debtToIncomeRatio * 100) || 0).toFixed(1)}%
                </div>
                <p className="text-sm text-gray-600">
                  Based on your provided financial information
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Income stability assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Income Stability Assessment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label>How would you rate your income stability? (1-10)</Label>
            <Slider
              value={[riskProfile.riskCapacity.incomeStability]}
              onValueChange={(value) => updateRiskData('riskCapacity', { incomeStability: value[0] })}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>1 - Very unstable</span>
              <span className="font-medium">Current: {riskProfile.riskCapacity.incomeStability}/10</span>
              <span>10 - Very stable</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Income Replaceability</Label>
            <Select
              value={riskProfile.riskCapacity.incomeReplaceability}
              onValueChange={(value: any) => updateRiskData('riskCapacity', { incomeReplaceability: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High - Could easily find similar income</SelectItem>
                <SelectItem value="medium">Medium - Would take some time to replace</SelectItem>
                <SelectItem value="low">Low - Would be difficult to replace income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>How many alternative income streams do you have?</Label>
            <Input
              type="number"
              min="0"
              max="10"
              value={riskProfile.riskCapacity.alternativeIncomeStreams}
              onChange={(e) => updateRiskData('riskCapacity', { 
                alternativeIncomeStreams: parseInt(e.target.value) || 0 
              })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Age and career stage impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Time-Based Risk Capacity
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Age-Based Risk Capacity (1-10)</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">
                  Auto-calculated: {riskProfile.riskCapacity.ageBasedCapacity}/10
                </div>
                <p className="text-sm text-gray-600">
                  Based on your age: {clientInfo?.personal?.age} years
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Career Stage Impact (1-10)</Label>
              <Slider
                value={[riskProfile.riskCapacity.careerStageImpact]}
                onValueChange={(value) => updateRiskData('riskCapacity', { careerStageImpact: value[0] })}
                max={10}
                min={1}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>1 - Early career</span>
                <span>10 - Peak earnings</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dependents impact */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Responsibilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Label>Impact of dependents on risk capacity (1-10)</Label>
            <Slider
              value={[riskProfile.riskCapacity.dependentsImpact]}
              onValueChange={(value) => updateRiskData('riskCapacity', { dependentsImpact: value[0] })}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>1 - No impact</span>
              <span className="font-medium">Current: {riskProfile.riskCapacity.dependentsImpact}/10</span>
              <span>10 - Major impact</span>
            </div>
            <p className="text-sm text-gray-600">
              You indicated {clientInfo?.personal?.dependents || 0} dependents
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('capacity'); setCurrentSection('behavioral'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Risk Capacity Assessment
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Behavioral Profile Section
  const renderBehavioralProfile = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Behavioral Investment Profile</h3>
        <p className="text-gray-600">Understanding your behavioral tendencies helps us design a strategy you'll stick with.</p>
      </div>

      {BEHAVIORAL_QUESTIONS.map((question) => (
        <Card key={question.id}>
          <CardHeader>
            <CardTitle className="text-lg">{question.title}</CardTitle>
            <p className="text-gray-600">{question.question}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Slider
                value={[riskProfile.behavioralProfile[question.id as keyof typeof riskProfile.behavioralProfile] as number]}
                onValueChange={(value) => updateRiskData('behavioralProfile', { 
                  [question.id]: value[0] 
                })}
                max={question.scale.max}
                min={question.scale.min}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>{question.scale.labels[0]}</span>
                <span className="font-medium">
                  {riskProfile.behavioralProfile[question.id as keyof typeof riskProfile.behavioralProfile]}/{question.scale.max}
                </span>
                <span>{question.scale.labels[question.scale.labels.length - 1]}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Trading behavior */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Trading Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>How would you describe your preferred trading frequency?</Label>
            <Select
              value={riskProfile.behavioralProfile.tradingFrequency}
              onValueChange={(value: any) => updateRiskData('behavioralProfile', { tradingFrequency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Buy and hold for years</SelectItem>
                <SelectItem value="medium">Medium - Occasional rebalancing</SelectItem>
                <SelectItem value="high">High - Active trading and adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>How often do you attempt to time the market?</Label>
            <Select
              value={riskProfile.behavioralProfile.marketTimingAttempts}
              onValueChange={(value: any) => updateRiskData('behavioralProfile', { marketTimingAttempts: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never - I don't try to time the market</SelectItem>
                <SelectItem value="rarely">Rarely - Only in extreme situations</SelectItem>
                <SelectItem value="sometimes">Sometimes - When I see opportunities</SelectItem>
                <SelectItem value="often">Often - I actively try to time entries/exits</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('behavioral'); setCurrentSection('timeHorizon'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Behavioral Assessment
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Time Horizon Analysis
  const renderTimeHorizonAnalysis = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Time Horizon Analysis</h3>
        <p className="text-gray-600">Define your investment timeframes for different goals and purposes.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {['shortTerm', 'mediumTerm', 'longTerm'].map((term) => {
          const data = riskProfile.timeHorizonAnalysis[term as keyof typeof riskProfile.timeHorizonAnalysis];
          const termLabel = term === 'shortTerm' ? 'Short Term' : term === 'mediumTerm' ? 'Medium Term' : 'Long Term';
          
          return (
            <Card key={term}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  {termLabel}
                </CardTitle>
                <p className="text-sm text-gray-600">
                  {term === 'shortTerm' ? '1-3 years' : term === 'mediumTerm' ? '3-10 years' : '10+ years'}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Time Horizon (years)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={(data as any)?.years || 0}
                    onChange={(e) => updateRiskData('timeHorizonAnalysis', {
                      [term]: { ...data, years: parseInt(e.target.value) || 1 }
                    })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Target Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="number"
                      min="0"
                      value={(data as any)?.goalAmount || 0}
                      onChange={(e) => updateRiskData('timeHorizonAnalysis', {
                        [term]: { ...data, goalAmount: parseFloat(e.target.value) || 0 }
                      })}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label>Risk Allocation ({(data as any)?.riskAllocation || 0}%)</Label>
                  <Slider
                    value={[(data as any)?.riskAllocation || 0]}
                    onValueChange={(value) => updateRiskData('timeHorizonAnalysis', {
                      [term]: { ...data, riskAllocation: value[0] }
                    })}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('timeHorizon'); setCurrentSection('liquidity'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Time Horizon Analysis
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Liquidity Requirements
  const renderLiquidityRequirements = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Liquidity Requirements</h3>
        <p className="text-gray-600">Assess your need for accessible funds and cash flow requirements.</p>
      </div>

      {/* Emergency Fund Analysis */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center text-green-800">
            <Shield className="w-5 h-5 mr-2" />
            Emergency Fund Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Current Emergency Fund</Label>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${riskProfile.liquidityRequirements.emergencyFund.current.toLocaleString()}
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Recommended Target</Label>
              <div className="p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  ${riskProfile.liquidityRequirements.emergencyFund.target.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">
                  {riskProfile.liquidityRequirements.emergencyFund.monthsExpenses} months of expenses
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred Emergency Fund Size (months of expenses)</Label>
            <Slider
              value={[riskProfile.liquidityRequirements.emergencyFund.monthsExpenses]}
              onValueChange={(value) => {
                const monthsExpenses = value[0];
                const target = riskProfile.liquidityRequirements.cashFlowRequirements.monthlyExpenses * monthsExpenses;
                updateRiskData('liquidityRequirements', {
                  emergencyFund: {
                    ...riskProfile.liquidityRequirements.emergencyFund,
                    monthsExpenses,
                    target
                  }
                });
              }}
              max={12}
              min={3}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>3 months</span>
              <span className="font-medium">{riskProfile.liquidityRequirements.emergencyFund.monthsExpenses} months</span>
              <span>12 months</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Flow Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Cash Flow Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monthly Income</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">
                  ${riskProfile.liquidityRequirements.cashFlowRequirements.monthlyIncome.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">Auto-calculated from annual income</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Monthly Expenses</Label>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-semibold">
                  ${riskProfile.liquidityRequirements.cashFlowRequirements.monthlyExpenses.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">From your financial information</p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="seasonalVariations"
                checked={riskProfile.liquidityRequirements.cashFlowRequirements.seasonalVariations}
                onCheckedChange={(checked) => updateRiskData('liquidityRequirements', {
                  cashFlowRequirements: {
                    ...riskProfile.liquidityRequirements.cashFlowRequirements,
                    seasonalVariations: checked
                  }
                })}
              />
              <Label htmlFor="seasonalVariations">My income has seasonal variations</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liquidity Preference */}
      <Card>
        <CardHeader>
          <CardTitle>Liquidity Preference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <Label>How important is easy access to your investments? (1-10)</Label>
            <Slider
              value={[riskProfile.liquidityRequirements.liquidityPreference]}
              onValueChange={(value) => updateRiskData('liquidityRequirements', { liquidityPreference: value[0] })}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>1 - Don't need access</span>
              <span className="font-medium">{riskProfile.liquidityRequirements.liquidityPreference}/10</span>
              <span>10 - Need immediate access</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('liquidity'); setCurrentSection('results'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Liquidity Assessment
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Results Section
  const renderResults = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Your Risk Profile Results</h3>
        <p className="text-gray-600">Based on your comprehensive assessment, here's your personalized risk profile.</p>
      </div>

      {/* Overall Risk Score */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Your Overall Risk Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <div className="text-6xl font-bold text-blue-600 mb-2">
              {(Number(riskProfile.overallRiskScore) || 0).toFixed(1)}/10
            </div>
            <div className="text-2xl font-semibold capitalize text-gray-700 mb-2">
              {riskProfile.riskCategory.replace('-', ' ')}
            </div>
            <div className="text-lg text-gray-600">
              Confidence Level: {riskProfile.confidenceLevel}%
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <Heart className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <div className="text-lg font-semibold">Risk Tolerance</div>
              <div className="text-2xl font-bold text-gray-700">
                {(((riskProfile.riskTolerance.sleepAtNightTest + 
                   (riskProfile.riskTolerance.volatilityPreference === 'low' ? 3 : 
                    riskProfile.riskTolerance.volatilityPreference === 'medium' ? 6 : 9) +
                   (11 - riskProfile.riskTolerance.lossAversion)) / 3) || 0).toFixed(1)}
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <Shield className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <div className="text-lg font-semibold">Risk Capacity</div>
              <div className="text-2xl font-bold text-gray-700">
                {(((riskProfile.riskCapacity.financialCushion + 
                   riskProfile.riskCapacity.incomeStability + 
                   riskProfile.riskCapacity.ageBasedCapacity) / 3) || 0).toFixed(1)}
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <Brain className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <div className="text-lg font-semibold">Behavioral</div>
              <div className="text-2xl font-bold text-gray-700">
                {(((riskProfile.behavioralProfile.patientInvestor + 
                   riskProfile.behavioralProfile.disciplinedExecution) / 2) || 0).toFixed(1)}
              </div>
            </div>

            <div className="text-center p-4 bg-white rounded-lg">
              <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <div className="text-lg font-semibold">Time Horizon</div>
              <div className="text-2xl font-bold text-gray-700">
                {riskProfile.timeHorizonAnalysis.longTerm.years}y
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Category Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-500" />
            What This Means For Your Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {riskProfile.riskCategory === 'conservative' && (
            <div className="space-y-2">
              <p className="text-gray-700">
                Your conservative risk profile suggests a preference for capital preservation with steady, predictable returns.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Recommended allocation: 20-30% stocks, 70-80% bonds and cash</li>
                <li>Expected annual return: 4-6%</li>
                <li>Low volatility with minimal risk of significant losses</li>
                <li>Suitable for short-term goals and capital preservation</li>
              </ul>
            </div>
          )}
          
          {riskProfile.riskCategory === 'moderate' && (
            <div className="space-y-2">
              <p className="text-gray-700">
                Your moderate risk profile balances growth potential with reasonable stability.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Recommended allocation: 50-60% stocks, 40-50% bonds</li>
                <li>Expected annual return: 6-8%</li>
                <li>Moderate volatility with balanced risk-return profile</li>
                <li>Suitable for medium to long-term goals</li>
              </ul>
            </div>
          )}
          
          {riskProfile.riskCategory === 'aggressive' && (
            <div className="space-y-2">
              <p className="text-gray-700">
                Your aggressive risk profile emphasizes growth potential and can handle significant volatility.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600">
                <li>Recommended allocation: 80-90% stocks, 10-20% bonds</li>
                <li>Expected annual return: 8-10%+</li>
                <li>High volatility with potential for significant gains and losses</li>
                <li>Suitable for long-term goals with flexibility</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
            Personalized Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-1" />
              <div>
                <div className="font-medium text-blue-900">Diversification Strategy</div>
                <p className="text-blue-700 text-sm">
                  Based on your risk profile, we recommend a globally diversified portfolio with {riskProfile.riskCategory === 'conservative' ? 'emphasis on stability' : riskProfile.riskCategory === 'aggressive' ? 'growth focus' : 'balanced approach'}.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-500 mt-1" />
              <div>
                <div className="font-medium text-green-900">Rebalancing Frequency</div>
                <p className="text-green-700 text-sm">
                  Given your behavioral profile, we suggest {riskProfile.behavioralProfile.patientInvestor > 7 ? 'annual' : 'quarterly'} rebalancing to maintain target allocation.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-500 mt-1" />
              <div>
                <div className="font-medium text-purple-900">Emergency Fund Priority</div>
                <p className="text-purple-700 text-sm">
                  {riskProfile.liquidityRequirements.emergencyFund.current < riskProfile.liquidityRequirements.emergencyFund.target 
                    ? 'Focus on building your emergency fund before aggressive investing' 
                    : 'Your emergency fund is well-positioned for your investment strategy'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render current section
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'tolerance':
        return renderRiskTolerance();
      case 'capacity':
        return renderRiskCapacity();
      case 'behavioral':
        return renderBehavioralProfile();
      case 'timeHorizon':
        return renderTimeHorizonAnalysis();
      case 'liquidity':
        return renderLiquidityRequirements();
      case 'results':
        return renderResults();
      default:
        return renderRiskTolerance();
    }
  };

  const canProceedToNext = () => {
    return completedSections.size >= 5 && currentSection === 'results';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Advanced Risk Profiling
        </h1>
        <p className="text-lg text-gray-600">
          A comprehensive assessment to understand your risk tolerance, capacity, and behavioral patterns.
        </p>
        
        <div className="max-w-md mx-auto">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-gray-500 mt-2">{Math.round(progress)}% Complete</p>
        </div>
      </div>

      {/* Section Navigation */}
      <Card className="bg-white shadow-lg">
        <CardContent className="p-0">
          <div className="flex flex-wrap border-b">
            {Object.entries(RISK_SECTIONS).map(([key, { title, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setCurrentSection(key as RiskSection)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  currentSection === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : completedSections.has(key as RiskSection)
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{title}</span>
                {completedSections.has(key as RiskSection) && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="min-h-[600px]">
        {renderCurrentSection()}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center">
        <Button
          onClick={currentSection === 'tolerance' ? onPrevious : () => {
            const sections: RiskSection[] = ['tolerance', 'capacity', 'behavioral', 'timeHorizon', 'liquidity', 'results'];
            const currentIndex = sections.indexOf(currentSection);
            if (currentIndex > 0) {
              setCurrentSection(sections[currentIndex - 1]);
            }
          }}
          variant="outline"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentSection === 'tolerance' ? 'Previous Step' : 'Previous Section'}
        </Button>

        <div className="text-sm text-gray-500">
          {currentSection === 'results' ? 'Assessment Complete' : 'Complete all sections to see results'}
        </div>

        {currentSection === 'results' ? (
          <Button
            onClick={onNext}
            disabled={!canProceedToNext() || isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span>Continue to Investment Preferences</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => {
              const sections: RiskSection[] = ['tolerance', 'capacity', 'behavioral', 'timeHorizon', 'liquidity', 'results'];
              const currentIndex = sections.indexOf(currentSection);
              if (currentIndex < sections.length - 1) {
                setCurrentSection(sections[currentIndex + 1]);
              }
            }}
            disabled={isLoading}
          >
            Next Section
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default AdvancedRiskProfiling;
