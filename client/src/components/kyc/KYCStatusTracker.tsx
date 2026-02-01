import React from 'react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { KYCProgressStep, KYCVerification } from '../../types/kyc';

interface KYCStatusTrackerProps {
  currentStep: number;
  kycVerification?: KYCVerification;
  className?: string;
}

// Define the KYC verification steps
const KYC_STEPS: KYCProgressStep[] = [
  {
    id: 'personal_info',
    title: 'Personal Information',
    description: 'Provide your basic personal details',
    status: 'upcoming',
    icon: '👤'
  },
  {
    id: 'document_upload',
    title: 'Document Upload',
    description: 'Upload required identity documents',
    status: 'upcoming',
    icon: '📄'
  },
  {
    id: 'risk_assessment',
    title: 'Risk Assessment',
    description: 'Complete your investment profile',
    status: 'upcoming',
    icon: '📊'
  },
  {
    id: 'review_submission',
    title: 'Review & Submit',
    description: 'Review and submit for verification',
    status: 'upcoming',
    icon: '✅'
  },
  {
    id: 'verification_review',
    title: 'Under Review',
    description: 'Our team is reviewing your application',
    status: 'upcoming',
    icon: '🔍'
  },
  {
    id: 'verification_complete',
    title: 'Verification Complete',
    description: 'Your account has been verified',
    status: 'upcoming',
    icon: '🎉'
  }
];

export const KYCStatusTracker: React.FC<KYCStatusTrackerProps> = ({
  currentStep,
  kycVerification,
  className
}) => {
  // Update step statuses based on current step and verification status
  const getStepStatus = (stepIndex: number): KYCProgressStep['status'] => {
    if (kycVerification) {
      // If KYC is submitted and under review
      if (kycVerification.verificationStatus === 'under_review') {
        if (stepIndex < 4) return 'completed';
        if (stepIndex === 4) return 'current';
        return 'upcoming';
      }
      
      // If KYC is approved
      if (kycVerification.verificationStatus === 'approved') {
        if (stepIndex < 5) return 'completed';
        if (stepIndex === 5) return 'current';
        return 'upcoming';
      }
      
      // If KYC is rejected
      if (kycVerification.verificationStatus === 'rejected') {
        if (stepIndex < 4) return 'completed';
        if (stepIndex === 4) return 'current'; // Show as current to allow re-submission
        return 'upcoming';
      }
    }
    
    // Default step progression for form completion
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'upcoming';
  };

  const steps = KYC_STEPS.map((step, index) => ({
    ...step,
    status: getStepStatus(index)
  }));

  const getStatusColor = (status: KYCProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'current':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-400 bg-gray-100';
    }
  };

  const getConnectorColor = (status: KYCProgressStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'current':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Verification Progress
            </h3>
            <p className="text-sm text-gray-600">
              Track your KYC verification status
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div 
                    className={cn(
                      "absolute left-6 top-12 w-0.5 h-8 -ml-px",
                      getConnectorColor(step.status)
                    )}
                  />
                )}
                
                {/* Step Content */}
                <div className="flex items-start space-x-4">
                  {/* Step Icon */}
                  <div className={cn(
                    "flex items-center justify-center w-12 h-12 rounded-full text-lg font-medium border-2 transition-colors",
                    step.status === 'completed' 
                      ? "bg-green-100 border-green-500 text-green-700"
                      : step.status === 'current'
                      ? "bg-blue-100 border-blue-500 text-blue-700"
                      : "bg-gray-100 border-gray-300 text-gray-500"
                  )}>
                    {step.status === 'completed' ? (
                      <span>✓</span>
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>

                  {/* Step Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className={cn(
                        "text-sm font-medium",
                        step.status === 'current' ? "text-blue-900" : "text-gray-900"
                      )}>
                        {step.title}
                      </h4>
                      
                      {/* Status Badge */}
                      <span className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        step.status === 'completed' 
                          ? "bg-green-100 text-green-800"
                          : step.status === 'current'
                          ? "bg-blue-100 text-blue-800"
                          : "bg-gray-100 text-gray-600"
                      )}>
                        {step.status === 'completed' ? 'Completed' : 
                         step.status === 'current' ? 'Current' : 'Pending'}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1">
                      {step.description}
                    </p>

                    {/* Special messages for specific statuses */}
                    {step.status === 'current' && kycVerification?.verificationStatus === 'rejected' && step.id === 'verification_review' && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-sm text-red-800">
                          <span className="font-medium">Verification Rejected:</span> {kycVerification.rejectionReason}
                        </p>
                      </div>
                    )}
                    
                    {step.status === 'current' && step.id === 'verification_review' && kycVerification?.verificationStatus === 'under_review' && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm text-yellow-800">
                          <span className="font-medium">In Review:</span> Expected completion in 1-3 business days
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Status */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Overall Status</h4>
                <p className="text-xs text-gray-600">
                  {kycVerification ? (
                    kycVerification.verificationStatus === 'approved' ? 'Verification Complete' :
                    kycVerification.verificationStatus === 'under_review' ? 'Under Review' :
                    kycVerification.verificationStatus === 'rejected' ? 'Verification Rejected' :
                    'Pending Completion'
                  ) : (
                    'Not Started'
                  )}
                </p>
              </div>
              
              <div className="text-right">
                <div className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium",
                  kycVerification?.verificationStatus === 'approved' 
                    ? "bg-green-100 text-green-800"
                    : kycVerification?.verificationStatus === 'under_review'
                    ? "bg-yellow-100 text-yellow-800"
                    : kycVerification?.verificationStatus === 'rejected'
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
                )}>
                  {kycVerification ? (
                    kycVerification.verificationStatus === 'approved' ? '✅ Verified' :
                    kycVerification.verificationStatus === 'under_review' ? '⏳ In Review' :
                    kycVerification.verificationStatus === 'rejected' ? '❌ Rejected' :
                    '📋 Pending'
                  ) : (
                    '🚀 Get Started'
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={cn(
                    "h-2 rounded-full transition-all duration-500",
                    kycVerification?.verificationStatus === 'approved' ? "bg-green-500" :
                    kycVerification?.verificationStatus === 'under_review' ? "bg-yellow-500" :
                    kycVerification?.verificationStatus === 'rejected' ? "bg-red-500" :
                    "bg-blue-500"
                  )}
                  style={{ 
                    width: `${((currentStep + (kycVerification?.verificationStatus === 'approved' ? 2 : 
                                kycVerification?.verificationStatus === 'under_review' ? 1 : 0)) / steps.length) * 100}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Start</span>
                <span>
                  {Math.round(((currentStep + (kycVerification?.verificationStatus === 'approved' ? 2 : 
                              kycVerification?.verificationStatus === 'under_review' ? 1 : 0)) / steps.length) * 100)}% Complete
                </span>
              </div>
            </div>
          </div>

          {/* Help Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-1">💡 Need Help?</h4>
            <p className="text-xs text-blue-800">
              If you have questions about the verification process or need assistance, 
              please contact our support team at support@sovranwealthfund.com
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
