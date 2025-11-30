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
  User, 
  Briefcase, 
  DollarSign, 
  Home, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Info,
  PiggyBank,
  CreditCard,
  Building,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Users,
  GraduationCap,
  Target,
  FileText,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { ClientInformation } from './types';

interface ClientInformationCollectionProps {
  data: Partial<ClientInformation>;
  onDataChange: (data: Partial<ClientInformation>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

// Form sections for better organization
type FormSection = 'personal' | 'financial' | 'experience' | 'objectives' | 'review';

const FORM_SECTIONS = {
  personal: { title: 'Personal Details', icon: User },
  financial: { title: 'Financial Information', icon: DollarSign },
  experience: { title: 'Investment Experience', icon: TrendingUp },
  objectives: { title: 'Financial Objectives', icon: Target },
  review: { title: 'Review & Confirm', icon: CheckCircle }
};

// Validation rules
const validatePersonalDetails = (data: any) => {
  const errors: Record<string, string> = {};
  
  if (!data.firstName) errors.firstName = 'First name is required';
  if (!data.lastName) errors.lastName = 'Last name is required';
  if (!data.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
  if (!data.email) errors.email = 'Email is required';
  if (!data.phone) errors.phone = 'Phone number is required';
  if (!data.address?.street) errors.street = 'Street address is required';
  if (!data.address?.city) errors.city = 'City is required';
  if (!data.address?.state) errors.state = 'State is required';
  if (!data.address?.zipCode) errors.zipCode = 'ZIP code is required';
  if (!data.occupation) errors.occupation = 'Occupation is required';
  if (!data.employmentStatus) errors.employmentStatus = 'Employment status is required';
  
  return errors;
};

const validateFinancialDetails = (data: any) => {
  const errors: Record<string, string> = {};
  
  if (!data.annualIncome || data.annualIncome <= 0) {
    errors.annualIncome = 'Annual income is required';
  }
  if (!data.netWorth && data.netWorth !== 0) {
    errors.netWorth = 'Net worth is required';
  }
  if (!data.liquidAssets && data.liquidAssets !== 0) {
    errors.liquidAssets = 'Liquid assets amount is required';
  }
  if (!data.monthlyExpenses || data.monthlyExpenses <= 0) {
    errors.monthlyExpenses = 'Monthly expenses is required';
  }
  
  return errors;
};

export const ClientInformationCollection: React.FC<ClientInformationCollectionProps> = ({
  data,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false
}) => {
  const [currentSection, setCurrentSection] = useState<FormSection>('personal');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState(0);
  const [completedSections, setCompletedSections] = useState<Set<FormSection>>(new Set());

  // Initialize form data with defaults
  const [formData, setFormData] = useState<ClientInformation>({
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
        country: 'US'
      },
      occupation: '',
      employer: '',
      employmentStatus: 'employed',
      maritalStatus: 'single',
      dependents: 0,
      citizenshipStatus: 'citizen',
      taxResidency: ['US']
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
      overallExperience: 'none',
      yearsInvesting: 0,
      assetClassExperience: {
        stocks: 'none',
        bonds: 'none',
        realEstate: 'none',
        crypto: 'none',
        alternatives: 'none',
        options: 'none'
      },
      tradingFrequency: 'never',
      largestLoss: 0,
      professionalAdvice: 'none',
      investmentEducation: []
    },
    objectives: {
      primaryObjective: 'growth',
      timeHorizon: 'long',
      planToRetire: true,
      retirementAge: 65,
      legacyPlanning: false,
      majorLifeEvents: [],
      importanceRanking: {
        retirement: 5,
        education: 3,
        homeOwnership: 4,
        business: 2,
        travel: 1,
        legacy: 3
      }
    },
    ...data
  });

  // Update progress based on completed sections
  useEffect(() => {
    const totalSections = Object.keys(FORM_SECTIONS).length - 1; // Exclude review
    const progress = (completedSections.size / totalSections) * 100;
    setProgress(progress);
  }, [completedSections]);

  // Calculate age from date of birth
  useEffect(() => {
    if (formData.personal.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(formData.personal.dateOfBirth);
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      const finalAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate()) 
        ? age - 1 
        : age;
      
      updateFormData('personal', { age: finalAge });
    }
  }, [formData.personal.dateOfBirth]);

  // Update parent component when data changes
  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

  const updateFormData = useCallback((section: keyof ClientInformation, updates: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...updates
      }
    }));
    setErrors({});
  }, []);

  const validateCurrentSection = () => {
    let sectionErrors: Record<string, string> = {};
    
    switch (currentSection) {
      case 'personal':
        sectionErrors = validatePersonalDetails(formData.personal);
        break;
      case 'financial':
        sectionErrors = validateFinancialDetails(formData.financial);
        break;
      case 'experience':
        // Experience validation is optional but can provide warnings
        break;
      case 'objectives':
        // Basic objectives validation
        if (!formData.objectives.primaryObjective) {
          sectionErrors.primaryObjective = 'Primary objective is required';
        }
        break;
    }
    
    setErrors(sectionErrors);
    
    if (Object.keys(sectionErrors).length === 0) {
      setCompletedSections(prev => new Set([...prev, currentSection]));
      return true;
    }
    
    return false;
  };

  const handleSectionNext = () => {
    if (validateCurrentSection()) {
      const sections: FormSection[] = ['personal', 'financial', 'experience', 'objectives', 'review'];
      const currentIndex = sections.indexOf(currentSection);
      if (currentIndex < sections.length - 1) {
        setCurrentSection(sections[currentIndex + 1]);
      }
    }
  };

  const handleSectionPrevious = () => {
    const sections: FormSection[] = ['personal', 'financial', 'experience', 'objectives', 'review'];
    const currentIndex = sections.indexOf(currentSection);
    if (currentIndex > 0) {
      setCurrentSection(sections[currentIndex - 1]);
    }
  };

  const canProceedToNext = () => {
    return completedSections.has('personal') && 
           completedSections.has('financial') && 
           currentSection === 'review';
  };

  // Render Personal Details Section
  const renderPersonalDetails = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            id="firstName"
            value={formData.personal.firstName}
            onChange={(e) => updateFormData('personal', { firstName: e.target.value })}
            placeholder="Enter first name"
            className={errors.firstName ? 'border-red-500' : ''}
          />
          {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            id="lastName"
            value={formData.personal.lastName}
            onChange={(e) => updateFormData('personal', { lastName: e.target.value })}
            placeholder="Enter last name"
            className={errors.lastName ? 'border-red-500' : ''}
          />
          {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth *</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.personal.dateOfBirth}
            onChange={(e) => updateFormData('personal', { dateOfBirth: e.target.value })}
            className={errors.dateOfBirth ? 'border-red-500' : ''}
          />
          {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
          {formData.personal.age > 0 && (
            <p className="text-gray-500 text-sm">Age: {formData.personal.age} years</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="maritalStatus">Marital Status</Label>
          <Select
            value={formData.personal.maritalStatus}
            onValueChange={(value: any) => updateFormData('personal', { maritalStatus: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select marital status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="married">Married</SelectItem>
              <SelectItem value="divorced">Divorced</SelectItem>
              <SelectItem value="widowed">Widowed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              type="email"
              value={formData.personal.email}
              onChange={(e) => updateFormData('personal', { email: e.target.value })}
              placeholder="Enter email address"
              className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              value={formData.personal.phone}
              onChange={(e) => updateFormData('personal', { phone: e.target.value })}
              placeholder="(555) 123-4567"
              className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center">
          <Home className="w-5 h-5 mr-2" />
          Address Information
        </Label>
        
        <div className="space-y-2">
          <Label htmlFor="street">Street Address *</Label>
          <Input
            id="street"
            value={formData.personal.address.street}
            onChange={(e) => updateFormData('personal', { 
              address: { ...formData.personal.address, street: e.target.value }
            })}
            placeholder="123 Main St"
            className={errors.street ? 'border-red-500' : ''}
          />
          {errors.street && <p className="text-red-500 text-sm">{errors.street}</p>}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <Input
              id="city"
              value={formData.personal.address.city}
              onChange={(e) => updateFormData('personal', { 
                address: { ...formData.personal.address, city: e.target.value }
              })}
              placeholder="City"
              className={errors.city ? 'border-red-500' : ''}
            />
            {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">State *</Label>
            <Input
              id="state"
              value={formData.personal.address.state}
              onChange={(e) => updateFormData('personal', { 
                address: { ...formData.personal.address, state: e.target.value }
              })}
              placeholder="State"
              className={errors.state ? 'border-red-500' : ''}
            />
            {errors.state && <p className="text-red-500 text-sm">{errors.state}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="zipCode">ZIP Code *</Label>
            <Input
              id="zipCode"
              value={formData.personal.address.zipCode}
              onChange={(e) => updateFormData('personal', { 
                address: { ...formData.personal.address, zipCode: e.target.value }
              })}
              placeholder="12345"
              className={errors.zipCode ? 'border-red-500' : ''}
            />
            {errors.zipCode && <p className="text-red-500 text-sm">{errors.zipCode}</p>}
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center">
          <Briefcase className="w-5 h-5 mr-2" />
          Employment Information
        </Label>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="occupation">Occupation *</Label>
            <Input
              id="occupation"
              value={formData.personal.occupation}
              onChange={(e) => updateFormData('personal', { occupation: e.target.value })}
              placeholder="Software Engineer"
              className={errors.occupation ? 'border-red-500' : ''}
            />
            {errors.occupation && <p className="text-red-500 text-sm">{errors.occupation}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="employer">Employer</Label>
            <Input
              id="employer"
              value={formData.personal.employer}
              onChange={(e) => updateFormData('personal', { employer: e.target.value })}
              placeholder="Company Name"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="employmentStatus">Employment Status *</Label>
            <Select
              value={formData.personal.employmentStatus}
              onValueChange={(value: any) => updateFormData('personal', { employmentStatus: value })}
            >
              <SelectTrigger className={errors.employmentStatus ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select employment status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employed">Employed</SelectItem>
                <SelectItem value="self-employed">Self-Employed</SelectItem>
                <SelectItem value="unemployed">Unemployed</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
                <SelectItem value="student">Student</SelectItem>
              </SelectContent>
            </Select>
            {errors.employmentStatus && <p className="text-red-500 text-sm">{errors.employmentStatus}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dependents">Number of Dependents</Label>
            <Input
              id="dependents"
              type="number"
              min="0"
              value={formData.personal.dependents}
              onChange={(e) => updateFormData('personal', { dependents: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Render Financial Details Section
  const renderFinancialDetails = () => (
    <div className="space-y-6">
      {/* Income Information */}
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center">
          <DollarSign className="w-5 h-5 mr-2" />
          Income Information
        </Label>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="annualIncome">Annual Income (Gross) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="annualIncome"
                type="number"
                min="0"
                value={formData.financial.annualIncome || ''}
                onChange={(e) => updateFormData('financial', { annualIncome: parseFloat(e.target.value) || 0 })}
                placeholder="75000"
                className={`pl-10 ${errors.annualIncome ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.annualIncome && <p className="text-red-500 text-sm">{errors.annualIncome}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="incomeStability">Income Stability</Label>
            <Select
              value={formData.financial.incomeStability}
              onValueChange={(value: any) => updateFormData('financial', { incomeStability: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select income stability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="very-stable">Very Stable (Government, Tenured)</SelectItem>
                <SelectItem value="stable">Stable (Corporate, Salaried)</SelectItem>
                <SelectItem value="variable">Variable (Commission, Freelance)</SelectItem>
                <SelectItem value="unstable">Unstable (Seasonal, Contract)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="monthlyExpenses">Monthly Living Expenses *</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="monthlyExpenses"
              type="number"
              min="0"
              value={formData.financial.monthlyExpenses || ''}
              onChange={(e) => updateFormData('financial', { monthlyExpenses: parseFloat(e.target.value) || 0 })}
              placeholder="4000"
              className={`pl-10 ${errors.monthlyExpenses ? 'border-red-500' : ''}`}
            />
          </div>
          {errors.monthlyExpenses && <p className="text-red-500 text-sm">{errors.monthlyExpenses}</p>}
        </div>
      </div>

      {/* Assets and Net Worth */}
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center">
          <PiggyBank className="w-5 h-5 mr-2" />
          Assets & Net Worth
        </Label>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="netWorth">Estimated Net Worth *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="netWorth"
                type="number"
                value={formData.financial.netWorth || ''}
                onChange={(e) => updateFormData('financial', { netWorth: parseFloat(e.target.value) || 0 })}
                placeholder="250000"
                className={`pl-10 ${errors.netWorth ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.netWorth && <p className="text-red-500 text-sm">{errors.netWorth}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="liquidAssets">Liquid Assets (Cash, Savings) *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="liquidAssets"
                type="number"
                min="0"
                value={formData.financial.liquidAssets || ''}
                onChange={(e) => updateFormData('financial', { liquidAssets: parseFloat(e.target.value) || 0 })}
                placeholder="50000"
                className={`pl-10 ${errors.liquidAssets ? 'border-red-500' : ''}`}
              />
            </div>
            {errors.liquidAssets && <p className="text-red-500 text-sm">{errors.liquidAssets}</p>}
          </div>
        </div>

        {/* Detailed Asset Breakdown */}
        <div className="space-y-4">
          <Label className="text-md font-medium">Asset Breakdown (Optional)</Label>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(formData.financial.totalAssets).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={`asset-${key}`} className="capitalize">
                  {key === 'realEstate' ? 'Real Estate' : key}
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id={`asset-${key}`}
                    type="number"
                    min="0"
                    value={value || ''}
                    onChange={(e) => updateFormData('financial', {
                      totalAssets: {
                        ...formData.financial.totalAssets,
                        [key]: parseFloat(e.target.value) || 0
                      }
                    })}
                    placeholder="0"
                    className="pl-10"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Debt Information */}
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center">
          <CreditCard className="w-5 h-5 mr-2" />
          Debt Information (Optional)
        </Label>

        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(formData.financial.totalDebts).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`debt-${key}`} className="capitalize">
                {key === 'studentLoans' ? 'Student Loans' : 
                 key === 'creditCards' ? 'Credit Cards' : key}
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id={`debt-${key}`}
                  type="number"
                  min="0"
                  value={value || ''}
                  onChange={(e) => updateFormData('financial', {
                    totalDebts: {
                      ...formData.financial.totalDebts,
                      [key]: parseFloat(e.target.value) || 0
                    }
                  })}
                  placeholder="0"
                  className="pl-10"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emergencyFund">Emergency Fund</Label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            id="emergencyFund"
            type="number"
            min="0"
            value={formData.financial.emergencyFund || ''}
            onChange={(e) => updateFormData('financial', { emergencyFund: parseFloat(e.target.value) || 0 })}
            placeholder="15000"
            className="pl-10"
          />
        </div>
        <p className="text-gray-500 text-sm">
          Funds set aside for unexpected expenses (typically 3-6 months of expenses)
        </p>
      </div>
    </div>
  );

  // Render Investment Experience Section
  const renderInvestmentExperience = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Investment Experience
        </Label>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="overallExperience">Overall Investment Experience</Label>
            <Select
              value={formData.experience.overallExperience}
              onValueChange={(value: any) => updateFormData('experience', { overallExperience: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select experience level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - New to investing</SelectItem>
                <SelectItem value="limited">Limited - Some basic knowledge</SelectItem>
                <SelectItem value="moderate">Moderate - Some investing experience</SelectItem>
                <SelectItem value="extensive">Extensive - Experienced investor</SelectItem>
                <SelectItem value="professional">Professional - Industry experience</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="yearsInvesting">Years of Investing Experience</Label>
            <Input
              id="yearsInvesting"
              type="number"
              min="0"
              max="50"
              value={formData.experience.yearsInvesting || ''}
              onChange={(e) => updateFormData('experience', { yearsInvesting: parseInt(e.target.value) || 0 })}
              placeholder="5"
            />
          </div>
        </div>

        {/* Asset Class Experience */}
        <div className="space-y-4">
          <Label className="text-md font-medium">Experience with Asset Classes</Label>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(formData.experience.assetClassExperience).map(([asset, experience]) => (
              <div key={asset} className="space-y-2">
                <Label htmlFor={`exp-${asset}`} className="capitalize">
                  {asset === 'realEstate' ? 'Real Estate' : asset}
                </Label>
                <Select
                  value={experience}
                  onValueChange={(value: any) => updateFormData('experience', {
                    assetClassExperience: {
                      ...formData.experience.assetClassExperience,
                      [asset]: value
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="limited">Limited</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="extensive">Extensive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="tradingFrequency">Trading Frequency</Label>
            <Select
              value={formData.experience.tradingFrequency}
              onValueChange={(value: any) => updateFormData('experience', { tradingFrequency: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="How often do you trade?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="rarely">Rarely (Less than once per year)</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="largestLoss">Largest Investment Loss ($)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="largestLoss"
                type="number"
                min="0"
                value={formData.experience.largestLoss || ''}
                onChange={(e) => updateFormData('experience', { largestLoss: parseFloat(e.target.value) || 0 })}
                placeholder="5000"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="professionalAdvice">Professional Investment Advice</Label>
          <Select
            value={formData.experience.professionalAdvice}
            onValueChange={(value: any) => updateFormData('experience', { professionalAdvice: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Do you use professional advice?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Never used professional advice</SelectItem>
              <SelectItem value="sometimes">Sometimes use professional advice</SelectItem>
              <SelectItem value="always">Always use professional advice</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  // Render Financial Objectives Section
  const renderFinancialObjectives = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-lg font-medium flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Financial Objectives
        </Label>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="primaryObjective">Primary Investment Objective</Label>
            <Select
              value={formData.objectives.primaryObjective}
              onValueChange={(value: any) => updateFormData('objectives', { primaryObjective: value })}
            >
              <SelectTrigger className={errors.primaryObjective ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select primary objective" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="growth">Growth - Maximize long-term returns</SelectItem>
                <SelectItem value="income">Income - Generate regular income</SelectItem>
                <SelectItem value="preservation">Preservation - Protect capital</SelectItem>
                <SelectItem value="balanced">Balanced - Mix of growth and income</SelectItem>
              </SelectContent>
            </Select>
            {errors.primaryObjective && <p className="text-red-500 text-sm">{errors.primaryObjective}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeHorizon">Investment Time Horizon</Label>
            <Select
              value={formData.objectives.timeHorizon}
              onValueChange={(value: any) => updateFormData('objectives', { timeHorizon: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select time horizon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short">Short Term (Less than 3 years)</SelectItem>
                <SelectItem value="medium">Medium Term (3-10 years)</SelectItem>
                <SelectItem value="long">Long Term (10+ years)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Retirement Planning */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="planToRetire"
              checked={formData.objectives.planToRetire}
              onCheckedChange={(checked) => updateFormData('objectives', { planToRetire: checked })}
            />
            <Label htmlFor="planToRetire">I plan to retire</Label>
          </div>

          {formData.objectives.planToRetire && (
            <div className="space-y-2">
              <Label htmlFor="retirementAge">Expected Retirement Age</Label>
              <Input
                id="retirementAge"
                type="number"
                min="50"
                max="80"
                value={formData.objectives.retirementAge || ''}
                onChange={(e) => updateFormData('objectives', { retirementAge: parseInt(e.target.value) || 65 })}
                placeholder="65"
              />
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="legacyPlanning"
            checked={formData.objectives.legacyPlanning}
            onCheckedChange={(checked) => updateFormData('objectives', { legacyPlanning: checked })}
          />
          <Label htmlFor="legacyPlanning">I'm interested in legacy/estate planning</Label>
        </div>

        {/* Goal Importance Ranking */}
        <div className="space-y-4">
          <Label className="text-md font-medium">Rank the Importance of These Goals (1-10)</Label>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(formData.objectives.importanceRanking).map(([goal, importance]) => (
              <div key={goal} className="space-y-2">
                <Label htmlFor={`importance-${goal}`} className="capitalize">
                  {goal === 'homeOwnership' ? 'Home Ownership' : goal}
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id={`importance-${goal}`}
                    type="number"
                    min="1"
                    max="10"
                    value={importance || ''}
                    onChange={(e) => updateFormData('objectives', {
                      importanceRanking: {
                        ...formData.objectives.importanceRanking,
                        [goal]: parseInt(e.target.value) || 1
                      }
                    })}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">({importance}/10)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Render Review Section
  const renderReviewSection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Review Your Information</h3>
        <p className="text-gray-600">Please review all the information you've provided before proceeding.</p>
      </div>

      <div className="grid gap-6">
        {/* Personal Information Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="w-5 h-5 mr-2" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><strong>Name:</strong> {formData.personal.firstName} {formData.personal.lastName}</div>
              <div><strong>Age:</strong> {formData.personal.age}</div>
              <div><strong>Email:</strong> {formData.personal.email}</div>
              <div><strong>Phone:</strong> {formData.personal.phone}</div>
              <div><strong>Employment:</strong> {formData.personal.occupation} ({formData.personal.employmentStatus})</div>
              <div><strong>Marital Status:</strong> {formData.personal.maritalStatus}</div>
              <div className="md:col-span-2">
                <strong>Address:</strong> {formData.personal.address.street}, {formData.personal.address.city}, {formData.personal.address.state} {formData.personal.address.zipCode}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Information Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              Financial Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><strong>Annual Income:</strong> ${formData.financial.annualIncome.toLocaleString()}</div>
              <div><strong>Net Worth:</strong> ${formData.financial.netWorth.toLocaleString()}</div>
              <div><strong>Liquid Assets:</strong> ${formData.financial.liquidAssets.toLocaleString()}</div>
              <div><strong>Monthly Expenses:</strong> ${formData.financial.monthlyExpenses.toLocaleString()}</div>
              <div><strong>Income Stability:</strong> {formData.financial.incomeStability}</div>
              <div><strong>Emergency Fund:</strong> ${formData.financial.emergencyFund.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Investment Experience Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Investment Experience
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><strong>Overall Experience:</strong> {formData.experience.overallExperience}</div>
              <div><strong>Years Investing:</strong> {formData.experience.yearsInvesting}</div>
              <div><strong>Trading Frequency:</strong> {formData.experience.tradingFrequency}</div>
              <div><strong>Professional Advice:</strong> {formData.experience.professionalAdvice}</div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Objectives Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="w-5 h-5 mr-2" />
              Financial Objectives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div><strong>Primary Objective:</strong> {formData.objectives.primaryObjective}</div>
              <div><strong>Time Horizon:</strong> {formData.objectives.timeHorizon}</div>
              <div><strong>Retirement Planning:</strong> {formData.objectives.planToRetire ? `Yes (Age ${formData.objectives.retirementAge})` : 'No'}</div>
              <div><strong>Legacy Planning:</strong> {formData.objectives.legacyPlanning ? 'Yes' : 'No'}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {completedSections.size < 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">Please complete all required sections before proceeding.</p>
          </div>
        </div>
      )}
    </div>
  );

  // Render current section content
  const renderCurrentSection = () => {
    switch (currentSection) {
      case 'personal':
        return renderPersonalDetails();
      case 'financial':
        return renderFinancialDetails();
      case 'experience':
        return renderInvestmentExperience();
      case 'objectives':
        return renderFinancialObjectives();
      case 'review':
        return renderReviewSection();
      default:
        return renderPersonalDetails();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">
          Tell Us About Yourself
        </h1>
        <p className="text-lg text-gray-600">
          Help us create a personalized wealth management strategy by sharing some information about your background and goals.
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
            {Object.entries(FORM_SECTIONS).map(([key, { title, icon: Icon }]) => (
              <button
                key={key}
                onClick={() => setCurrentSection(key as FormSection)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  currentSection === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : completedSections.has(key as FormSection)
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{title}</span>
                {completedSections.has(key as FormSection) && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card className="bg-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            {React.createElement(FORM_SECTIONS[currentSection].icon, { className: "w-5 h-5 mr-2" })}
            {FORM_SECTIONS[currentSection].title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderCurrentSection()}
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center">
        <Button
          onClick={currentSection === 'personal' ? onPrevious : handleSectionPrevious}
          variant="outline"
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {currentSection === 'personal' ? 'Previous Step' : 'Previous Section'}
        </Button>

        <div className="text-sm text-gray-500">
          {currentSection === 'review' ? 'Ready to proceed' : 'Fill out all sections to continue'}
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
                <span>Continue to Risk Assessment</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleSectionNext}
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

export default ClientInformationCollection;
