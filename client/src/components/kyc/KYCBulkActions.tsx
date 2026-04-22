import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface KYCBulkActionsProps {
  selectedItems: number[];
  onBulkAction: (action: string, data: any) => Promise<void>;
  onClearSelection: () => void;
  isLoading?: boolean;
}

interface BulkActionData {
  action: 'bulk_approve' | 'bulk_reject' | 'bulk_assign' | 'bulk_escalate';
  rejectionReason?: string;
  assignedReviewer?: string;
  riskLevel?: string;
  complianceNotes?: string;
}

export const KYCBulkActions: React.FC<KYCBulkActionsProps> = ({
  selectedItems,
  onBulkAction,
  onClearSelection,
  isLoading = false
}) => {
  const [showActionModal, setShowActionModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [actionData, setActionData] = useState<Partial<BulkActionData>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleActionSelect = (action: string) => {
    setSelectedAction(action);
    setActionData({ action: action as any });
    setShowActionModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedAction || selectedItems.length === 0) return;
    
    setIsProcessing(true);
    try {
      await onBulkAction(selectedAction, {
        ...actionData,
        kycIds: selectedItems
      });
      setShowActionModal(false);
      setSelectedAction('');
      setActionData({});
      onClearSelection();
    } catch (error) {
      console.error('Bulk action failed:', error);
      // Error handling would be done by parent component
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    setShowActionModal(false);
    setSelectedAction('');
    setActionData({});
  };

  const getActionTitle = (action: string) => {
    switch (action) {
      case 'bulk_approve': return 'Bulk Approve';
      case 'bulk_reject': return 'Bulk Reject';
      case 'bulk_assign': return 'Bulk Assign Reviewer';
      case 'bulk_escalate': return 'Bulk Escalate';
      default: return 'Bulk Action';
    }
  };

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'bulk_approve': 
        return `This will approve ${selectedItems.length} KYC submission(s) and set them to approved status.`;
      case 'bulk_reject': 
        return `This will reject ${selectedItems.length} KYC submission(s). A rejection reason is required.`;
      case 'bulk_assign': 
        return `This will assign ${selectedItems.length} KYC submission(s) to a specific reviewer.`;
      case 'bulk_escalate': 
        return `This will escalate ${selectedItems.length} KYC submission(s) for additional review.`;
      default: return '';
    }
  };

  if (selectedItems.length === 0) {
    return (
      <Card className="border-2 border-gray-300 bg-gray-50">
        <CardContent className="py-8 text-center">
          <div className="text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium mb-2">No Items Selected</p>
            <p className="text-sm">Select KYC submissions to perform bulk actions</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 border-blue-300 bg-gradient-to-br from-white to-blue-50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-blue-800">
              Bulk Actions ({selectedItems.length} selected)
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={onClearSelection}
              disabled={isLoading}
              className="text-gray-600 hover:text-gray-800"
            >
              Clear Selection
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={() => handleActionSelect('bulk_approve')}
              disabled={isLoading}
              className="bg-green-500 hover:bg-green-600 text-white"
              size="sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Approve All
            </Button>

            <Button
              onClick={() => handleActionSelect('bulk_reject')}
              disabled={isLoading}
              className="bg-red-500 hover:bg-red-600 text-white"
              size="sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Reject All
            </Button>

            <Button
              onClick={() => handleActionSelect('bulk_assign')}
              disabled={isLoading}
              className="bg-blue-500 hover:bg-blue-600 text-white"
              size="sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Assign Reviewer
            </Button>

            <Button
              onClick={() => handleActionSelect('bulk_escalate')}
              disabled={isLoading}
              className="bg-yellow-500 hover:bg-yellow-600 text-white"
              size="sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              Escalate
            </Button>
          </div>

          {/* Selection Summary */}
          <div className="bg-blue-100 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800">
                <span className="font-medium">{selectedItems.length} submission(s) selected</span>
                <span className="ml-2 text-blue-600">
                  IDs: {selectedItems.slice(0, 5).join(', ')}{selectedItems.length > 5 ? '...' : ''}
                </span>
              </div>
              <div className="text-xs text-blue-600">
                Max 100 items per bulk action
              </div>
            </div>
          </div>

          {/* Warning for large selections */}
          {selectedItems.length > 50 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-yellow-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="text-sm text-yellow-800">
                  <span className="font-medium">Large Selection Warning:</span>
                  <span className="ml-1">Processing {selectedItems.length} items may take some time. Please review carefully before proceeding.</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getActionTitle(selectedAction)}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isProcessing}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-4">
                  {getActionDescription(selectedAction)}
                </p>

                {/* Action-specific form fields */}
                {selectedAction === 'bulk_reject' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Rejection Reason *
                      </label>
                      <select
                        value={actionData.rejectionReason || ''}
                        onChange={(e) => setActionData({...actionData, rejectionReason: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select a reason...</option>
                        <option value="insufficient_documentation">Insufficient Documentation</option>
                        <option value="document_quality_poor">Document Quality Poor</option>
                        <option value="identity_verification_failed">Identity Verification Failed</option>
                        <option value="address_verification_failed">Address Verification Failed</option>
                        <option value="suspicious_activity">Suspicious Activity</option>
                        <option value="compliance_concerns">Compliance Concerns</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedAction === 'bulk_assign' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assign to Reviewer *
                      </label>
                      <select
                        value={actionData.assignedReviewer || ''}
                        onChange={(e) => setActionData({...actionData, assignedReviewer: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select reviewer...</option>
                        <option value="1">Senior Reviewer - Alice Johnson</option>
                        <option value="2">KYC Specialist - Bob Smith</option>
                        <option value="3">Compliance Officer - Carol Wilson</option>
                      </select>
                    </div>
                  </div>
                )}

                {(selectedAction === 'bulk_approve' || selectedAction === 'bulk_reject') && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Risk Level
                      </label>
                      <select
                        value={actionData.riskLevel || 'low'}
                        onChange={(e) => setActionData({...actionData, riskLevel: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="low">Low Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="high">High Risk</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Common compliance notes field */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Compliance Notes (Optional)
                    </label>
                    <textarea
                      value={actionData.complianceNotes || ''}
                      onChange={(e) => setActionData({...actionData, complianceNotes: e.target.value})}
                      rows={3}
                      placeholder="Add any compliance notes or reasoning for this action..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAction}
                  disabled={isProcessing || (selectedAction === 'bulk_reject' && !actionData.rejectionReason)}
                  className={`${
                    selectedAction === 'bulk_approve' ? 'bg-green-500 hover:bg-green-600' :
                    selectedAction === 'bulk_reject' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                >
                  {isProcessing ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'Confirm Action'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
