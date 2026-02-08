import React, { useState } from 'react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'Who can invest in Community Land Funds?',
    answer: 'All U.S. residents 18+ can invest through SEC Regulation Crowdfunding (Reg CF). No accredited investor status required. This is a public offering open to everyone.'
  },
  {
    question: 'What are the investment limits?',
    answer: 'SEC Reg CF limits depend on your income and net worth. If both are under $124,000, you can invest the greater of $2,500 or 5% of the lesser. If either exceeds $124,000, you can invest up to 10% of the lesser (max $124,000/year across all Reg CF offerings).'
  },
  {
    question: 'How does ownership work?',
    answer: 'Each investment receives ERC-1155 tokens on Arbitrum blockchain representing fractional ownership. These tokens are your proof of ownership, stored in your wallet and verifiable on-chain at any time.'
  },
  {
    question: 'What are the risks?',
    answer: 'Land investment carries risk including potential loss of principal. Land values fluctuate based on market conditions, development potential, and location factors. Investments are illiquid and there is no guarantee of returns.'
  },
  {
    question: 'Can I cancel my subscription?',
    answer: 'Yes, you can pause or cancel your investment subscription at any time. Existing ownership tokens remain yours. There are no penalties for cancellation, but no refunds for payments already processed.'
  }
];

interface RegCFDisclosureProps {
  showCalculator?: boolean;
}

export default function RegCFDisclosure({ showCalculator = true }: RegCFDisclosureProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [income, setIncome] = useState<number>(75000);
  const [netWorth, setNetWorth] = useState<number>(50000);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const calculateLimit = () => {
    const lesser = Math.min(income, netWorth);
    const greater = Math.max(income, netWorth);
    
    if (income < 124000 && netWorth < 124000) {
      return Math.max(2500, lesser * 0.05);
    } else {
      return Math.min(124000, lesser * 0.10);
    }
  };

  const limit = calculateLimit();

  return (
    <div>
      <h3 style={{ 
        fontSize: 20, 
        fontWeight: 700, 
        color: '#111827', 
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }}>
        <svg style={{ width: 24, height: 24, color: '#d4af37' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Frequently Asked Questions
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {FAQ_ITEMS.map((item, index) => (
          <div
            key={index}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              overflow: 'hidden',
              background: openIndex === index ? '#f9fafb' : '#ffffff'
            }}
          >
            <button
              onClick={() => toggleFAQ(index)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
                {item.question}
              </span>
              <svg 
                style={{ 
                  width: 20, 
                  height: 20, 
                  color: '#6b7280',
                  transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openIndex === index && (
              <div style={{ padding: '0 20px 16px', color: '#4b5563', fontSize: 14, lineHeight: 1.6 }}>
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCalculator && (
        <div style={{
          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
          borderRadius: 16,
          padding: 24,
          border: '1px solid #e5e7eb',
          marginBottom: 24
        }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 16 }}>
            Your Investment Limit Calculator
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Annual Income
              </label>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '2px solid #e5e7eb',
                  fontSize: 15,
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Net Worth
              </label>
              <input
                type="number"
                value={netWorth}
                onChange={(e) => setNetWorth(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 8,
                  border: '2px solid #e5e7eb',
                  fontSize: 15,
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          <div style={{
            background: '#d1fae5',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center'
          }}>
            <p style={{ fontSize: 13, color: '#065f46', marginBottom: 4 }}>
              Your SEC Reg CF Annual Limit
            </p>
            <p style={{ fontSize: 28, fontWeight: 700, color: '#047857' }}>
              ${limit.toLocaleString()}
            </p>
            <p style={{ fontSize: 12, color: '#059669' }}>
              across all Reg CF offerings in 12 months
            </p>
          </div>
        </div>
      )}

      <div style={{
        background: '#fef3c7',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #fcd34d'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <svg style={{ width: 20, height: 20, color: '#d97706', flexShrink: 0, marginTop: 2 }} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p style={{ fontWeight: 600, fontSize: 13, color: '#92400e', marginBottom: 8 }}>
              Full Disclosure Documents
            </p>
            <p style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5, marginBottom: 12 }}>
              Before investing, please review all offering documents including risk factors, 
              use of proceeds, and financial information.
            </p>
            <Link 
              href="/docs/investor/COMMUNITY_LAND_FUNDS_REGCF.md"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                fontWeight: 600,
                color: '#92400e',
                textDecoration: 'underline'
              }}
            >
              Read Full Offering Circular
              <svg style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
