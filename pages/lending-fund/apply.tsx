import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import MobileBottomNav from '../../components/lending-fund/MobileBottomNav';

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

  const inputStyle = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid #E5E7EB',
    fontSize: '15px',
    background: '#FFFFFF',
    color: '#1a1a2e',
    outline: 'none',
    minHeight: '48px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px'
  };

  if (submitted) {
    return (
      <>
        <Head>
          <title>Application Submitted | AXUSD Fix & Flip Fund</title>
        </Head>
        <div style={{ minHeight: '100vh', background: '#FFFFFF', padding: '40px 20px' }}>
          <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: '40px'
            }}>
              ✓
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginBottom: '16px' }}>
              Application Submitted!
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
              Thank you for your interest in the AXUSD Fix & Flip Lending Fund. Your application #{applicationId} has been received and is under review.
            </p>
            <div style={{
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '32px'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0F766E', marginBottom: '12px' }}>
                What Happens Next?
              </h3>
              <ul style={{ textAlign: 'left', color: '#115E59', fontSize: '14px', lineHeight: 1.8 }}>
                <li>Our team will review your application within 24-48 hours</li>
                <li>We may reach out for additional documentation</li>
                <li>Upon approval, you'll receive term sheet details</li>
                <li>Funding can close in as little as 7-10 days</li>
              </ul>
            </div>
            <Link
              href="/lending-fund"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: '#00D4AA',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              Back to Fund Overview
            </Link>
          </div>
        </div>
        <MobileBottomNav />
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Apply for Loan | AXUSD Fix & Flip Fund</title>
      </Head>
      <div style={{ minHeight: '100vh', background: '#F9FAFB', paddingBottom: '100px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
          padding: '32px 20px',
          color: '#FFFFFF'
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Link href="/lending-fund" style={{ color: '#99F6E4', fontSize: '14px', textDecoration: 'none' }}>
                ← Back to Fund
              </Link>
              <Link href="/lending-fund/borrower-guide" style={{ color: '#FFFFFF', fontSize: '14px', textDecoration: 'none', padding: '6px 12px', background: 'rgba(255,255,255,0.15)', borderRadius: '6px' }}>
                Read Borrower Guide
              </Link>
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginTop: '16px' }}>
              Fix & Flip Loan Application
            </h1>
            <p style={{ color: '#A7F3D0', marginTop: '8px' }}>
              Bridge financing for real estate investors • Up to 70% LTV • 12-month terms
            </p>
          </div>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            {[1, 2, 3].map(s => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: '6px',
                  borderRadius: '3px',
                  background: step >= s ? '#00D4AA' : '#E5E7EB',
                  transition: 'background 0.3s'
                }}
              />
            ))}
          </div>

          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            {step === 1 && (
              <>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a2e', marginBottom: '24px' }}>
                  Step 1: Borrower Information
                </h2>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>Full Name *</label>
                    <input
                      type="text"
                      value={formData.borrowerName}
                      onChange={e => updateField('borrowerName', e.target.value)}
                      placeholder="John Smith"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Email *</label>
                      <input
                        type="email"
                        value={formData.borrowerEmail}
                        onChange={e => updateField('borrowerEmail', e.target.value)}
                        placeholder="john@example.com"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input
                        type="tel"
                        value={formData.borrowerPhone}
                        onChange={e => updateField('borrowerPhone', e.target.value)}
                        placeholder="(555) 123-4567"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Company Name (if applicable)</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={e => updateField('companyName', e.target.value)}
                      placeholder="ABC Investments LLC"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Years of RE Experience</label>
                      <select
                        value={formData.yearsExperience}
                        onChange={e => updateField('yearsExperience', e.target.value)}
                        style={inputStyle}
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
                      <label style={labelStyle}>Projects Completed</label>
                      <select
                        value={formData.projectsCompleted}
                        onChange={e => updateField('projectsCompleted', e.target.value)}
                        style={inputStyle}
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
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a2e', marginBottom: '24px' }}>
                  Step 2: Property Details
                </h2>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div>
                    <label style={labelStyle}>Property Address *</label>
                    <input
                      type="text"
                      value={formData.propertyAddress}
                      onChange={e => updateField('propertyAddress', e.target.value)}
                      placeholder="123 Main Street"
                      style={inputStyle}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>City</label>
                      <input
                        type="text"
                        value={formData.propertyCity}
                        onChange={e => updateField('propertyCity', e.target.value)}
                        placeholder="Atlanta"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>State</label>
                      <select
                        value={formData.propertyState}
                        onChange={e => updateField('propertyState', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="">Select</option>
                        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>ZIP</label>
                      <input
                        type="text"
                        value={formData.propertyZip}
                        onChange={e => updateField('propertyZip', e.target.value)}
                        placeholder="30301"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Property Type</label>
                      <select
                        value={formData.propertyType}
                        onChange={e => updateField('propertyType', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="single_family">Single Family</option>
                        <option value="multi_family">Multi-Family (2-4 units)</option>
                        <option value="commercial">Commercial</option>
                        <option value="mixed_use">Mixed Use</option>
                        <option value="land">Land</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Acquisition Status</label>
                      <select
                        value={formData.acquisitionStatus}
                        onChange={e => updateField('acquisitionStatus', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="under_contract">Under Contract</option>
                        <option value="owned">Already Owned</option>
                        <option value="searching">Still Searching</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Scope of Rehab Work</label>
                    <textarea
                      value={formData.rehabScope}
                      onChange={e => updateField('rehabScope', e.target.value)}
                      placeholder="Describe the renovation work planned (kitchen, bathrooms, roof, HVAC, etc.)"
                      style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a2e', marginBottom: '24px' }}>
                  Step 3: Loan Details
                </h2>
                <div style={{ display: 'grid', gap: '20px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Purchase Price</label>
                      <input
                        type="number"
                        value={formData.purchasePrice}
                        onChange={e => updateField('purchasePrice', e.target.value)}
                        placeholder="150000"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Rehab Budget</label>
                      <input
                        type="number"
                        value={formData.rehabBudget}
                        onChange={e => updateField('rehabBudget', e.target.value)}
                        placeholder="50000"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>After Repair Value (ARV)</label>
                      <input
                        type="number"
                        value={formData.arvEstimate}
                        onChange={e => updateField('arvEstimate', e.target.value)}
                        placeholder="280000"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Loan Amount Requested *</label>
                      <input
                        type="number"
                        value={formData.loanAmountRequested}
                        onChange={e => updateField('loanAmountRequested', e.target.value)}
                        placeholder="140000"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div style={{
                    background: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    borderRadius: '10px',
                    padding: '16px'
                  }}>
                    <div style={{ fontSize: '13px', color: '#92400E' }}>
                      <strong>Max LTV:</strong> 70% of ARV • <strong>Interest Rate:</strong> 14% • <strong>Origination:</strong> 2-3 points
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={labelStyle}>Loan Term</label>
                      <select
                        value={formData.loanTermMonths}
                        onChange={e => updateField('loanTermMonths', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="6">6 months</option>
                        <option value="9">9 months</option>
                        <option value="12">12 months</option>
                        <option value="18">18 months</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Exit Strategy</label>
                      <select
                        value={formData.exitStrategy}
                        onChange={e => updateField('exitStrategy', e.target.value)}
                        style={inputStyle}
                      >
                        <option value="sell">Sell Property</option>
                        <option value="refinance">Refinance to Long-Term</option>
                        <option value="hold">Hold as Rental</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        checked={formData.hasContractor}
                        onChange={e => updateField('hasContractor', e.target.checked)}
                        style={{ width: '20px', height: '20px' }}
                      />
                      I have a contractor lined up
                    </label>
                    {formData.hasContractor && (
                      <input
                        type="text"
                        value={formData.contractorName}
                        onChange={e => updateField('contractorName', e.target.value)}
                        placeholder="Contractor name"
                        style={{ ...inputStyle, marginTop: '10px' }}
                      />
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Additional Notes</label>
                    <textarea
                      value={formData.additionalNotes}
                      onChange={e => updateField('additionalNotes', e.target.value)}
                      placeholder="Any additional information about your project..."
                      style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <div style={{
                marginTop: '20px',
                padding: '12px 16px',
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                color: '#DC2626',
                fontSize: '14px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: '#F3F4F6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '48px'
                  }}
                >
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && (!formData.borrowerName || !formData.borrowerEmail)}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: '#00D4AA',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: step === 1 && (!formData.borrowerName || !formData.borrowerEmail) ? 0.5 : 1,
                    minHeight: '48px'
                  }}
                >
                  Continue
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !formData.propertyAddress || !formData.loanAmountRequested}
                  style={{
                    flex: 1,
                    padding: '16px',
                    background: loading ? '#9CA3AF' : '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: !formData.propertyAddress || !formData.loanAmountRequested ? 0.5 : 1,
                    minHeight: '48px'
                  }}
                >
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>

          <div style={{
            marginTop: '24px',
            padding: '20px',
            background: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e', marginBottom: '12px' }}>
              Loan Terms Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Max LTV', value: '70%' },
                { label: 'Interest Rate', value: '14%' },
                { label: 'Origination', value: '2-3 pts' },
                { label: 'Term', value: 'Up to 18 mo' },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#00D4AA' }}>{item.value}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <MobileBottomNav />
      </div>
    </>
  );
}
