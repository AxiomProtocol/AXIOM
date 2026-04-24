import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function LoanApplication() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    borrowerName: '',
    borrowerEmail: '',
    borrowerPhone: '',
    companyName: '',
    borrowerAddress: '',
    yearsExperience: '',
    projectsCompleted: '',
    propertyAddress: '',
    propertyCity: '',
    propertyState: '',
    propertyZip: '',
    propertyType: 'single_family',
    purchasePrice: '',
    rehabBudget: '',
    arvEstimate: '',
    loanAmountRequested: '',
    loanTermMonths: '12',
    acquisitionStatus: 'under_contract',
    rehabScope: '',
    exitStrategy: 'sell',
    timelineMonths: '',
    hasContractor: false,
    contractorName: '',
    additionalNotes: ''
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/realestate/loan-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setApplicationId(data.applicationId);
      } else {
        setError(data.error || 'Failed to submit application');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <DesignLawLayout>
        <Head>
          <title>Application Submitted | AXUSD Fix & Flip Fund</title>
        </Head>
        <div className="max-w-xl mx-auto text-center">
          <div className="mb-6">
            <span className="text-4xl text-dl-forest">✓</span>
          </div>
          <h1 className="font-dl-serif text-3xl text-dl-navy mb-4">
            Application Submitted!
          </h1>
          <p className="text-dl-gray mb-6 leading-relaxed">
            Thank you for your interest in the AXUSD Fix & Flip Lending Fund. Your application #{applicationId} has been received and is under review.
          </p>
          <div className="border border-dl-border bg-dl-bg-alt p-5 mb-8 text-left">
            <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-3">
              What Happens Next?
            </h3>
            <ul className="text-sm text-dl-gray leading-relaxed space-y-1">
              <li>Our team will review your application within 24-48 hours</li>
              <li>We may reach out for additional documentation</li>
              <li>Upon approval, you'll receive term sheet details</li>
              <li>Funding can close in as little as 7-10 days</li>
            </ul>
          </div>
          <Link
            href="/lending-fund"
            className="inline-block px-6 py-3 bg-dl-navy text-white font-medium"
          >
            Back to Fund Overview
          </Link>
        </div>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>Apply for Loan | AXUSD Fix & Flip Fund</title>
      </Head>

      <div className="mb-6">
        <div className="flex gap-4 items-center mb-4">
          <Link href="/lending-fund" className="text-sm text-dl-navy">
            ← Back to Fund
          </Link>
          <Link href="/lending-fund" className="text-sm text-dl-navy border border-dl-border bg-dl-bg-alt px-3 py-1">
            Read Fund Overview
          </Link>
        </div>
        <h1 className="font-dl-serif text-3xl text-dl-navy">
          Fix & Flip Loan Application
        </h1>
        <p className="text-dl-gray mt-2">
          Bridge financing for real estate investors • Up to 70% LTV • 12-month terms
        </p>
      </div>

      <div className="max-w-3xl">
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div
              key={s}
              className={`flex-1 h-1.5 ${step >= s ? 'bg-dl-navy' : 'bg-dl-bg-alt border border-dl-border'}`}
            />
          ))}
        </div>

        <div className="border border-dl-border bg-dl-bg p-8">
          {step === 1 && (
            <>
              <h2 className="font-dl-serif text-xl text-dl-navy mb-6">
                Step 1: Borrower Information
              </h2>
              <div className="grid gap-5">
                <div>
                  <label className="block text-sm font-medium text-dl-navy mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.borrowerName}
                    onChange={e => updateField('borrowerName', e.target.value)}
                    placeholder="John Smith"
                    className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Email *</label>
                    <input
                      type="email"
                      value={formData.borrowerEmail}
                      onChange={e => updateField('borrowerEmail', e.target.value)}
                      placeholder="john@example.com"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.borrowerPhone}
                      onChange={e => updateField('borrowerPhone', e.target.value)}
                      placeholder="(555) 123-4567"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dl-navy mb-1">Company Name (if applicable)</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={e => updateField('companyName', e.target.value)}
                    placeholder="ABC Investments LLC"
                    className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Years of RE Experience</label>
                    <select
                      value={formData.yearsExperience}
                      onChange={e => updateField('yearsExperience', e.target.value)}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="">Select...</option>
                      <option value="0">Less than 1 year</option>
                      <option value="1">1-2 years</option>
                      <option value="3">3-5 years</option>
                      <option value="6">6-10 years</option>
                      <option value="11">10+ years</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Projects Completed</label>
                    <select
                      value={formData.projectsCompleted}
                      onChange={e => updateField('projectsCompleted', e.target.value)}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="">Select...</option>
                      <option value="0">This is my first</option>
                      <option value="1">1-2 projects</option>
                      <option value="3">3-5 projects</option>
                      <option value="6">6-10 projects</option>
                      <option value="11">10+ projects</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-dl-serif text-xl text-dl-navy mb-6">
                Step 2: Property Details
              </h2>
              <div className="grid gap-5">
                <div>
                  <label className="block text-sm font-medium text-dl-navy mb-1">Property Address *</label>
                  <input
                    type="text"
                    value={formData.propertyAddress}
                    onChange={e => updateField('propertyAddress', e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-medium text-dl-navy mb-1">City</label>
                    <input
                      type="text"
                      value={formData.propertyCity}
                      onChange={e => updateField('propertyCity', e.target.value)}
                      placeholder="Atlanta"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">State</label>
                    <select
                      value={formData.propertyState}
                      onChange={e => updateField('propertyState', e.target.value)}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="">Select</option>
                      {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">ZIP</label>
                    <input
                      type="text"
                      value={formData.propertyZip}
                      onChange={e => updateField('propertyZip', e.target.value)}
                      placeholder="30301"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Property Type</label>
                    <select
                      value={formData.propertyType}
                      onChange={e => updateField('propertyType', e.target.value)}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="single_family">Single Family</option>
                      <option value="multi_family">Multi-Family (2-4 units)</option>
                      <option value="commercial">Commercial</option>
                      <option value="mixed_use">Mixed Use</option>
                      <option value="land">Land</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Acquisition Status</label>
                    <select
                      value={formData.acquisitionStatus}
                      onChange={e => updateField('acquisitionStatus', e.target.value)}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="under_contract">Under Contract</option>
                      <option value="owned">Already Owned</option>
                      <option value="searching">Still Searching</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dl-navy mb-1">Scope of Rehab Work</label>
                  <textarea
                    value={formData.rehabScope}
                    onChange={e => updateField('rehabScope', e.target.value)}
                    placeholder="Describe the renovation work planned (kitchen, bathrooms, roof, HVAC, etc.)"
                    className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono min-h-[100px] resize-y"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-dl-serif text-xl text-dl-navy mb-6">
                Step 3: Loan Details
              </h2>
              <div className="grid gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Purchase Price</label>
                    <input
                      type="number"
                      value={formData.purchasePrice}
                      onChange={e => updateField('purchasePrice', e.target.value)}
                      placeholder="150000"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Rehab Budget</label>
                    <input
                      type="number"
                      value={formData.rehabBudget}
                      onChange={e => updateField('rehabBudget', e.target.value)}
                      placeholder="50000"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">After Repair Value (ARV)</label>
                    <input
                      type="number"
                      value={formData.arvEstimate}
                      onChange={e => updateField('arvEstimate', e.target.value)}
                      placeholder="280000"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Loan Amount Requested *</label>
                    <input
                      type="number"
                      value={formData.loanAmountRequested}
                      onChange={e => updateField('loanAmountRequested', e.target.value)}
                      placeholder="140000"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    />
                  </div>
                </div>
                <div className="border border-dl-border bg-dl-bg-alt p-4 text-sm text-dl-gray">
                  <strong>Max LTV:</strong> 70% of ARV • <strong>Interest Rate:</strong> 14% • <strong>Origination:</strong> 2-3 points
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Loan Term</label>
                    <select
                      value={formData.loanTermMonths}
                      onChange={e => updateField('loanTermMonths', e.target.value)}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="6">6 months</option>
                      <option value="9">9 months</option>
                      <option value="12">12 months</option>
                      <option value="18">18 months</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Exit Strategy</label>
                    <select
                      value={formData.exitStrategy}
                      onChange={e => updateField('exitStrategy', e.target.value)}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="sell">Sell Property</option>
                      <option value="refinance">Refinance to Long-Term</option>
                      <option value="hold">Hold as Rental</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-dl-navy mb-1">
                    <input
                      type="checkbox"
                      checked={formData.hasContractor}
                      onChange={e => updateField('hasContractor', e.target.checked)}
                      className="w-5 h-5"
                    />
                    I have a contractor lined up
                  </label>
                  {formData.hasContractor && (
                    <input
                      type="text"
                      value={formData.contractorName}
                      onChange={e => updateField('contractorName', e.target.value)}
                      placeholder="Contractor name"
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono mt-2"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-dl-navy mb-1">Additional Notes</label>
                  <textarea
                    value={formData.additionalNotes}
                    onChange={e => updateField('additionalNotes', e.target.value)}
                    placeholder="Any additional information about your project..."
                    className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono min-h-[80px] resize-y"
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="border border-dl-error p-3 mt-5 text-sm text-dl-error">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex-1 px-4 py-3 bg-dl-bg-alt border border-dl-border text-dl-navy font-medium"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && (!formData.borrowerName || !formData.borrowerEmail)}
                className="flex-1 px-4 py-3 bg-dl-navy text-white font-medium disabled:opacity-50"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.propertyAddress || !formData.loanAmountRequested}
                className="flex-1 px-4 py-3 bg-dl-navy text-white font-medium disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>

        <div className="border border-dl-border bg-dl-bg p-5 mt-6">
          <h3 className="font-dl-serif text-base text-dl-navy font-medium mb-3">
            Loan Terms Summary
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Max LTV', value: '70%' },
              { label: 'Interest Rate', value: '14%' },
              { label: 'Origination', value: '2-3 pts' },
              { label: 'Term', value: 'Up to 18 mo' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-lg font-bold font-dl-mono text-dl-navy">{item.value}</div>
                <div className="text-xs text-dl-gray">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}
