import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';
import ParticipationDisclosurePanel from '../components/Disclosures/ParticipationDisclosurePanel';

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

      <div className="min-h-screen bg-gray-50">
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 text-white py-12">
          <div className="max-w-4xl mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Become a Member</h1>
            <p className="text-amber-100 text-lg">Join the Axiom Protocol Private Membership Association</p>
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
                          ? 'bg-green-500 text-white' 
                          : index === currentStepIndex 
                            ? 'bg-amber-600 text-white' 
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
                        index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                      }`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {currentStep === 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Private Membership Association Overview</h2>
              
              <div className="prose max-w-none">
                {PMA_OVERVIEW.split('\n\n').map((paragraph, i) => (
                  <p key={i} className="text-gray-700 mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4 my-6">
                <div className="bg-amber-50 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2">What You Can Do</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
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
                <Link href="/pma" className="text-amber-600 hover:underline">
                  Learn more about PMA
                </Link>
                <button
                  onClick={() => setCurrentStep('rules')}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Continue to Rules
                </button>
              </div>
            </div>
          )}

          {currentStep === 'rules' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
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

              <label className="flex items-start gap-3 cursor-pointer bg-amber-50 rounded-lg p-4 border border-amber-200">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
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
                  className={`font-semibold py-3 px-6 rounded-lg transition-colors ${
                    rulesAccepted
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Continue to Disclosures
                </button>
              </div>
            </div>
          )}

          {currentStep === 'disclosures' && (
            <div>
              <ParticipationDisclosurePanel
                onAccept={() => setCurrentStep('confirm')}
                onDecline={() => setCurrentStep('rules')}
              />
              
              <div className="mt-4">
                <button
                  onClick={() => setCurrentStep('rules')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Back to Rules
                </button>
              </div>
            </div>
          )}

          {currentStep === 'confirm' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Your Application</h2>
                <p className="text-gray-600">You have reviewed all requirements and are ready to apply for membership.</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>PMA Overview reviewed</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Membership rules accepted</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Participation disclosures acknowledged</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setCurrentStep('disclosures')}
                  className="text-gray-600 hover:text-gray-900 font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitMembership}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Your membership application has been received. You will be notified once your application is reviewed and approved.
              </p>

              <div className="bg-amber-50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
                <h4 className="font-semibold text-amber-900 mb-2">What happens next:</h4>
                <ul className="text-sm text-amber-800 space-y-1">
                  <li>Your application will be reviewed</li>
                  <li>You will receive an email notification</li>
                  <li>Once approved, you can access member features</li>
                </ul>
              </div>

              <div className="flex justify-center gap-4">
                <Link
                  href="/"
                  className="border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Return Home
                </Link>
                <Link
                  href="/participate"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
