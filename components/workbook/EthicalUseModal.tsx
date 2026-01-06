import React, { useState } from 'react';

interface EthicalUseModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function EthicalUseModal({ isOpen, onAccept, onDecline }: EthicalUseModalProps) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;
    if (atBottom) {
      setScrolledToEnd(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">Ethical Use Agreement</h2>
          <p className="text-sm text-gray-600 mt-1">
            Please read carefully before proceeding
          </p>
        </div>

        <div 
          className="p-6 overflow-y-auto flex-1"
          onScroll={handleScroll}
        >
          <div className="space-y-4 text-sm text-gray-700">
            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Purpose of This Tool</h3>
              <p>
                This Land Reclamation Workbook is designed to help you organize genealogical research 
                related to historical land ownership. It provides structure for evidence collection, 
                document management, and research planning.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">What This Tool Does NOT Do</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Does not provide legal advice or legal representation</li>
                <li>Does not guarantee any outcome or entitlement</li>
                <li>Does not validate or verify legal claims</li>
                <li>Does not establish proof of ownership</li>
                <li>Does not serve as a legal document</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Your Responsibilities</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Consult qualified legal counsel before taking any legal action</li>
                <li>Verify all information independently through official sources</li>
                <li>Understand that research findings may be inconclusive</li>
                <li>Use this tool ethically and in good faith</li>
                <li>Respect the privacy and rights of others in your research</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Research Integrity</h3>
              <p>
                This tool enforces research integrity standards including identity collision detection, 
                evidence quality assessment, and assumption tracking. These safeguards help ensure 
                your research is thorough and well-documented, but they do not replace professional 
                legal or genealogical expertise.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Privacy</h3>
              <p>
                Your case data is private by default. You control who has access to your research. 
                We do not share your research data with third parties.
              </p>
            </section>

            <section className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <h3 className="font-semibold text-amber-800 mb-2">Important Notice</h3>
              <p className="text-amber-700">
                By accepting this agreement, you acknowledge that you understand the limitations 
                of this tool and agree to use it responsibly. You accept full responsibility for 
                how you use the information and research organized through this workbook.
              </p>
            </section>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {scrolledToEnd ? 'You may now proceed' : 'Please scroll to read the full agreement'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
            >
              Decline
            </button>
            <button
              onClick={onAccept}
              disabled={!scrolledToEnd}
              className={`px-4 py-2 rounded-lg transition ${
                scrolledToEnd
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              I Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
