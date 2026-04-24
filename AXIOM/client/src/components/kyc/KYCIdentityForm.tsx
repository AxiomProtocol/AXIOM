import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { KYCStepProps, KYCValidationErrors } from '../../types/kyc';

// Country list for nationality selection
const COUNTRIES = [
  'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark',
  'Finland', 'Australia', 'New Zealand', 'Japan', 'Singapore', 'Other'
];

interface KYCIdentityFormProps extends KYCStepProps {
  isSubmitting?: boolean;
}

export const KYCIdentityForm: React.FC<KYCIdentityFormProps> = ({
  data,
  onDataChange,
  onNext,
  onPrevious,
  isLoading = false,
  isSubmitting = false,
  errors = {}
}) => {
  const [formData, setFormData] = useState({
    firstName: data.personalInfo?.firstName || '',
    lastName: data.personalInfo?.lastName || '',
    dateOfBirth: data.personalInfo?.dateOfBirth || '',
    nationality: data.personalInfo?.nationality || '',
    address: data.personalInfo?.address || '',
    phoneNumber: data.personalInfo?.phoneNumber || ''
  });

  const [validationErrors, setValidationErrors] = useState<KYCValidationErrors['personalInfo']>({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Update parent component when form data changes
  useEffect(() => {
    onDataChange({
      personalInfo: formData
    });
  }, [formData]);

  // Validate form data
  useEffect(() => {
    const errors: KYCValidationErrors['personalInfo'] = {};

    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.firstName)) {
      errors.firstName = 'First name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    } else if (!/^[a-zA-Z\s'-]+$/.test(formData.lastName)) {
      errors.lastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
    }

    // Date of birth validation
    if (!formData.dateOfBirth) {
      errors.dateOfBirth = 'Date of birth is required';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 18) {
        errors.dateOfBirth = 'You must be at least 18 years old';
      } else if (age > 120) {
        errors.dateOfBirth = 'Please enter a valid date of birth';
      }
    }

    // Nationality validation
    if (!formData.nationality) {
      errors.nationality = 'Nationality is required';
    }

    // Address validation
    if (!formData.address.trim()) {
      errors.address = 'Address is required';
    } else if (formData.address.length < 10) {
      errors.address = 'Please provide a complete address';
    }

    // Phone number validation
    if (!formData.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(formData.phoneNumber)) {
      errors.phoneNumber = 'Please enter a valid phone number';
    } else if (formData.phoneNumber.replace(/\D/g, '').length < 10) {
      errors.phoneNumber = 'Phone number must be at least 10 digits';
    }

    setValidationErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  }, [formData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (isFormValid && !isLoading && !isSubmitting) {
      onNext();
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX for US numbers
    if (digits.length >= 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    } else if (digits.length >= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else if (digits.length >= 3) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    }
    return digits;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Verify Your Identity
        </h2>
        <p className="text-lg text-gray-600">
          We need to collect some basic information to verify your identity and comply with regulations.
        </p>
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            🔒 <strong>Your information is secure:</strong> All data is encrypted and stored securely. 
            We only use this information for verification purposes as required by law.
          </p>
        </div>
        
        {/* SECURITY WARNING */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ Development Demo Notice</h4>
          <div className="text-xs text-yellow-700 space-y-1">
            <p>• This is a demonstration KYC interface for development purposes</p>
            <p>• Production implementation requires secure server-side data handling</p>
            <p>• Real KYC requires integration with identity verification providers</p>
            <p>• Data entered here should not be real personal information</p>
          </div>
        </div>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-center">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name Fields */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter your first name"
                className={cn(
                  validationErrors.firstName ? 'border-red-500 focus:border-red-500' : ''
                )}
                disabled={isLoading || isSubmitting}
              />
              {validationErrors.firstName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter your last name"
                className={cn(
                  validationErrors.lastName ? 'border-red-500 focus:border-red-500' : ''
                )}
                disabled={isLoading || isSubmitting}
              />
              {validationErrors.lastName && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.lastName}</p>
              )}
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
              className={cn(
                validationErrors.dateOfBirth ? 'border-red-500 focus:border-red-500' : ''
              )}
              disabled={isLoading || isSubmitting}
              max={new Date().toISOString().split('T')[0]} // Cannot select future dates
            />
            {validationErrors.dateOfBirth && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.dateOfBirth}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">You must be at least 18 years old</p>
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nationality <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.nationality}
              onChange={(e) => handleInputChange('nationality', e.target.value)}
              className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                validationErrors.nationality ? 'border-red-500 focus:border-red-500' : ''
              )}
              disabled={isLoading || isSubmitting}
            >
              <option value="">Select your nationality</option>
              {COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {validationErrors.nationality && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.nationality}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <Input
              type="tel"
              value={formData.phoneNumber}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                handleInputChange('phoneNumber', formatted);
              }}
              placeholder="(555) 123-4567"
              className={cn(
                validationErrors.phoneNumber ? 'border-red-500 focus:border-red-500' : ''
              )}
              disabled={isLoading || isSubmitting}
            />
            {validationErrors.phoneNumber && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.phoneNumber}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">We may use this to verify your identity</p>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Complete Address <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Enter your complete residential address including street, city, state/province, postal code, and country"
              rows={3}
              className={cn(
                "flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
                validationErrors.address ? 'border-red-500 focus:border-red-500' : ''
              )}
              disabled={isLoading || isSubmitting}
            />
            {validationErrors.address && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.address}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Provide your complete residential address. This must match your proof of address document.
            </p>
          </div>

          {/* Legal Disclaimer */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">📋 Legal Requirements</h4>
            <p className="text-xs text-gray-600 mb-3">
              By providing this information, you confirm that all details are accurate and true. 
              False information may result in account suspension or termination. This information 
              is collected for compliance with Anti-Money Laundering (AML) and Know Your Customer (KYC) regulations.
            </p>
            
            {/* Production Compliance Requirements */}
            <div className="border-t border-gray-200 pt-3">
              <h5 className="text-xs font-medium text-gray-800 mb-2">Production Compliance Requirements:</h5>
              <div className="text-xs text-gray-600 space-y-1">
                <p>• PEP (Politically Exposed Person) screening against global databases</p>
                <p>• Sanctions list checking (OFAC, UN, EU consolidated lists)</p>
                <p>• Identity document verification with automated fraud detection</p>
                <p>• Biometric verification and liveness detection</p>
                <p>• Continuous monitoring and periodic re-verification</p>
                <p>• Audit logging for all verification activities</p>
                <p>• Data retention per regulatory requirements (typically 5-7 years)</p>
              </div>
            </div>
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
                  <span>Validating...</span>
                </div>
              ) : (
                'Continue to Documents'
              )}
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Step 1 of 3: Personal Information
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: '33%' }}></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
