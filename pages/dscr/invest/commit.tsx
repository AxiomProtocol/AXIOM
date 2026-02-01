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
        <meta name="description" content="Invest in a diversified portfolio of DSCR rental property loans. Target 10-14% annual returns backed by real estate. SEC Reg D 506(c) for accredited investors." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/lending-fund" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Lending Fund
            </Link>
            <h1 style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a2e', marginTop: '16px' }}>
              DSCR Rental Lending Fund
            </h1>
            <p style={{ fontSize: '18px', color: '#6b7280', marginTop: '12px', maxWidth: '600px', margin: '12px auto 0' }}>
              Earn passive income backed by a diversified portfolio of 30-year rental property loans
            </p>
          </div>

          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)', color: 'white', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px', color: '#D4AF37' }}>Fund Highlights</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '24px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37' }}>10-14%</div>
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Target Annual Return</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37' }}>$25K</div>
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Minimum Investment</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37' }}>Monthly</div>
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Distributions</div>
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37' }}>1st Lien</div>
                <div style={{ fontSize: '14px', color: '#9CA3AF' }}>Secured Position</div>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#1a1a2e' }}>How the Fund Works</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#D4AF3720', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>1</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '4px' }}>You Invest</div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>Your capital is pooled with other accredited investors in the DSCR Pool Vault.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#D4AF3720', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>2</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '4px' }}>We Originate</div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>Fund is deployed into carefully underwritten 30-year rental property loans.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#D4AF3720', color: '#D4AF37', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>3</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '4px' }}>Borrowers Repay</div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>Monthly loan payments include principal and interest, secured by 1st lien position.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#22C55E20', color: '#22C55E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>4</div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '4px' }}>You Earn</div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>Receive monthly distributions proportional to your share of the fund.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {Object.entries(TIER_INFO).map(([key, tier]) => (
              <div key={key} style={{ ...cardStyle, borderLeft: `4px solid ${key === 'low' ? '#22C55E' : key === 'standard' ? '#3B82F6' : '#F59E0B'}` }}>
                <div style={{ fontWeight: 600, color: key === 'low' ? '#22C55E' : key === 'standard' ? '#3B82F6' : '#F59E0B', marginBottom: '8px' }}>{tier.name}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', lineHeight: 1.6 }}>
                  <div>Interest Rate: {tier.rate}</div>
                  <div>Target Return: {tier.targetReturn}</div>
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>{tier.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...cardStyle, background: '#FFFBEB', borderColor: '#FCD34D', marginBottom: '24px' }}>
            <div style={{ fontSize: '14px', color: '#92400E' }}>
              <strong>SEC Reg D 506(c) Offering</strong> — This investment opportunity is available to accredited investors only. 
              Minimum investment: $25,000. All investors must complete accreditation verification. Target returns are based on 
              projected loan performance and are not guaranteed. Past performance does not guarantee future results.
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

          <div style={{ ...cardStyle, marginTop: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#1a1a2e' }}>Investor FAQ</h3>
            
            <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '8px' }}>
                What is an accredited investor?
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                An accredited investor is an individual with annual income exceeding $200,000 (or $300,000 with spouse) 
                for two consecutive years, or net worth over $1 million excluding primary residence. Entities must have 
                $5 million in assets. This status allows participation in private securities offerings.
              </p>
            </div>

            <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '8px' }}>
                How are returns generated?
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                Returns come from the interest payments made by borrowers on 30-year DSCR loans. With rates between 
                7-9.5% APR on the loans and low default rates due to conservative underwriting, the fund targets 
                10-14% annual returns after expenses and reserves.
              </p>
            </div>

            <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '8px' }}>
                What happens if a borrower defaults?
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                All loans are secured by first-lien position on the property with maximum 75% LTV. This means the 
                property value exceeds the loan balance by at least 25%. In case of default, the fund can foreclose 
                and recover the principal. We also maintain loss reserves to protect investor returns.
              </p>
            </div>

            <div style={{ borderBottom: '1px solid #E5E7EB', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '8px' }}>
                Can I redeem my investment early?
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                The fund has a 12-month lockup period. After that, quarterly redemption requests are processed 
                subject to available liquidity. Early redemption fees may apply. Full details are provided in the 
                Private Placement Memorandum (PPM).
              </p>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '15px', color: '#374151', marginBottom: '8px' }}>
                How is this different from REITs?
              </div>
              <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
                Unlike REITs that own and manage properties, this fund focuses on lending to property investors. 
                You earn fixed income from loan interest rather than variable returns from property appreciation 
                and rental income. This provides more predictable, bond-like returns with real estate backing.
              </p>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: '24px', background: '#F0FDF4', border: '1px solid #86EFAC' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#166534' }}>Need More Information?</h4>
            <p style={{ fontSize: '14px', color: '#166534', lineHeight: 1.6, margin: 0 }}>
              Schedule a call with our investor relations team to discuss the opportunity in detail. 
              We&apos;ll walk you through the fund structure, current portfolio, and answer any questions 
              before you commit. Email <strong>investors@axiomprotocol.app</strong> or submit the form above.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
