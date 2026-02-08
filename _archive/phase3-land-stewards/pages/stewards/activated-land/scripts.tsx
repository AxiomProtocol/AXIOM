import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { trackActivatedLand, ActivatedLandEvents } from '../../../lib/stewards/activatedLandAnalytics';
import {
  smsTemplate,
  facebookDMTemplate,
  emailOutreachTemplate,
  inPersonPitchScript,
  communityMeetingIntro,
  firstCallScript,
  followUpScript,
  closingOnboardingScript,
  objectionHandling,
  complianceDos,
  complianceDonts
} from '../../../lib/stewards/outreachScripts';

const scripts = [
  { id: 'sms', title: 'SMS Template', content: smsTemplate },
  { id: 'facebook', title: 'Facebook DM', content: facebookDMTemplate },
  { id: 'email', title: 'Email Outreach', content: emailOutreachTemplate },
  { id: 'inperson', title: 'In-Person Pitch', content: inPersonPitchScript },
  { id: 'community', title: 'Community Meeting Intro', content: communityMeetingIntro },
  { id: 'firstcall', title: 'First Call Script', content: firstCallScript },
  { id: 'followup', title: 'Follow-Up Script', content: followUpScript },
  { id: 'closing', title: 'Closing / Onboarding', content: closingOnboardingScript }
];

export default function ActivatedLandScriptsPage() {
  const [activeTab, setActiveTab] = useState('sms');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackActivatedLand(ActivatedLandEvents.SCRIPTS_VIEW);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeScript = scripts.find(s => s.id === activeTab);

  return (
    <>
      <Head>
        <title>Scripts | Activated Land | Stewards | Axiom Protocol</title>
        <meta name="description" content="Outreach scripts and templates for the Steward-Activated Land Program." />
      </Head>
      
      <main className="min-h-screen bg-gray-50">
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
          <Link href="/stewards/activated-land" className="text-amber-600 hover:underline text-sm mb-4 inline-block">
            ← Back to Activated Land Overview
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">Outreach Scripts</h1>
          <p className="text-lg text-gray-600 mb-8">
            Compliant templates for landowner outreach and conversations.
          </p>

          {/* Compliance Box */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="font-semibold text-green-800 mb-4">✓ DO</h3>
              <ul className="space-y-2">
                {complianceDos.map((item, idx) => (
                  <li key={idx} className="text-sm text-green-700 flex gap-2">
                    <span>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <h3 className="font-semibold text-red-800 mb-4">✗ DON'T</h3>
              <ul className="space-y-2">
                {complianceDonts.map((item, idx) => (
                  <li key={idx} className="text-sm text-red-700 flex gap-2">
                    <span>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Scripts Tabs */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex flex-wrap border-b border-gray-200">
              {scripts.map(script => (
                <button
                  key={script.id}
                  onClick={() => setActiveTab(script.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === script.id
                      ? 'bg-amber-50 text-amber-700 border-b-2 border-amber-500'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {script.title}
                </button>
              ))}
            </div>
            
            {activeScript && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{activeScript.title}</h2>
                  <button
                    onClick={() => handleCopy(activeScript.content)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                  >
                    {copied ? '✓ Copied!' : 'Copy Script'}
                  </button>
                </div>
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg text-gray-700 leading-relaxed">
                  {activeScript.content}
                </pre>
              </div>
            )}
          </div>

          {/* Objection Handling */}
          <div className="mt-12 bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Objection Handling</h2>
            <div className="space-y-6">
              {Object.entries(objectionHandling).map(([objection, response]) => (
                <div key={objection} className="border-l-4 border-amber-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">"{objection}"</h3>
                  <p className="text-gray-600">{response}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-200 flex justify-between">
            <Link href="/stewards/activated-land/playbook" className="text-amber-600 hover:underline">
              ← View Playbook
            </Link>
            <Link href="/stewards/activated-land/checklists" className="text-amber-600 hover:underline">
              View Checklists →
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
