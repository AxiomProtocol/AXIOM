import React from 'react';

interface PendingApproval {
  id: string;
  type?: string;
  description?: string;
  amount?: string;
  toAddress?: string;
  requestedAt?: string;
  requestedBy?: string;
}

interface PendingApprovalsProps {
  approvals: PendingApproval[];
  onApprove?: (approvalId: string) => void;
  onReject?: (approvalId: string) => void;
  loading?: boolean;
}

export function PendingApprovals({ approvals, onApprove, onReject, loading }: PendingApprovalsProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="border border-dl-border p-4">
            <div className="h-3 bg-dl-border w-48 animate-pulse mb-2" />
            <div className="h-2 bg-dl-border w-32 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (approvals.length === 0) {
    return (
      <div className="border border-dl-border p-6">
        <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-2">Multi-Party Authorization Queue</p>
        <p className="text-sm font-dl-mono text-dl-muted">No pending authorizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest">
        Multi-Party Authorization Queue ({approvals.length})
      </p>
      {approvals.map((approval) => (
        <div key={approval.id} className="border border-dl-border p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-sm font-dl-mono text-dl-navy">
                {approval.description ?? approval.type ?? 'Pending Authorization'}
              </p>
              {approval.amount && (
                <p className="text-xs font-dl-mono text-dl-muted mt-0.5">Amount: {approval.amount}</p>
              )}
              {approval.toAddress && (
                <p className="text-xs font-dl-mono text-dl-muted mt-0.5 break-all">
                  To: {approval.toAddress.slice(0, 10)}...{approval.toAddress.slice(-6)}
                </p>
              )}
              {approval.requestedAt && (
                <p className="text-xs font-dl-mono text-dl-muted mt-0.5">
                  {new Date(approval.requestedAt).toLocaleString()}
                </p>
              )}
            </div>
            <span className="text-xs font-dl-mono border border-yellow-500 text-yellow-600 px-2 py-0.5">
              Pending
            </span>
          </div>
          <div className="flex gap-2">
            {onApprove && (
              <button
                onClick={() => onApprove(approval.id)}
                className="flex-1 bg-dl-forest text-white text-xs font-dl-mono py-1.5 hover:opacity-90 transition-opacity"
              >
                Authorize
              </button>
            )}
            {onReject && (
              <button
                onClick={() => onReject(approval.id)}
                className="flex-1 border border-red-400 text-red-500 text-xs font-dl-mono py-1.5 hover:bg-red-50 transition-colors"
              >
                Reject
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
