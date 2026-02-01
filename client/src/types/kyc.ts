// KYC Types based on the database schema
export interface KYCVerification {
  id?: number;
  userId: number;
  
  // Personal Information
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  address: string;
  phoneNumber: string;
  
  // Verification Status and Workflow
  verificationStatus: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: number;
  rejectionReason?: string;
  
  // Risk Assessment
  riskLevel?: 'low' | 'medium' | 'high';
  complianceNotes?: string;
  
  // Additional verification data
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  
  // Compliance tracking
  lastUpdatedBy?: number;
  expiresAt?: string;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface KYCDocument {
  id?: number;
  kycId: number;
  
  // Document Information
  documentType: 'identity_front' | 'identity_back' | 'proof_of_address' | 'selfie_verification';
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  fileMimeType?: string;
  fileHash?: string;
  
  // Verification Status
  verificationStatus: 'pending' | 'approved' | 'rejected';
  verifiedAt?: string;
  verifiedBy?: number;
  rejectionReason?: string;
  
  // Document Analysis Results
  ocrData?: any;
  confidenceScore?: number;
  analysisResults?: any;
  
  // Security and compliance
  isEncrypted?: boolean;
  uploadIpAddress?: string;
  
  // Timestamps
  uploadedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface KYCVerificationStep {
  id?: number;
  kycId: number;
  stepType: 'personal_info' | 'document_upload' | 'review_submission';
  stepStatus: 'not_started' | 'in_progress' | 'completed';
  completedAt?: string;
  data?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface RiskAssessmentData {
  // Employment and Income
  employmentStatus: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student';
  annualIncome: 'under_25k' | '25k_50k' | '50k_100k' | '100k_250k' | 'over_250k';
  sourceOfFunds: 'salary' | 'business' | 'investment' | 'inheritance' | 'other';
  
  // Investment Experience
  investmentExperience: 'none' | 'beginner' | 'intermediate' | 'advanced';
  cryptoExperience: 'none' | 'basic' | 'intermediate' | 'advanced';
  
  // Risk Tolerance
  riskTolerance: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';
  investmentHorizon: 'short_term' | 'medium_term' | 'long_term';
  
  // Compliance Questions
  isPoliticallyExposed: boolean;
  hasCriminalRecord: boolean;
  sanctionsListCheck: boolean;
  
  // Additional Information
  investmentGoals: string[];
  additionalNotes?: string;
}

export interface KYCFormData {
  // Personal Information
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: string;
    phoneNumber: string;
  };
  
  // Document uploads
  documents: {
    identityFront?: File;
    identityBack?: File;
    proofOfAddress?: File;
    selfieVerification?: File;
  };
  
  // Risk assessment
  riskAssessment: RiskAssessmentData;
}

export interface KYCStepProps {
  data: Partial<KYCFormData>;
  onDataChange: (data: Partial<KYCFormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
  errors?: Record<string, string>;
}

export interface DocumentUploadProps {
  documentType: KYCDocument['documentType'];
  onUpload: (file: File, type: KYCDocument['documentType']) => void;
  onRemove: (type: KYCDocument['documentType']) => void;
  uploadedFile?: File;
  isUploading?: boolean;
  error?: string;
  maxSize?: number; // in MB
  acceptedTypes?: string[];
}

export interface KYCProgressStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'upcoming';
  icon: string;
}

// Validation error types
export interface KYCValidationErrors {
  personalInfo?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    nationality?: string;
    address?: string;
    phoneNumber?: string;
  };
  documents?: {
    identityFront?: string;
    identityBack?: string;
    proofOfAddress?: string;
    selfieVerification?: string;
  };
  riskAssessment?: {
    [key: string]: string;
  };
}

// API response types
export interface KYCApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  errors?: KYCValidationErrors;
}

export interface DocumentUploadResponse {
  success: boolean;
  documentId?: number;
  fileUrl?: string;
  error?: string;
}
