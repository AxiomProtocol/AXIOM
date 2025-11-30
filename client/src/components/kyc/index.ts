// KYC Components Export
export { KYCIdentityForm } from './KYCIdentityForm';
export { KYCDocumentUpload } from './KYCDocumentUpload';
export { KYCRiskAssessment } from './KYCRiskAssessment';
export { KYCStatusTracker } from './KYCStatusTracker';
export { KYCVerificationPage } from './KYCVerificationPage';

// KYC Admin Components Export
export { KYCAdvancedFilters } from './KYCAdvancedFilters';
export { KYCBulkActions } from './KYCBulkActions';
export { KYCDocumentViewer } from './KYCDocumentViewer';
export { KYCAuditTrailViewer } from './KYCAuditTrailViewer';
export { KYCStatsDashboard } from './KYCStatsDashboard';
// Temporarily comment out problematic export until we fix it
// export { KYCComprehensiveAdminDashboard } from './KYCComprehensiveAdminDashboard';

// Re-export types for convenience
export type {
  KYCVerification,
  KYCDocument,
  KYCVerificationStep,
  RiskAssessmentData,
  KYCFormData,
  KYCStepProps,
  DocumentUploadProps,
  KYCProgressStep,
  KYCValidationErrors,
  KYCApiResponse,
  DocumentUploadResponse
} from '../../types/kyc';

// Admin component types
export type { KYCFilters } from './KYCAdvancedFilters';
