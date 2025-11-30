import React, { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../../lib/utils';
import { KYCStepProps, DocumentUploadProps, KYCDocument } from '../../types/kyc';

// Document requirements configuration
const DOCUMENT_REQUIREMENTS = {
  identity_front: {
    title: 'Government ID (Front)',
    description: 'Front side of your passport, driver\'s license, or national ID card',
    examples: ['Passport photo page', 'Driver\'s license front', 'National ID card front'],
    required: true,
    icon: '🆔'
  },
  identity_back: {
    title: 'Government ID (Back)',
    description: 'Back side of your driver\'s license or national ID card (not required for passport)',
    examples: ['Driver\'s license back', 'National ID card back'],
    required: false,
    icon: '🆔'
  },
  proof_of_address: {
    title: 'Proof of Address',
    description: 'Recent document showing your name and address (not older than 3 months)',
    examples: ['Utility bill', 'Bank statement', 'Government letter', 'Lease agreement'],
    required: true,
    icon: '🏠'
  },
  selfie_verification: {
    title: 'Selfie with ID',
    description: 'Clear photo of yourself holding your ID next to your face',
    examples: ['Hold ID next to face', 'Good lighting', 'Clear and readable ID'],
    required: true,
    icon: '🤳'
  }
};

// File validation constants
const MAX_FILE_SIZE = 10; // MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

// Single document upload component
const DocumentUploadCard: React.FC<{
  documentType: KYCDocument['documentType'];
  uploadedFile?: File;
  onUpload: (file: File, type: KYCDocument['documentType']) => void;
  onRemove: (type: KYCDocument['documentType']) => void;
  isUploading?: boolean;
  error?: string;
  disabled?: boolean;
}> = ({
  documentType,
  uploadedFile,
  onUpload,
  onRemove,
  isUploading = false,
  error,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string>('');

  const requirements = DOCUMENT_REQUIREMENTS[documentType];

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE * 1024 * 1024) {
      return `File size must be less than ${MAX_FILE_SIZE}MB`;
    }

    // Check file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      return `File type not supported. Please use: ${ACCEPTED_EXTENSIONS.join(', ')}`;
    }

    // Check file name for basic security
    if (file.name.length > 255) {
      return 'File name is too long';
    }

    // Basic file name validation
    if (!/^[a-zA-Z0-9._\-\s]+\.(jpg|jpeg|png|webp|pdf)$/i.test(file.name)) {
      return 'File name contains invalid characters';
    }

    return null;
  };

  const handleFileSelect = (file: File) => {
    if (disabled) return;

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError('');
    onUpload(file, documentType);
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);

    if (disabled || isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, isUploading]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setDragOver(true);
    }
  }, [disabled, isUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const openFileDialog = () => {
    if (!disabled && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (Number((bytes / Math.pow(k, i)) || 0)).toFixed(2) + ' ' + sizes[i];
  };

  return (
    <Card className={cn(
      "transition-all duration-200",
      error || validationError ? "border-red-500" : "",
      uploadedFile ? "border-green-500 bg-green-50" : "",
      dragOver ? "border-blue-500 bg-blue-50" : ""
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <span className="text-2xl">{requirements.icon}</span>
          <div>
            <div className="flex items-center space-x-2">
              <span>{requirements.title}</span>
              {requirements.required && <span className="text-red-500 text-sm">*</span>}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{requirements.description}</p>
        
        {/* Upload Area */}
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
            dragOver ? "border-blue-500 bg-blue-50" : "border-gray-300",
            disabled ? "cursor-not-allowed opacity-50" : "hover:border-blue-500 hover:bg-blue-50",
            uploadedFile ? "border-green-500 bg-green-50" : ""
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : uploadedFile ? (
            <div className="space-y-2">
              <div className="text-4xl text-green-600">✅</div>
              <p className="text-sm font-medium text-green-800">{uploadedFile.name}</p>
              <p className="text-xs text-green-600">{formatFileSize(uploadedFile.size)}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(documentType);
                }}
                className="mt-2"
              >
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-4xl text-gray-400">📎</div>
              <p className="text-sm font-medium text-gray-900">
                Drop file here or click to upload
              </p>
              <p className="text-xs text-gray-500">
                Supported: {ACCEPTED_EXTENSIONS.join(', ')} (max {MAX_FILE_SIZE}MB)
              </p>
            </div>
          )}
        </div>

        {/* Examples */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-xs font-medium text-gray-700 mb-1">Accepted documents:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            {requirements.examples.map((example, index) => (
              <li key={index} className="flex items-center space-x-1">
                <span className="text-green-500">•</span>
                <span>{example}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Error Messages */}
        {(error || validationError) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error || validationError}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Main KYC Document Upload Component
interface KYCDocumentUploadProps extends KYCStepProps {
  onUpload: (file: File, type: KYCDocument['documentType']) => Promise<void>;
  isUploading?: boolean;
  uploadErrors?: Record<string, string>;
}

export const KYCDocumentUpload: React.FC<KYCDocumentUploadProps> = ({
  data,
  onDataChange,
  onNext,
  onPrevious,
  onUpload,
  isLoading = false,
  isUploading = false,
  errors = {},
  uploadErrors = {}
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<Set<KYCDocument['documentType']>>(new Set());

  const handleFileUpload = async (file: File, type: KYCDocument['documentType']) => {
    setUploadingFiles(prev => new Set([...prev, type]));

    try {
      await onUpload(file, type);
      
      // Update the data with the uploaded file
      const camelCaseType = type === 'identity_front' ? 'identityFront' :
                           type === 'identity_back' ? 'identityBack' :
                           type === 'proof_of_address' ? 'proofOfAddress' :
                           type === 'selfie_verification' ? 'selfieVerification' : type;
      
      onDataChange({
        documents: {
          ...data.documents,
          [camelCaseType]: file
        }
      });
    } catch (error) {
      console.error(`Error uploading ${type}:`, error);
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(type);
        return newSet;
      });
    }
  };

  const handleFileRemove = (type: KYCDocument['documentType']) => {
    const camelCaseType = type === 'identity_front' ? 'identityFront' :
                         type === 'identity_back' ? 'identityBack' :
                         type === 'proof_of_address' ? 'proofOfAddress' :
                         type === 'selfie_verification' ? 'selfieVerification' : type;
    
    onDataChange({
      documents: {
        ...data.documents,
        [camelCaseType]: undefined
      }
    });
  };

  // Check if all required documents are uploaded
  const requiredDocuments = Object.entries(DOCUMENT_REQUIREMENTS)
    .filter(([_, req]) => req.required)
    .map(([type, _]) => type as KYCDocument['documentType']);

  const allRequiredUploaded = requiredDocuments.every(type => {
    const camelCaseType = type === 'identity_front' ? 'identityFront' :
                         type === 'identity_back' ? 'identityBack' :
                         type === 'proof_of_address' ? 'proofOfAddress' :
                         type === 'selfie_verification' ? 'selfieVerification' : type;
    return data.documents?.[camelCaseType] !== undefined;
  });

  const hasAnyUploading = uploadingFiles.size > 0;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Your Documents
        </h2>
        <p className="text-lg text-gray-600">
          Please upload clear, readable photos or scans of your documents for verification.
        </p>
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <p className="text-sm text-yellow-800">
            📸 <strong>Photo Tips:</strong> Ensure documents are well-lit, flat, and all text is clearly readable. 
            Avoid glare, shadows, or blurry images.
          </p>
        </div>
        
        {/* SERVER-SIDE SECURITY REQUIREMENTS WARNING */}
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-medium text-red-800 mb-2">🛡️ Production Security Requirements</h4>
          <div className="text-xs text-red-700 space-y-1">
            <p><strong>File Upload Security (Server-side required):</strong></p>
            <p>• Virus/malware scanning for all uploaded files</p>
            <p>• EXIF data stripping to remove location metadata</p>
            <p>• File type validation beyond MIME type checking</p>
            <p>• Encrypted storage with access audit logging</p>
            <p>• Presigned URLs for direct-to-cloud upload</p>
            <p>• Maximum retention period enforcement per regulations</p>
            <p><strong>Note:</strong> This demo interface does not implement these security measures</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 max-w-4xl mx-auto">
        {(Object.entries(DOCUMENT_REQUIREMENTS) as [KYCDocument['documentType'], any][]).map(([type, requirements]) => {
          const camelCaseType = type === 'identity_front' ? 'identityFront' :
                               type === 'identity_back' ? 'identityBack' :
                               type === 'proof_of_address' ? 'proofOfAddress' :
                               type === 'selfie_verification' ? 'selfieVerification' : type;
          
          return (
            <DocumentUploadCard
              key={type}
              documentType={type}
              uploadedFile={data.documents?.[camelCaseType]}
              onUpload={handleFileUpload}
              onRemove={handleFileRemove}
              isUploading={uploadingFiles.has(type)}
              error={uploadErrors[type]}
              disabled={isLoading}
            />
          );
        })}
      </div>

      {/* Security Notice */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">🔐 Security & Privacy</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• All documents are encrypted and stored securely</p>
            <p>• We only use this information for identity verification</p>
            <p>• Documents are reviewed by our compliance team only</p>
            <p>• We comply with all data protection regulations</p>
          </div>
        </div>
        
        {/* Document Verification Technology Requirements */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-medium text-orange-800 mb-2">🤖 Production Document Verification</h4>
          <div className="text-xs text-orange-700 space-y-1">
            <p><strong>Automated Verification Requirements:</strong></p>
            <p>• OCR (Optical Character Recognition) for data extraction</p>
            <p>• Document authenticity verification (watermarks, security features)</p>
            <p>• Cross-reference with issuing authority databases</p>
            <p>• Facial recognition matching between ID and selfie</p>
            <p>• Liveness detection to prevent photo spoofing</p>
            <p>• Integration with providers like Jumio, Onfido, or Veriff</p>
            <p>• Real-time fraud detection and risk scoring</p>
            <p><strong>Note:</strong> This demo uses basic file upload without verification</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between max-w-2xl mx-auto pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onPrevious}
          disabled={isLoading || hasAnyUploading}
        >
          Previous
        </Button>
        
        <Button
          type="button"
          onClick={onNext}
          disabled={!allRequiredUploaded || isLoading || hasAnyUploading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {hasAnyUploading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
              <span>Uploading...</span>
            </div>
          ) : (
            'Continue to Risk Assessment'
          )}
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Step 2 of 3: Document Upload
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2 max-w-2xl mx-auto">
          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '66%' }}></div>
        </div>
        
        {/* Upload Status */}
        <div className="mt-4 text-sm">
          <span className="text-gray-600">
            Required documents: {requiredDocuments.filter(type => {
              const camelCaseType = type === 'identity_front' ? 'identityFront' :
                                   type === 'identity_back' ? 'identityBack' :
                                   type === 'proof_of_address' ? 'proofOfAddress' :
                                   type === 'selfie_verification' ? 'selfieVerification' : type;
              return data.documents?.[camelCaseType];
            }).length} / {requiredDocuments.length}
          </span>
          {allRequiredUploaded && (
            <span className="ml-2 text-green-600 font-medium">✓ All required documents uploaded</span>
          )}
        </div>
      </div>
    </div>
  );
};
