import React, { useState } from 'react';

interface SubscriptionGateProps {
  onSubscribe: () => void;
  isLoading?: boolean;
}

export default function SubscriptionGate({ onSubscribe, isLoading }: SubscriptionGateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-8 text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Land Reclamation Workbook</h1>
          <p className="text-amber-100">Organize your genealogical land research with AI assistance</p>
        </div>

        <div className="p-8">
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm">1</span>
                Research Organization
              </h3>
              <ul className="text-sm text-gray-600 space-y-2 pl-8">
                <li>Structured case management</li>
                <li>Evidence tracking with provenance</li>
                <li>Fact claims with confidence levels</li>
                <li>Section-by-section checklists</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm">2</span>
                AI Research Assistant
              </h3>
              <ul className="text-sm text-gray-600 space-y-2 pl-8">
                <li>Research planning guidance</li>
                <li>Evidence organization help</li>
                <li>Dossier drafting support</li>
                <li>Identity collision detection</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm">3</span>
                Professional Exports
              </h3>
              <ul className="text-sm text-gray-600 space-y-2 pl-8">
                <li>Attorney-ready PDF dossiers</li>
                <li>Evidence summary reports</li>
                <li>Research checklist exports</li>
                <li>Citation formatting</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-sm">4</span>
                Research Integrity
              </h3>
              <ul className="text-sm text-gray-600 space-y-2 pl-8">
                <li>Assumption tracking</li>
                <li>Hypothesis labeling</li>
                <li>Evidence quality assessment</li>
                <li>Deliberate friction safeguards</li>
              </ul>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-gray-900 mb-1">$20</div>
            <div className="text-gray-500 mb-4">per month</div>
            
            <div className="text-sm text-gray-600 mb-6">
              Includes 100 AI calls, 50 document extractions, 20 exports per month
            </div>

            <button
              onClick={onSubscribe}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-amber-700 hover:to-orange-700 transition disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Subscribe Now'}
            </button>

            <p className="text-xs text-gray-500 mt-4">
              Cancel anytime. No legal advice provided. Research tool only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
