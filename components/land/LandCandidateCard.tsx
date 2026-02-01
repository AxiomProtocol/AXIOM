import React from 'react';
import Link from 'next/link';

interface LandCandidateCardProps {
  candidate: {
    id: number;
    name: string;
    location?: string;
    county?: string;
    state?: string;
    acreage?: string;
    askingPrice?: string;
    propertyType?: string;
    stage: string;
    stewardshipIntent?: string;
    publicSummary?: string;
    featuredImageUrl?: string;
    dueDiligenceProgress?: number;
    isAccessVerified?: boolean;
    isTitleReviewed?: boolean;
    isSurveyVerified?: boolean;
    isEnvironmentalScreened?: boolean;
  };
}

const stageLabels: Record<string, { label: string; color: string }> = {
  candidate: { label: 'Candidate', color: 'bg-blue-100 text-blue-800' },
  under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  due_diligence: { label: 'Due Diligence', color: 'bg-orange-100 text-orange-800' },
  ready_for_vote: { label: 'Ready for Vote', color: 'bg-purple-100 text-purple-800' },
  approved_for_execution: { label: 'Approved', color: 'bg-green-100 text-green-800' },
  acquired: { label: 'Acquired', color: 'bg-emerald-100 text-emerald-800' },
  archived: { label: 'Archived', color: 'bg-gray-100 text-gray-800' },
};

export default function LandCandidateCard({ candidate }: LandCandidateCardProps) {
  const stage = stageLabels[candidate.stage] || stageLabels.candidate;
  const progress = candidate.dueDiligenceProgress || 0;

  const formatPrice = (value: string | number | undefined) => {
    if (!value) return 'TBD';
    const num = parseFloat(String(value));
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const diligenceChecks = [
    { key: 'isAccessVerified', label: 'Access', checked: candidate.isAccessVerified },
    { key: 'isTitleReviewed', label: 'Title', checked: candidate.isTitleReviewed },
    { key: 'isSurveyVerified', label: 'Survey', checked: candidate.isSurveyVerified },
    { key: 'isEnvironmentalScreened', label: 'Environmental', checked: candidate.isEnvironmentalScreened },
  ];

  return (
    <Link href={`/land/${candidate.id}`} className="block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
      <div className="aspect-video bg-gray-100 relative">
        {candidate.featuredImageUrl ? (
          <img
            src={candidate.featuredImageUrl}
            alt={candidate.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-amber-100">
            <svg className="w-16 h-16 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${stage.color}`}>
            {stage.label}
          </span>
        </div>
        {candidate.propertyType && (
          <div className="absolute top-3 right-3">
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-700">
              {candidate.propertyType}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-gray-900 mb-1">{candidate.name}</h3>
        <p className="text-sm text-gray-500 mb-3">
          {candidate.county && candidate.state 
            ? `${candidate.county}, ${candidate.state}`
            : candidate.location || 'Location TBD'}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Acreage</p>
            <p className="font-bold text-gray-900">{candidate.acreage || 'TBD'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-500">Asking Price</p>
            <p className="font-bold text-gray-900">{formatPrice(candidate.askingPrice)}</p>
          </div>
        </div>

        {candidate.stewardshipIntent && (
          <div className="mb-4">
            <p className="text-xs font-medium text-gray-500 mb-1">Stewardship Intent</p>
            <p className="text-sm text-gray-700 line-clamp-2">{candidate.stewardshipIntent}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Due Diligence Progress</span>
            <span className="font-medium text-gray-700">{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-4">
          {diligenceChecks.map((check) => (
            <span
              key={check.key}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                check.checked 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {check.checked ? (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {check.label}
            </span>
          ))}
        </div>

        <div
          className="block w-full text-center py-2 px-4 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
        >
          View Details
        </div>
      </div>
    </Link>
  );
}
