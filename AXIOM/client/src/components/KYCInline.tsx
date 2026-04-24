import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { CheckCircle, Clock, Upload, FileText, AlertCircle } from 'lucide-react';

interface KYCInlineProps {
  onComplete: (result: { submitted: boolean; approved?: boolean }) => void;
}

export function KYCInline({ onComplete }: KYCInlineProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
    documentType: 'passport',
    documentUploaded: false
  });
  const [uploadState, setUploadState] = useState({
    uploading: false,
    uploadedFile: null as File | null,
    uploadError: null as string | null
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Complete KYC
      onComplete({ submitted: true, approved: false });
    }
  };

  const handleDocumentUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    
    if (file.size > maxSize) {
      setUploadState({ uploading: false, uploadedFile: null, uploadError: 'File size must be less than 10MB' });
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setUploadState({ uploading: false, uploadedFile: null, uploadError: 'Please upload a JPEG, PNG, WebP, or PDF file' });
      return;
    }

    // Start upload
    setUploadState({ uploading: true, uploadedFile: null, uploadError: null });

    try {
      // Get document type mapping
      const documentTypeMap: Record<string, string> = {
        'passport': 'identity_front',
        'drivers_license': 'identity_front',
        'national_id': 'identity_front'
      };

      const mappedDocumentType = documentTypeMap[formData.documentType] || 'identity_front';

      // Create form data for upload
      const uploadFormData = new FormData();
      uploadFormData.append('document', file);
      uploadFormData.append('documentType', mappedDocumentType);

      // Get JWT token from localStorage or context
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch('/api/kyc/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadFormData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUploadState({
          uploading: false,
          uploadedFile: file,
          uploadError: null
        });
        setFormData(prev => ({ ...prev, documentUploaded: true }));
      } else {
        setUploadState({
          uploading: false,
          uploadedFile: null,
          uploadError: result.error || 'Upload failed. Please try again.'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadState({
        uploading: false,
        uploadedFile: null,
        uploadError: 'Network error. Please check your connection and try again.'
      });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.firstName && formData.lastName && formData.dateOfBirth;
      case 2:
        return formData.phoneNumber;
      case 3:
        return formData.documentUploaded;
      default:
        return false;
    }
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center space-x-2 mb-4">
        {[1, 2, 3].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
              stepNum <= step ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {stepNum < step ? <CheckCircle className="h-4 w-4" /> : stepNum}
            </div>
            {stepNum < 3 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && (
        <div className="space-y-3">
          <h4 className="font-medium">Personal Information</h4>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
            />
            <Input
              placeholder="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
            />
          </div>
          <Input
            type="date"
            placeholder="Date of Birth"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <h4 className="font-medium">Contact Information</h4>
          <Input
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
          />
          <p className="text-xs text-gray-500">We'll send verification updates to this number</p>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <h4 className="font-medium">Document Upload</h4>
          <select 
            className="w-full p-2 border rounded"
            value={formData.documentType}
            onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
            disabled={uploadState.uploading}
          >
            <option value="passport">Passport</option>
            <option value="drivers_license">Driver's License</option>
            <option value="national_id">National ID</option>
          </select>
          
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {/* Upload Button / Progress / Success */}
          {uploadState.uploading ? (
            <div className="flex items-center justify-center p-4 border border-blue-200 rounded-lg bg-blue-50">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
              <span className="text-sm text-blue-700">Uploading document...</span>
            </div>
          ) : uploadState.uploadedFile ? (
            <div className="p-4 border border-green-200 rounded-lg bg-green-50">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-green-800">Document uploaded successfully</div>
                  <div className="text-xs text-green-600 flex items-center mt-1">
                    <FileText className="h-3 w-3 mr-1" />
                    {uploadState.uploadedFile.name} ({(uploadState.uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              onClick={handleDocumentUpload}
              className="w-full"
              disabled={uploadState.uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          )}

          {/* Error Message */}
          {uploadState.uploadError && (
            <div className="p-3 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-red-800">Upload Error</div>
                  <div className="text-xs text-red-600 mt-1">{uploadState.uploadError}</div>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500">
            Upload a clear photo of your {formData.documentType.replace('_', ' ')} (JPEG, PNG, WebP, or PDF, max 10MB)
          </p>
        </div>
      )}

      {/* Action Button */}
      <Button 
        onClick={handleNext}
        disabled={!canProceed() || uploadState.uploading}
        className="w-full"
        size="sm"
      >
        {uploadState.uploading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full"></div>
            <span>Uploading...</span>
          </div>
        ) : (
          step === 3 ? 'Submit for Review' : 'Next'
        )}
      </Button>
    </div>
  );
}
