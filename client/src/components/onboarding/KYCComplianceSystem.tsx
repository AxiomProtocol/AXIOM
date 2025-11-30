import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
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
  Scan,
  Eye,
  Lock,
  Key,
  UserCheck,
  FileCheck,
  CreditCard,
  Building,
  Globe,
  Zap,
  Award,
  Star
} from 'lucide-react';
import { LoadingSpinner, LoadingButton } from '../ui/loading-states';

interface KYCComplianceSystemProps {
  onComplete: (kycData: KYCData) => void;
  onCancel: () => void;
  existingData?: Partial<KYCData>;
}

export interface KYCData {
  verificationLevel: 'basic' | 'enhanced' | 'institutional';
  identityVerification: IdentityVerification;
  addressVerification: AddressVerification;
  incomeVerification: IncomeVerification;
  sourceOfFunds: SourceOfFunds;
  pepScreening: PEPScreening;
  sanctions: SanctionsScreening;
  riskAssessment: KYCRiskAssessment;
  documents: KYCDocument[];
  status: 'pending' | 'in-progress' | 'completed' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string;
  approvedAt?: string;
}

interface IdentityVerification {
  documentType: 'passport' | 'drivers-license' | 'national-id' | 'other';
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingCountry: string;
  documentImages: {
    front?: string;
    back?: string;
    selfie?: string;
  };
  verificationStatus: 'pending' | 'verified' | 'failed';
  aiVerificationScore?: number;
  manualReviewRequired?: boolean;
}

interface AddressVerification {
  documentType: 'utility-bill' | 'bank-statement' | 'government-letter' | 'lease-agreement';
  documentDate: string;
  addressMatches: boolean;
  verificationStatus: 'pending' | 'verified' | 'failed';
}

interface IncomeVerification {
  verificationMethod: 'pay-stub' | 'tax-return' | 'bank-statements' | 'employment-letter';
  annualIncome: number;
  employmentStatus: string;
  employer?: string;
  verificationStatus: 'pending' | 'verified' | 'failed';
  documentsRequired: string[];
}

interface SourceOfFunds {
  primarySource: 'employment' | 'business' | 'investments' | 'inheritance' | 'other';
  description: string;
  supportingDocuments: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface PEPScreening {
  isPEP: boolean;
  pepDetails?: {
    position: string;
    jurisdiction: string;
    startDate: string;
    endDate?: string;
  };
  familyConnections: boolean;
  closeAssociates: boolean;
  screeningDate: string;
  riskLevel: 'low' | 'medium' | 'high';
}

interface SanctionsScreening {
  sanctionsHit: boolean;
  watchlistHit: boolean;
  adverseMediaHit: boolean;
  screeningDate: string;
  details?: {
    listName: string;
    matchScore: number;
    falsePositive: boolean;
  };
}

interface KYCRiskAssessment {
  overallRiskScore: number;
  riskCategory: 'low' | 'medium' | 'high' | 'prohibited';
  riskFactors: string[];
  mitigatingFactors: string[];
  enhancedDueDiligence: boolean;
  monitoringLevel: 'standard' | 'enhanced' | 'intensive';
}

interface KYCDocument {
  id: string;
  type: string;
  category: 'identity' | 'address' | 'income' | 'source-of-funds' | 'other';
  fileName: string;
  fileSize: number;
  uploadDate: string;
  status: 'pending' | 'processing' | 'verified' | 'rejected';
  rejectionReason?: string;
  confidenceScore?: number;
}

// KYC verification levels with requirements
const KYC_LEVELS = {
  basic: {
    title: 'Basic Verification',
    maxInvestment: 250000,
    description: 'Standard verification for most retail clients',
    requirements: [
      'Government-issued photo ID',
      'Proof of address (within 3 months)',
      'Basic identity verification',
      'Sanctions screening'
    ],
    documents: ['identity', 'address'],
    timeframe: '24-48 hours'
  },
  enhanced: {
    title: 'Enhanced Verification', 
    maxInvestment: 1000000,
    description: 'Additional verification for higher investment limits',
    requirements: [
      'All basic requirements',
      'Income verification documents',
      'Source of funds documentation',
      'Enhanced due diligence',
      'Employment verification'
    ],
    documents: ['identity', 'address', 'income', 'source-of-funds'],
    timeframe: '3-5 business days'
  },
  institutional: {
    title: 'Institutional Verification',
    maxInvestment: null,
    description: 'Comprehensive verification for institutional clients',
    requirements: [
      'All enhanced requirements',
      'Corporate documentation',
      'Beneficial ownership information',
      'Board resolutions',
      'Professional references',
      'Regulatory approvals'
    ],
    documents: ['identity', 'address', 'income', 'source-of-funds', 'corporate'],
    timeframe: '5-10 business days'
  }
};

// Document upload configuration
const DOCUMENT_TYPES = {
  identity: {
    passport: { label: 'Passport', requirements: ['Clear photo of data page', 'Must not be expired'] },
    'drivers-license': { label: "Driver's License", requirements: ['Front and back photos', 'Must be current'] },
    'national-id': { label: 'National ID Card', requirements: ['Front and back photos', 'Government issued'] }
  },
  address: {
    'utility-bill': { label: 'Utility Bill', requirements: ['Issued within 3 months', 'Shows full address'] },
    'bank-statement': { label: 'Bank Statement', requirements: ['Issued within 3 months', 'Official letterhead'] },
    'government-letter': { label: 'Government Letter', requirements: ['Recent official correspondence'] }
  },
  income: {
    'pay-stub': { label: 'Recent Pay Stub', requirements: ['Within 30 days', 'Shows year-to-date earnings'] },
    'tax-return': { label: 'Tax Return', requirements: ['Most recent year', 'All pages included'] },
    'employment-letter': { label: 'Employment Letter', requirements: ['On company letterhead', 'Salary verification'] }
  }
};

export const KYCComplianceSystem: React.FC<KYCComplianceSystemProps> = ({
  onComplete,
  onCancel,
  existingData
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [kycData, setKycData] = useState<Partial<KYCData>>(existingData || {});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState<'basic' | 'enhanced' | 'institutional'>('basic');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { title: 'Verification Level', description: 'Choose your verification level' },
    { title: 'Identity Verification', description: 'Upload government-issued ID' },
    { title: 'Address Verification', description: 'Verify your residential address' },
    { title: 'Additional Documents', description: 'Upload required documents' },
    { title: 'Review & Submit', description: 'Review and submit for approval' }
  ];

  // Document upload handler
  const handleFileUpload = useCallback(async (file: File, documentType: string, category: string) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate file upload with progress
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', documentType);
      formData.append('category', category);

      // Progress simulation
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + Math.random() * 20;
        });
      }, 200);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Create document record
      const document: KYCDocument = {
        id: Math.random().toString(36).substr(2, 9),
        type: documentType,
        category: category as any,
        fileName: file.name,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        status: 'processing',
        confidenceScore: Math.random() * 30 + 70 // 70-100%
      };

      setKycData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), document]
      }));

      // Simulate processing delay
      setTimeout(() => {
        setKycData(prev => ({
          ...prev,
          documents: prev.documents?.map(doc => 
            doc.id === document.id 
              ? { ...doc, status: 'verified' }
              : doc
          )
        }));
      }, 3000);

    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  // Render verification level selection
  const renderLevelSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Choose Your Verification Level</h3>
        <p className="text-gray-600">
          Select the verification level that matches your investment needs
        </p>
      </div>

      <div className="grid gap-6">
        {Object.entries(KYC_LEVELS).map(([level, config]) => (
          <Card 
            key={level}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedLevel === level ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => setSelectedLevel(level as any)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {level === 'basic' && <Shield className="w-6 h-6 mr-3 text-green-600" />}
                  {level === 'enhanced' && <Star className="w-6 h-6 mr-3 text-blue-600" />}
                  {level === 'institutional' && <Award className="w-6 h-6 mr-3 text-purple-600" />}
                  <div>
                    <CardTitle className="text-lg">{config.title}</CardTitle>
                    <p className="text-gray-600 text-sm mt-1">{config.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {config.maxInvestment ? `$${(Number(config.maxInvestment / 1000) || 0).toFixed(0)}K` : 'Unlimited'}
                  </p>
                  <p className="text-sm text-gray-500">Max Investment</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm text-gray-700 mb-2">Requirements:</p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {config.requirements.map((req, index) => (
                      <li key={index} className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm font-medium text-gray-700">
                    Processing Time: {config.timeframe}
                  </span>
                  {selectedLevel === level && (
                    <div className="flex items-center text-blue-600">
                      <Check className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Selected</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Render identity verification
  const renderIdentityVerification = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Identity Verification</h3>
        <p className="text-gray-600">
          Upload a clear photo of your government-issued ID
        </p>
      </div>

      {/* Document type selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Document Type</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(DOCUMENT_TYPES.identity).map(([type, config]) => (
            <div key={type} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 mr-3" />
                  <div>
                    <h4 className="font-medium">{config.label}</h4>
                    <ul className="text-sm text-gray-600 mt-1">
                      {config.requirements.map((req, index) => (
                        <li key={index}>• {req}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Set document type and trigger file upload
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/*';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        handleFileUpload(file, type, 'identity');
                      }
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upload progress */}
      {isUploading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mb-4" />
              <h4 className="font-medium mb-2">Processing your document...</h4>
              <Progress value={uploadProgress} className="mb-2" />
              <p className="text-sm text-gray-600">{Math.round(uploadProgress)}% complete</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded documents */}
      {kycData.documents && kycData.documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {kycData.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center">
                    <FileCheck className="w-5 h-5 mr-3 text-green-600" />
                    <div>
                      <p className="font-medium">{doc.fileName}</p>
                      <p className="text-sm text-gray-600">
                        {doc.category} • Uploaded {new Date(doc.uploadDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {doc.status === 'processing' && (
                      <div className="flex items-center text-yellow-600">
                        <Clock className="w-4 h-4 mr-1" />
                        <span className="text-sm">Processing</span>
                      </div>
                    )}
                    {doc.status === 'verified' && (
                      <div className="flex items-center text-green-600">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        <span className="text-sm">Verified</span>
                      </div>
                    )}
                    {doc.confidenceScore && (
                      <span className="text-sm text-gray-500 ml-3">
                        {Math.round(doc.confidenceScore)}% match
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // Navigation
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete KYC process
      const completedKycData: KYCData = {
        verificationLevel: selectedLevel,
        status: 'completed',
        submittedAt: new Date().toISOString(),
        ...kycData
      } as KYCData;
      
      onComplete(completedKycData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return selectedLevel !== null;
      case 1:
        return kycData.documents?.some(doc => doc.category === 'identity' && doc.status === 'verified');
      default:
        return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Shield className="w-6 h-6 mr-2" />
                KYC/AML Compliance Verification
              </CardTitle>
              <p className="text-gray-600 mt-1">
                Complete identity verification to comply with regulations
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">
                Step {currentStep + 1} of {steps.length}
              </p>
              <Progress value={(currentStep + 1) / steps.length * 100} className="w-32 mt-2" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Steps Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  index <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                </div>
                <div className={`ml-3 ${index !== steps.length - 1 ? 'mr-4' : ''}`}>
                  <p className={`font-medium text-sm ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-600'
                  }`}>
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-4 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {currentStep === 0 && renderLevelSelection()}
          {currentStep === 1 && renderIdentityVerification()}
          {/* Additional steps would be rendered here */}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={currentStep === 0 ? onCancel : handlePrevious}
            >
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </Button>
            <LoadingButton
              onClick={handleNext}
              loading={isUploading}
              disabled={!canProceed()}
            >
              {currentStep === steps.length - 1 ? 'Complete Verification' : 'Next'}
            </LoadingButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
