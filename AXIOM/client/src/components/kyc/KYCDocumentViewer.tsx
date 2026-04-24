import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface KYCDocumentViewerProps {
  documents: KYCDocumentData[];
  kycId: number;
  onDocumentVerify: (documentId: number, status: 'approved' | 'rejected', reason?: string) => void;
  isLoading?: boolean;
}

interface KYCDocumentData {
  id: number;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  rejectionReason?: string;
}

export const KYCDocumentViewer: React.FC<KYCDocumentViewerProps> = ({
  documents,
  kycId,
  onDocumentVerify,
  isLoading = false
}) => {
  const [selectedDocument, setSelectedDocument] = useState<KYCDocumentData | null>(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verificationAction, setVerificationAction] = useState<'approved' | 'rejected'>('approved');
  const [rejectionReason, setRejectionReason] = useState('');
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (documents.length > 0 && !selectedDocument) {
      setSelectedDocument(documents[0]);
      setCurrentDocumentIndex(0);
    }
  }, [documents, selectedDocument]);

  const handleDocumentSelect = (document: KYCDocumentData, index: number) => {
    setSelectedDocument(document);
    setCurrentDocumentIndex(index);
    setZoom(1);
    setRotation(0);
  };

  const handleNext = () => {
    if (currentDocumentIndex < documents.length - 1) {
      const nextIndex = currentDocumentIndex + 1;
      handleDocumentSelect(documents[nextIndex], nextIndex);
    }
  };

  const handlePrevious = () => {
    if (currentDocumentIndex > 0) {
      const prevIndex = currentDocumentIndex - 1;
      handleDocumentSelect(documents[prevIndex], prevIndex);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleResetView = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleVerifyDocument = () => {
    if (!selectedDocument) return;
    
    if (verificationAction === 'rejected' && !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    onDocumentVerify(
      selectedDocument.id, 
      verificationAction, 
      verificationAction === 'rejected' ? rejectionReason : undefined
    );
    
    setShowVerifyModal(false);
    setRejectionReason('');
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'identity_front': return 'ID Front';
      case 'identity_back': return 'ID Back';
      case 'proof_of_address': return 'Proof of Address';
      case 'selfie_verification': return 'Selfie Verification';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (documents.length === 0) {
    return (
      <Card className="border-2 border-gray-300">
        <CardContent className="py-12 text-center">
          <div className="text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium mb-2">No Documents Available</p>
            <p className="text-sm">This KYC submission has no uploaded documents yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Document Navigation */}
      <Card className="border-2 border-blue-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-blue-800">
            Document Verification ({documents.length} documents)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {documents.map((doc, index) => (
              <button
                key={doc.id}
                onClick={() => handleDocumentSelect(doc, index)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  selectedDocument?.id === doc.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                }`}
                disabled={isLoading}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {getDocumentTypeLabel(doc.documentType)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs border ${getStatusColor(doc.verificationStatus)}`}>
                    {doc.verificationStatus}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  <div className="truncate">{doc.fileName}</div>
                  <div className="mt-1">{formatFileSize(doc.fileSize)}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document Viewer */}
      {selectedDocument && (
        <Card className="border-2 border-blue-300">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-blue-800">
                  {getDocumentTypeLabel(selectedDocument.documentType)}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedDocument.fileName} • {formatFileSize(selectedDocument.fileSize)} • 
                  Uploaded {new Date(selectedDocument.uploadedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded border ${getStatusColor(selectedDocument.verificationStatus)}`}>
                  {selectedDocument.verificationStatus}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Viewer Controls */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentDocumentIndex === 0 || isLoading}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-gray-600">
                  {currentDocumentIndex + 1} of {documents.length}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleNext}
                  disabled={currentDocumentIndex === documents.length - 1 || isLoading}
                >
                  Next →
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={handleZoomOut} disabled={zoom <= 0.5}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                  </svg>
                </Button>
                <span className="text-sm text-gray-600 min-w-[4rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <Button size="sm" variant="outline" onClick={handleZoomIn} disabled={zoom >= 3}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </Button>
                <Button size="sm" variant="outline" onClick={handleRotate}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetView}>
                  Reset
                </Button>
              </div>
            </div>

            {/* Document Display */}
            <div className="bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden">
              <div className="relative min-h-[400px] max-h-[600px] overflow-auto bg-white">
                {selectedDocument.mimeType?.startsWith('image/') ? (
                  <img
                    ref={imageRef}
                    src={selectedDocument.fileUrl}
                    alt={selectedDocument.fileName}
                    className="mx-auto block"
                    style={{
                      transform: `scale(${zoom}) rotate(${rotation}deg)`,
                      transformOrigin: 'center',
                      transition: 'transform 0.3s ease'
                    }}
                    onError={(e) => {
                      console.error('Image load error:', e);
                      // Could show error state here
                    }}
                  />
                ) : selectedDocument.mimeType === 'application/pdf' ? (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium mb-2">PDF Document</p>
                      <p className="text-sm text-gray-600 mb-4">{selectedDocument.fileName}</p>
                      <Button
                        onClick={() => window.open(selectedDocument.fileUrl, '_blank')}
                        className="bg-blue-500 hover:bg-blue-600 text-white"
                      >
                        Open PDF in New Tab
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-lg font-medium mb-2">Unsupported File Type</p>
                      <p className="text-sm text-gray-600 mb-4">{selectedDocument.mimeType}</p>
                      <Button
                        onClick={() => window.open(selectedDocument.fileUrl, '_blank')}
                        variant="outline"
                      >
                        Download File
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Verification Actions */}
            {selectedDocument.verificationStatus === 'pending' && (
              <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800">
                  <span className="font-medium">Document Verification Required</span>
                  <p className="mt-1">Please review the document and approve or reject it.</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      setVerificationAction('rejected');
                      setShowVerifyModal(true);
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white"
                    disabled={isLoading}
                  >
                    Reject
                  </Button>
                  <Button
                    onClick={() => {
                      setVerificationAction('approved');
                      setShowVerifyModal(true);
                    }}
                    className="bg-green-500 hover:bg-green-600 text-white"
                    disabled={isLoading}
                  >
                    Approve
                  </Button>
                </div>
              </div>
            )}

            {/* Rejection Reason Display */}
            {selectedDocument.verificationStatus === 'rejected' && selectedDocument.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-800">
                  <span className="font-medium">Rejection Reason:</span>
                  <p className="mt-1">{selectedDocument.rejectionReason}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Verification Modal */}
      {showVerifyModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {verificationAction === 'approved' ? 'Approve Document' : 'Reject Document'}
                </h3>
                <button
                  onClick={() => setShowVerifyModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  {verificationAction === 'approved' 
                    ? `Are you sure you want to approve the ${getDocumentTypeLabel(selectedDocument.documentType)} document?`
                    : `Please provide a reason for rejecting the ${getDocumentTypeLabel(selectedDocument.documentType)} document.`
                  }
                </p>

                {verificationAction === 'rejected' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rejection Reason *
                    </label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select a reason...</option>
                      <option value="document_quality_poor">Poor Document Quality</option>
                      <option value="document_not_readable">Document Not Readable</option>
                      <option value="document_expired">Document Expired</option>
                      <option value="document_invalid">Document Invalid</option>
                      <option value="information_mismatch">Information Mismatch</option>
                      <option value="suspicious_document">Suspicious Document</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowVerifyModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVerifyDocument}
                  disabled={isLoading || (verificationAction === 'rejected' && !rejectionReason)}
                  className={verificationAction === 'approved' 
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                  }
                >
                  {isLoading ? 'Processing...' : `Confirm ${verificationAction === 'approved' ? 'Approval' : 'Rejection'}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
