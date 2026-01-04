import React, { useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { RebuildNav } from '../../components/axiomRebuild/RebuildNav';
import { trackActivatedLand, ActivatedLandEvents } from '../../lib/stewards/activatedLandAnalytics';

const steps = [
  {
    step: 1,
    title: 'Land Intake',
    description: 'Submit basic information about your property including location, acreage, current use, and your goals for the land.',
    details: [
      'Complete our simple online application (10 minutes)',
      'Provide property details and photos if available',
      'Share your vision and any preferences',
      'A steward will contact you within 48 hours'
    ],
    icon: '📋'
  },
  {
    step: 2,
    title: 'Site Readiness Check',
    description: 'A steward visits your property to assess suitability for community activities and discuss logistics.',
    details: [
      'In-person or virtual site visit',
      'Assessment of access, utilities, and safety',
      'Discussion of potential uses based on land characteristics',
      'Identification of any preparation needed'
    ],
    icon: '🔍'
  },
  {
    step: 3,
    title: 'Stewardship Plan',
    description: 'Together with your steward, develop a plan outlining proposed activities, schedules, and communication protocols.',
    details: [
      'Collaborative planning session',
      'Written plan for your review',
      'Clear activity schedules and participant guidelines',
      'Your approval required before proceeding'
    ],
    icon: '📝'
  },
  {
    step: 4,
    title: 'Activation Cycle Launch',
    description: 'Community activities begin on your property according to the approved plan.',
    details: [
      'Steward coordinates all participants',
      'Regular updates provided to you',
      'Activities follow approved guidelines',
      'You can visit and observe anytime'
    ],
    icon: '🚀'
  },
  {
    step: 5,
    title: 'Ongoing Coordination',
    description: 'Continuous communication, regular reporting, and the flexibility to adjust as needed.',
    details: [
      'Weekly or monthly steward updates',
      'Seasonal planning discussions',
      'Ability to pause or modify activities',
      'Optional future discussions if interested'
    ],
    icon: '🔄'
  }
];

export default function LandownersActivatePage() {
  useEffect(() => {
    trackActivatedLand(ActivatedLandEvents.LANDOWNER_PAGE_VIEW, { page: 'activate' });
  }, []);

  return (
    <>
      <Head>
        <title>How Activation Works | Landowners | Axiom Protocol</title>
        <meta name="description" content="Step-by-step guide to activating your land through the Steward-Activated Land Program." />
      </Head>
      <RebuildNav />
      
      <main className="min-h-screen bg-white pt-20">
        <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
          <Link href="/landowners" className="text-amber-600 hover:underline text-sm mb-4 inline-block">
            ← Back to Landowners
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">How Land Activation Works</h1>
          <p className="text-lg text-gray-600 mb-12">
            A step-by-step guide to the activation process, from initial application to ongoing community activities.
          </p>

          <div className="space-y-8">
            {steps.map((step) => (
              <div key={step.step} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="p-6 md:p-8">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center text-2xl">
                        {step.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                          Step {step.step}
                        </span>
                        <h2 className="text-xl font-bold text-gray-900">{step.title}</h2>
                      </div>
                      <p className="text-gray-600 mb-4">{step.description}</p>
                      <ul className="space-y-2">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                            <span className="text-amber-500 mt-0.5">•</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-gray-900 text-white rounded-xl p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">Optional Future Steps</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              Some landowners, after experiencing successful activation, express interest in exploring 
              future options like land partnerships, seller financing, or other arrangements. These 
              discussions are completely optional, separate from activation, and initiated only at your request.
            </p>
            <p className="text-sm text-gray-400">
              Activation does not require or imply any future sale or transfer of your property.
            </p>
          </div>

          <div className="mt-12 text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Get Started?</h3>
            <Link href="/landowners/apply" className="inline-block px-8 py-4 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors">
              Apply to Activate Your Land
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
