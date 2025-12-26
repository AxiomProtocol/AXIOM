import React from 'react';

const statusColors = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50' },
  executed: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/50' },
  rejected: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50' },
  expired: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/50' },
};

const actionLabels = {
  transaction_reverse: 'Transaction Reversal',
  transaction_refund: 'Transaction Refund',
  payout_reverse: 'Payout Reversal',
  payout_override: 'Payout Override',
  role_escalation: 'Role Escalation',
  disable_privileged_user: 'Disable Privileged User',
  user_create_privileged: 'Create Privileged User',
  moderation_ban_privileged: 'Ban Privileged User',
};

export function ProposalCard({ proposal, onApprove, onReject, isApproving, currentUserRole }) {
  const colors = statusColors[proposal.status] || statusColors.pending;
  const actionLabel = actionLabels[proposal.action_type] || proposal.action_type;
  
  const canApprove = proposal.status === 'pending' && 
    ['superadmin', 'admin', 'finance'].includes(currentUserRole);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const formatAmount = (amount) => {
    if (!amount) return null;
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(parseFloat(amount));
  };

  return (
    <div className={`rounded-lg border ${colors.border} ${colors.bg} p-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
              {proposal.status.toUpperCase()}
            </span>
            <span className="text-sm text-gray-400">
              {actionLabel}
            </span>
          </div>
          
          <h3 className="text-white font-medium mb-1">
            Proposal #{proposal.id.substring(0, 8)}
          </h3>
          
          <p className="text-gray-300 text-sm mb-3">
            {proposal.reason}
          </p>

          {proposal.amount && (
            <div className="text-amber-400 font-medium mb-2">
              Amount: {formatAmount(proposal.amount)}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>Target: {proposal.target_type}/{proposal.target_id?.substring(0, 8)}</div>
            <div>Created: {formatDate(proposal.created_at)}</div>
            {proposal.expires_at && (
              <div className="col-span-2">
                Expires: {formatDate(proposal.expires_at)}
              </div>
            )}
          </div>
        </div>
      </div>

      {canApprove && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-700">
          <button
            onClick={() => onApprove?.(proposal.id)}
            disabled={isApproving}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-green-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            {isApproving ? 'Processing...' : 'Approve'}
          </button>
          <button
            onClick={() => onReject?.(proposal.id)}
            disabled={isApproving}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {proposal.status === 'executed' && proposal.executed_at && (
        <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-green-400">
          Executed on {formatDate(proposal.executed_at)}
        </div>
      )}
    </div>
  );
}

export function ProposalError({ error, onRetry }) {
  return (
    <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="text-red-400 text-xl">⚠️</div>
        <div className="flex-1">
          <h3 className="text-red-400 font-medium mb-1">Action Failed</h3>
          <p className="text-gray-300 text-sm mb-3">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProposalLoading() {
  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4 animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-16 bg-gray-700 rounded" />
        <div className="h-4 w-24 bg-gray-700 rounded" />
      </div>
      <div className="h-5 w-48 bg-gray-700 rounded mb-2" />
      <div className="h-4 w-full bg-gray-700 rounded mb-4" />
      <div className="grid grid-cols-2 gap-2">
        <div className="h-3 w-32 bg-gray-700 rounded" />
        <div className="h-3 w-32 bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export function DryRunResult({ result }) {
  if (!result.dryRun) return null;
  
  return (
    <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
      <div className="flex items-start gap-3">
        <div className="text-blue-400 text-xl">🔍</div>
        <div className="flex-1">
          <h3 className="text-blue-400 font-medium mb-1">Dry Run Result</h3>
          <p className="text-gray-300 text-sm mb-3">
            No changes were made. This is a simulation of what would happen.
          </p>
          
          {result.dryRunDetails && (
            <div className="bg-gray-900/50 rounded p-3 text-xs font-mono text-gray-300 overflow-x-auto">
              <div>Would Execute: {result.dryRunDetails.wouldExecute ? 'Yes' : 'No'}</div>
              <div>Validation: {result.dryRunDetails.validationPassed ? 'Passed' : 'Failed'}</div>
              {result.dryRunDetails.warnings?.length > 0 && (
                <div className="mt-2 text-yellow-400">
                  Warnings: {result.dryRunDetails.warnings.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProposalCard;
