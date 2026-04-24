import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../../components/navigation';
import { trackActivatedLand, ActivatedLandEvents } from '../../lib/stewards/activatedLandAnalytics';

export default function LandownersPage() {
  useEffect(() => {
    trackActivatedLand(ActivatedLandEvents.LANDOWNER_PAGE_VIEW, { page: 'landing' });
  }, []);

  return (
    <SiteLayout>
      <Head>
        <title>Landowners | Steward-Activated Land Program | Axiom Protocol</title>
        <meta name="description" content="Activate your underutilized land through community stewardship. Retain full ownership while putting your property to productive use." />
      </Head>
      
      <main className="min-h-screen bg-white">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
              Steward-Activated Land Program
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Put Your Land to Work for the Community
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect your underutilized property with community stewards who coordinate productive land use. 
              You retain full ownership while your land serves a greater purpose.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/landowners/apply" className="px-8 py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors">
                Apply to Activate Your Land
              </Link>
              <Link href="/landowners/activate" className="px-8 py-4 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors">
                Learn How It Works
              </Link>
            </div>
          </div>
        </section>

        {/* What This Is */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">What Is Land Activation?</h2>
            <div className="max-w-3xl mx-auto">
              <p className="text-lg text-gray-600 mb-6">
                Land activation is a community coordination model where landowners allow trained stewards to 
                organize productive activities on their property. This includes community food production, 
                land restoration, and educational programs.
              </p>
              <p className="text-lg text-gray-600">
                Unlike traditional leasing or sale, activation keeps you as the owner. Stewards coordinate 
                community participants and activities while you maintain full control and can stop at any time.
              </p>
            </div>
          </div>
        </section>

        {/* Why Participate */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Why Landowners Participate</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🌱</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Productive Use</h3>
                <p className="text-gray-600">Transform idle land into productive community space without the work of managing it yourself.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🤝</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Community Connection</h3>
                <p className="text-gray-600">Build relationships with local community members and contribute to regional food security.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Maintain Ownership</h3>
                <p className="text-gray-600">Keep 100% ownership and control. This is not a lease, sale, or transfer of any rights.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">How It Works</h2>
            <div className="max-w-4xl mx-auto">
              <div className="space-y-6">
                {[
                  { step: 1, title: 'Apply', desc: 'Submit basic information about your property through our simple intake form.' },
                  { step: 2, title: 'Site Assessment', desc: 'A steward visits to assess land readiness and discuss your preferences.' },
                  { step: 3, title: 'Stewardship Plan', desc: 'Review and approve a plan outlining proposed activities on your land.' },
                  { step: 4, title: 'Activation', desc: 'Community activities begin with your ongoing oversight and approval.' },
                  { step: 5, title: 'Ongoing Coordination', desc: 'Stewards provide regular updates and you maintain the right to pause anytime.' }
                ].map((item) => (
                  <div key={item.step} className="flex gap-6 items-start">
                    <div className="flex-shrink-0 w-10 h-10 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What You Keep */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">What You Keep and Control</h2>
            <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
              {[
                'Full legal ownership of your property',
                'Final approval over all activities',
                'The right to pause or stop at any time',
                'Access to your property whenever you want',
                'Decision-making on future land use',
                'Complete control over potential sale or transfer'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                  <span className="text-green-600 text-xl">✓</span>
                  <span className="text-gray-800">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Activation vs Selling */}
        <section className="bg-gray-900 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold text-center mb-12">Activation vs. Traditional Sale or Lease</h2>
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-amber-400 mb-4">Selling</h3>
                  <ul className="text-gray-400 space-y-2 text-sm">
                    <li>Transfer ownership permanently</li>
                    <li>One-time transaction</li>
                    <li>Lose connection to land</li>
                    <li>No ongoing relationship</li>
                  </ul>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-amber-400 mb-4">Leasing</h3>
                  <ul className="text-gray-400 space-y-2 text-sm">
                    <li>Retain ownership</li>
                    <li>Binding contract terms</li>
                    <li>Limited control during lease</li>
                    <li>Tenant relationship</li>
                  </ul>
                </div>
                <div className="text-center bg-amber-500/10 rounded-xl p-6 border border-amber-500/30">
                  <h3 className="text-xl font-semibold text-amber-400 mb-4">Activation</h3>
                  <ul className="text-white space-y-2 text-sm">
                    <li>Retain 100% ownership</li>
                    <li>No binding contract</li>
                    <li>Full control maintained</li>
                    <li>Community partnership</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Ready to Activate Your Land?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Join landowners across the country who are putting their property to productive community use.
            </p>
            <Link href="/landowners/apply" className="inline-block px-8 py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors">
              Apply to Activate Your Land
            </Link>
            <p className="mt-4 text-sm text-gray-500">
              Have questions? <Link href="/landowners/faq" className="text-amber-600 hover:underline">View our FAQ</Link>
            </p>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
