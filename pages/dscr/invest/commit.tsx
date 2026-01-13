import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const TIER_INFO = {
  low: { name: 'Low Risk Tier', rate: '7%', targetReturn: '10-12%', description: 'Conservative underwriting, lowest LTV' },
  standard: { name: 'Standard Tier', rate: '8%', targetReturn: '12-14%', description: 'Balanced risk/return profile' },
  yield: { name: 'Yield Tier', rate: '9.5%', targetReturn: '14-16%', description: 'Higher yield, higher LTV loans' }
};

export default function InvestorCommitment() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [commitmentId, setCommitmentId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    walletAddress: '',
    commitmentAmount: '',
    tierPreference: '',
    timelineMonths: '3',
    isAccredited: false,
    accreditationMethod: '',
    isEntity: false,
    entityName: '',
    entityType: '',
    investorNotes: '',
    referralCode: ''
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/dscr/investor/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        setCommitmentId(data.commitmentId);
      } else {
        setError(data.error || 'Failed to submit commitment');
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
          <title>Commitment Received | DSCR Fund</title>
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
              Commitment Received!
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', marginBottom: '8px' }}>
              Thank you for your interest in the AXUSD DSCR Rental Lending Fund.
            </p>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
              Your soft commitment of <strong>${Number(formData.commitmentAmount).toLocaleString()}</strong> has been registered.
              Our team will reach out within 2-3 business days to discuss next steps and complete the accreditation process.
            </p>
            <div style={{ ...cardStyle, textAlign: 'left', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>What Happens Next</h3>
              <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#374151', lineHeight: 1.8 }}>
                <li>We&apos;ll verify your accredited investor status</li>
                <li>You&apos;ll receive the Private Placement Memorandum (PPM)</li>
                <li>Complete subscription documents and fund your investment</li>
                <li>Start earning returns from day one of deployment</li>
              </ol>
            </div>
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
        <title>Invest in DSCR Fund | AXUSD Rental Lending</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/lending-fund" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Lending Fund
            </Link>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginTop: '16px' }}>
              Invest in DSCR Rental Fund
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', marginTop: '8px' }}>
              Register your investment commitment for 30-year amortizing rental property loans
            </p>
          </div>

          <div style={{ ...cardStyle, background: '#FFFBEB', borderColor: '#FCD34D', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: '#92400E' }}>
              <strong>SEC Reg D 506(c) Offering</strong> — This investment opportunity is available to accredited investors only. 
              Minimum investment: $25,000. Target returns are based on historical performance and are not guaranteed.
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '16px', marginBottom: '20px', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Investor Information</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input style={inputStyle} value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input style={inputStyle} value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input style={inputStyle} type="email" value={formData.email} onChange={e => updateField('email', e.target.value)} required />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input style={inputStyle} value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Wallet Address (for on-chain tracking)</label>
                  <input style={inputStyle} value={formData.walletAddress} onChange={e => updateField('walletAddress', e.target.value)} placeholder="0x..." />
                </div>
              </div>

              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.isEntity} onChange={e => updateField('isEntity', e.target.checked)} />
                  <span style={{ fontSize: '14px' }}>Investing as a business entity</span>
                </label>
              </div>

              {formData.isEntity && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '16px' }}>
                  <div>
                    <label style={labelStyle}>Entity Name</label>
                    <input style={inputStyle} value={formData.entityName} onChange={e => updateField('entityName', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Entity Type</label>
                    <select style={inputStyle} value={formData.entityType} onChange={e => updateField('entityType', e.target.value)}>
                      <option value="">Select...</option>
                      <option value="LLC">LLC</option>
                      <option value="Corporation">Corporation</option>
                      <option value="Trust">Trust</option>
                      <option value="Partnership">Partnership</option>
                      <option value="IRA">Self-Directed IRA</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Investment Details</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Commitment Amount (USD) *</label>
                  <input 
                    style={inputStyle} 
                    type="number" 
                    min="25000" 
                    step="1000"
                    value={formData.commitmentAmount} 
                    onChange={e => updateField('commitmentAmount', e.target.value)} 
                    placeholder="Minimum $25,000"
                    required 
                  />
                </div>
                <div>
                  <label style={labelStyle}>Investment Timeline</label>
                  <select style={inputStyle} value={formData.timelineMonths} onChange={e => updateField('timelineMonths', e.target.value)}>
                    <option value="1">Within 1 month</option>
                    <option value="3">Within 3 months</option>
                    <option value="6">Within 6 months</option>
                    <option value="12">Within 12 months</option>
                  </select>
                </div>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 600, marginTop: '24px', marginBottom: '16px' }}>Tier Preference (Optional)</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                {(['low', 'standard', 'yield'] as const).map(tier => (
                  <div 
                    key={tier}
                    onClick={() => updateField('tierPreference', formData.tierPreference === tier ? '' : tier)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: formData.tierPreference === tier ? '2px solid #D4AF37' : '1px solid #E5E7EB',
                      background: formData.tierPreference === tier ? '#FFFBEB' : '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px' }}>{TIER_INFO[tier].name}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                      Rate: {TIER_INFO[tier].rate} | Target: {TIER_INFO[tier].targetReturn}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>{TIER_INFO[tier].description}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Accreditation</h2>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={formData.isAccredited} 
                    onChange={e => updateField('isAccredited', e.target.checked)}
                    style={{ marginTop: '4px' }}
                  />
                  <span style={{ fontSize: '14px', lineHeight: 1.6 }}>
                    I certify that I am an &quot;accredited investor&quot; as defined in Rule 501 of Regulation D under the Securities Act of 1933. 
                    I understand that I will be required to provide verification of my accredited investor status.
                  </span>
                </label>
              </div>

              {formData.isAccredited && (
                <div>
                  <label style={labelStyle}>How do you qualify as an accredited investor?</label>
                  <select style={inputStyle} value={formData.accreditationMethod} onChange={e => updateField('accreditationMethod', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="income">Income ($200K+ individual / $300K+ joint for 2 years)</option>
                    <option value="net_worth">Net Worth ($1M+ excluding primary residence)</option>
                    <option value="professional">Licensed Professional (Series 7, 65, or 82)</option>
                    <option value="entity">Entity with $5M+ assets</option>
                    <option value="knowledgeable">Knowledgeable Employee of a private fund</option>
                  </select>
                </div>
              )}
            </div>

            <div style={cardStyle}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Additional Information</h2>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Investment Notes (optional)</label>
                  <textarea 
                    style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }}
                    value={formData.investorNotes}
                    onChange={e => updateField('investorNotes', e.target.value)}
                    placeholder="Any questions or specific requirements?"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Referral Code (if applicable)</label>
                  <input style={inputStyle} value={formData.referralCode} onChange={e => updateField('referralCode', e.target.value)} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading || !formData.firstName || !formData.lastName || !formData.email || !formData.commitmentAmount} style={{
              width: '100%',
              padding: '16px',
              background: !loading && formData.firstName && formData.lastName && formData.email && formData.commitmentAmount 
                ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' 
                : '#E5E7EB',
              color: '#FFFFFF',
              borderRadius: '12px',
              border: 'none',
              fontSize: '16px',
              fontWeight: 600,
              cursor: !loading && formData.firstName && formData.lastName && formData.email && formData.commitmentAmount ? 'pointer' : 'not-allowed'
            }}>
              {loading ? 'Submitting...' : 'Register Investment Commitment'}
            </button>

            <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '16px', lineHeight: 1.6 }}>
              By submitting, you agree to be contacted about this investment opportunity. 
              This is a non-binding soft commitment and does not obligate you to invest.
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
