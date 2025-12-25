import { useState } from 'react';
import Link from 'next/link';

export default function TrustGraduationModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden">
        <div className="p-6 border-b border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Trust and Graduation Overview
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              How Axiom SUSU builds credibility before commitment
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-sm">1</span>
              Why Axiom SUSU Starts with Trust
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Axiom SUSU is designed so that financial commitment follows human connection. 
              Members build credibility before joining an on-chain circle.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-3 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-sm">2</span>
              The Three Stages
            </h3>
            <div className="space-y-3">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">👥</div>
                  <h4 className="font-semibold text-white">Purpose Groups</h4>
                  <span className="px-2 py-0.5 bg-gray-600/50 text-gray-300 text-xs rounded-full">Step 1</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Join a regional hub to find like-minded members. Align on a shared goal and contribution level, 
                  exchange vouches, and build reputation before committing funds.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="text-gray-500 text-xl">↓</div>
              </div>
              <div className="bg-gray-800/50 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">🔗</div>
                  <h4 className="font-semibold text-white">SUSU Circles</h4>
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">Step 2</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Graduate to an on-chain circle after the group meets readiness thresholds. 
                  Choose Personal Vault (self-custody) or Community Pool (pooled custody). 
                  Smart contracts enforce contributions and payouts.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="text-gray-500 text-xl">↓</div>
              </div>
              <div className="bg-gray-800/50 border border-green-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="text-2xl">🏛️</div>
                  <h4 className="font-semibold text-white">The Wealth Practice</h4>
                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Step 3</span>
                </div>
                <p className="text-gray-400 text-sm">
                  After completing successful SUSU rounds, graduate into The Wealth Practice for 
                  access to larger investment opportunities, real estate pools, DePIN infrastructure, 
                  and enhanced governance power.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2 flex items-center gap-2">
              <span className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-sm">3</span>
              What "Graduation" Means
            </h3>
            <p className="text-gray-300 leading-relaxed">
              Each stage has graduation requirements. Purpose Groups graduate to SUSU Circles when 
              members meet trust thresholds. SUSU Circles graduate to The Wealth Practice after 
              completing 3+ successful rounds or 6+ months with all members in good standing.
            </p>
          </section>

          <section className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span className="text-xl">📄</span>
              Read the Full Protocol Design
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              Learn more about trust mechanics, reputation scoring, and the complete Axiom SUSU framework.
            </p>
            <Link
              href="/whitepaper"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Read the AXIOM SUSU Whitepaper
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </section>
        </div>

        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
