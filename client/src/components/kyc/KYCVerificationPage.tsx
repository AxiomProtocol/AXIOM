/**
 * ⚠️ CRITICAL SECURITY WARNING ⚠️
 * 
 * This KYC component currently uses localStorage for authentication tokens,
 * which poses a serious XSS vulnerability risk. This implementation is for 
 * DEVELOPMENT/DEMO PURPOSES ONLY and is NOT production-ready.
 * 
 * BEFORE PRODUCTION USE:
 * 1. Replace localStorage auth with secure httpOnly cookies
 * 2. Implement server-side session management
 * 3. Add secure file upload pipeline with AV scanning
 * 4. Integrate real KYC/IDV providers (Jumio, Onfido, etc.)
 * 5. Add automated PEP/sanctions screening
 * 6. Implement audit logging and compliance features
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../Layout';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { 
  KYCFormData, 
  KYCVerification, 
  KYCDocument, 
  KYCValidationErrors,
  KYCApiResponse,
  DocumentUploadResponse 
} from '../../types/kyc';
import { KYCIdentityForm } from './KYCIdentityForm';
import { KYCDocumentUpload } from './KYCDocumentUpload';
import { KYCRiskAssessment } from './KYCRiskAssessment';
import { KYCStatusTracker } from './KYCStatusTracker';

// KYC Verification Steps
enum KYCStep {
  IDENTITY_FORM = 0,
  DOCUMENT_UPLOAD = 1,
  RISK_ASSESSMENT = 2,
  REVIEW_SUBMIT = 3,
  COMPLETE = 4
}

const STEP_TITLES = {
  [KYCStep.IDENTITY_FORM]: 'Personal Information',
  [KYCStep.DOCUMENT_UPLOAD]: 'Document Upload',
  [KYCStep.RISK_ASSESSMENT]: 'Risk Assessment',
  [KYCStep.REVIEW_SUBMIT]: 'Review & Submit',
  [KYCStep.COMPLETE]: 'Verification Complete'
};

interface KYCVerificationPageProps {
  userId?: number;
  onComplete?: (kycVerification: KYCVerification) => void;
}

export const KYCVerificationPage: React.FC<KYCVerificationPageProps> = ({
  userId,
  onComplete
}) => {
  const navigate = useNavigate();
  
  // Form state
  const [currentStep, setCurrentStep] = useState<KYCStep>(KYCStep.IDENTITY_FORM);
  const [formData, setFormData] = useState<KYCFormData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      nationality: '',
      address: '',
      phoneNumber: ''
    },
    documents: {},
    riskAssessment: {
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
      additionalNotes: ''
    }
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<KYCValidationErrors>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  
  // KYC verification state
  const [kycVerification, setKycVerification] = useState<KYCVerification | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on mount
  // ⚠️ SECURITY WARNING: Using localStorage for auth tokens is insecure
  // TODO: Replace with httpOnly cookies and server-side session validation
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('auth-token');
      const user = localStorage.getItem('user-data');
      
      if (token && user) {
        setIsAuthenticated(true);
        try {
          const userData = JSON.parse(user);
          if (userData.id && !userId) {
            // Use user ID from localStorage if not provided as prop
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
        }
      } else {
        // Don't redirect when used in dashboard context - show auth prompt instead
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [navigate, userId]);

  // Load existing KYC data if available
  useEffect(() => {
    const loadExistingKYC = async () => {
      if (!isAuthenticated) return;

      try {
        setIsLoading(true);
        const token = localStorage.getItem('auth-token');
        
        const response = await fetch('/api/kyc/verification', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.kycVerification) {
            setKycVerification(data.kycVerification);
            
            // If KYC is already submitted, show the status
            if (data.kycVerification.verificationStatus !== 'pending') {
              setCurrentStep(KYCStep.COMPLETE);
            } else {
              // SECURITY FIX: Removed localStorage PII storage
              // TODO: Implement server-side session storage for form data
              // Note: Form data is now only stored in component state during session
              console.log('KYC verification pending - form data will not be pre-filled for security');
            }
          }
        }
      } catch (error) {
        console.error('Error loading KYC data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExistingKYC();
  }, [isAuthenticated]);

  // SECURITY FIX: Removed PII storage in localStorage
  // ⚠️ CRITICAL: Never store sensitive personal data (PII) in localStorage
  // This is vulnerable to XSS attacks and violates compliance requirements
  // TODO: Implement server-side session storage for form progress
  // useEffect(() => {
  //   // REMOVED: localStorage.setItem('kyc-form-data', JSON.stringify(formData));
  // }, [formData, isAuthenticated]);

  // Handle form data changes
  const handleDataChange = useCallback((newData: Partial<KYCFormData>) => {
    setFormData(prev => ({
      personalInfo: { ...prev.personalInfo, ...newData.personalInfo },
      documents: { ...prev.documents, ...newData.documents },
      riskAssessment: { ...prev.riskAssessment, ...newData.riskAssessment }
    }));
    
    // Clear errors when data changes
    setErrors({});
    setSubmitError('');
  }, []);

  // Handle document upload
  const handleDocumentUpload = async (file: File, type: KYCDocument['documentType']) => {
    setIsUploading(true);
    setUploadErrors(prev => ({ ...prev, [type]: '' }));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', type);

      // ⚠️ SECURITY WARNING: localStorage auth tokens are insecure
      // TODO: Replace with httpOnly cookies for production
      const token = localStorage.getItem('auth-token');
      
      // TODO: Implement secure file upload with:
      // - Presigned URLs for direct-to-cloud upload
      // - Server-side virus scanning
      // - EXIF data stripping
      // - File type validation beyond MIME type
      // - Encrypted storage with audit logging
      const response = await fetch('/api/kyc/upload-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result: DocumentUploadResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Document uploaded successfully
      console.log('Document uploaded successfully:', result);
      
    } catch (error: any) {
      console.error('Document upload error:', error);
      setUploadErrors(prev => ({ 
        ...prev, 
        [type]: error.message || 'Upload failed' 
      }));
      throw error; // Re-throw to handle in component
    } finally {
      setIsUploading(false);
    }
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < KYCStep.COMPLETE) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > KYCStep.IDENTITY_FORM) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Form submission
  const handleSubmitKYC = async () => {
    setIsSubmitting(true);
    setSubmitError('');

    try {
      // ⚠️ SECURITY WARNING: localStorage auth tokens are insecure
      // TODO: Replace with httpOnly cookies for production
      const token = localStorage.getItem('auth-token');
      
      // TODO: Production KYC submission requires:
      // - Real PEP/sanctions screening integration (WorldCheck, etc.)
      // - Automated document verification (Jumio, Onfido, etc.)
      // - Compliance audit logging
      // - Data retention policy enforcement
      // - Encrypted data transmission and storage
      const response = await fetch('/api/kyc/submit-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const result: KYCApiResponse = await response.json();

      if (!result.success) {
        if (result.errors) {
          setErrors(result.errors);
        }
        throw new Error(result.error || 'Submission failed');
      }

      // KYC submitted successfully
      setKycVerification(result.data);
      setCurrentStep(KYCStep.COMPLETE);
      
      // SECURITY FIX: No longer storing PII in localStorage
      // TODO: Clear server-side session data on successful submission
      
      // Call completion callback if provided
      if (onComplete) {
        onComplete(result.data);
      }

    } catch (error: any) {
      console.error('KYC submission error:', error);
      setSubmitError(error.message || 'Failed to submit verification');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation check for enabling next button
  const canProceedToNext = () => {
    switch (currentStep) {
      case KYCStep.IDENTITY_FORM:
        return formData.personalInfo.firstName && 
               formData.personalInfo.lastName && 
               formData.personalInfo.dateOfBirth && 
               formData.personalInfo.nationality && 
               formData.personalInfo.address && 
               formData.personalInfo.phoneNumber;
      
      case KYCStep.DOCUMENT_UPLOAD:
        return formData.documents.identityFront && 
               formData.documents.proofOfAddress && 
               formData.documents.selfieVerification;
      
      case KYCStep.RISK_ASSESSMENT:
        return formData.riskAssessment.investmentGoals.length > 0 &&
               formData.riskAssessment.sanctionsListCheck;
      
      default:
        return true;
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case KYCStep.IDENTITY_FORM:
        return (
          <KYCIdentityForm
            data={formData}
            onDataChange={handleDataChange}
            onNext={handleNext}
            onPrevious={handlePrevious}
            isLoading={isLoading}
            errors={errors.personalInfo}
          />
        );

      case KYCStep.DOCUMENT_UPLOAD:
        return (
          <KYCDocumentUpload
            data={formData}
            onDataChange={handleDataChange}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onUpload={handleDocumentUpload}
            isLoading={isLoading}
            isUploading={isUploading}
            errors={errors.documents}
            uploadErrors={uploadErrors}
          />
        );

      case KYCStep.RISK_ASSESSMENT:
        return (
          <KYCRiskAssessment
            data={formData}
            onDataChange={handleDataChange}
            onNext={() => setCurrentStep(KYCStep.REVIEW_SUBMIT)}
            onPrevious={handlePrevious}
            isLoading={isLoading}
            errors={errors.riskAssessment}
          />
        );

      case KYCStep.REVIEW_SUBMIT:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Review Your Information
              </h2>
              <p className="text-lg text-gray-600">
                Please review all information before submitting for verification.
              </p>
            </div>

            <div className="max-w-4xl mx-auto space-y-6">
              {/* Personal Information Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Name:</strong> {formData.personalInfo.firstName} {formData.personalInfo.lastName}</div>
                    <div><strong>Date of Birth:</strong> {formData.personalInfo.dateOfBirth}</div>
                    <div><strong>Nationality:</strong> {formData.personalInfo.nationality}</div>
                    <div><strong>Phone:</strong> {formData.personalInfo.phoneNumber}</div>
                    <div className="md:col-span-2"><strong>Address:</strong> {formData.personalInfo.address}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Uploaded Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {formData.documents.identityFront && <div>✅ Government ID (Front)</div>}
                    {formData.documents.identityBack && <div>✅ Government ID (Back)</div>}
                    {formData.documents.proofOfAddress && <div>✅ Proof of Address</div>}
                    {formData.documents.selfieVerification && <div>✅ Selfie Verification</div>}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Risk Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Employment:</strong> {formData.riskAssessment.employmentStatus}</div>
                  <div><strong>Annual Income:</strong> {formData.riskAssessment.annualIncome}</div>
                  <div><strong>Investment Experience:</strong> {formData.riskAssessment.investmentExperience}</div>
                  <div><strong>Risk Tolerance:</strong> {formData.riskAssessment.riskTolerance}</div>
                  <div><strong>Investment Goals:</strong> {formData.riskAssessment.investmentGoals.join(', ')}</div>
                </CardContent>
              </Card>

              {submitError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{submitError}</p>
                </div>
              )}

              <div className="flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={isSubmitting}
                >
                  Previous
                </Button>
                
                <Button
                  type="button"
                  onClick={handleSubmitKYC}
                  disabled={isSubmitting || !canProceedToNext()}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    'Submit for Verification'
                  )}
                </Button>
              </div>
            </div>
          </div>
        );

      case KYCStep.COMPLETE:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Verification Submitted Successfully!
              </h2>
              <p className="text-lg text-gray-600">
                Thank you for completing your KYC verification. Our team will review your application.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <KYCStatusTracker 
                currentStep={currentStep} 
                kycVerification={kycVerification || undefined}
              />
              
              <div className="mt-6 space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Our compliance team will review your documents (1-3 business days)</li>
                    <li>• You'll receive an email notification when the review is complete</li>
                    <li>• Once approved, you'll have full access to all platform features</li>
                  </ul>
                </div>

                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Go to Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Check Status
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout title="KYC Verification" showWalletConnect={false}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
          <div className="max-w-md mx-auto px-4">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center space-x-2">
                  <span className="text-2xl">🔐</span>
                  <span>Authentication Required</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-gray-600">
                  Please log in to access the KYC verification process and complete your identity verification.
                </p>
                <Button 
                  onClick={() => navigate('/login')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Go to Login
                </Button>
                <p className="text-sm text-gray-500">
                  Don't have an account? You can sign up during the login process.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="KYC Verification" showWalletConnect={false}>
      <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-white py-8">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Identity Verification (KYC)
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Complete your identity verification to unlock all features and start building wealth with confidence.
            </p>
          </div>

          {/* Progress Indicator */}
          {currentStep < KYCStep.COMPLETE && (
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4 mb-4">
                {Object.entries(STEP_TITLES).slice(0, 4).map(([stepKey, title], index) => {
                  const stepNum = parseInt(stepKey);
                  const isActive = stepNum === currentStep;
                  const isCompleted = stepNum < currentStep;
                  
                  return (
                    <div key={stepKey} className="flex items-center">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium",
                        isCompleted ? "bg-green-500 text-white" :
                        isActive ? "bg-blue-500 text-white" :
                        "bg-gray-200 text-gray-600"
                      )}>
                        {isCompleted ? '✓' : stepNum + 1}
                      </div>
                      {index < 3 && (
                        <div className={cn(
                          "w-12 h-0.5 mx-2",
                          stepNum < currentStep ? "bg-green-500" : "bg-gray-200"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  {STEP_TITLES[currentStep as keyof typeof STEP_TITLES]}
                </p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Status Tracker Sidebar */}
            {(currentStep === KYCStep.COMPLETE || kycVerification) && (
              <div className="lg:col-span-4">
                <KYCStatusTracker 
                  currentStep={currentStep} 
                  kycVerification={kycVerification || undefined}
                />
              </div>
            )}
            
            {/* Step Content */}
            <div className={cn(
              currentStep === KYCStep.COMPLETE || kycVerification 
                ? "lg:col-span-8" 
                : "lg:col-span-12"
            )}>
              {renderStepContent()}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};
