import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { RebuildNav } from '../../components/axiomRebuild/RebuildNav';
import { trackActivatedLand, ActivatedLandEvents } from '../../lib/stewards/activatedLandAnalytics';

const faqs = [
  {
    q: "Do I keep ownership of my land?",
    a: "Yes, absolutely. You retain 100% legal ownership of your property at all times. Land activation is not a sale, transfer, or lease. You maintain full ownership rights and can sell or transfer your property whenever you choose, completely independent of the activation program."
  },
  {
    q: "What does Axiom do on my land?",
    a: "Axiom coordinates community stewards who organize productive activities like food production, community gardens, and land restoration. Stewards handle community organizing, scheduling, and coordination. All activities are approved by you in advance, and you can pause or stop any activity at any time."
  },
  {
    q: "Who are the Stewards?",
    a: "Stewards are community coordinators who have completed our training program. They are responsible for organizing community activities, communicating with landowners, and ensuring activities are conducted safely and respectfully. Each steward is vetted and trained before working with landowners."
  },
  {
    q: "What happens on my land during activation?",
    a: "Activities vary based on your preferences and land characteristics. Common activities include community food production, educational programs, land restoration, and community gatherings. You review and approve the stewardship plan before any activities begin."
  },
  {
    q: "What about insurance and liability?",
    a: "Axiom carries coordination insurance for program activities. Specific coverage details are provided during the intake process. We recommend landowners maintain their existing property insurance and consult with their insurance provider about coverage questions."
  },
  {
    q: "Can I stop the program at any time?",
    a: "Yes. You can pause or completely stop participation at any time without penalty. Simply notify your assigned steward, and activities will wind down according to a reasonable timeline that you agree to."
  },
  {
    q: "Does this require selling or leasing my land?",
    a: "No. Activation is completely separate from any sale or lease arrangement. You are not selling, leasing, or transferring any property rights. Future decisions about your land remain entirely yours."
  },
  {
    q: "How are activities coordinated on my property?",
    a: "Your assigned steward manages all coordination. They schedule community activities, communicate with participants, and provide you with regular updates. You have direct contact with your steward and final say over all activities."
  },
  {
    q: "How do I get started?",
    a: "Start by completing our simple application form. A steward will contact you to discuss your property and answer questions. If there's a good fit, we proceed to site assessment and stewardship planning. The entire intake process is designed to be informative and pressure-free."
  },
  {
    q: "Is there any cost to participate?",
    a: "There is no cost to landowners to participate in the activation program. Stewards coordinate community volunteers who contribute their time, and program operations are supported through community participation."
  },
  {
    q: "What if I want to sell my land later?",
    a: "You are always free to sell your property. The activation program has no claim on your land and does not affect your ability to sell. If you decide to sell, simply let your steward know, and we'll wind down activities. Separately, some landowners have expressed interest in future acquisition discussions, but this is entirely optional and independent of activation."
  }
];

export default function LandownersFAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    trackActivatedLand(ActivatedLandEvents.LANDOWNER_PAGE_VIEW, { page: 'faq' });
  }, []);

  return (
    <>
      <Head>
        <title>FAQ | Landowners | Axiom Protocol</title>
        <meta name="description" content="Frequently asked questions about the Steward-Activated Land Program for landowners." />
      </Head>
      <RebuildNav />
      
      <main className="min-h-screen bg-white pt-20">
        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
          <Link href="/landowners" className="text-amber-600 hover:underline text-sm mb-4 inline-block">
            ← Back to Landowners
          </Link>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
          <p className="text-lg text-gray-600 mb-12">
            Common questions from landowners about the Steward-Activated Land Program.
          </p>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                  className="w-full px-6 py-4 text-left flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <svg 
                    className={`w-5 h-5 text-gray-500 transition-transform ${openIndex === idx ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {openIndex === idx && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                    <p className="text-gray-600">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 p-6 bg-amber-50 rounded-xl border border-amber-200">
            <h3 className="font-semibold text-gray-900 mb-2">Still have questions?</h3>
            <p className="text-gray-600 mb-4">
              We're happy to answer any additional questions you may have about the program.
            </p>
            <Link href="/landowners/apply" className="text-amber-600 font-medium hover:underline">
              Apply and speak with a steward →
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
