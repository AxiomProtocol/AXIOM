import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { KYCStepProps, RiskAssessmentData, KYCValidationErrors } from '../../types/kyc';

// Options for form fields
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed', label: 'Employed (Full-time or Part-time)' },
  { value: 'self_employed', label: 'Self-employed / Business Owner' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' }
];

const ANNUAL_INCOME_OPTIONS = [
  { value: 'under_25k', label: 'Under $25,000' },
  { value: '25k_50k', label: '$25,000 - $50,000' },
  { value: '50k_100k', label: '$50,000 - $100,000' },
  { value: '100k_250k', label: '$100,000 - $250,000' },
  { value: 'over_250k', label: 'Over $250,000' }
];

const SOURCE_OF_FUNDS_OPTIONS = [
  { value: 'salary', label: 'Salary / Wages' },
  { value: 'business', label: 'Business Income' },
  { value: 'investment', label: 'Investment Returns' },
  { value: 'inheritance', label: 'Inheritance / Gift' },
  { value: 'other', label: 'Other (please specify)' }
];

const INVESTMENT_EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'No prior investment experience' },
  { value: 'beginner', label: 'Beginner (less than 2 years)' },
  { value: 'intermediate', label: 'Intermediate (2-5 years)' },
  { value: 'advanced', label: 'Advanced (5+ years)' }
];

const CRYPTO_EXPERIENCE_OPTIONS = [
  { value: 'none', label: 'No cryptocurrency experience' },
  { value: 'basic', label: 'Basic understanding' },
  { value: 'intermediate', label: 'Some trading experience' },
  { value: 'advanced', label: 'Experienced crypto investor' }
];

const RISK_TOLERANCE_OPTIONS = [
  { 
    value: 'very_low', 
    label: 'Very Low Risk', 
    description: 'I prioritize capital preservation over growth' 
  },
  { 
    value: 'low', 
    label: 'Low Risk', 
    description: 'I prefer stable returns with minimal volatility' 
  },
  { 
    value: 'moderate', 
    label: 'Moderate Risk', 
    description: 'I can accept some volatility for potentially higher returns' 
  },
  { 
    value: 'high', 
    label: 'High Risk', 
    description: 'I am comfortable with significant volatility for growth potential' 
  },
  { 
    value: 'very_high', 
    label: 'Very High Risk', 
    description: 'I seek maximum growth and can handle large fluctuations' 
  }
];

const INVESTMENT_HORIZON_OPTIONS = [
  { value: 'short_term', label: 'Short-term (less than 2 years)' },
  { value: 'medium_term', label: 'Medium-term (2-5 years)' },
  { value: 'long_term', label: 'Long-term (5+ years)' }
];

const INVESTMENT_GOALS_OPTIONS = [
  'Wealth preservation',
  'Steady income generation',
  'Capital appreciation',
  'Retirement planning',
  'Education funding',
  'Property investment',
  'Emergency fund building',
  'Diversification',
  'Cryptocurrency exposure',
  'ESG/Sustainable investing'
];

interface KYCRiskAssessmentProps extends KYCStepProps {
  isSubmitting?: boolean;
}

export const KYCRiskAssessment: React.FC<KYCRiskAssessmentProps> = ({
  data,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false,
  isSubmitting = false,
  errors = {}
}) => {
  const [formData, setFormData] = useState<RiskAssessmentData>({
    employmentStatus: 'employed',
    annualIncome: 'under_25k',
    sourceOfFunds: 'salary',
    investmentExperience: 'none',
    cryptoExperience: 'none',
    riskTolerance: 'moderate',
    investmentHorizon: 'long_term',
    isPoliticallyExposed: false,
    hasCriminalRecord: false,
    sanctionsListCheck: false,
    investmentGoals: [],
    additionalNotes: '',
    ...data.riskAssessment
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(false);
  const [otherSourceOfFunds, setOtherSourceOfFunds] = useState('');

  // Update parent component when form data changes
  useEffect(() => {
    onDataChange({
      riskAssessment: formData
    });
  }, [formData]);

  // Validate form data
  useEffect(() => {
    const errors: Record<string, string> = {};

    // Required field validations
    if (!formData.employmentStatus) {
      errors.employmentStatus = 'Employment status is required';
    }

    if (!formData.annualIncome) {
      errors.annualIncome = 'Annual income range is required';
    }

    if (!formData.sourceOfFunds) {
      errors.sourceOfFunds = 'Source of funds is required';
    }

    if (formData.sourceOfFunds === 'other' && !otherSourceOfFunds.trim()) {
      errors.otherSourceOfFunds = 'Please specify other source of funds';
    }

    if (!formData.investmentExperience) {
      errors.investmentExperience = 'Investment experience is required';
    }

    if (!formData.cryptoExperience) {
      errors.cryptoExperience = 'Cryptocurrency experience is required';
    }

    if (!formData.riskTolerance) {
      errors.riskTolerance = 'Risk tolerance is required';
    }

    if (!formData.investmentHorizon) {
      errors.investmentHorizon = 'Investment horizon is required';
    }

    if (formData.investmentGoals.length === 0) {
      errors.investmentGoals = 'Please select at least one investment goal';
    }

    // Compliance checks
    if (formData.isPoliticallyExposed === undefined) {
      errors.isPoliticallyExposed = 'Please answer this compliance question';
    }

    if (formData.hasCriminalRecord === undefined) {
      errors.hasCriminalRecord = 'Please answer this compliance question';
    }

    if (formData.sanctionsListCheck === undefined) {
      errors.sanctionsListCheck = 'Please confirm sanctions list check';
    }

    setValidationErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [formData, otherSourceOfFunds]);

  const handleInputChange = (field: keyof RiskAssessmentData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInvestmentGoalsChange = (goal: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      investmentGoals: checked
        ? [...prev.investmentGoals, goal]
        : prev.investmentGoals.filter(g => g !== goal)
    }));
  };

  const handleNext = () => {
    if (isFormValid && !isLoading && !isSubmitting) {
      onNext();
    }
  };

  const RadioGroup: React.FC<{
    name: string;
    options: Array<{ value: string; label: string; description?: string }>;
    value: string;
    onChange: (value: string) => void;
    error?: string;
  }> = ({ name, options, value, onChange, error }) => (
    <div className="space-y-3">
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            "flex items-start space-x-3 p-3 border rounded-lg cursor-pointer transition-colors",
            value === option.value 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-200 hover:border-blue-300"
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1"
            disabled={isLoading || isSubmitting}
          />
          <div className="flex-1">
            <div className="font-medium text-gray-900">{option.label}</div>
            {option.description && (
              <div className="text-sm text-gray-600 mt-1">{option.description}</div>
            )}
          </div>
        </label>
      ))}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );

  const CheckboxGroup: React.FC<{
    options: string[];
    values: string[];
    onChange: (value: string, checked: boolean) => void;
    error?: string;
  }> = ({ options, values, onChange, error }) => (
    <div className="space-y-2">
      <div className="grid md:grid-cols-2 gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={values.includes(option)}
              onChange={(e) => onChange(option, e.target.checked)}
              disabled={isLoading || isSubmitting}
            />
            <span className="text-sm text-gray-900">{option}</span>
          </label>
        ))}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Risk Assessment & Profile
        </h2>
        <p className="text-lg text-gray-600">
          Help us understand your financial situation and investment preferences to provide personalized recommendations.
        </p>
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            📊 <strong>Confidential Assessment:</strong> This information helps us ensure compliance 
            with regulations and provide investment advice suitable for your profile.
          </p>
        </div>
        
        {/* AML/COMPLIANCE WARNINGS */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Production Compliance Requirements</h4>
          <div className="text-xs text-yellow-700 space-y-1">
            <p><strong>AML/KYC Compliance:</strong></p>
            <p>• Enhanced due diligence for high-risk customers</p>
            <p>• Ongoing transaction monitoring and suspicious activity reporting</p>
            <p>• Customer risk scoring and periodic re-assessment</p>
            <p>• Integration with global sanctions and PEP databases</p>
            <p><strong>Note:</strong> This demo does not perform real compliance screening</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Employment & Income Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Employment & Income</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employment Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Employment Status <span className="text-red-500">*</span>
              </label>
              <RadioGroup
                name="employmentStatus"
                options={EMPLOYMENT_STATUS_OPTIONS}
                value={formData.employmentStatus}
                onChange={(value) => handleInputChange('employmentStatus', value as any)}
                error={validationErrors.employmentStatus}
              />
            </div>

            {/* Annual Income */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Annual Income Range <span className="text-red-500">*</span>
              </label>
              <RadioGroup
                name="annualIncome"
                options={ANNUAL_INCOME_OPTIONS}
                value={formData.annualIncome}
                onChange={(value) => handleInputChange('annualIncome', value as any)}
                error={validationErrors.annualIncome}
              />
            </div>

            {/* Source of Funds */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Primary Source of Funds <span className="text-red-500">*</span>
              </label>
              <RadioGroup
                name="sourceOfFunds"
                options={SOURCE_OF_FUNDS_OPTIONS}
                value={formData.sourceOfFunds}
                onChange={(value) => handleInputChange('sourceOfFunds', value as any)}
                error={validationErrors.sourceOfFunds}
              />
              
              {formData.sourceOfFunds === 'other' && (
                <div className="mt-3">
                  <Input
                    type="text"
                    value={otherSourceOfFunds}
                    onChange={(e) => setOtherSourceOfFunds(e.target.value)}
                    placeholder="Please specify your source of funds"
                    className={cn(
                      validationErrors.otherSourceOfFunds ? 'border-red-500' : ''
                    )}
                    disabled={isLoading || isSubmitting}
                  />
                  {validationErrors.otherSourceOfFunds && (
                    <p className="text-red-500 text-sm mt-1">{validationErrors.otherSourceOfFunds}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Investment Experience Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Investment Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* General Investment Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                General Investment Experience <span className="text-red-500">*</span>
              </label>
              <RadioGroup
                name="investmentExperience"
                options={INVESTMENT_EXPERIENCE_OPTIONS}
                value={formData.investmentExperience}
                onChange={(value) => handleInputChange('investmentExperience', value as any)}
                error={validationErrors.investmentExperience}
              />
            </div>

            {/* Cryptocurrency Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Cryptocurrency Experience <span className="text-red-500">*</span>
              </label>
              <RadioGroup
                name="cryptoExperience"
                options={CRYPTO_EXPERIENCE_OPTIONS}
                value={formData.cryptoExperience}
                onChange={(value) => handleInputChange('cryptoExperience', value as any)}
                error={validationErrors.cryptoExperience}
              />
            </div>
          </CardContent>
        </Card>

        {/* Risk Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Risk Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Risk Tolerance */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Risk Tolerance <span className="text-red-500">*</span>
              </label>
              <RadioGroup
                name="riskTolerance"
                options={RISK_TOLERANCE_OPTIONS}
                value={formData.riskTolerance}
                onChange={(value) => handleInputChange('riskTolerance', value as any)}
                error={validationErrors.riskTolerance}
              />
            </div>

            {/* Investment Horizon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Investment Time Horizon <span className="text-red-500">*</span>
              </label>
              <RadioGroup
                name="investmentHorizon"
                options={INVESTMENT_HORIZON_OPTIONS}
                value={formData.investmentHorizon}
                onChange={(value) => handleInputChange('investmentHorizon', value as any)}
                error={validationErrors.investmentHorizon}
              />
            </div>

            {/* Investment Goals */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Investment Goals <span className="text-red-500">*</span>
              </label>
              <p className="text-sm text-gray-600 mb-3">Select all that apply:</p>
              <CheckboxGroup
                options={INVESTMENT_GOALS_OPTIONS}
                values={formData.investmentGoals}
                onChange={handleInvestmentGoalsChange}
                error={validationErrors.investmentGoals}
              />
            </div>
          </CardContent>
        </Card>

        {/* Compliance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Compliance Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Politically Exposed Person */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Are you a Politically Exposed Person (PEP)? <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-600 mb-3">
                This includes government officials, senior executives of state-owned enterprises, 
                or family members of such individuals.
              </p>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="isPoliticallyExposed"
                    checked={formData.isPoliticallyExposed === false}
                    onChange={() => handleInputChange('isPoliticallyExposed', false)}
                    disabled={isLoading || isSubmitting}
                  />
                  <span>No</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="isPoliticallyExposed"
                    checked={formData.isPoliticallyExposed === true}
                    onChange={() => handleInputChange('isPoliticallyExposed', true)}
                    disabled={isLoading || isSubmitting}
                  />
                  <span>Yes</span>
                </label>
              </div>
              {validationErrors.isPoliticallyExposed && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.isPoliticallyExposed}</p>
              )}
            </div>

            {/* Criminal Record */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Do you have any criminal convictions? <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="hasCriminalRecord"
                    checked={formData.hasCriminalRecord === false}
                    onChange={() => handleInputChange('hasCriminalRecord', false)}
                    disabled={isLoading || isSubmitting}
                  />
                  <span>No</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="hasCriminalRecord"
                    checked={formData.hasCriminalRecord === true}
                    onChange={() => handleInputChange('hasCriminalRecord', true)}
                    disabled={isLoading || isSubmitting}
                  />
                  <span>Yes</span>
                </label>
              </div>
              {validationErrors.hasCriminalRecord && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.hasCriminalRecord}</p>
              )}
            </div>

            {/* Sanctions Check */}
            <div>
              <label className="flex items-start space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.sanctionsListCheck}
                  onChange={(e) => handleInputChange('sanctionsListCheck', e.target.checked)}
                  disabled={isLoading || isSubmitting}
                  className="mt-1"
                />
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    Sanctions List Confirmation <span className="text-red-500">*</span>
                  </span>
                  <p className="text-gray-600 mt-1">
                    I confirm that I am not on any government sanctions list, nor am I 
                    prohibited from participating in cryptocurrency or investment activities.
                  </p>
                </div>
              </label>
              {validationErrors.sanctionsListCheck && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.sanctionsListCheck}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Additional Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={formData.additionalNotes || ''}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                placeholder="Any additional information you'd like to provide about your investment goals, experience, or circumstances..."
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                disabled={isLoading || isSubmitting}
              />
            </div>
          </CardContent>
        </Card>

        {/* Legal Disclaimer */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">⚖️ Important Disclosure</h4>
          <p className="text-xs text-gray-600">
            This assessment helps us understand your risk profile and provide suitable investment recommendations. 
            All information provided will be kept confidential and used only for compliance and advisory purposes. 
            Your risk assessment may be updated periodically to ensure our recommendations remain appropriate for your situation.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={isLoading || isSubmitting}
          >
            Previous
          </Button>
          
          <Button
            type="button"
            onClick={handleNext}
            disabled={!isFormValid || isLoading || isSubmitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit for Review'
            )}
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="text-center">
          <p className="text-sm text-gray-500">
            Step 3 of 3: Risk Assessment
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};
