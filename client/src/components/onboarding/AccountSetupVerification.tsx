import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Progress } from '../ui/progress';
import { 
  Shield,
  Upload,
  FileText,
  Camera,
  Check,
  X,
  Clock,
  AlertCircle,
  CheckCircle,
  Users,
  Building,
  CreditCard,
  Banknote,
  Eye,
  EyeOff,
  Lock,
  Key,
  Zap,
  UserCheck,
  FileCheck,
  Target,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Info,
  Star,
  Award,
  Lightbulb
} from 'lucide-react';
import { AccountSetup, ClientInformation, FinancialGoal } from './types';
import { KYCVerificationPage } from '../kyc/KYCVerificationPage';

interface AccountSetupVerificationProps {
  accountSetup: Partial<AccountSetup>;
  clientInfo: ClientInformation;
  goals: FinancialGoal[];
  onDataChange: (data: Partial<AccountSetup>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

// Setup sections
type SetupSection = 'account-types' | 'kyc-verification' | 'funding' | 'beneficiaries' | 'agreements' | 'review';

const SETUP_SECTIONS = {
  'account-types': { title: 'Account Types', icon: Building, description: 'Choose your investment accounts' },
  'kyc-verification': { title: 'Identity Verification', icon: Shield, description: 'Complete KYC requirements' },
  'funding': { title: 'Funding Setup', icon: Banknote, description: 'Set up initial funding' },
  'beneficiaries': { title: 'Beneficiaries', icon: Users, description: 'Add beneficiary information' },
  'agreements': { title: 'Legal Agreements', icon: FileText, description: 'Review and sign agreements' },
  'review': { title: 'Final Review', icon: CheckCircle, description: 'Complete account setup' }
};

// Account type configurations
const ACCOUNT_TYPES = {
  taxable: {
    title: 'Taxable Investment Account',
    description: 'Standard investment account with no contribution limits',
    icon: Building,
    features: ['No contribution limits', 'Full liquidity', 'Taxed on gains/income', 'Flexible withdrawals'],
    minDeposit: 1000,
    recommended: true,
    taxAdvantages: ['Tax-loss harvesting', 'Asset location optimization'],
    considerations: ['Capital gains tax applies', 'Dividends are taxable']
  },
  'ira-traditional': {
    title: 'Traditional IRA',
    description: 'Tax-deferred retirement savings account',
    icon: Shield,
    features: ['Tax-deductible contributions', 'Tax-deferred growth', 'RMDs at age 73', '$7,000 annual limit'],
    minDeposit: 100,
    recommended: false,
    taxAdvantages: ['Immediate tax deduction', 'Tax-deferred growth'],
    considerations: ['Early withdrawal penalties', 'Required minimum distributions']
  },
  'ira-roth': {
    title: 'Roth IRA',
    description: 'Tax-free retirement savings account',
    icon: Star,
    features: ['After-tax contributions', 'Tax-free growth', 'Tax-free withdrawals', '$7,000 annual limit'],
    minDeposit: 100,
    recommended: false,
    taxAdvantages: ['Tax-free growth', 'Tax-free qualified withdrawals', 'No RMDs'],
    considerations: ['No immediate tax deduction', 'Income limits apply']
  },
  '401k-rollover': {
    title: '401(k) Rollover IRA',
    description: 'Rollover funds from employer 401(k) plan',
    icon: Building,
    features: ['Direct rollover from 401(k)', 'No contribution limits', 'Preserve tax benefits', 'More investment options'],
    minDeposit: 0,
    recommended: false,
    taxAdvantages: ['Maintain tax-deferred status', 'Avoid early withdrawal penalties'],
    considerations: ['May lose loan options', 'Consider timing of rollover']
  },
  trust: {
    title: 'Trust Account',
    description: 'Investment account for trust entities',
    icon: Users,
    features: ['Trust entity investments', 'Professional management', 'Estate planning benefits', 'Tax pass-through'],
    minDeposit: 25000,
    recommended: false,
    taxAdvantages: ['Estate planning benefits', 'Tax efficiency'],
    considerations: ['Higher minimums', 'Complex tax reporting', 'Legal documentation required']
  }
};

// Funding methods
const FUNDING_METHODS = {
  'bank-transfer': {
    title: 'Bank Transfer (ACH)',
    description: 'Electronic transfer from your bank account',
    timeframe: '3-5 business days',
    fees: 'Free',
    limits: 'Up to $250,000 per day',
    icon: Banknote
  },
  wire: {
    title: 'Wire Transfer',
    description: 'Same-day transfer for large amounts',
    timeframe: 'Same business day',
    fees: '$25-50',
    limits: 'No limit',
    icon: Zap
  },
  check: {
    title: 'Check Deposit',
    description: 'Mail a check for deposit',
    timeframe: '7-10 business days',
    fees: 'Free',
    limits: 'Up to $100,000',
    icon: FileText
  },
  rollover: {
    title: '401(k) Rollover',
    description: 'Direct rollover from employer plan',
    timeframe: '1-2 weeks',
    fees: 'Free',
    limits: 'No limit',
    icon: Building
  }
};

// Required agreements
const AGREEMENTS = {
  'client-agreement': {
    title: 'Client Agreement',
    description: 'Terms and conditions for investment services',
    required: true,
    pages: 12,
    keyPoints: [
      'Investment advisory services and fees',
      'Account management procedures',
      'Risk disclosures and limitations',
      'Privacy policy and data usage'
    ]
  },
  'trading-agreement': {
    title: 'Trading Authorization',
    description: 'Authorization for trading activities',
    required: true,
    pages: 6,
    keyPoints: [
      'Trading authorization and limitations',
      'Order execution procedures',
      'Market data and research usage',
      'Electronic delivery consent'
    ]
  },
  'advisory-agreement': {
    title: 'Investment Advisory Agreement',
    description: 'Formal advisory relationship terms',
    required: true,
    pages: 8,
    keyPoints: [
      'Advisory services and methodology',
      'Fee structure and billing',
      'Performance reporting procedures',
      'Termination procedures'
    ]
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    description: 'Data protection and privacy practices',
    required: true,
    pages: 4,
    keyPoints: [
      'Information collection and usage',
      'Data sharing and protection',
      'Third-party service providers',
      'Opt-out procedures'
    ]
  }
};

export const AccountSetupVerification: React.FC<AccountSetupVerificationProps> = ({
  accountSetup,
  clientInfo,
  goals,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<SetupSection>('account-types');
  const [progress, setProgress] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<SetupSection>>(new Set());
  const [showKYCModal, setShowKYCModal] = useState(false);

  // Initialize account setup data
  const [setupData, setSetupData] = useState<AccountSetup>({
    accountTypes: [],
    kycStatus: 'pending',
    documentsUploaded: [],
    beneficiaries: [],
    tradingPermissions: [],
    agreements: [],
    fundingMethod: {
      type: 'bank-transfer',
      initialAmount: 10000,
      status: 'pending'
    },
    ...accountSetup
  });

  // Update progress
  useEffect(() => {
    const totalSections = Object.keys(SETUP_SECTIONS).length - 1; // Exclude review
    const progress = (completedSections.size / totalSections) * 100;
    setProgress(progress);
  }, [completedSections]);

  // Update parent component when data changes
  useEffect(() => {
    onDataChange(setupData);
  }, [setupData, onDataChange]);

  const updateSetupData = useCallback((updates: Partial<AccountSetup>) => {
    setSetupData(prev => ({ ...prev, ...updates }));
  }, []);

  const markSectionComplete = (section: SetupSection) => {
    setCompletedSections(prev => new Set([...prev, section]));
  };

  // Add beneficiary
  const addBeneficiary = () => {
    const newBeneficiary = {
      id: `beneficiary-${Date.now()}`,
      name: '',
      relationship: '',
      percentage: 0,
      address: '',
      dateOfBirth: '',
      ssn: ''
    };
    
    updateSetupData({
      beneficiaries: [...setupData.beneficiaries, newBeneficiary]
    });
  };

  // Update beneficiary
  const updateBeneficiary = (id: string, updates: any) => {
    const updatedBeneficiaries = setupData.beneficiaries.map(b => 
      b.id === id ? { ...b, ...updates } : b
    );
    updateSetupData({ beneficiaries: updatedBeneficiaries });
  };

  // Remove beneficiary
  const removeBeneficiary = (id: string) => {
    updateSetupData({
      beneficiaries: setupData.beneficiaries.filter(b => b.id !== id)
    });
  };

  // Sign agreement
  const signAgreement = (agreementType: string) => {
    const newAgreement = {
      type: agreementType as any,
      signed: true,
      signedDate: new Date().toISOString(),
      version: '1.0'
    };

    const existingIndex = setupData.agreements.findIndex(a => a.type === agreementType);
    const updatedAgreements = existingIndex >= 0 
      ? setupData.agreements.map((a, i) => i === existingIndex ? newAgreement : a)
      : [...setupData.agreements, newAgreement];

    updateSetupData({ agreements: updatedAgreements });
  };

  // Render Account Types Section
  const renderAccountTypes = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Choose Your Investment Accounts</h3>
        <p className="text-gray-600">
          Select the types of investment accounts that best fit your goals and tax situation.
        </p>
      </div>

      {/* Recommended Account Based on Profile */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Lightbulb className="w-5 h-5 mr-2" />
            Recommended for Your Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-blue-700 mb-4">
            Based on your age ({clientInfo?.personal?.age}), income (${clientInfo?.financial?.annualIncome?.toLocaleString()}), 
            and goals, we recommend starting with a taxable investment account.
          </p>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">Taxable Investment Account - Recommended</span>
          </div>
        </CardContent>
      </Card>

      {/* Account Type Cards */}
      <div className="grid gap-6">
        {Object.entries(ACCOUNT_TYPES).map(([key, accountType]) => {
          const isSelected = setupData.accountTypes.some(at => at.type === key);
          
          return (
            <Card 
              key={key} 
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'hover:border-gray-300 hover:shadow-md'
              } ${accountType.recommended ? 'ring-2 ring-blue-200' : ''}`}
              onClick={() => {
                const updatedTypes = isSelected
                  ? setupData.accountTypes.filter(at => at.type !== key)
                  : [...setupData.accountTypes, {
                      type: key as any,
                      initialFunding: accountType.minDeposit,
                      recurringContributions: {
                        amount: 1000,
                        frequency: 'monthly' as any,
                        startDate: new Date().toISOString().split('T')[0]
                      },
                      taxLotMethod: 'tax-optimized' as any
                    }];
                updateSetupData({ accountTypes: updatedTypes });
              }}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <accountType.icon className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{accountType.title}</span>
                        {accountType.recommended && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            Recommended
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-gray-600">{accountType.description}</p>
                    </div>
                  </div>
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-300'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Key Features</Label>
                    <ul className="text-sm text-gray-600 space-y-1 mt-1">
                      {accountType.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Tax Advantages</Label>
                    <ul className="text-sm text-gray-600 space-y-1 mt-1">
                      {accountType.taxAdvantages.map((advantage, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span>{advantage}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Minimum Deposit: <strong>${accountType.minDeposit.toLocaleString()}</strong></span>
                </div>

                {isSelected && (
                  <div className="p-4 bg-white rounded-lg border border-blue-200">
                    <Label className="text-sm font-medium text-gray-700 block mb-3">Initial Funding Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-gray-400">$</span>
                      <Input
                        type="number"
                        min={accountType.minDeposit}
                        value={setupData.accountTypes.find(at => at.type === key)?.initialFunding || accountType.minDeposit}
                        onChange={(e) => {
                          const updatedTypes = setupData.accountTypes.map(at => 
                            at.type === key 
                              ? { ...at, initialFunding: parseFloat(e.target.value) || accountType.minDeposit }
                              : at
                          );
                          updateSetupData({ accountTypes: updatedTypes });
                        }}
                        className="pl-8"
                        placeholder={accountType.minDeposit.toString()}
                      />
                    </div>
                  </div>
                )}

                {accountType.considerations && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-xs text-yellow-800 font-medium mb-1">Important Considerations:</p>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      {accountType.considerations.map((consideration, idx) => (
                        <li key={idx}>• {consideration}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {setupData.accountTypes.length === 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">Please select at least one account type to continue.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('account-types'); setCurrentSection('kyc-verification'); }}
          disabled={setupData.accountTypes.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continue to Verification
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render KYC Verification Section
  const renderKYCVerification = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Identity Verification (KYC)</h3>
        <p className="text-gray-600">
          Complete the Know Your Customer (KYC) process to verify your identity and comply with regulatory requirements.
        </p>
      </div>

      {/* KYC Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                setupData.kycStatus === 'completed' || setupData.kycStatus === 'approved' 
                  ? 'bg-green-100' 
                  : setupData.kycStatus === 'in-progress' 
                    ? 'bg-yellow-100'
                    : 'bg-gray-100'
              }`}>
                {setupData.kycStatus === 'completed' || setupData.kycStatus === 'approved' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : setupData.kycStatus === 'in-progress' ? (
                  <Clock className="w-6 h-6 text-yellow-600" />
                ) : (
                  <Shield className="w-6 h-6 text-gray-600" />
                )}
              </div>
              
              <div>
                <div className="font-semibold text-lg capitalize">
                  {setupData.kycStatus.replace('-', ' ')}
                </div>
                <div className="text-gray-600">
                  {setupData.kycStatus === 'pending' && 'Ready to start verification process'}
                  {setupData.kycStatus === 'in-progress' && 'Verification documents under review'}
                  {setupData.kycStatus === 'completed' && 'Identity verification completed successfully'}
                  {setupData.kycStatus === 'approved' && 'Account approved and ready for funding'}
                  {setupData.kycStatus === 'rejected' && 'Additional documentation required'}
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowKYCModal(true)}
              disabled={setupData.kycStatus === 'approved'}
              className={
                setupData.kycStatus === 'completed' || setupData.kycStatus === 'approved'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {setupData.kycStatus === 'pending' && 'Start Verification'}
              {setupData.kycStatus === 'in-progress' && 'Continue Verification'}
              {setupData.kycStatus === 'completed' && 'Review Verification'}
              {setupData.kycStatus === 'approved' && 'Verification Complete'}
              {setupData.kycStatus === 'rejected' && 'Retry Verification'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Required Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Required Documents
          </CardTitle>
          <p className="text-gray-600">Please have the following documents ready for verification</p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { type: 'identity', title: 'Government-Issued ID', desc: 'Driver\'s license, passport, or state ID' },
              { type: 'address-proof', title: 'Proof of Address', desc: 'Utility bill, bank statement (within 90 days)' },
              { type: 'income-verification', title: 'Income Verification', desc: 'Recent pay stub, tax return, or bank statements' },
              { type: 'tax-documents', title: 'Tax Documents', desc: 'Recent tax returns or W-2 forms' }
            ].map((doc) => {
              const isUploaded = setupData.documentsUploaded.some(d => d.type === doc.type && d.status === 'verified');
              const isPending = setupData.documentsUploaded.some(d => d.type === doc.type && d.status === 'uploaded');
              
              return (
                <div key={doc.type} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-1 ${
                    isUploaded ? 'bg-green-100' : isPending ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    {isUploaded ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : isPending ? (
                      <Clock className="w-4 h-4 text-yellow-600" />
                    ) : (
                      <FileText className="w-4 h-4 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{doc.title}</div>
                    <div className="text-sm text-gray-600">{doc.desc}</div>
                    {isUploaded && (
                      <div className="text-xs text-green-600 mt-1">✓ Verified</div>
                    )}
                    {isPending && (
                      <div className="text-xs text-yellow-600 mt-1">⏳ Under Review</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Lock className="w-5 h-5 mr-2" />
            Security & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span>Bank-level 256-bit encryption protects your documents</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span>Documents are automatically deleted after verification</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span>FINRA and SEC regulated for your protection</span>
            </li>
            <li className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span>Personal information is never shared with third parties</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* KYC Modal */}
      {showKYCModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Identity Verification</h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowKYCModal(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="h-full overflow-y-auto">
              <KYCVerificationPage
                onComplete={(kycData) => {
                  updateSetupData({ 
                    kycStatus: 'completed',
                    documentsUploaded: [
                      { type: 'identity', status: 'verified', fileName: 'identity.pdf', uploadDate: new Date().toISOString() },
                      { type: 'address-proof', status: 'verified', fileName: 'address.pdf', uploadDate: new Date().toISOString() },
                    ]
                  });
                  setShowKYCModal(false);
                  markSectionComplete('kyc-verification');
                  setCurrentSection('funding');
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('kyc-verification'); setCurrentSection('funding'); }}
          disabled={setupData.kycStatus !== 'completed' && setupData.kycStatus !== 'approved'}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continue to Funding Setup
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Funding Setup Section
  const renderFundingSetup = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Set Up Initial Funding</h3>
        <p className="text-gray-600">
          Choose how you'd like to fund your investment account and set your initial deposit amount.
        </p>
      </div>

      {/* Initial Funding Amount */}
      <Card>
        <CardHeader>
          <CardTitle>Initial Investment Amount</CardTitle>
          <p className="text-gray-600">How much would you like to invest initially?</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Label htmlFor="initialAmount" className="text-lg font-medium">Initial Deposit Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-400 text-lg">$</span>
              <Input
                id="initialAmount"
                type="number"
                min="1000"
                value={setupData.fundingMethod.initialAmount}
                onChange={(e) => updateSetupData({
                  fundingMethod: {
                    ...setupData.fundingMethod,
                    initialAmount: parseFloat(e.target.value) || 1000
                  }
                })}
                className="pl-8 text-lg"
                placeholder="10000"
              />
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="flex flex-wrap gap-2">
              {[5000, 10000, 25000, 50000, 100000].map(amount => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => updateSetupData({
                    fundingMethod: {
                      ...setupData.fundingMethod,
                      initialAmount: amount
                    }
                  })}
                  className={setupData.fundingMethod.initialAmount === amount ? 'border-blue-500 bg-blue-50' : ''}
                >
                  ${amount.toLocaleString()}
                </Button>
              ))}
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-800 text-sm">
                💡 Consider starting with ${Math.max(10000, Math.min(50000, (clientInfo?.financial?.liquidAssets || 0) * 0.1)).toLocaleString()} 
                based on your liquid assets (${clientInfo?.financial?.liquidAssets?.toLocaleString() || 0}).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funding Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Funding Method</CardTitle>
          <p className="text-gray-600">Select how you'd like to transfer funds to your account</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(FUNDING_METHODS).map(([key, method]) => {
              const isSelected = setupData.fundingMethod.type === key;
              
              return (
                <div
                  key={key}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                  }`}
                  onClick={() => updateSetupData({
                    fundingMethod: { ...setupData.fundingMethod, type: key as any }
                  })}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <method.icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      <div>
                        <div className="font-semibold">{method.title}</div>
                        <div className="text-sm text-gray-600">{method.description}</div>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Timeframe</div>
                      <div className="font-medium">{method.timeframe}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Fees</div>
                      <div className="font-medium">{method.fees}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Limits</div>
                      <div className="font-medium">{method.limits}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Bank Account Details (if ACH selected) */}
      {setupData.fundingMethod.type === 'bank-transfer' && (
        <Card>
          <CardHeader>
            <CardTitle>Bank Account Details</CardTitle>
            <p className="text-gray-600">Enter your bank account information for ACH transfer</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Bank Name</Label>
                <Input
                  value={setupData.fundingMethod.bankInfo?.bankName || ''}
                  onChange={(e) => updateSetupData({
                    fundingMethod: {
                      ...setupData.fundingMethod,
                      bankInfo: {
                        ...setupData.fundingMethod.bankInfo,
                        bankName: e.target.value,
                        routingNumber: setupData.fundingMethod.bankInfo?.routingNumber || '',
                        accountNumber: setupData.fundingMethod.bankInfo?.accountNumber || '',
                        accountType: setupData.fundingMethod.bankInfo?.accountType || 'checking'
                      }
                    }
                  })}
                  placeholder="Chase Bank"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Account Type</Label>
                <Select
                  value={setupData.fundingMethod.bankInfo?.accountType || 'checking'}
                  onValueChange={(value: any) => updateSetupData({
                    fundingMethod: {
                      ...setupData.fundingMethod,
                      bankInfo: {
                        ...setupData.fundingMethod.bankInfo!,
                        accountType: value
                      }
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Routing Number</Label>
                <Input
                  value={setupData.fundingMethod.bankInfo?.routingNumber || ''}
                  onChange={(e) => updateSetupData({
                    fundingMethod: {
                      ...setupData.fundingMethod,
                      bankInfo: {
                        ...setupData.fundingMethod.bankInfo!,
                        routingNumber: e.target.value
                      }
                    }
                  })}
                  placeholder="123456789"
                  maxLength={9}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={setupData.fundingMethod.bankInfo?.accountNumber || ''}
                  onChange={(e) => updateSetupData({
                    fundingMethod: {
                      ...setupData.fundingMethod,
                      bankInfo: {
                        ...setupData.fundingMethod.bankInfo!,
                        accountNumber: e.target.value
                      }
                    }
                  })}
                  placeholder="1234567890"
                />
              </div>
            </div>

            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-yellow-800 text-sm">
                🔒 Your bank information is encrypted and securely stored. We use bank-level security to protect your data.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('funding'); setCurrentSection('beneficiaries'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continue to Beneficiaries
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Beneficiaries Section
  const renderBeneficiaries = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Add Beneficiaries</h3>
        <p className="text-gray-600">
          Designate beneficiaries for your investment accounts to ensure your assets are distributed according to your wishes.
        </p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-blue-800">
              <p className="font-medium mb-1">Important Information</p>
              <ul className="text-sm space-y-1">
                <li>• Beneficiaries will receive your account assets if something happens to you</li>
                <li>• You can update beneficiaries at any time after account opening</li>
                <li>• Percentages must total 100% across all beneficiaries</li>
                <li>• Adding beneficiaries is optional but highly recommended</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Beneficiary List */}
      <div className="space-y-4">
        {setupData.beneficiaries.map((beneficiary, index) => (
          <Card key={beneficiary.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Beneficiary {index + 1}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeBeneficiary(beneficiary.id)}
                >
                  <Minus className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={beneficiary.name}
                    onChange={(e) => updateBeneficiary(beneficiary.id, { name: e.target.value })}
                    placeholder="John Smith"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select
                    value={beneficiary.relationship}
                    onValueChange={(value) => updateBeneficiary(beneficiary.id, { relationship: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date of Birth</Label>
                  <Input
                    type="date"
                    value={beneficiary.dateOfBirth}
                    onChange={(e) => updateBeneficiary(beneficiary.id, { dateOfBirth: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Percentage (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={beneficiary.percentage}
                    onChange={(e) => updateBeneficiary(beneficiary.id, { percentage: parseFloat(e.target.value) || 0 })}
                    placeholder="50"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea
                  value={beneficiary.address}
                  onChange={(e) => updateBeneficiary(beneficiary.id, { address: e.target.value })}
                  placeholder="123 Main St, City, State 12345"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Beneficiary Button */}
        <div className="text-center">
          <Button onClick={addBeneficiary} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Add Beneficiary
          </Button>
        </div>
      </div>

      {/* Percentage Validation */}
      {setupData.beneficiaries.length > 0 && (
        <Card className={`border-2 ${
          setupData.beneficiaries.reduce((sum, b) => sum + b.percentage, 0) === 100 
            ? 'border-green-500 bg-green-50' 
            : 'border-yellow-500 bg-yellow-50'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {setupData.beneficiaries.reduce((sum, b) => sum + b.percentage, 0) === 100 ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              )}
              <span className="font-medium">
                Total Percentage: {setupData.beneficiaries.reduce((sum, b) => sum + b.percentage, 0)}%
              </span>
            </div>
            {setupData.beneficiaries.reduce((sum, b) => sum + b.percentage, 0) !== 100 && (
              <p className="text-sm text-yellow-700 mt-1">
                Percentages should total 100%. Currently {setupData.beneficiaries.reduce((sum, b) => sum + b.percentage, 0)}%.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('beneficiaries'); setCurrentSection('agreements'); }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Continue to Agreements
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Agreements Section
  const renderAgreements = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Review & Sign Agreements</h3>
        <p className="text-gray-600">
          Please review and electronically sign the required agreements to complete your account setup.
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(AGREEMENTS).map(([key, agreement]) => {
          const isSigned = setupData.agreements.some(a => a.type === key && a.signed);
          
          return (
            <Card key={key}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <span>{agreement.title}</span>
                        {agreement.required && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                            Required
                          </span>
                        )}
                      </CardTitle>
                      <p className="text-gray-600">{agreement.description}</p>
                      <p className="text-sm text-gray-500">{agreement.pages} pages</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isSigned && (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">Signed</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Key Points:</Label>
                  <ul className="text-sm text-gray-600 space-y-1 mt-1">
                    {agreement.keyPoints.map((point, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2"></div>
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="flex items-center justify-between">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Read Full Agreement
                  </Button>
                  
                  {!isSigned ? (
                    <Button 
                      onClick={() => signAgreement(key)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      I Agree & Sign
                    </Button>
                  ) : (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        Signed on {new Date(setupData.agreements.find(a => a.type === key)?.signedDate || '').toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Electronic Signature Notice */}
      <Card className="bg-gray-50 border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="w-5 h-5 mr-2 text-gray-600" />
            Electronic Signature Authorization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 text-sm mb-4">
            By clicking "I Agree & Sign" on any agreement above, you consent to use electronic signatures. 
            Electronic signatures have the same legal effect as handwritten signatures under the Electronic 
            Signatures in Global and National Commerce Act (E-SIGN Act) and Uniform Electronic Transactions Act (UETA).
          </p>
          <div className="flex items-center space-x-2">
            <Checkbox id="esign-consent" />
            <Label htmlFor="esign-consent" className="text-sm">
              I consent to the use of electronic signatures and agree that electronic signatures are legally binding
            </Label>
          </div>
        </CardContent>
      </Card>

      {Object.keys(AGREEMENTS).some(key => !setupData.agreements.some(a => a.type === key && a.signed)) && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              <p className="text-yellow-800">Please sign all required agreements to continue.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-center">
        <Button 
          onClick={() => { markSectionComplete('agreements'); setCurrentSection('review'); }}
          disabled={Object.keys(AGREEMENTS).some(key => !setupData.agreements.some(a => a.type === key && a.signed))}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Complete Account Setup
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );

  // Render Review Section
  const renderReview = () => {
    const totalInitialFunding = setupData.accountTypes.reduce((sum, at) => sum + at.initialFunding, 0);
    
    return (
      <div className="space-y-8">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Account Setup Complete!</h3>
          <p className="text-gray-600">
            Review your account configuration before proceeding to portfolio recommendations.
          </p>
        </div>

        {/* Success Card */}
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Account Successfully Configured</CardTitle>
            <p className="text-green-700">You're ready to start your wealth-building journey!</p>
          </CardHeader>
        </Card>

        {/* Account Summary */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Account Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {setupData.accountTypes.map((accountType, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">
                        {ACCOUNT_TYPES[accountType.type]?.title || accountType.type}
                      </div>
                      <div className="text-sm text-gray-600">
                        Initial: ${accountType.initialFunding.toLocaleString()}
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <div className="font-semibold text-lg">
                    Total Initial Investment: ${totalInitialFunding.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Verification Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span>Identity Verification</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600 capitalize">{setupData.kycStatus}</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Documents Uploaded</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">{setupData.documentsUploaded.length} verified</span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Agreements Signed</span>
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-600">{setupData.agreements.length} signed</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Funding Method */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Banknote className="w-5 h-5 mr-2" />
              Funding Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Method</div>
                <div className="font-medium">
                  {FUNDING_METHODS[setupData.fundingMethod.type]?.title || setupData.fundingMethod.type}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Initial Amount</div>
                <div className="font-medium">${setupData.fundingMethod.initialAmount.toLocaleString()}</div>
              </div>
              {setupData.fundingMethod.bankInfo && (
                <>
                  <div>
                    <div className="text-sm text-gray-600">Bank</div>
                    <div className="font-medium">{setupData.fundingMethod.bankInfo.bankName}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Account Type</div>
                    <div className="font-medium capitalize">{setupData.fundingMethod.bankInfo.accountType}</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Beneficiaries */}
        {setupData.beneficiaries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Beneficiaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {setupData.beneficiaries.map((beneficiary, idx) => (
                  <div key={beneficiary.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{beneficiary.name}</span>
                      <span className="text-gray-600 text-sm ml-2">({beneficiary.relationship})</span>
                    </div>
                    <span className="font-medium">{beneficiary.percentage}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Target className="w-5 h-5 mr-2" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-blue-700">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>Review your personalized portfolio recommendations</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>Finalize your investment strategy and allocations</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>Complete your initial funding to start investing</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <span>Access your personalized wealth management dashboard</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render current section
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'account-types':
        return renderAccountTypes();
      case 'kyc-verification':
        return renderKYCVerification();
      case 'funding':
        return renderFundingSetup();
      case 'beneficiaries':
        return renderBeneficiaries();
      case 'agreements':
        return renderAgreements();
      case 'review':
        return renderReview();
      default:
        return renderAccountTypes();
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
          Account Setup & Verification
        </h1>
        <p className="text-lg text-gray-600">
          Complete your account setup with secure verification, funding configuration, and legal agreements.
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
            {Object.entries(SETUP_SECTIONS).map(([key, { title, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setCurrentSection(key as SetupSection)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  currentSection === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : completedSections.has(key as SetupSection)
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{title}</span>
                {completedSections.has(key as SetupSection) && (
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
          onClick={currentSection === 'account-types' ? onPrevious : () => {
            const sections: SetupSection[] = ['account-types', 'kyc-verification', 'funding', 'beneficiaries', 'agreements', 'review'];
            const currentIndex = sections.indexOf(currentSection);
            if (currentIndex > 0) {
              setCurrentSection(sections[currentIndex - 1]);
            }
          }}
          variant="outline"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentSection === 'account-types' ? 'Previous Step' : 'Previous Section'}
        </Button>

        <div className="text-sm text-gray-500">
          {currentSection === 'review' ? 'Setup Complete' : 'Complete all sections to finish setup'}
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
                <span>Continue to Portfolio Recommendations</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        ) : (
          <Button
            onClick={() => {
              const sections: SetupSection[] = ['account-types', 'kyc-verification', 'funding', 'beneficiaries', 'agreements', 'review'];
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

export default AccountSetupVerification;
