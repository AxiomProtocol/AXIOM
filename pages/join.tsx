import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';
import ParticipationDisclosurePanel from '../components/Disclosures/ParticipationDisclosurePanel';

const joinImage = "/images/community_membership_unity_illustration.png";

type Step = 'overview' | 'rules' | 'disclosures' | 'confirm' | 'complete';

const PMA_OVERVIEW = `
Axiom Protocol operates as a Private Membership Association (PMA) Trust. This structure enables members to participate in a private ecosystem for coordination and stewardship practice, protected by constitutional rights of freedom of association and contract.

As a PMA member, you join a community committed to collective resource coordination, transparent governance, and responsible land stewardship. Membership is not an investment, and there are no guaranteed financial outcomes.

The PMA framework provides:
- Privacy protection for member information and transactions
- Contractual freedom to participate in coordinated activities
- Community governance through purpose pools and proposals
- Access to stewardship opportunities and educational resources
`;

const RULES = [
  {
    title: "Voluntary Participation",
    content: "All membership is voluntary. You may withdraw your membership at any time by following the established procedures."
  },
  {
    title: "Good Faith Conduct",
    content: "Members agree to act in good faith toward other members and the Association. This includes honest communication, respectful engagement, and adherence to governance decisions."
  },
  {
    title: "Confidentiality",
    content: "Members agree to maintain the confidentiality of Association matters and not disclose private member information to non-members without consent."
  },
  {
    title: "Governance Participation",
    content: "Members may participate in governance by voting on proposals, committing resources to purpose pools, and contributing to community discussions."
  },
  {
    title: "Resource Commitments",
    content: "When committing resources to purpose pools, members acknowledge that allocations are governed by community decisions and due diligence processes."
  },
  {
    title: "No Investment Claims",
    content: "Participation in Axiom Protocol is for coordination and stewardship practice. The Association makes no claims of investment returns, guaranteed outcomes, or financial benefits."
  }
];

export default function JoinPage() {
  const [currentStep, setCurrentStep] = useState<Step>('overview');
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: { id: Step; label: string }[] = [
    { id: 'overview', label: 'PMA Overview' },
    { id: 'rules', label: 'Rules' },
    { id: 'disclosures', label: 'Disclosures' },
    { id: 'confirm', label: 'Confirm' },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleSubmitMembership = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/membership/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rulesAccepted: true,
          disclosuresAccepted: true,
          agreementVersion: '1.0'
        })
      });

      const data = await response.json();

      if (data.success) {
        setCurrentStep('complete');
      } else {
        setError(data.error || 'Failed to submit membership application');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SiteLayout>
      <Head>
        <title>Join Axiom Protocol | Become a Member</title>
        <meta name="description" content="Join the Axiom Protocol PMA Trust. Become a member to participate in community coordination, purpose pools, and land stewardship." />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <div style={{
          position: "relative",
          padding: "80px 0 60px 0",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 170, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 60%, rgba(123, 104, 238, 0.05) 0%, transparent 50%)
            `,
            pointerEvents: "none"
          }} />
          
          <div className="max-w-6xl mx-auto px-4" style={{ position: "relative" }}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div style={{ 
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(123, 104, 238, 0.08) 100%)",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  marginBottom: "20px",
                  border: "1px solid rgba(0, 212, 170, 0.2)"
                }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    background: "linear-gradient(135deg, #00D4AA 0%, #00A389 100%)",
                    borderRadius: "50%"
                  }} />
                  <span style={{ 
                    fontSize: "13px", 
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#00A389"
                  }}>Membership</span>
                </div>
                
                <h1 style={{ 
                  fontSize: "clamp(32px, 5vw, 48px)", 
                  lineHeight: 1.1, 
                  margin: "0 0 16px 0",
                  fontWeight: 700,
                  color: "#0A0F1C"
                }}>Become a Member</h1>
                
                <p style={{ 
                  fontSize: "18px", 
                  lineHeight: 1.6,
                  color: "rgba(10, 15, 28, 0.65)", 
                  maxWidth: "500px",
                  margin: 0
                }}>
                  Join the Axiom Protocol Private Membership Association and participate in community coordination and stewardship.
                </p>
              </div>
              
              <div className="hidden lg:block">
                <img 
                  src={joinImage} 
                  alt="Community membership illustration"
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "24px",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          {currentStep !== 'complete' && (
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                  <React.Fragment key={step.id}>
                    <div className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                        index < currentStepIndex 
                          ? 'bg-teal-500 text-white' 
                          : index === currentStepIndex 
                            ? 'bg-teal-600 text-white' 
                            : 'bg-gray-200 text-gray-500'
                      }`}>
                        {index < currentStepIndex ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span className={`ml-2 text-sm hidden sm:inline ${
                        index === currentStepIndex ? 'font-semibold text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        index < currentStepIndex ? 'bg-teal-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'overview' && (
            <div style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06)"
            }}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Private Membership Association Overview</h2>
              
              <div className="prose max-w-none">
                {PMA_OVERVIEW.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-gray-700 mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4 my-6">
                <div style={{ background: "rgba(0, 212, 170, 0.08)", borderRadius: "12px", padding: "16px" }}>
                  <h4 className="font-semibold text-teal-900 mb-2">What You Can Do</h4>
                  <ul className="text-sm text-teal-800 space-y-1">
                    <li>Participate in purpose pools</li>
                    <li>Vote on governance proposals</li>
                    <li>Apply for steward roles</li>
                    <li>Access member resources</li>
                  </ul>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">What This Is Not</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>Not a financial investment</li>
                    <li>Not a guaranteed return</li>
                    <li>Not a passive income scheme</li>
                    <li>Not an SEC-registered offering</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <Link href="/pma" className="text-teal-600 hover:underline">
                  Learn more about PMA
                </Link>
                <button
                  onClick={() => setCurrentStep('rules')}
                  style={{
                    background: "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)",
                    color: "white",
                    fontWeight: 600,
                    padding: "12px 24px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Continue to Rules
                </button>
              </div>
            </div>
          )}

          {currentStep === 'rules' && (
            <div style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06)"
            }}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Membership Rules</h2>
              <p className="text-gray-600 mb-6">Please review and accept the following membership rules.</p>

              <div className="space-y-4 mb-6">
                {RULES.map((rule, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-1">{rule.title}</h4>
                    <p className="text-sm text-gray-700">{rule.content}</p>
                  </div>
                ))}
              </div>

              <label className="flex items-start gap-3 cursor-pointer rounded-lg p-4 border" style={{ background: "rgba(0, 212, 170, 0.06)", borderColor: "rgba(0, 212, 170, 0.3)" }}>
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">
                  I have read and agree to abide by the Axiom Protocol PMA membership rules.
                </span>
              </label>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep('overview')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('disclosures')}
                  disabled={!rulesAccepted}
                  style={{
                    background: rulesAccepted ? "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)" : "#ccc",
                    color: "white",
                    fontWeight: 600,
                    padding: "12px 24px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: rulesAccepted ? "pointer" : "not-allowed"
                  }}
                >
                  Continue to Disclosures
                </button>
              </div>
            </div>
          )}

          {currentStep === 'disclosures' && (
            <div style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06)"
            }}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Important Disclosures</h2>
              <p className="text-gray-600 mb-6">Please review these important disclosures about participation.</p>

              <ParticipationDisclosurePanel showActions={false} />

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep('rules')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('confirm')}
                  style={{
                    background: "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)",
                    color: "white",
                    fontWeight: 600,
                    padding: "12px 24px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Continue to Confirmation
                </button>
              </div>
            </div>
          )}

          {currentStep === 'confirm' && (
            <div style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "24px",
              padding: "32px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06)"
            }}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Confirm Membership Application</h2>
              
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Reviewed PMA Overview
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Accepted Membership Rules
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-teal-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Reviewed Important Disclosures
                  </li>
                </ul>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">
                  {error}
                </div>
              )}

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep('disclosures')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitMembership}
                  disabled={loading}
                  style={{
                    background: "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)",
                    color: "white",
                    fontWeight: 600,
                    padding: "12px 24px",
                    borderRadius: "12px",
                    border: "none",
                    cursor: loading ? "wait" : "pointer",
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div style={{
              background: "rgba(255, 255, 255, 0.9)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              borderRadius: "24px",
              padding: "48px",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06)",
              textAlign: "center"
            }}>
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-teal-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Your membership application has been received. You will be notified once your application has been reviewed.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/participate"
                  style={{
                    background: "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)",
                    color: "white",
                    fontWeight: 600,
                    padding: "12px 24px",
                    borderRadius: "12px",
                    textDecoration: "none",
                    display: "inline-block"
                  }}
                >
                  View Participation Dashboard
                </Link>
                <Link
                  href="/system"
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg"
                >
                  Learn How It Works
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
