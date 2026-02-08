import React from 'react';
import Link from 'next/link';

interface PoolCardProps {
  pool: {
    id: number;
    name: string;
    purpose: string;
    description?: string;
    status: string;
    targetAmountAxusd?: string;
    currentAmountAxusd?: string;
    minCommitAxusd?: string;
    maxCommitAxusd?: string;
    memberLimit?: number;
    currentMemberCount?: number;
    startAt?: string;
    endAt?: string;
    landCandidate?: {
      name: string;
      location: string;
      acreage: string;
    };
  };
  showCommitButton?: boolean;
  onCommit?: () => void;
}

export default function PoolCard({ pool, showCommitButton = true, onCommit }: PoolCardProps) {
  const target = parseFloat(pool.targetAmountAxusd || '0');
  const current = parseFloat(pool.currentAmountAxusd || '0');
  const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  
  const spotsRemaining = pool.memberLimit 
    ? pool.memberLimit - (pool.currentMemberCount || 0)
    : null;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    draft: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    open: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    paused: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    closed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    executing: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  };

  const statusStyle = statusColors[pool.status] || statusColors.draft;

  const formatAmount = (value: string | number) => {
    const num = parseFloat(String(value));
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return (
    <div className={`bg-white rounded-xl border ${statusStyle.border} overflow-hidden hover:shadow-lg transition-shadow`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text} mb-2`}>
              {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
            </span>
            <h3 className="text-xl font-bold text-gray-900">{pool.name}</h3>
          </div>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {pool.purpose}
        </p>

        {pool.landCandidate && (
          <div className="bg-amber-50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-amber-900">
              Land Candidate: {pool.landCandidate.name}
            </p>
            <p className="text-xs text-amber-700">
              {pool.landCandidate.location} - {pool.landCandidate.acreage} acres
            </p>
          </div>
        )}

        {target > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Progress</span>
              <span className="font-semibold text-gray-900">
                {formatAmount(current)} / {formatAmount(target)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1 text-right">{progress.toFixed(1)}% committed</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <p className="text-gray-500">Min Commitment</p>
            <p className="font-semibold text-gray-900">
              {formatAmount(pool.minCommitAxusd || '50')} AXUSD
            </p>
          </div>
          {pool.memberLimit && (
            <div>
              <p className="text-gray-500">Spots Remaining</p>
              <p className="font-semibold text-gray-900">
                {spotsRemaining} / {pool.memberLimit}
              </p>
            </div>
          )}
          {pool.currentMemberCount !== undefined && (
            <div>
              <p className="text-gray-500">Members</p>
              <p className="font-semibold text-gray-900">{pool.currentMemberCount}</p>
            </div>
          )}
          {pool.endAt && (
            <div>
              <p className="text-gray-500">Ends</p>
              <p className="font-semibold text-gray-900">
                {new Date(pool.endAt).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link
            href={`/participate/pool/${pool.id}`}
            className="flex-1 text-center py-2 px-4 border border-amber-600 text-amber-600 font-semibold rounded-lg hover:bg-amber-50 transition-colors"
          >
            View Details
          </Link>
          {showCommitButton && pool.status === 'open' && (
            <button
              onClick={onCommit}
              className="flex-1 py-2 px-4 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
            >
              Commit AXUSD
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
