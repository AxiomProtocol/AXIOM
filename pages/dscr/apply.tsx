import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const PROPERTY_TYPES = [
  { value: 'sfr', label: 'Single Family' },
  { value: 'duplex', label: 'Duplex' },
  { value: 'triplex', label: 'Triplex' },
  { value: 'fourplex', label: 'Fourplex' },
  { value: 'multifamily', label: 'Multifamily (5+)' },
  { value: 'condo', label: 'Condo/Townhome' }
];

const TIER_INFO = {
  low: { name: 'Low Risk', rate: '7%', ltv: '65%', dscr: '1.25x', color: '#22C55E' },
  standard: { name: 'Standard', rate: '8%', ltv: '70%', dscr: '1.20x', color: '#3B82F6' },
  yield: { name: 'Yield', rate: '9.5%', ltv: '75%', dscr: '1.10x', color: '#F59E0B' }
};

export default function DSCRLoanApplication() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [calculatedMetrics, setCalculatedMetrics] = useState<any>(null);
  const [error, setError] = useState('');

  const [borrower, setBorrower] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    isEntity: false,
    entityName: '',
    entityType: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    yearsExperience: '',
    propertiesOwned: '',
    totalUnitsOwned: ''
  });

  const [property, setProperty] = useState({
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    propertyType: 'sfr',
    yearBuilt: '',
    squareFeet: '',
    bedrooms: '',
    bathrooms: '',
    units: '1',
    purchasePrice: '',
    appraisedValue: '',
    monthlyRent: '',
    occupancyStatus: 'occupied',
    monthlyExpenses: '',
    propertyTaxes: '',
    insurance: '',
    hoaFees: '',
    managementFees: ''
  });

  const [loan, setLoan] = useState({
    loanAmountRequested: '',
    loanPurpose: 'purchase',
    termMonths: '360',
    tier: 'standard'
  });

  const updateBorrower = (field: string, value: any) => {
    setBorrower(prev => ({ ...prev, [field]: value }));
  };

  const updateProperty = (field: string, value: any) => {
    setProperty(prev => ({ ...prev, [field]: value }));
  };

  const updateLoan = (field: string, value: any) => {
    setLoan(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/dscr/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ borrower, property, loan })
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setApplicationNumber(data.applicationNumber);
        setCalculatedMetrics(data.calculatedMetrics);
      } else {
        setError(data.error || 'Failed to submit application');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid #E5E7EB',
    fontSize: '15px',
    background: '#FFFFFF',
    color: '#1a1a2e',
    outline: 'none',
    minHeight: '48px',
    boxSizing: 'border-box'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px'
  };

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    border: '1px solid #E5E7EB'
  };

  if (submitted) {
    return (
      <>
        <Head>
          <title>Application Submitted | DSCR Rental Loans</title>
        </Head>
        <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '40px 20px' }}>
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
            <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
              Your DSCR loan application has been received.
            </p>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#D4AF37', marginBottom: '24px' }}>
              Application #{applicationNumber}
            </p>
            
            {calculatedMetrics && (
              <div style={{ ...cardStyle, textAlign: 'left', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Preliminary Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Monthly Payment</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>${calculatedMetrics.monthlyPayment?.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>DSCR</div>
                    <div style={{ fontSize: '18px', fontWeight: 600, color: calculatedMetrics.dscr >= 1.1 ? '#22C55E' : '#EF4444' }}>
                      {calculatedMetrics.dscr?.toFixed(2)}x
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>LTV</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{(calculatedMetrics.ltv * 100).toFixed(1)}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Interest Rate</div>
                    <div style={{ fontSize: '18px', fontWeight: 600 }}>{(calculatedMetrics.interestRate * 100).toFixed(1)}%</div>
                  </div>
                </div>
              </div>
            )}

            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
              Our underwriting team will review your application and reach out within 1-2 business days. 
              If approved, you&apos;ll receive a conditional term sheet.
            </p>
            
            <Link href="/lending-fund" style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
              color: '#FFFFFF',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              Return to Lending Fund
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Apply for DSCR Loan | AXUSD Rental Lending Fund</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/lending-fund" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Lending Fund
            </Link>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginTop: '16px' }}>
              DSCR Rental Loan Application
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', marginTop: '8px' }}>
              30-year amortizing loans for rental investment properties
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
            {[1, 2, 3, 4].map(s => (
              <div key={s} style={{
                width: '80px',
                height: '6px',
                borderRadius: '3px',
                background: step >= s ? '#D4AF37' : '#E5E7EB'
              }} />
            ))}
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '16px', marginBottom: '20px', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {step === 1 && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Borrower Information</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input style={inputStyle} value={borrower.firstName} onChange={e => updateBorrower('firstName', e.target.value)} placeholder="John" />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input style={inputStyle} value={borrower.lastName} onChange={e => updateBorrower('lastName', e.target.value)} placeholder="Doe" />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} type="email" value={borrower.email} onChange={e => updateBorrower('email', e.target.value)} placeholder="john@example.com" />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={borrower.phone} onChange={e => updateBorrower('phone', e.target.value)} placeholder="(555) 123-4567" />
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={borrower.isEntity} onChange={e => updateBorrower('isEntity', e.target.checked)} />
                  <span style={{ fontSize: '14px' }}>Borrowing as a business entity (LLC, Corporation, etc.)</span>
                </label>
              </div>

              {borrower.isEntity && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={labelStyle}>Entity Name</label>
                    <input style={inputStyle} value={borrower.entityName} onChange={e => updateBorrower('entityName', e.target.value)} placeholder="ABC Properties LLC" />
                  </div>
                  <div>
                    <label style={labelStyle}>Entity Type</label>
                    <select style={inputStyle} value={borrower.entityType} onChange={e => updateBorrower('entityType', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="LLC">LLC</option>
                      <option value="Corporation">Corporation</option>
                      <option value="Trust">Trust</option>
                      <option value="Partnership">Partnership</option>
                    </select>
                  </div>
                </div>
              )}

              <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '16px' }}>Your Address</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Street Address</label>
                  <input style={inputStyle} value={borrower.streetAddress} onChange={e => updateBorrower('streetAddress', e.target.value)} placeholder="123 Main Street" />
                </div>
                <div>
                  <label style={labelStyle}>City</label>
                  <input style={inputStyle} value={borrower.city} onChange={e => updateBorrower('city', e.target.value)} placeholder="City" />
                </div>
                <div>
                  <label style={labelStyle}>State</label>
                  <select style={inputStyle} value={borrower.state} onChange={e => updateBorrower('state', e.target.value)}>
                    <option value="">Select...</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ZIP Code</label>
                  <input style={inputStyle} value={borrower.zipCode} onChange={e => updateBorrower('zipCode', e.target.value)} placeholder="12345" />
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '16px' }}>Real Estate Experience</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Years Experience</label>
                  <input style={inputStyle} type="number" value={borrower.yearsExperience} onChange={e => updateBorrower('yearsExperience', e.target.value)} placeholder="5" />
                </div>
                <div>
                  <label style={labelStyle}>Properties Owned</label>
                  <input style={inputStyle} type="number" value={borrower.propertiesOwned} onChange={e => updateBorrower('propertiesOwned', e.target.value)} placeholder="3" />
                </div>
                <div>
                  <label style={labelStyle}>Total Units Owned</label>
                  <input style={inputStyle} type="number" value={borrower.totalUnitsOwned} onChange={e => updateBorrower('totalUnitsOwned', e.target.value)} placeholder="10" />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep(2)} disabled={!borrower.firstName || !borrower.lastName || !borrower.email} style={{
                  padding: '14px 32px',
                  background: borrower.firstName && borrower.lastName && borrower.email ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' : '#E5E7EB',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: borrower.firstName && borrower.lastName && borrower.email ? 'pointer' : 'not-allowed'
                }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Property Information</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Property Address *</label>
                  <input style={inputStyle} value={property.streetAddress} onChange={e => updateProperty('streetAddress', e.target.value)} placeholder="456 Investment Ave" />
                </div>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input style={inputStyle} value={property.city} onChange={e => updateProperty('city', e.target.value)} placeholder="City" />
                </div>
                <div>
                  <label style={labelStyle}>State *</label>
                  <select style={inputStyle} value={property.state} onChange={e => updateProperty('state', e.target.value)}>
                    <option value="">Select...</option>
                    {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>ZIP Code *</label>
                  <input style={inputStyle} value={property.zipCode} onChange={e => updateProperty('zipCode', e.target.value)} placeholder="12345" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginTop: '20px' }}>
                <div>
                  <label style={labelStyle}>Property Type</label>
                  <select style={inputStyle} value={property.propertyType} onChange={e => updateProperty('propertyType', e.target.value)}>
                    {PROPERTY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Year Built</label>
                  <input style={inputStyle} type="number" value={property.yearBuilt} onChange={e => updateProperty('yearBuilt', e.target.value)} placeholder="1990" />
                </div>
                <div>
                  <label style={labelStyle}>Sq Ft</label>
                  <input style={inputStyle} type="number" value={property.squareFeet} onChange={e => updateProperty('squareFeet', e.target.value)} placeholder="1500" />
                </div>
                <div>
                  <label style={labelStyle}>Bedrooms</label>
                  <input style={inputStyle} type="number" value={property.bedrooms} onChange={e => updateProperty('bedrooms', e.target.value)} placeholder="3" />
                </div>
                <div>
                  <label style={labelStyle}>Bathrooms</label>
                  <input style={inputStyle} type="number" step="0.5" value={property.bathrooms} onChange={e => updateProperty('bathrooms', e.target.value)} placeholder="2" />
                </div>
                <div>
                  <label style={labelStyle}>Units</label>
                  <input style={inputStyle} type="number" value={property.units} onChange={e => updateProperty('units', e.target.value)} placeholder="1" />
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '16px' }}>Valuation</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Purchase Price *</label>
                  <input style={inputStyle} type="number" value={property.purchasePrice} onChange={e => updateProperty('purchasePrice', e.target.value)} placeholder="300000" />
                </div>
                <div>
                  <label style={labelStyle}>Appraised Value</label>
                  <input style={inputStyle} type="number" value={property.appraisedValue} onChange={e => updateProperty('appraisedValue', e.target.value)} placeholder="310000" />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} style={{
                  padding: '14px 32px',
                  background: '#FFFFFF',
                  color: '#6b7280',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Back
                </button>
                <button onClick={() => setStep(3)} disabled={!property.streetAddress || !property.city || !property.state || !property.zipCode || !property.purchasePrice} style={{
                  padding: '14px 32px',
                  background: property.streetAddress && property.city && property.state && property.zipCode && property.purchasePrice ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' : '#E5E7EB',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: property.streetAddress && property.city && property.state && property.zipCode && property.purchasePrice ? 'pointer' : 'not-allowed'
                }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Rental Income & Expenses</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Monthly Rent *</label>
                  <input style={inputStyle} type="number" value={property.monthlyRent} onChange={e => updateProperty('monthlyRent', e.target.value)} placeholder="2500" />
                </div>
                <div>
                  <label style={labelStyle}>Occupancy Status</label>
                  <select style={inputStyle} value={property.occupancyStatus} onChange={e => updateProperty('occupancyStatus', e.target.value)}>
                    <option value="occupied">Currently Occupied</option>
                    <option value="vacant">Vacant</option>
                    <option value="partially_occupied">Partially Occupied</option>
                  </select>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '16px' }}>Monthly Expenses (Excluding Principal & Interest)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Property Taxes</label>
                  <input style={inputStyle} type="number" value={property.propertyTaxes} onChange={e => updateProperty('propertyTaxes', e.target.value)} placeholder="250" />
                </div>
                <div>
                  <label style={labelStyle}>Insurance</label>
                  <input style={inputStyle} type="number" value={property.insurance} onChange={e => updateProperty('insurance', e.target.value)} placeholder="150" />
                </div>
                <div>
                  <label style={labelStyle}>HOA Fees</label>
                  <input style={inputStyle} type="number" value={property.hoaFees} onChange={e => updateProperty('hoaFees', e.target.value)} placeholder="0" />
                </div>
                <div>
                  <label style={labelStyle}>Management (10%)</label>
                  <input style={inputStyle} type="number" value={property.managementFees} onChange={e => updateProperty('managementFees', e.target.value)} placeholder="250" />
                </div>
                <div>
                  <label style={labelStyle}>Total Monthly Expenses *</label>
                  <input style={inputStyle} type="number" value={property.monthlyExpenses} onChange={e => updateProperty('monthlyExpenses', e.target.value)} placeholder="650" />
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(2)} style={{
                  padding: '14px 32px',
                  background: '#FFFFFF',
                  color: '#6b7280',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Back
                </button>
                <button onClick={() => setStep(4)} disabled={!property.monthlyRent || !property.monthlyExpenses} style={{
                  padding: '14px 32px',
                  background: property.monthlyRent && property.monthlyExpenses ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' : '#E5E7EB',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: property.monthlyRent && property.monthlyExpenses ? 'pointer' : 'not-allowed'
                }}>
                  Continue
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Loan Details</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Loan Amount Requested *</label>
                  <input style={inputStyle} type="number" value={loan.loanAmountRequested} onChange={e => updateLoan('loanAmountRequested', e.target.value)} placeholder="210000" />
                </div>
                <div>
                  <label style={labelStyle}>Loan Purpose</label>
                  <select style={inputStyle} value={loan.loanPurpose} onChange={e => updateLoan('loanPurpose', e.target.value)}>
                    <option value="purchase">Purchase</option>
                    <option value="refinance">Refinance</option>
                    <option value="cash_out_refi">Cash-Out Refinance</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Term</label>
                  <select style={inputStyle} value={loan.termMonths} onChange={e => updateLoan('termMonths', e.target.value)}>
                    <option value="360">30 Years</option>
                    <option value="180">15 Years</option>
                  </select>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '16px' }}>Select Your Tier</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {(['low', 'standard', 'yield'] as const).map(tier => (
                  <div 
                    key={tier}
                    onClick={() => updateLoan('tier', tier)}
                    style={{
                      padding: '20px',
                      borderRadius: '12px',
                      border: loan.tier === tier ? `2px solid ${TIER_INFO[tier].color}` : '1px solid #E5E7EB',
                      background: loan.tier === tier ? `${TIER_INFO[tier].color}10` : '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', color: TIER_INFO[tier].color }}>
                      {TIER_INFO[tier].name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      <div>Rate: {TIER_INFO[tier].rate}</div>
                      <div>Max LTV: {TIER_INFO[tier].ltv}</div>
                      <div>Min DSCR: {TIER_INFO[tier].dscr}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(3)} style={{
                  padding: '14px 32px',
                  background: '#FFFFFF',
                  color: '#6b7280',
                  borderRadius: '10px',
                  border: '1px solid #E5E7EB',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}>
                  Back
                </button>
                <button onClick={handleSubmit} disabled={loading || !loan.loanAmountRequested} style={{
                  padding: '14px 32px',
                  background: !loading && loan.loanAmountRequested ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' : '#E5E7EB',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: !loading && loan.loanAmountRequested ? 'pointer' : 'not-allowed'
                }}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
