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
  Lightbulb,
  Globe,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  BookOpen,
  Briefcase
} from 'lucide-react';
import { ClientInformation, PersonalDetails, FinancialDetails, InvestmentExperience, FinancialObjectives } from './types';
import { LoadingSpinner, LoadingOverlay } from '../ui/loading-states';

interface EnhancedDataCollectionProps {
  data: Partial<ClientInformation>;
  onDataChange: (data: Partial<ClientInformation>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

// Data collection sections
type DataSection = 'personal' | 'financial' | 'experience' | 'objectives' | 'kyc-verification' | 'review';

const DATA_SECTIONS = {
  'personal': { title: 'Personal Information', icon: UserCheck, description: 'Basic personal and contact details', estimatedTime: 3 },
  'financial': { title: 'Financial Profile', icon: DollarSign, description: 'Income, assets, and financial situation', estimatedTime: 8 },
  'experience': { title: 'Investment Experience', icon: TrendingUp, description: 'Your investment background and expertise', estimatedTime: 5 },
  'objectives': { title: 'Financial Objectives', icon: Target, description: 'Your financial goals and priorities', estimatedTime: 4 },
  'kyc-verification': { title: 'Identity Verification', icon: Shield, description: 'KYC/AML compliance and verification', estimatedTime: 6 },
  'review': { title: 'Review & Confirm', icon: CheckCircle, description: 'Review all information before proceeding', estimatedTime: 2 }
};

// KYC compliance levels
const KYC_LEVELS = {
  basic: {
    title: 'Basic Verification',
    description: 'Standard verification for most clients',
    requirements: ['Government-issued ID', 'Proof of address', 'SSN verification'],
    maxInvestment: 250000,
    features: ['Standard investment products', 'Basic account types', 'Standard reporting']
  },
  enhanced: {
    title: 'Enhanced Verification',
    description: 'Additional verification for higher limits',
    requirements: ['Income verification', 'Employment verification', 'Bank statements', 'Enhanced due diligence'],
    maxInvestment: 1000000,
    features: ['All investment products', 'Advanced account types', 'Priority support', 'Enhanced reporting']
  },
  institutional: {
    title: 'Institutional Verification',
    description: 'Comprehensive verification for institutional clients',
    requirements: ['Corporate documents', 'Beneficial ownership', 'Source of funds', 'FATCA/CRS compliance'],
    maxInvestment: null,
    features: ['All products & services', 'Dedicated relationship manager', 'Custom solutions', 'Institutional pricing']
  }
};

// Employment status options with detailed descriptions
const EMPLOYMENT_OPTIONS = {
  'employed': { label: 'Full-time Employee', description: 'Regular salary from employer', icon: Briefcase },
  'self-employed': { label: 'Self-Employed/Business Owner', description: 'Own business or freelance work', icon: Building },
  'unemployed': { label: 'Currently Unemployed', description: 'Actively seeking employment', icon: Users },
  'retired': { label: 'Retired', description: 'No longer actively working', icon: Clock },
  'student': { label: 'Student', description: 'Full-time student', icon: BookOpen }
};

// Income sources with validation
const INCOME_SOURCES = {
  salary: { label: 'Salary/Wages', min: 0, max: 10000000, typical: [30000, 200000] },
  business: { label: 'Business Income', min: 0, max: 50000000, typical: [20000, 1000000] },
  investments: { label: 'Investment Income', min: 0, max: 10000000, typical: [5000, 500000] },
  pension: { label: 'Pension/Retirement', min: 0, max: 5000000, typical: [15000, 100000] },
  other: { label: 'Other Income', min: 0, max: 5000000, typical: [0, 50000] }
};

export const EnhancedDataCollection: React.FC<EnhancedDataCollectionProps> = ({
  data,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<DataSection>('personal');
  const [progress, setProgress] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<DataSection>>(new Set());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showAdvancedFields, setShowAdvancedFields] = useState(false);

  // Initialize client information
  const [clientInfo, setClientInfo] = useState<ClientInformation>({
    personal: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      age: 0,
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'United States'
      },
      occupation: '',
      employer: '',
      employmentStatus: 'employed',
      maritalStatus: 'single',
      dependents: 0,
      citizenshipStatus: 'citizen',
      taxResidency: ['United States']
    },
    financial: {
      annualIncome: 0,
      incomeStability: 'stable',
      incomeSources: ['salary'],
      netWorth: 0,
      liquidAssets: 0,
      totalAssets: {
        cash: 0,
        stocks: 0,
        bonds: 0,
        realEstate: 0,
        crypto: 0,
        retirement: 0,
        other: 0
      },
      totalDebts: {
        mortgage: 0,
        studentLoans: 0,
        creditCards: 0,
        other: 0
      },
      monthlyExpenses: 0,
      emergencyFund: 0,
      expectedInheritance: 0,
      expectedMajorExpenses: []
    },
    experience: {
      overallExperience: 'limited',
      yearsInvesting: 0,
      assetClassExperience: {
        stocks: 'limited',
        bonds: 'none',
        realEstate: 'none',
        crypto: 'none',
        alternatives: 'none',
        options: 'none'
      },
      tradingFrequency: 'rarely',
      largestLoss: 0,
      professionalAdvice: 'sometimes',
      investmentEducation: ['self-taught']
    },
    objectives: {
      primaryObjective: 'balanced',
      timeHorizon: 'long',
      planToRetire: true,
      retirementAge: 65,
      legacyPlanning: false,
      majorLifeEvents: [],
      importanceRanking: {
        retirement: 1,
        education: 2,
        homeOwnership: 3,
        business: 4,
        travel: 5,
        legacy: 6
      }
    },
    ...data
  });

  // Update progress based on completed sections
  useEffect(() => {
    const totalSections = Object.keys(DATA_SECTIONS).length - 1; // Exclude review
    const completedCount = completedSections.size;
    setProgress((completedCount / totalSections) * 100);
  }, [completedSections]);

  // Auto-calculate age from date of birth
  useEffect(() => {
    if (clientInfo.personal.dateOfBirth) {
      const birthDate = new Date(clientInfo.personal.dateOfBirth);
      const age = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      updatePersonalInfo({ age });
    }
  }, [clientInfo.personal.dateOfBirth]);

  // Auto-calculate net worth
  useEffect(() => {
    const totalAssetValue = Object.values(clientInfo.financial.totalAssets).reduce((sum, val) => sum + val, 0);
    const totalDebtValue = Object.values(clientInfo.financial.totalDebts).reduce((sum, val) => sum + val, 0);
    const netWorth = totalAssetValue - totalDebtValue;
    
    if (netWorth !== clientInfo.financial.netWorth) {
      updateFinancialInfo({ netWorth });
    }
  }, [clientInfo.financial.totalAssets, clientInfo.financial.totalDebts]);

  // Update functions
  const updatePersonalInfo = useCallback((updates: Partial<PersonalDetails>) => {
    const updatedPersonal = { ...clientInfo.personal, ...updates };
    const updatedClientInfo = { ...clientInfo, personal: updatedPersonal };
    setClientInfo(updatedClientInfo);
    onDataChange(updatedClientInfo);
  }, [clientInfo, onDataChange]);

  const updateFinancialInfo = useCallback((updates: Partial<FinancialDetails>) => {
    const updatedFinancial = { ...clientInfo.financial, ...updates };
    const updatedClientInfo = { ...clientInfo, financial: updatedFinancial };
    setClientInfo(updatedClientInfo);
    onDataChange(updatedClientInfo);
  }, [clientInfo, onDataChange]);

  const updateExperienceInfo = useCallback((updates: Partial<InvestmentExperience>) => {
    const updatedExperience = { ...clientInfo.experience, ...updates };
    const updatedClientInfo = { ...clientInfo, experience: updatedExperience };
    setClientInfo(updatedClientInfo);
    onDataChange(updatedClientInfo);
  }, [clientInfo, onDataChange]);

  const updateObjectivesInfo = useCallback((updates: Partial<FinancialObjectives>) => {
    const updatedObjectives = { ...clientInfo.objectives, ...updates };
    const updatedClientInfo = { ...clientInfo, objectives: updatedObjectives };
    setClientInfo(updatedClientInfo);
    onDataChange(updatedClientInfo);
  }, [clientInfo, onDataChange]);

  // Validation functions
  const validateSection = (section: DataSection): boolean => {
    const errors: Record<string, string> = {};

    switch (section) {
      case 'personal':
        if (!clientInfo.personal.firstName.trim()) errors.firstName = 'First name is required';
        if (!clientInfo.personal.lastName.trim()) errors.lastName = 'Last name is required';
        if (!clientInfo.personal.email.trim()) errors.email = 'Email is required';
        if (!/^\S+@\S+\.\S+$/.test(clientInfo.personal.email)) errors.email = 'Valid email is required';
        if (!clientInfo.personal.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
        if (clientInfo.personal.age < 18) errors.age = 'Must be 18 or older';
        if (!clientInfo.personal.phone.trim()) errors.phone = 'Phone number is required';
        break;

      case 'financial':
        if (clientInfo.financial.annualIncome <= 0) errors.annualIncome = 'Annual income is required';
        if (clientInfo.financial.monthlyExpenses <= 0) errors.monthlyExpenses = 'Monthly expenses are required';
        if (clientInfo.financial.monthlyExpenses > clientInfo.financial.annualIncome / 12) {
          errors.monthlyExpenses = 'Monthly expenses cannot exceed monthly income';
        }
        break;

      case 'experience':
        if (!clientInfo.experience.overallExperience) errors.overallExperience = 'Investment experience is required';
        break;

      case 'objectives':
        if (!clientInfo.objectives.primaryObjective) errors.primaryObjective = 'Primary objective is required';
        if (!clientInfo.objectives.timeHorizon) errors.timeHorizon = 'Time horizon is required';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Navigation functions
  const handleSectionComplete = (section: DataSection) => {
    if (validateSection(section)) {
      setCompletedSections(prev => new Set([...prev, section]));
      return true;
    }
    return false;
  };

  const navigateToSection = (section: DataSection) => {
    if (handleSectionComplete(currentSection)) {
      setCurrentSection(section);
    }
  };

  const handleNext = () => {
    const sections = Object.keys(DATA_SECTIONS) as DataSection[];
    const currentIndex = sections.indexOf(currentSection);
    
    if (handleSectionComplete(currentSection)) {
      if (currentIndex < sections.length - 1) {
        setCurrentSection(sections[currentIndex + 1]);
      } else {
        onNext();
      }
    }
  };

  const handlePrevious = () => {
    const sections = Object.keys(DATA_SECTIONS) as DataSection[];
    const currentIndex = sections.indexOf(currentSection);
    
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1]);
    } else {
      onPrevious();
    }
  };

  // Render functions for each section
  const renderPersonalSection = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="w-5 h-5 mr-2" />
            Basic Information
          </CardTitle>
          <p className="text-gray-600">
            Please provide your basic personal information. All fields marked with * are required.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={clientInfo.personal.firstName}
                onChange={(e) => updatePersonalInfo({ firstName: e.target.value })}
                className={validationErrors.firstName ? 'border-red-500' : ''}
                placeholder="Enter your first name"
              />
              {validationErrors.firstName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.firstName}</p>
              )}
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={clientInfo.personal.lastName}
                onChange={(e) => updatePersonalInfo({ lastName: e.target.value })}
                className={validationErrors.lastName ? 'border-red-500' : ''}
                placeholder="Enter your last name"
              />
              {validationErrors.lastName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.lastName}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={clientInfo.personal.dateOfBirth}
                onChange={(e) => updatePersonalInfo({ dateOfBirth: e.target.value })}
                className={validationErrors.dateOfBirth ? 'border-red-500' : ''}
                max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              />
              {validationErrors.dateOfBirth && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.dateOfBirth}</p>
              )}
            </div>
            <div>
              <Label>Age</Label>
              <Input
                value={clientInfo.personal.age}
                disabled
                className="bg-gray-100"
              />
              {clientInfo.personal.age > 0 && clientInfo.personal.age < 18 && (
                <p className="text-red-500 text-sm mt-1">Must be 18 or older to invest</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Phone className="w-5 h-5 mr-2" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={clientInfo.personal.email}
                onChange={(e) => updatePersonalInfo({ email: e.target.value })}
                className={validationErrors.email ? 'border-red-500' : ''}
                placeholder="your@email.com"
              />
              {validationErrors.email && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={clientInfo.personal.phone}
                onChange={(e) => updatePersonalInfo({ phone: e.target.value })}
                className={validationErrors.phone ? 'border-red-500' : ''}
                placeholder="(555) 123-4567"
              />
              {validationErrors.phone && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center">
              <MapPin className="w-4 h-4 mr-2" />
              Address Information
            </h4>
            <div>
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                value={clientInfo.personal.address.street}
                onChange={(e) => updatePersonalInfo({ 
                  address: { ...clientInfo.personal.address, street: e.target.value }
                })}
                placeholder="123 Main Street"
              />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={clientInfo.personal.address.city}
                  onChange={(e) => updatePersonalInfo({ 
                    address: { ...clientInfo.personal.address, city: e.target.value }
                  })}
                  placeholder="New York"
                />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={clientInfo.personal.address.state}
                  onChange={(e) => updatePersonalInfo({ 
                    address: { ...clientInfo.personal.address, state: e.target.value }
                  })}
                  placeholder="NY"
                />
              </div>
              <div>
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input
                  id="zipCode"
                  value={clientInfo.personal.address.zipCode}
                  onChange={(e) => updatePersonalInfo({ 
                    address: { ...clientInfo.personal.address, zipCode: e.target.value }
                  })}
                  placeholder="10001"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment & Personal Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Briefcase className="w-5 h-5 mr-2" />
            Employment & Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Employment Status</Label>
            <Select
              value={clientInfo.personal.employmentStatus}
              onValueChange={(value) => updatePersonalInfo({ employmentStatus: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_OPTIONS).map(([key, option]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center">
                      <option.icon className="w-4 h-4 mr-2" />
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {(clientInfo.personal.employmentStatus === 'employed' || clientInfo.personal.employmentStatus === 'self-employed') && (
            <>
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={clientInfo.personal.occupation}
                  onChange={(e) => updatePersonalInfo({ occupation: e.target.value })}
                  placeholder="Software Engineer, Doctor, etc."
                />
              </div>
              {clientInfo.personal.employmentStatus === 'employed' && (
                <div>
                  <Label htmlFor="employer">Employer</Label>
                  <Input
                    id="employer"
                    value={clientInfo.personal.employer}
                    onChange={(e) => updatePersonalInfo({ employer: e.target.value })}
                    placeholder="Company name"
                  />
                </div>
              )}
            </>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Marital Status</Label>
              <Select
                value={clientInfo.personal.maritalStatus}
                onValueChange={(value) => updatePersonalInfo({ maritalStatus: value as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dependents">Number of Dependents</Label>
              <Input
                id="dependents"
                type="number"
                min="0"
                max="20"
                value={clientInfo.personal.dependents}
                onChange={(e) => updatePersonalInfo({ dependents: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <Label>Citizenship Status</Label>
            <Select
              value={clientInfo.personal.citizenshipStatus}
              onValueChange={(value) => updatePersonalInfo({ citizenshipStatus: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="citizen">U.S. Citizen</SelectItem>
                <SelectItem value="permanent-resident">Permanent Resident</SelectItem>
                <SelectItem value="visa-holder">Visa Holder</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Main render
  return (
    <LoadingOverlay isLoading={isLoading} message="Processing your information...">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Shield className="w-6 h-6 mr-2" />
                  Enhanced Data Collection
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Complete your profile to receive personalized investment recommendations
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">
                  Estimated time: {DATA_SECTIONS[currentSection].estimatedTime} minutes
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
              {(Object.keys(DATA_SECTIONS) as DataSection[]).map((section) => {
                const isActive = section === currentSection;
                const isCompleted = completedSections.has(section);
                const sectionInfo = DATA_SECTIONS[section];
                
                return (
                  <button
                    key={section}
                    onClick={() => navigateToSection(section)}
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-100 text-green-800 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <sectionInfo.icon className="w-4 h-4 mr-2" />
                    {sectionInfo.title}
                    {isCompleted && <Check className="w-4 h-4 ml-2" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Current Section Content */}
        {currentSection === 'personal' && renderPersonalSection()}
        {/* Additional sections will be rendered here */}

        {/* Navigation Buttons */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentSection === 'personal'}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </LoadingOverlay>
  );
};
