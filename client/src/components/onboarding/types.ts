// Comprehensive types for institutional-grade client onboarding

export interface OnboardingData {
  // Step completion tracking
  stepsCompleted: {
    welcome: boolean;
    clientInfo: boolean;
    riskProfiling: boolean;
    investmentPreferences: boolean;
    goalPlanning: boolean;
    accountSetup: boolean;
    portfolioRecommendation: boolean;
  };
  
  // Client information
  clientInfo: ClientInformation;
  
  // Risk profiling results
  riskProfile: RiskProfile;
  
  // Investment preferences
  investmentPreferences: InvestmentPreferences;
  
  // Goals from goal setting module
  goals: FinancialGoal[];
  
  // Account setup data
  accountSetup: AccountSetup;
  
  // Generated portfolio recommendation
  portfolioRecommendation?: PortfolioRecommendation;
}

// Client Information Types
export interface ClientInformation {
  personal: PersonalDetails;
  financial: FinancialDetails;
  experience: InvestmentExperience;
  objectives: FinancialObjectives;
}

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  occupation: string;
  employer: string;
  employmentStatus: 'employed' | 'self-employed' | 'unemployed' | 'retired' | 'student';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  dependents: number;
  citizenshipStatus: 'citizen' | 'permanent-resident' | 'visa-holder';
  taxResidency: string[];
}

export interface FinancialDetails {
  annualIncome: number;
  incomeStability: 'very-stable' | 'stable' | 'variable' | 'unstable';
  incomeSources: ('salary' | 'business' | 'investments' | 'pension' | 'other')[];
  netWorth: number;
  liquidAssets: number;
  totalAssets: {
    cash: number;
    stocks: number;
    bonds: number;
    realEstate: number;
    crypto: number;
    retirement: number;
    other: number;
  };
  totalDebts: {
    mortgage: number;
    studentLoans: number;
    creditCards: number;
    other: number;
  };
  monthlyExpenses: number;
  emergencyFund: number;
  expectedInheritance: number;
  expectedMajorExpenses: Array<{
    description: string;
    amount: number;
    timeframe: string;
  }>;
}

export interface InvestmentExperience {
  overallExperience: 'none' | 'limited' | 'moderate' | 'extensive' | 'professional';
  yearsInvesting: number;
  assetClassExperience: {
    stocks: 'none' | 'limited' | 'moderate' | 'extensive';
    bonds: 'none' | 'limited' | 'moderate' | 'extensive';
    realEstate: 'none' | 'limited' | 'moderate' | 'extensive';
    crypto: 'none' | 'limited' | 'moderate' | 'extensive';
    alternatives: 'none' | 'limited' | 'moderate' | 'extensive';
    options: 'none' | 'limited' | 'moderate' | 'extensive';
  };
  tradingFrequency: 'never' | 'rarely' | 'monthly' | 'weekly' | 'daily';
  largestLoss: number;
  professionalAdvice: 'none' | 'sometimes' | 'always';
  investmentEducation: ('self-taught' | 'formal-education' | 'professional-courses' | 'certifications')[];
}

export interface FinancialObjectives {
  primaryObjective: 'growth' | 'income' | 'preservation' | 'balanced';
  timeHorizon: 'short' | 'medium' | 'long';
  planToRetire: boolean;
  retirementAge?: number;
  legacyPlanning: boolean;
  majorLifeEvents: Array<{
    event: string;
    timeframe: string;
    financialImpact: number;
  }>;
  importanceRanking: {
    retirement: number;
    education: number;
    homeOwnership: number;
    business: number;
    travel: number;
    legacy: number;
  };
}

// Advanced Risk Profiling Types
export interface RiskProfile {
  riskTolerance: RiskTolerance;
  riskCapacity: RiskCapacity;
  behavioralProfile: BehavioralProfile;
  timeHorizonAnalysis: TimeHorizonAnalysis;
  liquidityRequirements: LiquidityRequirements;
  overallRiskScore: number;
  riskCategory: 'conservative' | 'moderate-conservative' | 'moderate' | 'moderate-aggressive' | 'aggressive';
  confidenceLevel: number;
  recommendations: string[];
}

export interface RiskTolerance {
  // Psychological comfort with volatility
  portfolioDeclineComfort: number; // Max % decline acceptable
  sleepAtNightTest: number; // 1-10 scale
  volatilityPreference: 'low' | 'medium' | 'high';
  lossAversion: number; // 1-10 scale (higher = more loss averse)
  regretAvoidance: number; // 1-10 scale
  
  // Scenario-based questions
  marketCrashReaction: 'panic-sell' | 'worry-hold' | 'buy-more' | 'ignore';
  investmentTimeframe: 'short' | 'medium' | 'long';
  riskRewardPreference: 'low-risk-low-return' | 'moderate' | 'high-risk-high-return';
}

export interface RiskCapacity {
  // Financial ability to take risk
  financialCushion: number; // Months of expenses covered
  incomeStability: number; // 1-10 scale
  debtToIncomeRatio: number;
  ageBasedCapacity: number; // Based on age and retirement timeline
  dependentsImpact: number; // Impact of dependents on risk capacity
  
  // Recovery ability
  incomeReplaceability: 'high' | 'medium' | 'low';
  careerStageImpact: number;
  alternativeIncomeStreams: number;
}

export interface BehavioralProfile {
  // Behavioral finance factors
  overconfidenceBias: number; // 1-10 scale
  herding: number; // Tendency to follow crowds
  anchoringBias: number;
  recencyBias: number;
  framingEffects: number;
  
  // Investment behavior patterns
  tradingFrequency: 'low' | 'medium' | 'high';
  marketTimingAttempts: 'never' | 'rarely' | 'sometimes' | 'often';
  emotionalDecisionMaking: number; // 1-10 scale
  informationOverload: number; // Tendency to analysis paralysis
  
  // Personality factors
  patientInvestor: number; // 1-10 scale
  disciplinedExecution: number;
  adaptability: number;
}

export interface TimeHorizonAnalysis {
  shortTerm: {
    years: number;
    goalAmount: number;
    riskAllocation: number;
  };
  mediumTerm: {
    years: number;
    goalAmount: number;
    riskAllocation: number;
  };
  longTerm: {
    years: number;
    goalAmount: number;
    riskAllocation: number;
  };
  
  // Goal-specific time horizons
  goalBasedHorizons: Array<{
    goalId: string;
    timeHorizon: number;
    flexibility: 'none' | 'some' | 'high';
    importance: number; // 1-10 scale
  }>;
}

export interface LiquidityRequirements {
  emergencyFund: {
    current: number;
    target: number;
    monthsExpenses: number;
  };
  
  shortTermNeeds: Array<{
    description: string;
    amount: number;
    timeframe: string;
    flexibility: 'none' | 'some' | 'high';
  }>;
  
  cashFlowRequirements: {
    monthlyIncome: number;
    monthlyExpenses: number;
    seasonalVariations: boolean;
    retirementIncomeNeeds?: number;
  };
  
  liquidityPreference: number; // 1-10 scale (higher = more liquidity preferred)
}

// Investment Preferences Types
export interface InvestmentPreferences {
  assetClassPreferences: AssetClassPreferences;
  geographicPreferences: GeographicPreferences;
  esgPreferences: ESGPreferences;
  managementPreferences: ManagementPreferences;
  taxConsiderations: TaxConsiderations;
  specialRequirements: SpecialRequirements;
}

export interface AssetClassPreferences {
  stocks: {
    allocation: number;
    preference: 'growth' | 'value' | 'blend';
    marketCapPreference: ('large' | 'mid' | 'small')[];
    sectorPreferences: string[];
    sectorExclusions: string[];
  };
  
  bonds: {
    allocation: number;
    durationType: 'short' | 'intermediate' | 'long' | 'mixed';
    creditQuality: 'government' | 'investment-grade' | 'high-yield' | 'mixed';
    bondTypes: ('treasury' | 'municipal' | 'corporate' | 'international')[];
  };
  
  realEstate: {
    allocation: number;
    reitPreference: 'residential' | 'commercial' | 'industrial' | 'healthcare' | 'diversified';
    directOwnership: boolean;
    internationalExposure: boolean;
  };
  
  alternatives: {
    allocation: number;
    types: ('commodities' | 'crypto' | 'private-equity' | 'hedge-funds' | 'infrastructure')[];
    riskTolerance: 'low' | 'medium' | 'high';
  };
  
  cash: {
    allocation: number;
    purpose: 'liquidity' | 'opportunity' | 'safety';
  };
}

export interface GeographicPreferences {
  domesticAllocation: number;
  developedMarketsAllocation: number;
  emergingMarketsAllocation: number;
  
  regionalPreferences: {
    northAmerica: number;
    europe: number;
    asia: number;
    other: number;
  };
  
  currencyHedging: 'none' | 'partial' | 'full';
  geopoliticalRiskTolerance: 'low' | 'medium' | 'high';
}

export interface ESGPreferences {
  importanceLevel: 'not-important' | 'somewhat-important' | 'very-important' | 'critical';
  
  environmentalFactors: {
    climateChange: boolean;
    renewableEnergy: boolean;
    pollutionReduction: boolean;
    sustainableResources: boolean;
  };
  
  socialFactors: {
    humanRights: boolean;
    laborStandards: boolean;
    communityDevelopment: boolean;
    productSafety: boolean;
  };
  
  governanceFactors: {
    boardDiversity: boolean;
    executiveCompensation: boolean;
    transparency: boolean;
    ethicalBusiness: boolean;
  };
  
  exclusions: string[]; // Industries/companies to exclude
  impactInvesting: boolean; // Interest in direct impact investments
}

export interface ManagementPreferences {
  activeVsPassive: 'passive-only' | 'mostly-passive' | 'mixed' | 'mostly-active' | 'active-only';
  feesSensitivity: 'very-sensitive' | 'somewhat-sensitive' | 'not-sensitive';
  rebalancingFrequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  taxLossHarvesting: boolean;
  
  advisorPreference: {
    humanAdvisor: boolean;
    digitalAdvisor: boolean;
    selfDirected: boolean;
    hybridApproach: boolean;
  };
}

export interface TaxConsiderations {
  taxBracket: string;
  taxDeferred: boolean; // Interest in tax-deferred accounts
  taxFree: boolean; // Interest in tax-free investments
  municipalBonds: boolean; // Appropriate for tax bracket
  
  accountTypes: ('taxable' | 'ira-traditional' | 'ira-roth' | '401k' | '529' | 'hsa')[];
  taxLossHarvesting: boolean;
  assetLocation: boolean; // Tax-efficient asset placement
}

export interface SpecialRequirements {
  islamicCompliance: boolean;
  sociallyResponsibleOnly: boolean;
  concentratedPositions: Array<{
    asset: string;
    percentage: number;
    restrictions: string;
  }>;
  
  liquidityConstraints: string[];
  regulatoryRestrictions: string[];
  personalRestrictions: string[];
}

// Financial Goals Types (Enhanced from existing GoalSettingModule)
export interface FinancialGoal {
  id: string;
  category: 'retirement' | 'education' | 'home' | 'business' | 'travel' | 'legacy' | 'emergency' | 'other';
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: 'high' | 'medium' | 'low';
  timeHorizon: number; // years
  importance: number; // 1-10 scale
  flexibility: {
    amount: 'none' | 'some' | 'high';
    timeline: 'none' | 'some' | 'high';
  };
  riskAllocation: number; // Based on time horizon and importance
  monthlyContribution: number;
  inflationAdjusted: boolean;
  linkedAccounts: string[];
  milestones: GoalMilestone[];
  constraints: string[];
}

export interface GoalMilestone {
  id: string;
  title: string;
  targetAmount: number;
  targetDate: string;
  completed: boolean;
  completedDate?: string;
}

// Account Setup Types
export interface AccountSetup {
  accountTypes: AccountType[];
  kycStatus: 'pending' | 'in-progress' | 'completed' | 'approved' | 'rejected';
  documentsUploaded: DocumentType[];
  beneficiaries: Beneficiary[];
  tradingPermissions: TradingPermission[];
  agreements: Agreement[];
  fundingMethod: FundingMethod;
}

export interface AccountType {
  type: 'taxable' | 'ira-traditional' | 'ira-roth' | '401k-rollover' | 'trust' | 'corporate';
  initialFunding: number;
  recurringContributions: {
    amount: number;
    frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly';
    startDate: string;
    endDate?: string;
  };
  taxLotMethod: 'fifo' | 'lifo' | 'tax-optimized';
}

export interface DocumentType {
  type: 'identity' | 'address-proof' | 'income-verification' | 'tax-documents' | 'other';
  status: 'pending' | 'uploaded' | 'verified' | 'rejected';
  fileName?: string;
  uploadDate?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  relationship: string;
  percentage: number;
  address: string;
  dateOfBirth: string;
  ssn: string;
}

export interface TradingPermission {
  type: 'stocks' | 'bonds' | 'options' | 'futures' | 'crypto' | 'alternatives';
  approved: boolean;
  requestDate: string;
  approvalDate?: string;
}

export interface Agreement {
  type: 'client-agreement' | 'privacy-policy' | 'trading-agreement' | 'advisory-agreement';
  signed: boolean;
  signedDate?: string;
  version: string;
}

export interface FundingMethod {
  type: 'bank-transfer' | 'wire' | 'check' | 'crypto' | 'rollover';
  bankInfo?: {
    routingNumber: string;
    accountNumber: string;
    bankName: string;
    accountType: 'checking' | 'savings';
  };
  initialAmount: number;
  status: 'pending' | 'completed' | 'failed';
}

// Portfolio Recommendation Types
export interface PortfolioRecommendation {
  id: string;
  clientId: string;
  createdDate: string;
  
  // Recommended allocation
  recommendedAllocation: AssetAllocation;
  alternativeAllocations: AssetAllocation[];
  
  // Risk metrics
  riskMetrics: RiskMetrics;
  
  // Performance projections
  performanceProjections: PerformanceProjection[];
  
  // Strategy explanation
  strategyRationale: string;
  keyFeatures: string[];
  assumptions: string[];
  
  // Implementation details
  implementation: ImplementationPlan;
  
  // Monitoring and rebalancing
  monitoringPlan: MonitoringPlan;
}

export interface AssetAllocation {
  name: string;
  description: string;
  
  allocations: {
    stocks: {
      domestic: number;
      international: number;
      emerging: number;
    };
    bonds: {
      government: number;
      corporate: number;
      international: number;
    };
    realEstate: number;
    alternatives: number;
    cash: number;
  };
  
  expectedReturn: number;
  expectedVolatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

export interface RiskMetrics {
  overallRiskScore: number;
  volatility: number;
  betaToMarket: number;
  correlationToMarket: number;
  valueAtRisk: {
    oneDay: number;
    oneMonth: number;
    oneYear: number;
  };
  expectedShortfall: number;
  downside: number;
}

export interface PerformanceProjection {
  timeHorizon: number; // years
  scenarios: {
    optimistic: {
      return: number;
      probability: number;
    };
    expected: {
      return: number;
      probability: number;
    };
    pessimistic: {
      return: number;
      probability: number;
    };
  };
  
  compoundedValue: {
    optimistic: number;
    expected: number;
    pessimistic: number;
  };
  
  probabilityOfSuccess: number; // For goal achievement
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

export interface ImplementationPlan {
  phases: ImplementationPhase[];
  totalImplementationTime: number; // days
  minimumInvestment: number;
  suggestedInitialInvestment: number;
  
  fundingSchedule: {
    initialAmount: number;
    recurringAmount: number;
    frequency: string;
  };
  
  rebalancingStrategy: {
    method: 'time-based' | 'threshold-based' | 'hybrid';
    frequency: string;
    thresholds: Record<string, number>;
  };
}

export interface ImplementationPhase {
  phase: number;
  name: string;
  description: string;
  duration: number; // days
  actions: string[];
  requirements: string[];
}

export interface MonitoringPlan {
  reviewFrequency: 'monthly' | 'quarterly' | 'semi-annually' | 'annually';
  
  keyMetrics: string[];
  alertThresholds: {
    performanceDeviation: number;
    allocationDrift: number;
    riskMetricChanges: number;
  };
  
  reportingSchedule: {
    performance: string;
    allocation: string;
    riskAssessment: string;
    goalProgress: string;
  };
  
  rebalancingTriggers: {
    allocationDrift: number;
    timeInterval: string;
    marketVolatility: number;
    taxConsiderations: boolean;
  };
}

// Validation and Error Types
export interface OnboardingValidation {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  completedSteps: string[];
  nextStep: string;
  canProceed: boolean;
  estimatedTimeRemaining: number; // minutes
}

// API Response Types
export interface OnboardingApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
  warnings?: string[];
  progress?: OnboardingProgress;
}

// Onboarding Step Configuration
export interface OnboardingStepConfig {
  id: string;
  title: string;
  description: string;
  component: string;
  estimatedTime: number; // minutes
  required: boolean;
  dependencies: string[];
  validationRules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
}

// Export all types for use in components
export type OnboardingStep = 
  | 'welcome'
  | 'client-info'
  | 'risk-profiling'
  | 'investment-preferences'
  | 'goal-planning'
  | 'account-setup'
  | 'portfolio-recommendation';

export const ONBOARDING_STEPS: OnboardingStep[] = [
  'welcome',
  'client-info',
  'risk-profiling',
  'investment-preferences',
  'goal-planning',
  'account-setup',
  'portfolio-recommendation'
];
