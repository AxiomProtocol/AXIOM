import React from 'react';
import Link from 'next/link';

interface SubscriptionGateProps {
  onSubscribe: () => void;
  isLoading?: boolean;
}

export default function SubscriptionGate({ onSubscribe, isLoading }: SubscriptionGateProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Land Reclamation Workbook</h1>
          <p className="text-xl text-gray-600">AI-powered genealogy research for heir property claims</p>
        </div>

        {/* Main Feature - AI Genealogy Search */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 mb-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex-shrink-0 text-6xl">🔍</div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">AI Genealogy Search</h2>
              <p className="text-amber-100 mb-4">
                Search 22+ billion historical records across real genealogy databases
              </p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">FamilySearch (Free)</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Census 1790-1950</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Land Deeds</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">Freedmen's Bureau</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">State Archives</span>
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">BLM Land Patents</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl">📊</span>
                <h3 className="font-semibold text-gray-900 text-lg">Real Database Access</h3>
              </div>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Direct links to FamilySearch's 22B+ records</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>US Census Bureau historical data</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>State archive connections by location</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Federal land patent searches (BLM)</span>
                </li>
              </ul>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl">🤖</span>
                <h3 className="font-semibold text-gray-900 text-lg">AI Research Guidance</h3>
              </div>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Personalized search strategies</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>African American genealogy expertise</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Name variation suggestions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Record collection recommendations</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-t">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-xl">📁</span>
                <h3 className="font-semibold text-gray-900 text-lg">Case Organization</h3>
              </div>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Structured research cases</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Evidence tracking with citations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Fact claims with confidence levels</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Research progress checklists</span>
                </li>
              </ul>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl">📄</span>
                <h3 className="font-semibold text-gray-900 text-lg">Professional Exports</h3>
              </div>
              <ul className="text-gray-600 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Attorney-ready PDF dossiers</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Evidence summary reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Proper citation formatting</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Research checklist exports</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md mx-auto">
          <div className="text-5xl font-bold text-gray-900 mb-1">$20</div>
          <div className="text-gray-500 mb-6">per month</div>
          
          <div className="bg-amber-50 rounded-lg p-4 mb-6 text-left">
            <div className="text-sm font-medium text-amber-800 mb-2">Monthly Includes:</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-600">100</div>
                <div className="text-xs text-amber-700">AI Calls</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">50</div>
                <div className="text-xs text-amber-700">Extractions</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">20</div>
                <div className="text-xs text-amber-700">Exports</div>
              </div>
            </div>
          </div>

          <button
            onClick={onSubscribe}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-amber-700 hover:to-orange-700 transition disabled:opacity-50 shadow-lg"
          >
            {isLoading ? 'Loading...' : 'Start Research Now'}
          </button>

          <p className="text-xs text-gray-500 mt-4">
            Cancel anytime. No legal advice provided. Research tool only.
          </p>
          
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already subscribed? Connect your wallet and sign in to access your workbook.
            </p>
          </div>
        </div>

        {/* Bottom Links */}
        <div className="text-center mt-8">
          <Link href="/reclaim" className="text-amber-600 hover:text-amber-700 text-sm">
            ← Back to Landing Page
          </Link>
        </div>
      </div>
    </div>
  );
}
