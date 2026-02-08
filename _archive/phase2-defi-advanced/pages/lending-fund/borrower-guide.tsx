import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MobileBottomNav from '../../components/lending-fund/MobileBottomNav';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: "What is the AXUSD Fix & Flip Lending Fund?",
    answer: "The AXUSD Fix & Flip Lending Fund is a real estate bridge loan program operated by Axiom Nexus LLC. We provide short-term financing to real estate investors who purchase, renovate, and sell properties for profit. Our fund is backed by accredited investors and uses blockchain technology for transparency and efficient settlement."
  },
  {
    question: "What is Axiom Protocol?",
    answer: "Axiom Protocol is a community-governed financial platform that combines traditional finance with blockchain technology. We're building a new model for wealth creation that prioritizes transparency, community ownership, and financial inclusion. Our lending fund is one of several financial products designed to benefit both investors and borrowers."
  },
  {
    question: "What is AXUSD?",
    answer: "AXUSD is a stablecoin (digital dollar) used within the Axiom ecosystem. It maintains a 1:1 value with the US Dollar and provides faster settlement, lower transaction costs, and complete transparency. While loans are denominated in AXUSD, you can easily convert to and from traditional US Dollars."
  },
  {
    question: "Do I need cryptocurrency experience to get a loan?",
    answer: "No! You don't need any cryptocurrency experience. Our team handles all the technical aspects. You'll receive funds in your preferred format (wire transfer, ACH, or AXUSD), and repayments work the same way. The blockchain technology works behind the scenes to provide transparency and security."
  },
  {
    question: "What types of properties do you finance?",
    answer: "We finance single-family homes, multi-family properties (2-4 units), and small commercial properties. The property must be suitable for a fix-and-flip or value-add strategy with a clear exit plan (sale or refinance) within 12-18 months."
  },
  {
    question: "What are the loan terms?",
    answer: "Our standard terms include: up to 70% of After Repair Value (ARV), 14% annual interest rate, 2-3 point origination fee, and terms from 6 to 18 months. Rates may vary based on experience, property type, and loan amount."
  },
  {
    question: "How much can I borrow?",
    answer: "Loan amounts typically range from $50,000 to $500,000, with maximum funding up to 70% of the property's After Repair Value (ARV). The exact amount depends on the purchase price, rehab budget, and your experience level."
  },
  {
    question: "What experience do I need?",
    answer: "We work with both new and experienced investors. First-time flippers are welcome, though you may need to demonstrate other relevant experience (construction, real estate, project management) or partner with an experienced contractor. Experienced investors may qualify for better terms."
  },
  {
    question: "How long does approval take?",
    answer: "Most applications receive an initial response within 24-48 hours. Once approved, we can typically fund within 7-14 days, depending on property appraisal and title work. Rush closings may be available for qualified borrowers."
  },
  {
    question: "What documents will I need?",
    answer: "After initial application, you'll need: government-issued ID, proof of funds for down payment, purchase contract (if under contract), property photos, scope of work/rehab budget, contractor bids (if available), and bank statements. Experienced investors should provide a track record of completed projects."
  },
  {
    question: "Is my information secure?",
    answer: "Absolutely. We use bank-level encryption for all data transmission and storage. Your personal and financial information is never shared with third parties except as required for loan processing (title companies, appraisers). Our blockchain transparency applies to loan performance data, not your personal details."
  },
  {
    question: "What happens if my project takes longer than expected?",
    answer: "Extensions are available on a case-by-case basis. If you anticipate needing more time, contact us before your maturity date. Extension fees typically apply. We work with borrowers to find solutions, but clear communication is essential."
  },
  {
    question: "How do I make payments?",
    answer: "Monthly interest payments are due on the 1st of each month. You can pay via ACH, wire transfer, or AXUSD. The full principal plus any remaining interest is due at maturity when you sell or refinance the property."
  },
  {
    question: "What if I can't complete the project?",
    answer: "If you encounter difficulties, contact us immediately. We may be able to restructure terms, extend the loan, or help you find a solution. As a last resort, properties may be sold to recover the loan balance. Open communication is always the best approach."
  }
];

export default function BorrowerGuide() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Head>
        <title>Borrower Guide | AXUSD Fix & Flip Lending Fund</title>
        <meta name="description" content="Complete guide for fix-and-flip borrowers. Learn about loan terms, application process, and frequently asked questions." />
      </Head>

      <div style={{ minHeight: '100vh', background: '#FFFFFF', paddingBottom: '100px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
          padding: '40px 20px',
          color: '#FFFFFF'
        }}>
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <Link href="/lending-fund" style={{ color: '#99F6E4', fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Fund Overview
            </Link>
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginTop: '16px', marginBottom: '12px' }}>
              Borrower Guide
            </h1>
            <p style={{ color: '#A7F3D0', fontSize: '18px', lineHeight: 1.6 }}>
              Everything you need to know about getting a fix-and-flip loan through the AXUSD Lending Fund
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 20px' }}>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              Welcome to the Future of Real Estate Lending
            </h2>
            <div style={{ fontSize: '16px', color: '#374151', lineHeight: 1.8 }}>
              <p style={{ marginBottom: '16px' }}>
                The AXUSD Fix & Flip Lending Fund combines the speed and flexibility of private money lending with the transparency and security of blockchain technology. Whether you're a seasoned flipper or starting your first project, we're here to help you succeed.
              </p>
              <p>
                Our fund is operated by <strong>Axiom Nexus LLC</strong>, a Mississippi-based company, and is structured as a SEC Regulation D 506(c) offering. This means we maintain the highest standards of compliance and investor protection while providing you with competitive financing.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              Understanding AXUSD in Your Loan
            </h2>
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
              borderRadius: '16px',
              border: '1px solid #C7D2FE',
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  color: '#FFFFFF',
                  fontWeight: 700
                }}>
                  $
                </div>
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e', marginBottom: '4px' }}>
                    What is AXUSD?
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    A digital dollar that powers our lending ecosystem
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.8 }}>
                AXUSD is a <strong>stablecoin</strong> - a type of digital currency that maintains a stable 1:1 value with the US Dollar. Think of it like a digital version of a dollar bill that can be transferred instantly, 24/7, with complete transparency. AXUSD is backed by reserves and operates on the Arbitrum blockchain, providing security and transparency that traditional banking cannot match.
              </p>
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e', marginBottom: '16px' }}>
              How AXUSD Works in Your Loan Journey
            </h3>

            <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
              {[
                {
                  title: "Fund Pool",
                  icon: "🏦",
                  description: "Investors deposit AXUSD into the lending fund pool. This creates a ready reserve of capital for loans, allowing us to fund quickly without traditional bank delays.",
                  color: "#7C3AED"
                },
                {
                  title: "Loan Disbursement",
                  icon: "💸",
                  description: "When your loan is approved, you choose how to receive funds: direct wire transfer to your bank account (converted from AXUSD), or AXUSD sent directly to your digital wallet. Most borrowers choose wire transfer for convenience.",
                  color: "#00D4AA"
                },
                {
                  title: "Monthly Payments",
                  icon: "📅",
                  description: "Make monthly interest payments via ACH, wire, check, or AXUSD - whatever works best for you. All payments are recorded on the blockchain for complete transparency and accurate record-keeping.",
                  color: "#F59E0B"
                },
                {
                  title: "Loan Payoff",
                  icon: "✅",
                  description: "When you sell or refinance, pay off the principal balance plus final interest. Wire transfer is most common. Your payoff is recorded on-chain, providing permanent proof of loan satisfaction.",
                  color: "#10B981"
                }
              ].map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '20px',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: `${item.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e', marginBottom: '6px' }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e', marginBottom: '16px' }}>
              Benefits of AXUSD-Powered Lending
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              {[
                {
                  title: "Faster Funding",
                  description: "No waiting for bank transfers or wire processing. AXUSD moves instantly, so once approved, your funds are available same-day.",
                  icon: "⚡"
                },
                {
                  title: "Complete Transparency",
                  description: "Every loan, payment, and transaction is recorded on a public blockchain. You can verify fund availability and loan status anytime.",
                  icon: "🔍"
                },
                {
                  title: "Lower Costs",
                  description: "Blockchain settlement reduces overhead costs. These savings help us offer competitive rates to borrowers.",
                  icon: "💰"
                },
                {
                  title: "24/7 Operations",
                  description: "Unlike banks, blockchain doesn't close. Make payments or receive funds any day, any time - even holidays and weekends.",
                  icon: "🌐"
                },
                {
                  title: "Immutable Records",
                  description: "Your loan history is permanently recorded. No lost paperwork, no disputes about payment history - everything is verifiable.",
                  icon: "📜"
                },
                {
                  title: "No Crypto Knowledge Needed",
                  description: "You don't need to understand blockchain. We handle all the technical aspects - you just receive traditional wire transfers.",
                  icon: "🎯"
                }
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '20px',
                  background: '#F9FAFB',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>{item.icon}</div>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div style={{
              padding: '20px',
              background: '#ECFDF5',
              borderRadius: '12px',
              border: '1px solid #A7F3D0'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#065F46', marginBottom: '8px' }}>
                Traditional Funds? No Problem!
              </h4>
              <p style={{ fontSize: '14px', color: '#047857', lineHeight: 1.6 }}>
                <strong>You don't need to own any cryptocurrency to get a loan.</strong> Most of our borrowers receive funds via traditional wire transfer and make payments via ACH or wire. The AXUSD technology works behind the scenes to provide transparency and efficiency benefits - you interact with regular dollars just like any other lender.
              </p>
            </div>
          </section>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              How the Loan Process Works
            </h2>
            <div style={{ display: 'grid', gap: '20px' }}>
              {[
                {
                  step: 1,
                  title: "Submit Your Application",
                  description: "Complete our simple 3-step online application. Provide basic information about yourself, the property, and your financing needs. This takes about 10-15 minutes.",
                  icon: "📝"
                },
                {
                  step: 2,
                  title: "Initial Review",
                  description: "Our team reviews your application within 24-48 hours. We'll evaluate the property, your experience, and the project viability. You may receive follow-up questions or a request for additional information.",
                  icon: "🔍"
                },
                {
                  step: 3,
                  title: "Term Sheet & Approval",
                  description: "If your project meets our criteria, we'll issue a term sheet outlining loan amount, interest rate, fees, and conditions. Review and accept to move forward.",
                  icon: "📋"
                },
                {
                  step: 4,
                  title: "Due Diligence",
                  description: "We order an appraisal (or review your BPO), verify property details, and complete title work. You'll submit remaining documentation during this phase.",
                  icon: "🏠"
                },
                {
                  step: 5,
                  title: "Closing & Funding",
                  description: "Sign loan documents and receive your funds. Most loans close within 7-14 days of approval. Funds are available immediately after closing.",
                  icon: "💰"
                },
                {
                  step: 6,
                  title: "Project Completion",
                  description: "Complete your renovation, sell or refinance the property, and repay the loan. Our team is available throughout to answer questions and support your success.",
                  icon: "🎉"
                }
              ].map((item) => (
                <div key={item.step} style={{
                  display: 'flex',
                  gap: '20px',
                  padding: '24px',
                  background: '#F9FAFB',
                  borderRadius: '12px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #00D4AA 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    flexShrink: 0
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#00D4AA', fontWeight: 600, marginBottom: '4px' }}>
                      STEP {item.step}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e', marginBottom: '8px' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: '15px', color: '#6b7280', lineHeight: 1.6 }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              Loan Terms at a Glance
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {[
                { label: "Maximum LTV", value: "70% of ARV", note: "Loan-to-value based on after repair value" },
                { label: "Interest Rate", value: "14% Annual", note: "Interest-only monthly payments" },
                { label: "Origination Fee", value: "2-3 Points", note: "Deducted from loan proceeds at closing" },
                { label: "Loan Terms", value: "6-18 Months", note: "Flexible terms to match your project" },
                { label: "Minimum Loan", value: "$50,000", note: "For qualified properties" },
                { label: "Maximum Loan", value: "$500,000", note: "Larger loans available case-by-case" },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '24px',
                  background: '#F0FDFA',
                  borderRadius: '12px',
                  border: '1px solid #99F6E4',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#0F766E', marginBottom: '8px' }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a2e', marginBottom: '4px' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {item.note}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              Eligibility Requirements
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div style={{
                padding: '24px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E5E7EB'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e', marginBottom: '16px' }}>
                  Borrower Requirements
                </h3>
                <ul style={{ fontSize: '15px', color: '#374151', lineHeight: 2, paddingLeft: '20px' }}>
                  <li>U.S. citizen or permanent resident</li>
                  <li>18 years or older</li>
                  <li>Valid government-issued ID</li>
                  <li>Proof of funds for down payment and reserves</li>
                  <li>No active bankruptcies</li>
                  <li>Entity borrowing accepted (LLC, Corp)</li>
                </ul>
              </div>
              <div style={{
                padding: '24px',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E5E7EB'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1a1a2e', marginBottom: '16px' }}>
                  Property Requirements
                </h3>
                <ul style={{ fontSize: '15px', color: '#374151', lineHeight: 2, paddingLeft: '20px' }}>
                  <li>Residential or small commercial property</li>
                  <li>Located in approved states</li>
                  <li>Clear title or title issues can be resolved</li>
                  <li>No environmental hazards</li>
                  <li>Structurally sound (or budget for repairs)</li>
                  <li>Marketable after renovation</li>
                </ul>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              Safety & Compliance
            </h2>
            <div style={{
              padding: '24px',
              background: '#FEF3C7',
              borderRadius: '12px',
              border: '1px solid #FDE68A',
              marginBottom: '24px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#92400E', marginBottom: '12px' }}>
                Important Disclosures
              </h3>
              <ul style={{ fontSize: '14px', color: '#78350F', lineHeight: 1.8, paddingLeft: '20px' }}>
                <li>Real estate investing involves risk. You could lose your investment if the project fails.</li>
                <li>Loan terms are subject to underwriting approval and may vary from advertised rates.</li>
                <li>Late payments may result in additional fees and could affect your credit.</li>
                <li>Default may result in foreclosure and loss of the property.</li>
                <li>Past performance of other borrowers does not guarantee your results.</li>
              </ul>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
              <div style={{
                padding: '24px',
                background: '#F0FDF4',
                borderRadius: '12px',
                border: '1px solid #BBF7D0'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#166534', marginBottom: '12px' }}>
                  Your Data is Protected
                </h3>
                <p style={{ fontSize: '15px', color: '#15803D', lineHeight: 1.6 }}>
                  We use 256-bit SSL encryption for all data transmission. Your personal information is stored securely and never sold to third parties. We comply with all applicable privacy regulations.
                </p>
              </div>
              <div style={{
                padding: '24px',
                background: '#EEF2FF',
                borderRadius: '12px',
                border: '1px solid #C7D2FE'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#3730A3', marginBottom: '12px' }}>
                  Regulatory Compliance
                </h3>
                <p style={{ fontSize: '15px', color: '#4338CA', lineHeight: 1.6 }}>
                  Axiom Nexus LLC operates in compliance with state and federal lending regulations. Our fund is structured as a SEC Regulation D 506(c) offering with proper investor protections.
                </p>
              </div>
              <div style={{
                padding: '24px',
                background: '#FDF4FF',
                borderRadius: '12px',
                border: '1px solid #E9D5FF'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#7E22CE', marginBottom: '12px' }}>
                  Blockchain Transparency
                </h3>
                <p style={{ fontSize: '15px', color: '#7C3AED', lineHeight: 1.6 }}>
                  All loan data (amounts, payments, performance) is recorded on the blockchain for complete transparency. Your personal information remains private and secure.
                </p>
              </div>
            </div>
          </section>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              Frequently Asked Questions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      background: 'none',
                      border: 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <span style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e', paddingRight: '16px' }}>
                      {faq.question}
                    </span>
                    <span style={{
                      fontSize: '24px',
                      color: '#00D4AA',
                      transform: openFaq === index ? 'rotate(45deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                      flexShrink: 0
                    }}>
                      +
                    </span>
                  </button>
                  {openFaq === index && (
                    <div style={{
                      padding: '0 24px 20px 24px',
                      fontSize: '15px',
                      color: '#6b7280',
                      lineHeight: 1.7
                    }}>
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              Tips for a Successful Application
            </h2>
            <div style={{
              padding: '24px',
              background: '#F9FAFB',
              borderRadius: '12px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {[
                  { icon: "✓", tip: "Be accurate and honest - Misrepresentation can delay or disqualify your application" },
                  { icon: "✓", tip: "Know your numbers - Have clear estimates for purchase price, rehab costs, and ARV" },
                  { icon: "✓", tip: "Have your contractor ready - Detailed scope of work and bids strengthen your application" },
                  { icon: "✓", tip: "Prepare your documents - Gather ID, bank statements, and any prior project documentation" },
                  { icon: "✓", tip: "Respond quickly - The faster you provide requested information, the faster we can fund" },
                  { icon: "✓", tip: "Ask questions - Our team is here to help. There are no bad questions." }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#00D4AA',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      {item.icon}
                    </span>
                    <span style={{ fontSize: '15px', color: '#374151', lineHeight: 1.5 }}>
                      {item.tip}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={{ marginBottom: '48px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '20px' }}>
              Contact & Support
            </h2>
            <div style={{
              padding: '32px',
              background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
              borderRadius: '16px',
              color: '#FFFFFF',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
                Have Questions? We're Here to Help
              </h3>
              <p style={{ color: '#A7F3D0', marginBottom: '24px', lineHeight: 1.6 }}>
                Our lending team is available Monday-Friday, 9am-6pm EST to answer your questions and guide you through the process.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <div style={{ fontSize: '16px' }}>
                  Email: <strong>lending@axiomprotocol.io</strong>
                </div>
              </div>
            </div>
          </section>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center',
            padding: '32px',
            background: '#F9FAFB',
            borderRadius: '16px',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e' }}>
              Ready to Get Started?
            </h2>
            <p style={{ fontSize: '16px', color: '#6b7280', maxWidth: '500px' }}>
              Apply now and get a response within 24-48 hours. Our streamlined process makes funding fast and simple.
            </p>
            <Link
              href="/lending-fund/apply"
              style={{
                display: 'inline-block',
                padding: '16px 48px',
                background: '#7C3AED',
                color: '#FFFFFF',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '18px',
                textDecoration: 'none',
                transition: 'transform 0.2s'
              }}
            >
              Apply for a Loan
            </Link>
          </div>

        </div>

        <MobileBottomNav />
      </div>
    </>
  );
}
