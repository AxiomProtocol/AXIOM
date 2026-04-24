import React, { useState } from 'react';

interface ParticipationDisclosurePanelProps {
  onAccept?: () => void;
  onDecline?: () => void;
  showActions?: boolean;
  version?: string;
  compact?: boolean;
}

const DISCLOSURE_VERSION = "1.0";

const disclosures = [
  {
    title: "Participation Purpose",
    content: "Participation in Axiom Protocol is for coordination and stewardship practice. This is a membership-based coordination system, not an investment platform."
  },
  {
    title: "No Guaranteed Outcomes",
    content: "There are no guaranteed outcomes from participation. Resource allocations, land acquisitions, and project execution depend on governance decisions, due diligence completion, and community coordination."
  },
  {
    title: "Token and Credit Nature",
    content: "Tokens, credits, and pool commitments do not convey property title, equity ownership, or profit rights unless explicitly structured and disclosed for a specific purpose after governance approval."
  },
  {
    title: "Allocation Dependencies",
    content: "All allocations depend on governance proposals, member voting, and successful completion of due diligence gates. The community retains discretion over resource deployment."
  },
  {
    title: "Educational Information",
    content: "Information provided through Axiom Protocol is educational in nature and does not constitute legal, financial, or investment advice. Consult qualified professionals for specific guidance."
  },
  {
    title: "Membership Obligations",
    content: "As a member of the Private Membership Association, you agree to operate within the PMA framework and respect the community governance process."
  }
];

export default function ParticipationDisclosurePanel({
  onAccept,
  onDecline,
  showActions = true,
  version = DISCLOSURE_VERSION,
  compact = false
}: ParticipationDisclosurePanelProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 20;
    if (isAtBottom) {
      setScrolledToBottom(true);
    }
  };

  return (
    <div className={`bg-white rounded-xl border border-gray-200 ${compact ? 'p-4' : 'p-6'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h3 className={`font-bold text-gray-900 ${compact ? 'text-lg' : 'text-xl'}`}>
            Participation Disclosure
          </h3>
          <p className="text-sm text-gray-500">Version {version}</p>
        </div>
      </div>

      <div 
        className={`${compact ? 'max-h-48' : 'max-h-80'} overflow-y-auto pr-2 space-y-4 border-y border-gray-100 py-4`}
        onScroll={handleScroll}
      >
        {disclosures.map((disclosure, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {index + 1}
              </span>
              {disclosure.title}
            </h4>
            <p className="text-gray-700 text-sm leading-relaxed pl-8">
              {disclosure.content}
            </p>
          </div>
        ))}
      </div>

      {showActions && (
        <div className="mt-4 space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
            />
            <span className="text-sm text-gray-700">
              I have read and understand these disclosures. I acknowledge that participation in Axiom Protocol is for coordination and stewardship practice, with no guaranteed outcomes.
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={onAccept}
              disabled={!acknowledged}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                acknowledged
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Accept and Continue
            </button>
            {onDecline && (
              <button
                onClick={onDecline}
                className="py-3 px-4 rounded-lg font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all"
              >
                Decline
              </button>
            )}
          </div>
        </div>
      )}

      {!showActions && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-sm text-amber-800">
            By participating, you acknowledge that you have read and understood these disclosures.
          </p>
        </div>
      )}
    </div>
  );
}

export { DISCLOSURE_VERSION, disclosures };
