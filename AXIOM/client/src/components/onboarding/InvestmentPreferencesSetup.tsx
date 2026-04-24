import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { Slider } from '../ui/slider';
import { 
  Globe, 
  TrendingUp, 
  PieChart, 
  Leaf, 
  Shield,
  Building,
  Coins,
  Home,
  Zap,
  Users,
  Banknote,
  BarChart3,
  Target,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertCircle,
  Settings,
  Heart,
  Lightbulb,
  DollarSign,
  Globe2,
  TreePine
} from 'lucide-react';
import { InvestmentPreferences, RiskProfile } from './types';

interface InvestmentPreferencesSetupProps {
  data: Partial<InvestmentPreferences>;
  riskProfile: RiskProfile;
  onDataChange: (data: Partial<InvestmentPreferences>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

// Investment preference sections
type PreferenceSection = 'asset-classes' | 'geographic' | 'esg' | 'management' | 'tax' | 'review';

const PREFERENCE_SECTIONS = {
  'asset-classes': { title: 'Asset Classes', icon: PieChart, description: 'Choose your preferred investment types' },
  'geographic': { title: 'Geographic', icon: Globe, description: 'Set regional investment preferences' },
  'esg': { title: 'ESG & Values', icon: Leaf, description: 'Sustainable and ethical investing' },
  'management': { title: 'Management Style', icon: Settings, description: 'Active vs passive preferences' },
  'tax': { title: 'Tax Considerations', icon: DollarSign, description: 'Tax-efficient strategies' },
  'review': { title: 'Review Preferences', icon: CheckCircle, description: 'Confirm your selections' }
};

// Asset class information
const ASSET_CLASS_INFO = {
  stocks: {
    icon: TrendingUp,
    title: 'Stocks (Equities)',
    description: 'Ownership shares in companies with growth potential',
    riskLevel: 'High',
    expectedReturn: '8-12%',
    timeHorizon: '5+ years',
    subcategories: ['Large Cap', 'Mid Cap', 'Small Cap', 'Growth', 'Value', 'Dividend']
  },
  bonds: {
    icon: Shield,
    title: 'Bonds (Fixed Income)',
    description: 'Debt securities providing steady income',
    riskLevel: 'Low-Medium',
    expectedReturn: '3-6%',
    timeHorizon: '1-10 years',
    subcategories: ['Government', 'Corporate', 'Municipal', 'International', 'High Yield']
  },
  realEstate: {
    icon: Home,
    title: 'Real Estate (REITs)',
    description: 'Property investments and real estate securities',
    riskLevel: 'Medium',
    expectedReturn: '6-10%',
    timeHorizon: '5+ years',
    subcategories: ['Residential', 'Commercial', 'Industrial', 'Healthcare', 'International']
  },
  alternatives: {
    icon: Zap,
    title: 'Alternative Investments',
    description: 'Diversifying investments beyond traditional assets',
    riskLevel: 'Medium-High',
    expectedReturn: '5-15%',
    timeHorizon: '3+ years',
    subcategories: ['Commodities', 'Cryptocurrency', 'Private Equity', 'Hedge Funds', 'Infrastructure']
  },
  cash: {
    icon: Banknote,
    title: 'Cash & Cash Equivalents',
    description: 'Liquid, low-risk holdings for stability',
    riskLevel: 'Very Low',
    expectedReturn: '1-3%',
    timeHorizon: 'Any',
    subcategories: ['Savings', 'Money Market', 'Treasury Bills', 'CDs']
  }
};

// Regional preferences
const REGIONS = {
  northAmerica: { name: 'North America', flag: '🇺🇸', markets: 'US, Canada' },
  europe: { name: 'Europe', flag: '🇪🇺', markets: 'UK, Germany, France, Switzerland' },
  asia: { name: 'Asia Pacific', flag: '🌏', markets: 'Japan, China, Australia, South Korea' },
  emergingMarkets: { name: 'Emerging Markets', flag: '🌍', markets: 'India, Brazil, Mexico, South Africa' }
};

// ESG factors
const ESG_FACTORS = {
  environmental: {
    title: 'Environmental',
    icon: TreePine,
    factors: [
      { key: 'climateChange', label: 'Climate Change Mitigation' },
      { key: 'renewableEnergy', label: 'Renewable Energy' },
      { key: 'pollutionReduction', label: 'Pollution Reduction' },
      { key: 'sustainableResources', label: 'Sustainable Resource Use' }
    ]
  },
  social: {
    title: 'Social',
    icon: Users,
    factors: [
      { key: 'humanRights', label: 'Human Rights' },
      { key: 'laborStandards', label: 'Fair Labor Standards' },
      { key: 'communityDevelopment', label: 'Community Development' },
      { key: 'productSafety', label: 'Product Safety & Quality' }
    ]
  },
  governance: {
    title: 'Governance',
    icon: Building,
    factors: [
      { key: 'boardDiversity', label: 'Board Diversity' },
      { key: 'executiveCompensation', label: 'Executive Compensation' },
      { key: 'transparency', label: 'Transparency & Reporting' },
      { key: 'ethicalBusiness', label: 'Ethical Business Practices' }
    ]
  }
};

export const InvestmentPreferencesSetup: React.FC<InvestmentPreferencesSetupProps> = ({
  data,
  riskProfile,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<PreferenceSection>('asset-classes');
  const [progress, setProgress] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<PreferenceSection>>(new Set());

  // Initialize investment preferences data
  const [preferences, setPreferences] = useState<InvestmentPreferences>({
    assetClassPreferences: {
      stocks: {
        allocation: 60,
        preference: 'blend',
        marketCapPreference: ['large', 'mid'],
        sectorPreferences: [],
        sectorExclusions: []
      },
      bonds: {
        allocation: 30,
        durationType: 'intermediate',
        creditQuality: 'investment-grade',
        bondTypes: ['treasury', 'corporate']
      },
      realEstate: {
        allocation: 10,
        reitPreference: 'diversified',
        directOwnership: false,
        internationalExposure: true
      },
      alternatives: {
        allocation: 0,
        types: [],
        riskTolerance: 'medium'
      },
      cash: {
        allocation: 0,
        purpose: 'liquidity'
      }
    },
    geographicPreferences: {
      domesticAllocation: 70,
      developedMarketsAllocation: 20,
      emergingMarketsAllocation: 10,
      regionalPreferences: {
        northAmerica: 70,
        europe: 15,
        asia: 10,
        other: 5
      },
      currencyHedging: 'partial',
      geopoliticalRiskTolerance: 'medium'
    },
    esgPreferences: {
      importanceLevel: 'somewhat-important',
      environmentalFactors: {
        climateChange: false,
        renewableEnergy: false,
        pollutionReduction: false,
        sustainableResources: false
      },
      socialFactors: {
        humanRights: false,
        laborStandards: false,
        communityDevelopment: false,
        productSafety: false
      },
      governanceFactors: {
        boardDiversity: false,
        executiveCompensation: false,
        transparency: false,
        ethicalBusiness: false
      },
      exclusions: [],
      impactInvesting: false
    },
    managementPreferences: {
      activeVsPassive: 'mixed',
      feesSensitivity: 'somewhat-sensitive',
      rebalancingFrequency: 'quarterly',
      taxLossHarvesting: true,
      advisorPreference: {
        humanAdvisor: false,
        digitalAdvisor: true,
        selfDirected: false,
        hybridApproach: true
      }
    },
    taxConsiderations: {
      taxBracket: '22%',
      taxDeferred: true,
      taxFree: true,
      municipalBonds: false,
      accountTypes: ['taxable', 'ira-traditional'],
      taxLossHarvesting: true,
      assetLocation: true
    },
    specialRequirements: {
      islamicCompliance: false,
      sociallyResponsibleOnly: false,
      concentratedPositions: [],
      liquidityConstraints: [],
      regulatoryRestrictions: [],
      personalRestrictions: []
    },
    ...data
  });

  // Update progress based on completed sections
  useEffect(() => {
    const totalSections = Object.keys(PREFERENCE_SECTIONS).length - 1; // Exclude review
    const progress = (completedSections.size / totalSections) * 100;
    setProgress(progress);
  }, [completedSections]);

  // Update parent component when data changes
  useEffect(() => {
    onDataChange(preferences);
  }, [preferences, onDataChange]);

  // Auto-adjust allocations based on risk profile
  useEffect(() => {
    if (riskProfile.riskCategory) {
      const baseAllocations = {
        conservative: { stocks: 30, bonds: 60, realEstate: 5, alternatives: 0, cash: 5 },
        'moderate-conservative': { stocks: 45, bonds: 45, realEstate: 7, alternatives: 0, cash: 3 },
        moderate: { stocks: 60, bonds: 30, realEstate: 10, alternatives: 0, cash: 0 },
        'moderate-aggressive': { stocks: 70, bonds: 20, realEstate: 8, alternatives: 2, cash: 0 },
        aggressive: { stocks: 80, bonds: 10, realEstate: 8, alternatives: 2, cash: 0 }
      };

      const allocation = baseAllocations[riskProfile.riskCategory];
      if (allocation && currentSection === 'asset-classes') {
        updatePreferences('assetClassPreferences', {
          stocks: { ...preferences.assetClassPreferences.stocks, allocation: allocation.stocks },
          bonds: { ...preferences.assetClassPreferences.bonds, allocation: allocation.bonds },
          realEstate: { ...preferences.assetClassPreferences.realEstate, allocation: allocation.realEstate },
          alternatives: { ...preferences.assetClassPreferences.alternatives, allocation: allocation.alternatives },
          cash: { ...preferences.assetClassPreferences.cash, allocation: allocation.cash }
        });
      }
    }
  }, [riskProfile.riskCategory, currentSection]);

  const updatePreferences = useCallback((section: keyof InvestmentPreferences, updates: any) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates
      }
    }));
  }, []);

  const markSectionComplete = (section: PreferenceSection) => {
    setCompletedSections(prev => new Set([...prev, section]));
  };

  const getTotalAllocation = () => {
    const { stocks, bonds, realEstate, alternatives, cash } = preferences.assetClassPreferences;
    return stocks.allocation + bonds.allocation + realEstate.allocation + alternatives.allocation + cash.allocation;
  };

  const getGeographicTotal = () => {
    const { domesticAllocation, developedMarketsAllocation, emergingMarketsAllocation } = preferences.geographicPreferences;
    return domesticAllocation + developedMarketsAllocation + emergingMarketsAllocation;
  };

  // Render Asset Classes Section
  const renderAssetClasses = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Asset Class Preferences</h3>
        <p className="text-gray-600">
          Set your preferred allocation across different investment types. We've suggested allocations based on your risk profile.
        </p>
      </div>

      {/* Risk Profile Based Suggestion */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Lightbulb className="w-5 h-5 mr-2" />
            Recommended for {riskProfile.riskCategory?.replace('-', ' ')} Risk Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 mb-4">
            Based on your risk assessment, we recommend a {riskProfile.riskCategory} allocation strategy.
            You can adjust these recommendations to match your preferences.
          </p>
        </CardContent>
      </Card>

      {/* Asset Allocation */}
      <div className="space-y-6">
        {Object.entries(ASSET_CLASS_INFO).map(([assetKey, assetInfo]) => {
          const allocation = preferences.assetClassPreferences[assetKey as keyof typeof preferences.assetClassPreferences];
          const allocationValue = typeof allocation === 'object' && 'allocation' in allocation ? allocation.allocation : 0;

          return (
            <Card key={assetKey} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <assetInfo.icon className="w-8 h-8 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{assetInfo.title}</CardTitle>
                      <p className="text-gray-600 text-sm">{assetInfo.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{allocationValue}%</div>
                    <div className="text-sm text-gray-500">{assetInfo.expectedReturn}</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div><strong>Risk Level:</strong> {assetInfo.riskLevel}</div>
                  <div><strong>Expected Return:</strong> {assetInfo.expectedReturn}</div>
                  <div><strong>Time Horizon:</strong> {assetInfo.timeHorizon}</div>
                </div>

                {/* Allocation Slider */}
                <div className="space-y-2">
                  <Label>Allocation Percentage: {allocationValue}%</Label>
                  <Slider
                    value={[allocationValue]}
                    onValueChange={(value) => {
                      updatePreferences('assetClassPreferences', {
                        [assetKey]: {
                          ...preferences.assetClassPreferences[assetKey as keyof typeof preferences.assetClassPreferences],
                          allocation: value[0]
                        }
                      });
                    }}
                    max={100}
                    min={0}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Asset-specific preferences */}
                {assetKey === 'stocks' && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Style Preference</Label>
                        <Select
                          value={preferences.assetClassPreferences.stocks.preference}
                          onValueChange={(value: any) => updatePreferences('assetClassPreferences', {
                            stocks: { ...preferences.assetClassPreferences.stocks, preference: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="growth">Growth - Fast-growing companies</SelectItem>
                            <SelectItem value="value">Value - Undervalued companies</SelectItem>
                            <SelectItem value="blend">Blend - Mix of growth and value</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Market Cap Preference</Label>
                        <div className="space-y-2">
                          {['large', 'mid', 'small'].map(cap => (
                            <div key={cap} className="flex items-center space-x-2">
                              <Checkbox
                                id={`cap-${cap}`}
                                checked={preferences.assetClassPreferences.stocks.marketCapPreference.includes(cap as any)}
                                onCheckedChange={(checked) => {
                                  const current = preferences.assetClassPreferences.stocks.marketCapPreference;
                                  const updated = checked 
                                    ? [...current, cap as any]
                                    : current.filter(c => c !== cap);
                                  updatePreferences('assetClassPreferences', {
                                    stocks: { ...preferences.assetClassPreferences.stocks, marketCapPreference: updated }
                                  });
                                }}
                              />
                              <Label htmlFor={`cap-${cap}`} className="capitalize">{cap} Cap</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {assetKey === 'bonds' && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Duration Preference</Label>
                        <Select
                          value={preferences.assetClassPreferences.bonds.durationType}
                          onValueChange={(value: any) => updatePreferences('assetClassPreferences', {
                            bonds: { ...preferences.assetClassPreferences.bonds, durationType: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short Term (1-3 years)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (3-10 years)</SelectItem>
                            <SelectItem value="long">Long Term (10+ years)</SelectItem>
                            <SelectItem value="mixed">Mixed Duration</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Credit Quality</Label>
                        <Select
                          value={preferences.assetClassPreferences.bonds.creditQuality}
                          onValueChange={(value: any) => updatePreferences('assetClassPreferences', {
                            bonds: { ...preferences.assetClassPreferences.bonds, creditQuality: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="government">Government Only</SelectItem>
                            <SelectItem value="investment-grade">Investment Grade</SelectItem>
                            <SelectItem value="high-yield">High Yield Included</SelectItem>
                            <SelectItem value="mixed">Mixed Credit Quality</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {assetKey === 'realEstate' && (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>REIT Preference</Label>
                        <Select
                          value={preferences.assetClassPreferences.realEstate.reitPreference}
                          onValueChange={(value: any) => updatePreferences('assetClassPreferences', {
                            realEstate: { ...preferences.assetClassPreferences.realEstate, reitPreference: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="residential">Residential REITs</SelectItem>
                            <SelectItem value="commercial">Commercial REITs</SelectItem>
                            <SelectItem value="industrial">Industrial REITs</SelectItem>
                            <SelectItem value="healthcare">Healthcare REITs</SelectItem>
                            <SelectItem value="diversified">Diversified REITs</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="international-re"
                            checked={preferences.assetClassPreferences.realEstate.internationalExposure}
                            onCheckedChange={(checked) => updatePreferences('assetClassPreferences', {
                              realEstate: { ...preferences.assetClassPreferences.realEstate, internationalExposure: checked }
                            })}
                          />
                          <Label htmlFor="international-re">International Real Estate</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="direct-ownership"
                            checked={preferences.assetClassPreferences.realEstate.directOwnership}
                            onCheckedChange={(checked) => updatePreferences('assetClassPreferences', {
                              realEstate: { ...preferences.assetClassPreferences.realEstate, directOwnership: checked }
                            })}
                          />
                          <Label htmlFor="direct-ownership">Direct Property Ownership</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {assetKey === 'alternatives' && allocationValue > 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Alternative Investment Types</Label>
                      <div className="grid md:grid-cols-2 gap-2">
                        {['commodities', 'crypto', 'private-equity', 'hedge-funds', 'infrastructure'].map(type => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              id={`alt-${type}`}
                              checked={preferences.assetClassPreferences.alternatives.types.includes(type as any)}
                              onCheckedChange={(checked) => {
                                const current = preferences.assetClassPreferences.alternatives.types;
                                const updated = checked 
                                  ? [...current, type as any]
                                  : current.filter(t => t !== type);
                                updatePreferences('assetClassPreferences', {
                                  alternatives: { ...preferences.assetClassPreferences.alternatives, types: updated }
                                });
                              }}
                            />
                            <Label htmlFor={`alt-${type}`} className="capitalize">{type.replace('-', ' ')}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Total Allocation Warning */}
      <Card className={`border-2 ${getTotalAllocation() === 100 ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            {getTotalAllocation() === 100 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <span className="font-medium">
              Total Allocation: {getTotalAllocation()}%
            </span>
          </div>
          {getTotalAllocation() !== 100 && (
            <p className="text-sm text-yellow-700 mt-1">
              Allocations should total 100%. Adjust your preferences above.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('asset-classes'); setCurrentSection('geographic'); }}
          disabled={getTotalAllocation() !== 100}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Asset Allocation
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Geographic Preferences Section
  const renderGeographicPreferences = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Geographic Investment Preferences</h3>
        <p className="text-gray-600">
          Diversify your investments across different regions and markets worldwide.
        </p>
      </div>

      {/* Market Allocation */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="text-2xl mr-2">🇺🇸</div>
              Domestic (US)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {preferences.geographicPreferences.domesticAllocation}%
              </div>
            </div>
            <Slider
              value={[preferences.geographicPreferences.domesticAllocation]}
              onValueChange={(value) => updatePreferences('geographicPreferences', { domesticAllocation: value[0] })}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-gray-600">
              Large, stable market with strong regulations and diverse sectors.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="text-2xl mr-2">🌍</div>
              Developed Markets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {preferences.geographicPreferences.developedMarketsAllocation}%
              </div>
            </div>
            <Slider
              value={[preferences.geographicPreferences.developedMarketsAllocation]}
              onValueChange={(value) => updatePreferences('geographicPreferences', { developedMarketsAllocation: value[0] })}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-gray-600">
              Established economies with mature markets (Europe, Japan, Australia).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="text-2xl mr-2">🚀</div>
              Emerging Markets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {preferences.geographicPreferences.emergingMarketsAllocation}%
              </div>
            </div>
            <Slider
              value={[preferences.geographicPreferences.emergingMarketsAllocation]}
              onValueChange={(value) => updatePreferences('geographicPreferences', { emergingMarketsAllocation: value[0] })}
              max={100}
              min={0}
              step={5}
              className="w-full"
            />
            <p className="text-sm text-gray-600">
              Higher growth potential with increased volatility (China, India, Brazil).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regional Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe2 className="w-5 h-5 mr-2" />
            Regional Allocation Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(REGIONS).map(([key, region]) => (
              <div key={key} className="space-y-2">
                <Label className="flex items-center">
                  <span className="text-xl mr-2">{region.flag}</span>
                  {region.name}
                </Label>
                <div className="flex items-center space-x-2">
                  <Slider
                    value={[preferences.geographicPreferences.regionalPreferences[key as keyof typeof preferences.geographicPreferences.regionalPreferences]]}
                    onValueChange={(value) => updatePreferences('geographicPreferences', {
                      regionalPreferences: {
                        ...preferences.geographicPreferences.regionalPreferences,
                        [key]: value[0]
                      }
                    })}
                    max={100}
                    min={0}
                    step={5}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium w-12">
                    {preferences.geographicPreferences.regionalPreferences[key as keyof typeof preferences.geographicPreferences.regionalPreferences]}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">{region.markets}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Currency and Risk Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Currency and Risk Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Currency Hedging</Label>
              <Select
                value={preferences.geographicPreferences.currencyHedging}
                onValueChange={(value: any) => updatePreferences('geographicPreferences', { currencyHedging: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Currency Hedging</SelectItem>
                  <SelectItem value="partial">Partial Hedging (50%)</SelectItem>
                  <SelectItem value="full">Full Currency Hedging</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Protect against foreign exchange risk</p>
            </div>

            <div className="space-y-2">
              <Label>Geopolitical Risk Tolerance</Label>
              <Select
                value={preferences.geographicPreferences.geopoliticalRiskTolerance}
                onValueChange={(value: any) => updatePreferences('geographicPreferences', { geopoliticalRiskTolerance: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low - Stable regions only</SelectItem>
                  <SelectItem value="medium">Medium - Some exposure to volatile regions</SelectItem>
                  <SelectItem value="high">High - Open to all regions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Geographic Allocation Warning */}
      <Card className={`border-2 ${getGeographicTotal() === 100 ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            {getGeographicTotal() === 100 ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <span className="font-medium">
              Total Geographic Allocation: {getGeographicTotal()}%
            </span>
          </div>
          {getGeographicTotal() !== 100 && (
            <p className="text-sm text-yellow-700 mt-1">
              Geographic allocations should total 100%. Adjust your preferences above.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('geographic'); setCurrentSection('esg'); }}
          disabled={getGeographicTotal() !== 100}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Geographic Preferences
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render ESG Preferences Section
  const renderESGPreferences = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">ESG & Values-Based Investing</h3>
        <p className="text-gray-600">
          Align your investments with your values through Environmental, Social, and Governance considerations.
        </p>
      </div>

      {/* ESG Importance Level */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Heart className="w-5 h-5 mr-2 text-red-500" />
            How Important is ESG to You?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select
              value={preferences.esgPreferences.importanceLevel}
              onValueChange={(value: any) => updatePreferences('esgPreferences', { importanceLevel: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-important">Not Important - Focus on returns only</SelectItem>
                <SelectItem value="somewhat-important">Somewhat Important - Consider ESG when possible</SelectItem>
                <SelectItem value="very-important">Very Important - Strong preference for ESG</SelectItem>
                <SelectItem value="critical">Critical - Only ESG-compliant investments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {preferences.esgPreferences.importanceLevel !== 'not-important' && (
        <>
          {/* ESG Factors */}
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(ESG_FACTORS).map(([category, categoryInfo]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <categoryInfo.icon className="w-5 h-5 mr-2" />
                    {categoryInfo.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {categoryInfo.factors.map(factor => (
                    <div key={factor.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${category}-${factor.key}`}
                        checked={preferences.esgPreferences[`${category}Factors` as keyof typeof preferences.esgPreferences][factor.key as keyof any]}
                        onCheckedChange={(checked) => {
                          const currentFactors = preferences.esgPreferences[`${category}Factors` as keyof typeof preferences.esgPreferences];
                          updatePreferences('esgPreferences', {
                            [`${category}Factors`]: {
                              ...(currentFactors && typeof currentFactors === 'object' ? currentFactors : {}),
                              [factor.key]: checked
                            }
                          });
                        }}
                      />
                      <Label htmlFor={`${category}-${factor.key}`} className="text-sm">
                        {factor.label}
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Industry Exclusions */}
          <Card>
            <CardHeader>
              <CardTitle>Industry Exclusions</CardTitle>
              <p className="text-gray-600">Industries or companies you prefer to exclude from your portfolio.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                'Tobacco', 'Alcohol', 'Gambling', 'Firearms', 'Fossil Fuels', 
                'Nuclear Energy', 'Adult Entertainment', 'Private Prisons'
              ].map(industry => (
                <div key={industry} className="flex items-center space-x-2">
                  <Checkbox
                    id={`exclude-${industry.toLowerCase()}`}
                    checked={preferences.esgPreferences.exclusions.includes(industry)}
                    onCheckedChange={(checked) => {
                      const current = preferences.esgPreferences.exclusions;
                      const updated = checked 
                        ? [...current, industry]
                        : current.filter(i => i !== industry);
                      updatePreferences('esgPreferences', { exclusions: updated });
                    }}
                  />
                  <Label htmlFor={`exclude-${industry.toLowerCase()}`}>{industry}</Label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Impact Investing */}
          <Card>
            <CardHeader>
              <CardTitle>Impact Investing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="impact-investing"
                  checked={preferences.esgPreferences.impactInvesting}
                  onCheckedChange={(checked) => updatePreferences('esgPreferences', { impactInvesting: checked })}
                />
                <Label htmlFor="impact-investing">
                  I'm interested in investments that generate positive social/environmental impact alongside financial returns
                </Label>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('esg'); setCurrentSection('management'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete ESG Preferences
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Management Preferences Section
  const renderManagementPreferences = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Investment Management Style</h3>
        <p className="text-gray-600">
          Choose how you want your investments to be managed and what type of advisory support you prefer.
        </p>
      </div>

      {/* Active vs Passive */}
      <Card>
        <CardHeader>
          <CardTitle>Active vs Passive Management</CardTitle>
          <p className="text-gray-600">
            Passive investing follows market indexes with lower fees. Active management tries to beat the market with higher fees.
          </p>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences.managementPreferences.activeVsPassive}
            onValueChange={(value: any) => updatePreferences('managementPreferences', { activeVsPassive: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="passive-only">Passive Only - Index funds and ETFs</SelectItem>
              <SelectItem value="mostly-passive">Mostly Passive - 80% passive, 20% active</SelectItem>
              <SelectItem value="mixed">Mixed Approach - 50% passive, 50% active</SelectItem>
              <SelectItem value="mostly-active">Mostly Active - 80% active, 20% passive</SelectItem>
              <SelectItem value="active-only">Active Only - Actively managed strategies</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Fee Sensitivity */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Sensitivity</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={preferences.managementPreferences.feesSensitivity}
            onValueChange={(value: any) => updatePreferences('managementPreferences', { feesSensitivity: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="very-sensitive">Very Sensitive - Minimize all fees</SelectItem>
              <SelectItem value="somewhat-sensitive">Somewhat Sensitive - Consider cost vs value</SelectItem>
              <SelectItem value="not-sensitive">Not Sensitive - Focus on performance over fees</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Rebalancing and Tax Optimization */}
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Management Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Rebalancing Frequency</Label>
              <Select
                value={preferences.managementPreferences.rebalancingFrequency}
                onValueChange={(value: any) => updatePreferences('managementPreferences', { rebalancingFrequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tax-loss-harvesting"
                  checked={preferences.managementPreferences.taxLossHarvesting}
                  onCheckedChange={(checked) => updatePreferences('managementPreferences', { taxLossHarvesting: checked })}
                />
                <Label htmlFor="tax-loss-harvesting">Enable Tax-Loss Harvesting</Label>
              </div>
              <p className="text-xs text-gray-500">Automatically realize losses to offset gains and reduce taxes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advisory Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Advisory Support Preferences</CardTitle>
          <p className="text-gray-600">What type of investment guidance do you prefer?</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries({
            humanAdvisor: 'Human Financial Advisor',
            digitalAdvisor: 'Digital/Robo Advisor', 
            selfDirected: 'Self-Directed Investing',
            hybridApproach: 'Hybrid (Digital + Human Support)'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center space-x-2">
              <Checkbox
                id={`advisor-${key}`}
                checked={preferences.managementPreferences.advisorPreference[key as keyof typeof preferences.managementPreferences.advisorPreference]}
                onCheckedChange={(checked) => {
                  updatePreferences('managementPreferences', {
                    advisorPreference: {
                      ...preferences.managementPreferences.advisorPreference,
                      [key]: checked
                    }
                  });
                }}
              />
              <Label htmlFor={`advisor-${key}`}>{label}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('management'); setCurrentSection('tax'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Management Preferences
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Tax Considerations Section
  const renderTaxConsiderations = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Tax Considerations</h3>
        <p className="text-gray-600">
          Optimize your investment strategy for tax efficiency based on your situation.
        </p>
      </div>

      {/* Tax Bracket and Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Situation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estimated Tax Bracket</Label>
              <Select
                value={preferences.taxConsiderations.taxBracket}
                onValueChange={(value: string) => updatePreferences('taxConsiderations', { taxBracket: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10%">10% ($0 - $11,000)</SelectItem>
                  <SelectItem value="12%">12% ($11,001 - $44,725)</SelectItem>
                  <SelectItem value="22%">22% ($44,726 - $95,375)</SelectItem>
                  <SelectItem value="24%">24% ($95,376 - $182,050)</SelectItem>
                  <SelectItem value="32%">32% ($182,051 - $231,250)</SelectItem>
                  <SelectItem value="35%">35% ($231,251 - $578,125)</SelectItem>
                  <SelectItem value="37%">37% ($578,126+)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="municipal-bonds"
                  checked={preferences.taxConsiderations.municipalBonds}
                  onCheckedChange={(checked) => updatePreferences('taxConsiderations', { municipalBonds: checked })}
                />
                <Label htmlFor="municipal-bonds">Consider Municipal Bonds</Label>
              </div>
              <p className="text-xs text-gray-500">Tax-free bonds (good for higher tax brackets)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Types */}
      <Card>
        <CardHeader>
          <CardTitle>Investment Account Types</CardTitle>
          <p className="text-gray-600">Which types of investment accounts do you want to use?</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: 'taxable', label: 'Taxable Brokerage Account', desc: 'No restrictions, but subject to capital gains tax' },
            { key: 'ira-traditional', label: 'Traditional IRA', desc: 'Tax-deductible contributions, taxed on withdrawal' },
            { key: 'ira-roth', label: 'Roth IRA', desc: 'After-tax contributions, tax-free growth and withdrawals' },
            { key: '401k', label: '401(k) Rollover', desc: 'Rollover from employer plan' },
            { key: '529', label: '529 Education Plan', desc: 'Tax-advantaged education savings' },
            { key: 'hsa', label: 'HSA Investment', desc: 'Triple tax advantage for medical expenses' }
          ].map(account => (
            <div key={account.key} className="border rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`account-${account.key}`}
                  checked={preferences.taxConsiderations.accountTypes.includes(account.key as any)}
                  onCheckedChange={(checked) => {
                    const current = preferences.taxConsiderations.accountTypes;
                    const updated = checked 
                      ? [...current, account.key as any]
                      : current.filter(type => type !== account.key);
                    updatePreferences('taxConsiderations', { accountTypes: updated });
                  }}
                />
                <Label htmlFor={`account-${account.key}`} className="font-medium">{account.label}</Label>
              </div>
              <p className="text-sm text-gray-600 mt-1 ml-6">{account.desc}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Tax Optimization Strategies */}
      <Card>
        <CardHeader>
          <CardTitle>Tax Optimization Strategies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tax-deferred"
                checked={preferences.taxConsiderations.taxDeferred}
                onCheckedChange={(checked) => updatePreferences('taxConsiderations', { taxDeferred: checked })}
              />
              <Label htmlFor="tax-deferred">Tax-Deferred Growth Strategies</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="tax-free"
                checked={preferences.taxConsiderations.taxFree}
                onCheckedChange={(checked) => updatePreferences('taxConsiderations', { taxFree: checked })}
              />
              <Label htmlFor="tax-free">Tax-Free Growth Strategies</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="asset-location"
                checked={preferences.taxConsiderations.assetLocation}
                onCheckedChange={(checked) => updatePreferences('taxConsiderations', { assetLocation: checked })}
              />
              <Label htmlFor="asset-location">Asset Location Optimization</Label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Place tax-inefficient investments in tax-advantaged accounts
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('tax'); setCurrentSection('review'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Tax Preferences
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Review Section
  const renderReview = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Review Your Investment Preferences</h3>
        <p className="text-gray-600">
          Review all your investment preferences before proceeding to goal-based planning.
        </p>
      </div>

      {/* Asset Allocation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="w-5 h-5 mr-2" />
            Asset Allocation Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-5 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{preferences.assetClassPreferences.stocks.allocation}%</div>
              <div className="text-sm text-blue-700">Stocks</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{preferences.assetClassPreferences.bonds.allocation}%</div>
              <div className="text-sm text-green-700">Bonds</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{preferences.assetClassPreferences.realEstate.allocation}%</div>
              <div className="text-sm text-yellow-700">Real Estate</div>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{preferences.assetClassPreferences.alternatives.allocation}%</div>
              <div className="text-sm text-purple-700">Alternatives</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">{preferences.assetClassPreferences.cash.allocation}%</div>
              <div className="text-sm text-gray-700">Cash</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Geographic Allocation Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Globe className="w-5 h-5 mr-2" />
            Geographic Allocation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{preferences.geographicPreferences.domesticAllocation}%</div>
              <div className="text-sm text-blue-700">🇺🇸 Domestic</div>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{preferences.geographicPreferences.developedMarketsAllocation}%</div>
              <div className="text-sm text-green-700">🌍 Developed</div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{preferences.geographicPreferences.emergingMarketsAllocation}%</div>
              <div className="text-sm text-yellow-700">🚀 Emerging</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ESG and Management Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Leaf className="w-5 h-5 mr-2" />
              ESG Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Importance:</strong> {preferences.esgPreferences.importanceLevel.replace('-', ' ')}</div>
              {preferences.esgPreferences.exclusions.length > 0 && (
                <div><strong>Exclusions:</strong> {preferences.esgPreferences.exclusions.join(', ')}</div>
              )}
              <div><strong>Impact Investing:</strong> {preferences.esgPreferences.impactInvesting ? 'Yes' : 'No'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Management Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div><strong>Active vs Passive:</strong> {preferences.managementPreferences.activeVsPassive.replace('-', ' ')}</div>
              <div><strong>Fee Sensitivity:</strong> {preferences.managementPreferences.feesSensitivity.replace('-', ' ')}</div>
              <div><strong>Rebalancing:</strong> {preferences.managementPreferences.rebalancingFrequency}</div>
              <div><strong>Tax-Loss Harvesting:</strong> {preferences.managementPreferences.taxLossHarvesting ? 'Enabled' : 'Disabled'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Considerations Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="w-5 h-5 mr-2" />
            Tax Considerations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <div><strong>Tax Bracket:</strong> {preferences.taxConsiderations.taxBracket}</div>
              <div><strong>Account Types:</strong> {preferences.taxConsiderations.accountTypes.length} selected</div>
            </div>
            <div>
              <div><strong>Municipal Bonds:</strong> {preferences.taxConsiderations.municipalBonds ? 'Yes' : 'No'}</div>
              <div><strong>Asset Location:</strong> {preferences.taxConsiderations.assetLocation ? 'Optimized' : 'Standard'}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {completedSections.size < 5 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">Please complete all preference sections before proceeding.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Render current section
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'asset-classes':
        return renderAssetClasses();
      case 'geographic':
        return renderGeographicPreferences();
      case 'esg':
        return renderESGPreferences();
      case 'management':
        return renderManagementPreferences();
      case 'tax':
        return renderTaxConsiderations();
      case 'review':
        return renderReview();
      default:
        return renderAssetClasses();
    }
  };

  const canProceedToNext = () => {
    return completedSections.size >= 5 && currentSection === 'review';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Investment Preferences Setup
        </h1>
        <p className="text-lg text-gray-600">
          Customize your investment strategy based on your preferences for asset classes, geography, values, and management style.
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
            {Object.entries(PREFERENCE_SECTIONS).map(([key, { title, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setCurrentSection(key as PreferenceSection)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  currentSection === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : completedSections.has(key as PreferenceSection)
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{title}</span>
                {completedSections.has(key as PreferenceSection) && (
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
          onClick={currentSection === 'asset-classes' ? onPrevious : () => {
            const sections: PreferenceSection[] = ['asset-classes', 'geographic', 'esg', 'management', 'tax', 'review'];
            const currentIndex = sections.indexOf(currentSection);
            if (currentIndex > 0) {
              setCurrentSection(sections[currentIndex - 1]);
            }
          }}
          variant="outline"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentSection === 'asset-classes' ? 'Previous Step' : 'Previous Section'}
        </Button>

        <div className="text-sm text-gray-500">
          {currentSection === 'review' ? 'Preferences Complete' : 'Complete all sections to review'}
        </div>

        {currentSection === 'review' ? (
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
                <span>Continue to Goal Planning</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => {
              const sections: PreferenceSection[] = ['asset-classes', 'geographic', 'esg', 'management', 'tax', 'review'];
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

export default InvestmentPreferencesSetup;
