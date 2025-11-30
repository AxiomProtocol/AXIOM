import { useState } from 'react';
import Layout from "../components/Layout";

const faqs = [
  { 
    question: "What is Axiom Smart City?", 
    answer: "Axiom is America's first on-chain sovereign smart city — a 1,000-acre digital-physical economy with full-service banking, tokenized real estate, DePIN infrastructure, and community governance, all powered by the AXM token on Arbitrum." 
  },
  { 
    question: "What is the AXM token?", 
    answer: "AXM is the native governance and utility token of Axiom Smart City. It's an ERC-20 token on Arbitrum One with a total supply of 15 billion. AXM is used for governance voting, DePIN node staking, fee payments, and accessing premium services." 
  },
  { 
    question: "How can I become a DePIN node operator?", 
    answer: "Visit our DePIN page, connect your wallet, and register your infrastructure node. You'll need to stake AXM tokens based on your node type (ranging from 1,000 AXM for IoT nodes to 10,000 AXM for Validator nodes)." 
  },
  { 
    question: "When is the Token Generation Event (TGE)?", 
    answer: "The AXM Token Generation Event is scheduled for January 1, 2026. Early participants can join through our waitlist and private sale programs." 
  },
  { 
    question: "What blockchain does Axiom use?", 
    answer: "Axiom is currently deployed on Arbitrum One (Layer 2). Post-TGE, we plan to launch our own Axiom Orbit Chain (Layer 3) using AXM as the native gas token." 
  },
  { 
    question: "How does governance work?", 
    answer: "AXM token holders can participate in governance by voting on proposals and delegating their voting power. Decisions about protocol upgrades, treasury allocation, and city development are made by the community." 
  },
  { 
    question: "What is Proof of Reserves?", 
    answer: "Proof of Reserves is our transparency system that provides independent verification of on-chain balances for Axiom-controlled wallets. Reports are published regularly with downloadable PDFs." 
  },
  { 
    question: "How can I invest in Axiom?", 
    answer: "You can participate through our DePIN node operator program, upcoming token sale, or approved investor programs following KYC/AML compliance requirements." 
  },
];

function FAQItem({ faq, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900">{faq.question}</span>
        <svg 
          className={`w-5 h-5 text-amber-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-4 text-gray-600">
          {faq.answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h1>
          <p className="text-lg text-gray-600">Find answers to common questions about Axiom Smart City.</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <FAQItem 
              key={i} 
              faq={faq} 
              isOpen={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Still have questions?</h3>
          <p className="text-gray-600 mb-4">Our team is here to help</p>
          <a 
            href="/contact" 
            className="inline-block px-6 py-3 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
