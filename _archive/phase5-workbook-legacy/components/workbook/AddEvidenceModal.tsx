import React, { useState } from 'react';

interface AddEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: EvidenceFormData) => void;
  isLoading?: boolean;
}

export interface EvidenceFormData {
  title: string;
  recordType: string;
  primaryOrSecondary: string;
  confidenceLevel: string;
  sourceName: string;
  sourceLocation?: string;
  sourceCitation?: string;
  dateAccessed: string;
  yearRangeStart?: number;
  yearRangeEnd?: number;
  county?: string;
  state?: string;
  legalDescription?: string;
  notes?: string;
}

const RECORD_TYPES = [
  { value: 'deed', label: 'Deed' },
  { value: 'census', label: 'Census Record' },
  { value: 'probate', label: 'Probate Record' },
  { value: 'tax', label: 'Tax Record' },
  { value: 'birth', label: 'Birth Record' },
  { value: 'death', label: 'Death Record' },
  { value: 'marriage', label: 'Marriage Record' },
  { value: 'military', label: 'Military Record' },
  { value: 'newspaper', label: 'Newspaper Article' },
  { value: 'photo', label: 'Photograph' },
  { value: 'other', label: 'Other' },
];

const CONFIDENCE_LEVELS = [
  { value: 'verified', label: 'Verified - Multiple corroborating sources' },
  { value: 'supported', label: 'Supported - At least one reliable source' },
  { value: 'unsupported', label: 'Unsupported - No corroborating sources yet' },
  { value: 'conflicting', label: 'Conflicting - Sources disagree' },
];

export default function AddEvidenceModal({ isOpen, onClose, onAdd, isLoading }: AddEvidenceModalProps) {
  const [formData, setFormData] = useState<EvidenceFormData>({
    title: '',
    recordType: 'deed',
    primaryOrSecondary: 'primary',
    confidenceLevel: 'unsupported',
    sourceName: '',
    sourceLocation: '',
    sourceCitation: '',
    dateAccessed: new Date().toISOString().split('T')[0],
    county: '',
    state: '',
    notes: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
  };

  const updateField = (field: keyof EvidenceFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full my-8">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Add Evidence Item</h2>
          <p className="text-sm text-gray-600 mt-1">Document a piece of evidence for your research</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title / Description
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Deed from John Smith to James Johnson, 1892"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Record Type
              </label>
              <select
                value={formData.recordType}
                onChange={(e) => updateField('recordType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {RECORD_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source Type
              </label>
              <select
                value={formData.primaryOrSecondary}
                onChange={(e) => updateField('primaryOrSecondary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="primary">Primary Source (original document)</option>
                <option value="secondary">Secondary Source (derived/compiled)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confidence Level
            </label>
            <select
              value={formData.confidenceLevel}
              onChange={(e) => updateField('confidenceLevel', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              {CONFIDENCE_LEVELS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Name / Repository
            </label>
            <input
              type="text"
              value={formData.sourceName}
              onChange={(e) => updateField('sourceName', e.target.value)}
              placeholder="e.g., Fulton County Courthouse, FamilySearch, Ancestry.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Location (optional)
            </label>
            <input
              type="text"
              value={formData.sourceLocation}
              onChange={(e) => updateField('sourceLocation', e.target.value)}
              placeholder="e.g., Deed Book 45, Page 123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Citation (optional)
            </label>
            <textarea
              value={formData.sourceCitation}
              onChange={(e) => updateField('sourceCitation', e.target.value)}
              placeholder="Enter a formal citation if available"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Accessed
            </label>
            <input
              type="date"
              value={formData.dateAccessed}
              onChange={(e) => updateField('dateAccessed', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year Range Start
              </label>
              <input
                type="number"
                value={formData.yearRangeStart || ''}
                onChange={(e) => updateField('yearRangeStart', parseInt(e.target.value) || 0)}
                placeholder="e.g., 1892"
                min="1600"
                max="2100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year Range End
              </label>
              <input
                type="number"
                value={formData.yearRangeEnd || ''}
                onChange={(e) => updateField('yearRangeEnd', parseInt(e.target.value) || 0)}
                placeholder="e.g., 1892"
                min="1600"
                max="2100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                County
              </label>
              <input
                type="text"
                value={formData.county}
                onChange={(e) => updateField('county', e.target.value)}
                placeholder="e.g., Fulton"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => updateField('state', e.target.value)}
                placeholder="e.g., Georgia"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Any additional observations or context"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </form>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !formData.title || !formData.sourceName}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Add Evidence'}
          </button>
        </div>
      </div>
    </div>
  );
}
