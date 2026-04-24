import React, { useState } from 'react';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { caseTitle: string; ancestorPrimaryName: string; ancestorNameVariants: string[]; jurisdictionCode: string }) => void;
  isLoading?: boolean;
}

export default function CreateCaseModal({ isOpen, onClose, onCreate, isLoading }: CreateCaseModalProps) {
  const [caseTitle, setCaseTitle] = useState('');
  const [ancestorPrimaryName, setAncestorPrimaryName] = useState('');
  const [nameVariants, setNameVariants] = useState('');
  const [jurisdictionCode, setJurisdictionCode] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const variants = nameVariants
      .split(',')
      .map(v => v.trim())
      .filter(v => v.length > 0);
    
    onCreate({
      caseTitle,
      ancestorPrimaryName,
      ancestorNameVariants: variants,
      jurisdictionCode,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Create New Research Case</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Case Title
            </label>
            <input
              type="text"
              value={caseTitle}
              onChange={(e) => setCaseTitle(e.target.value)}
              placeholder="e.g., Johnson Family Land Research"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Ancestor Name
            </label>
            <input
              type="text"
              value={ancestorPrimaryName}
              onChange={(e) => setAncestorPrimaryName(e.target.value)}
              placeholder="e.g., James Henry Johnson"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name Variants (comma-separated)
            </label>
            <input
              type="text"
              value={nameVariants}
              onChange={(e) => setNameVariants(e.target.value)}
              placeholder="e.g., J.H. Johnson, James Johnson Sr., Jim Johnson"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Include spelling variations, nicknames, and title variations
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Jurisdiction Code (optional)
            </label>
            <input
              type="text"
              value={jurisdictionCode}
              onChange={(e) => setJurisdictionCode(e.target.value)}
              placeholder="e.g., US-GA-FULTON"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: Country-State-County (e.g., US-GA-FULTON)
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !caseTitle || !ancestorPrimaryName}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating...' : 'Create Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
