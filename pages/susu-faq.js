import { useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Layout from '../components/Layout';
import { SUSU_ROUTES } from '../lib/susuRoutes';

const faqItems = [
  {
    question: "What is The Wealth Practice?",
    answer: "The Wealth Practice is a structured group savings practice based on the traditional SUSU method. Members follow agreed rules to build consistency together."
  },
  {
    question: "Is this an investment?",
    answer: "No. The Wealth Practice is not an investment product and does not promise profits or returns."
  },
  {
    question: "Is Axiom a bank?",
    answer: "No. Axiom is not a bank. Axiom provides coordination tools for group saving and financial discipline."
  },
  {
    question: "Do you guarantee payouts?",
    answer: "No. Participation depends on members following the group rules. No system can guarantee individual behavior."
  },
  {
    question: "Can I lose money?",
    answer: "Yes. Like any group saving arrangement, participation involves risk if members do not follow agreed rules."
  },
  {
    question: "Do I need a wallet to use this?",
    answer: "Some features may require a wallet connection. The platform may offer different onboarding steps depending on your setup."
  },
  {
    question: "Do I need AXM to participate?",
    answer: "Not necessarily. Participation requirements depend on how a group is configured."
  },
  {
    question: "What are Interest Groups and why do they matter?",
    answer: "Interest Groups help people connect by location or goal before any money is involved. They are designed to support trust-building and clarity before joining a group."
  },
  {
    question: "Is this legal?",
    answer: "Rotating savings systems are common globally. Laws vary by jurisdiction and by structure. This page is informational only and not legal advice."
  },
  {
    question: "Is it insured?",
    answer: "No. This is not an insured financial product."
  },
  {
    question: "Are there fees?",
    answer: "If fees apply, they should be clearly shown before you join or start. Always review the terms before committing."
  },
  {
    question: "What should I do before joining?",
    answer: "Read the group rules, confirm the schedule fits your budget, understand late or missed payment handling, and start small until you gain confidence."
  }
];

function FAQItem({ item, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900">{item.question}</span>
        <span className={`text-2xl text-gray-400 transition-transform ${isOpen ? 'rotate-45' : ''}`}>+</span>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-gray-700">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function SusuFaqPage() {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <Layout>
      <Head>
        <title>The Wealth Practice FAQ | Frequently Asked Questions</title>
        <meta name="description" content="Common questions about The Wealth Practice structured savings groups, how they work, and what to expect." />
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 text-white py-16">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg mx-auto mb-6">
              ❓
            </div>
            <h1 className="text-4xl font-bold mb-4">The Wealth Practice FAQ</h1>
            <p className="text-gray-300 mb-8">Common questions about structured savings groups and how The Wealth Practice works.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={SUSU_ROUTES.GROUPS_NEARBY_PATH}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
              >
                Find a Group Near You
              </Link>
              <Link
                href={SUSU_ROUTES.START_CIRCLE_PATH}
                className="px-6 py-3 bg-white/10 text-white border border-white/30 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Start a Wealth Practice
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <FAQItem
                key={index}
                item={item}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </div>

        <div className="bg-gray-900 text-white py-12">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold mb-6">Ready to get started?</h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Link
                href={SUSU_ROUTES.GROUPS_NEARBY_PATH}
                className="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
              >
                Find a Group Near You
              </Link>
              <Link
                href={SUSU_ROUTES.START_CIRCLE_PATH}
                className="px-6 py-3 bg-white/10 text-white border border-white/30 rounded-xl font-medium hover:bg-white/20 transition-colors"
              >
                Start a Wealth Practice
              </Link>
            </div>
            <Link href={SUSU_ROUTES.SUSU_START_PATH} className="text-amber-400 hover:text-amber-300 underline">
              Back to The Wealth Practice Introduction
            </Link>
          </div>
        </div>

        <div className="bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center text-sm text-gray-500 space-y-2">
              <p>This page is for informational purposes only and does not constitute financial, legal, or investment advice.</p>
              <p>Participation involves risk. Consult qualified professionals for advice specific to your situation.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
