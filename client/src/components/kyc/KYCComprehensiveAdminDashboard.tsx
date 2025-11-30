import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { KYCAdvancedFilters, KYCFilters } from './KYCAdvancedFilters';
import { KYCBulkActions } from './KYCBulkActions';
import { KYCDocumentViewer } from './KYCDocumentViewer';
import { KYCAuditTrailViewer } from './KYCAuditTrailViewer';
import { KYCStatsDashboard } from './KYCStatsDashboard';

interface KYCComprehensiveAdminDashboardProps {
  className?: string;
}

interface KYCSubmission {
  id: number;
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  verification_status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'expired';
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: number | null;
  reviewer_first_name: string | null;
  reviewer_last_name: string | null;
  rejection_reason: string | null;
  risk_level: 'low' | 'medium' | 'high' | null;
  compliance_notes: string | null;
  expires_at: string | null;
  documents_count: number;
  nationality: string;
  ip_address?: string;
  device_fingerprint?: string;
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

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  limit: number;
}

const defaultFilters: KYCFilters = {
  status: 'all',
  riskLevel: 'all',
  searchQuery: '',
  dateRange: { start: '', end: '' },
  submissionDateRange: { start: '', end: '' },
  reviewDateRange: { start: '', end: '' },
  documentType: 'all',
  nationality: 'all',
  reviewer: 'all',
  sortBy: 'submitted_at',
  sortOrder: 'DESC'
};

export const KYCComprehensiveAdminDashboard: React.FC<KYCComprehensiveAdminDashboardProps> = ({
  className = ''
}) => {
  // Main state
  const [activeTab, setActiveTab] = useState('overview');
  const [submissions, setSubmissions] = useState<KYCSubmission[]>([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState<number[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmission | null>(null);
  const [selectedDocuments, setSelectedDocuments] = useState<KYCDocumentData[]>([]);
  const [filters, setFilters] = useState<KYCFilters>(defaultFilters);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNextPage: false,
    hasPrevPage: false,
    limit: 20
  });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditKycId, setAuditKycId] = useState<number | null>(null);

  // Fetch submissions with current filters and pagination
  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.limit.toString(),
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      });
      
      // Add filters to params
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.riskLevel !== 'all') params.append('riskLevel', filters.riskLevel);
      if (filters.searchQuery) params.append('search', filters.searchQuery);
      if (filters.submissionDateRange.start) params.append('submissionStart', filters.submissionDateRange.start);
      if (filters.submissionDateRange.end) params.append('submissionEnd', filters.submissionDateRange.end);
      if (filters.reviewDateRange.start) params.append('reviewStart', filters.reviewDateRange.start);
      if (filters.reviewDateRange.end) params.append('reviewEnd', filters.reviewDateRange.end);
      if (filters.nationality !== 'all') params.append('nationality', filters.nationality);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/kyc/verifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KYC submissions: ${response.status}`);
      }
      
      const data = await response.json();
      setSubmissions(data.data.verifications);
      setPagination(data.data.pagination);
      
    } catch (error) {
      console.error('Error fetching KYC submissions:', error);
      setError('Failed to load KYC submissions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.limit]);

  // Fetch documents for selected submission
  const fetchDocuments = async (kycId: number) => {
    setDocumentLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/kyc/documents/list/${kycId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      
      const data = await response.json();
      setSelectedDocuments(data.data.documents || []);
      
    } catch (error) {
      console.error('Error fetching documents:', error);
      setSelectedDocuments([]);
    } finally {
      setDocumentLoading(false);
    }
  };

  // Handle individual KYC review
  const handleKYCReview = async (kycId: number, action: 'approve' | 'reject', reason?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/kyc/admin/review/${kycId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          rejectionReason: reason,
          riskLevel: action === 'approve' ? 'low' : 'medium',
          complianceNotes: `${action} by admin interface`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to review KYC submission');
      }
      
      // Refresh submissions and close modals
      await fetchSubmissions();
      setShowDetailModal(false);
      setSelectedSubmission(null);
      
    } catch (error) {
      console.error('Error reviewing KYC submission:', error);
      setError('Failed to process review. Please try again.');
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: string, data: any) => {
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/kyc/admin/bulk-actions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ...data
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute bulk action');
      }
      
      const result = await response.json();
      
      // Show success message or handle errors
      if (result.data.errors.length > 0) {
        console.warn('Some items failed:', result.data.errors);
      }
      
      // Refresh submissions
      await fetchSubmissions();
      setSelectedSubmissions([]);
      
    } catch (error) {
      console.error('Error executing bulk action:', error);
      setError('Failed to execute bulk action. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Handle document verification
  const handleDocumentVerify = async (documentId: number, status: 'approved' | 'rejected', reason?: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/kyc/documents/verify/${documentId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status,
          rejectionReason: reason
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify document');
      }
      
      // Refresh documents for current submission
      if (selectedSubmission) {
        await fetchDocuments(selectedSubmission.id);
      }
      
    } catch (error) {
      console.error('Error verifying document:', error);
      setError('Failed to verify document. Please try again.');
    }
  };

  // Handle submission selection
  const handleSubmissionSelect = (submissionId: number) => {
    setSelectedSubmissions(prev => {
      if (prev.includes(submissionId)) {
        return prev.filter(id => id !== submissionId);
      } else {
        return [...prev, submissionId];
      }
    });
  };

  // Handle select all submissions
  const handleSelectAll = () => {
    if (selectedSubmissions.length === submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(submissions.map(s => s.id));
    }
  };

  // Handle submission detail view
  const handleViewSubmission = (submission: KYCSubmission) => {
    setSelectedSubmission(submission);
    setShowDetailModal(true);
    fetchDocuments(submission.id);
  };

  // Handle audit trail view
  const handleViewAuditTrail = (kycId: number) => {
    setAuditKycId(kycId);
    setShowAuditModal(true);
  };

  // Filter change handler
  const handleFilterChange = (newFilters: KYCFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 })); // Reset to first page
  };

  // Reset filters
  const handleResetFilters = () => {
    setFilters(defaultFilters);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'under_review': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-300';
      case 'expired': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRiskLevelColor = (risk: string | null) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Load initial data
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchSubmissions();
    }
  }, [activeTab, fetchSubmissions]);

  // Render loading state
  if (isLoading && submissions.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="text-lg text-blue-600">Loading KYC submissions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gradient-to-br from-white via-blue-50 to-white min-h-screen ${className}`}>
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-blue-800 mb-2">
            KYC Comprehensive Admin Dashboard
          </h1>
          <p className="text-blue-600">
            Complete KYC verification management and compliance oversight
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-100 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Dashboard */}
        <div className="mb-8">
          <KYCStatsDashboard />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <KYCAdvancedFilters
            onFilterChange={handleFilterChange}
            initialFilters={filters}
            onReset={handleResetFilters}
            isLoading={isLoading}
          />
        </div>

        {/* Bulk Actions */}
        {selectedSubmissions.length > 0 && (
          <div className="mb-6">
            <KYCBulkActions
              selectedItems={selectedSubmissions}
              onBulkAction={handleBulkAction}
              isLoading={bulkActionLoading}
              onClearSelection={() => setSelectedSubmissions([])}
            />
          </div>
        )}

        {/* Main Content */}
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold text-blue-800">
                KYC Submissions ({pagination.totalRecords})
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchSubmissions}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Submissions Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-blue-200">
                    <th className="text-left p-3 font-semibold text-blue-800">
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.length === submissions.length && submissions.length > 0}
                        onChange={handleSelectAll}
                        className="mr-2"
                      />
                      Select
                    </th>
                    <th className="text-left p-3 font-semibold text-blue-800">User</th>
                    <th className="text-left p-3 font-semibold text-blue-800">Status</th>
                    <th className="text-left p-3 font-semibold text-blue-800">Risk</th>
                    <th className="text-left p-3 font-semibold text-blue-800">Submitted</th>
                    <th className="text-left p-3 font-semibold text-blue-800">Reviewed</th>
                    <th className="text-left p-3 font-semibold text-blue-800">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.id} className="border-b border-blue-100 hover:bg-blue-50">
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedSubmissions.includes(submission.id)}
                          onChange={() => handleSubmissionSelect(submission.id)}
                        />
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-blue-900">
                            {submission.first_name} {submission.last_name}
                          </div>
                          <div className="text-sm text-blue-600">{submission.email}</div>
                          <div className="text-xs text-blue-500">{submission.nationality}</div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.verification_status)}`}>
                          {submission.verification_status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        {submission.risk_level && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskLevelColor(submission.risk_level)}`}>
                            {submission.risk_level.toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-blue-800">
                          {formatDate(submission.submitted_at)}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm text-blue-800">
                          {submission.reviewed_at ? formatDate(submission.reviewed_at) : 'Pending'}
                        </div>
                        {submission.reviewer_first_name && (
                          <div className="text-xs text-blue-600">
                            by {submission.reviewer_first_name} {submission.reviewer_last_name}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSubmission(submission)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewAuditTrail(submission.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Audit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex justify-center items-center space-x-4">
                <Button
                  variant="outline"
                  disabled={!pagination.hasPrevPage || isLoading}
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                >
                  Previous
                </Button>
                <span className="text-blue-800">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={!pagination.hasNextPage || isLoading}
                  onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Modal */}
        {showDetailModal && selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-blue-800">
                  KYC Submission Details
                </h2>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedSubmission(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <KYCDocumentViewer
                kycId={selectedSubmission.id}
                documents={selectedDocuments}
                onDocumentVerify={handleDocumentVerify}
                isLoading={documentLoading}
              />
            </div>
          </div>
        )}

        {/* Audit Trail Modal */}
        {showAuditModal && auditKycId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-blue-800">
                  Audit Trail
                </h2>
                <button
                  onClick={() => {
                    setShowAuditModal(false);
                    setAuditKycId(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              
              <KYCAuditTrailViewer kycId={auditKycId} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
