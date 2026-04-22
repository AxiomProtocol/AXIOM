import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { trackActivatedLand, ActivatedLandEvents } from '../../../lib/stewards/activatedLandAnalytics';

export default function ActivatedLandOverviewPage() {
  useEffect(() => {
    trackActivatedLand(ActivatedLandEvents.PLAYBOOK_VIEW, { page: 'overview' });
  }, []);

  return (
    <>
      <Head>
        <title>Steward-Activated Land Program | Stewards | Axiom Protocol</title>
        <meta name="description" content="Overview of the Steward-Activated Land Program for community stewards." />
      </Head>
      
      <main className="min-h-screen bg-white">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <div className="mb-8">
            <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
              Steward Playbook
            </span>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Steward-Activated Land Program</h1>
            <p className="text-lg text-gray-600">
              A flagship acquisition track for activating underutilized land through community stewardship.
            </p>
          </div>

          {/* Why This Track Exists */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Why This Track Exists</h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 mb-4">
                Across the country, there are millions of acres of underutilized land - vacant lots, 
                inherited parcels, unused pasture. Meanwhile, communities need access to land for food 
                production, gathering spaces, and ecological restoration.
              </p>
              <p className="text-gray-600">
                The Steward-Activated Land Program bridges this gap by connecting willing landowners 
                with trained stewards who coordinate productive community use. Landowners retain ownership 
                while their land serves the community.
              </p>
            </div>
          </div>

          {/* What It Unlocks */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">What It Unlocks</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { icon: '🌱', title: 'Community Food Production', desc: 'Coordinate produce cycles on activated land' },
                { icon: '👥', title: 'Participant Engagement', desc: 'Connect community members with meaningful land work' },
                { icon: '📈', title: 'Steward Advancement', desc: 'Activated Land leads contribute to your reputation score' },
                { icon: '🏡', title: 'Future Opportunities', desc: 'Some owners may explore acquisition options later' }
              ].map((item, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 flex gap-4">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Success Metrics */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Success Metrics</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
              <div className="grid md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className="text-3xl font-bold text-amber-600">5+</div>
                  <div className="text-sm text-gray-600">Landowner contacts per month</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">50%</div>
                  <div className="text-sm text-gray-600">Intake to site visit conversion</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">3+</div>
                  <div className="text-sm text-gray-600">Active cycles per region</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-amber-600">90%</div>
                  <div className="text-sm text-gray-600">Landowner satisfaction rating</div>
                </div>
              </div>
            </div>
          </div>

          {/* Integration with Land Pipeline */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Integration with Land Pipeline</h2>
            <p className="text-gray-600 mb-4">
              Activated Land leads are tracked in your dashboard alongside traditional acquisition leads. 
              Key differences:
            </p>
            <ul className="space-y-2">
              {[
                'Lead Type is set to "Activated Land" instead of "Traditional"',
                'Additional fields track owner openness, access terms, and activation duration',
                'Separate pipeline stages: Intake → Site Readiness → Plan Drafted → Active Cycle → Completed',
                'Conversion options tracked separately (optional future acquisition discussions)'
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-600">
                  <span className="text-amber-500 mt-1">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/stewards/activated-land/playbook" className="bg-gray-900 text-white rounded-xl p-6 hover:bg-gray-800 transition-colors">
              <h3 className="font-semibold mb-2">📖 Full Playbook</h3>
              <p className="text-sm text-gray-300">Step-by-step activation guide</p>
            </Link>
            <Link href="/stewards/activated-land/scripts" className="bg-gray-900 text-white rounded-xl p-6 hover:bg-gray-800 transition-colors">
              <h3 className="font-semibold mb-2">💬 Scripts</h3>
              <p className="text-sm text-gray-300">Outreach and conversation templates</p>
            </Link>
            <Link href="/stewards/activated-land/checklists" className="bg-gray-900 text-white rounded-xl p-6 hover:bg-gray-800 transition-colors">
              <h3 className="font-semibold mb-2">✅ Checklists</h3>
              <p className="text-sm text-gray-300">Operational checklists</p>
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <Link href="/stewards/dashboard" className="text-amber-600 hover:underline">
              ← Back to Steward Dashboard
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
