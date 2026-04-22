import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface KYCAuditTrailViewerProps {
  kycId?: number;
  onClose?: () => void;
  isLoading?: boolean;
}

interface AuditLogEntry {
  id: number;
  action: string;
  actionBy: number;
  targetType: string;
  targetId: number;
  oldValues: any;
  newValues: any;
  changesSummary: string;
  reason: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
}

export const KYCAuditTrailViewer: React.FC<KYCAuditTrailViewerProps> = ({
  kycId,
  onClose,
  isLoading = false
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (kycId) {
      fetchAuditLogs();
    }
  }, [kycId, currentPage]);

  const fetchAuditLogs = async () => {
    if (!kycId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/kyc/admin/audit-logs/${kycId}?page=${currentPage}&limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch audit logs');
      }
      
      const data = await response.json();
      setAuditLogs(data.data.auditLogs);
      setTotalPages(data.data.pagination.totalPages);
      
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
      case 'kyc_submit':
        return '📝';
      case 'review_approve':
      case 'bulk_approve':
        return '✅';
      case 'review_reject':
      case 'bulk_reject':
        return '❌';
      case 'review_request_additional':
        return '📋';
      case 'review_escalate':
      case 'bulk_escalate':
        return '⚠️';
      case 'document_accessed':
      case 'kyc_document_view':
        return '👁️';
      case 'document_uploaded':
        return '📎';
      case 'data_export':
        return '📊';
      case 'bulk_assign':
        return '👤';
      default:
        return '📌';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'review_approve':
      case 'bulk_approve':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'review_reject':
      case 'bulk_reject':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'review_escalate':
      case 'bulk_escalate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'document_accessed':
      case 'kyc_document_view':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatActionName = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatUserAgent = (userAgent: string) => {
    if (!userAgent) return 'Unknown browser';
    
    if (userAgent.includes('Chrome')) return '🌐 Chrome';
    if (userAgent.includes('Firefox')) return '🔥 Firefox';
    if (userAgent.includes('Safari')) return '🧭 Safari';
    if (userAgent.includes('Edge')) return '📘 Edge';
    return '🌐 Browser';
  };

  const renderChangesSummary = (log: AuditLogEntry) => {
    if (!log.oldValues && !log.newValues) {
      return <span className="text-gray-600">{log.changesSummary || log.reason}</span>;
    }

    const changes = [];
    
    if (log.oldValues && log.newValues) {
      const oldVals = typeof log.oldValues === 'string' ? JSON.parse(log.oldValues) : log.oldValues;
      const newVals = typeof log.newValues === 'string' ? JSON.parse(log.newValues) : log.newValues;
      
      Object.keys(newVals).forEach(key => {
        if (oldVals[key] !== newVals[key]) {
          changes.push(
            <div key={key} className="text-xs bg-gray-100 rounded px-2 py-1 mb-1">
              <span className="font-medium">{key}:</span> 
              <span className="text-red-600 line-through ml-1">{oldVals[key] || 'null'}</span>
              <span className="text-green-600 ml-1">→ {newVals[key] || 'null'}</span>
            </div>
          );
        }
      });
    }
    
    return (
      <div>
        <span className="text-gray-600">{log.changesSummary || log.reason}</span>
        {changes.length > 0 && (
          <div className="mt-2">
            {changes}
          </div>
        )}
      </div>
    );
  };

  if (!kycId) {
    return (
      <Card className="border-2 border-gray-300">
        <CardContent className="py-12 text-center">
          <div className="text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium mb-2">No KYC Selected</p>
            <p className="text-sm">Select a KYC submission to view its audit trail</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-blue-800">
            Audit Trail - KYC #{kycId}
          </CardTitle>
          {onClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span className="text-red-800">{error}</span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium mb-2 text-gray-900">No Audit Logs</p>
            <p className="text-sm text-gray-600">No audit trail entries found for this KYC submission</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Timeline */}
            <div className="relative">
              {auditLogs.map((log, index) => (
                <div key={log.id} className="relative pb-8">
                  {/* Timeline line */}
                  {index < auditLogs.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-full bg-gray-200"></div>
                  )}
                  
                  {/* Timeline entry */}
                  <div className="relative flex items-start space-x-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-gray-900">
                            {formatActionName(log.action)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs border ${getActionColor(log.action)}`}>
                            {log.targetType}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatDate(log.createdAt)}
                        </span>
                      </div>
                      
                      {/* Admin info */}
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">
                          By: {log.adminFirstName} {log.adminLastName}
                        </span>
                        <span className="text-gray-500 ml-2">({log.adminEmail})</span>
                      </div>
                      
                      {/* Changes summary */}
                      <div className="mb-3">
                        {renderChangesSummary(log)}
                      </div>
                      
                      {/* Technical details */}
                      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
                        <div className="flex items-center space-x-4">
                          <span>IP: {log.ipAddress}</span>
                          <span>{formatUserAgent(log.userAgent)}</span>
                        </div>
                        <span>ID: {log.id}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
