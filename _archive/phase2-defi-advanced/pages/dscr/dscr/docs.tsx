import React, { CSSProperties } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface Document {
  title: string;
  description: string;
  filename: string;
  required: boolean;
}

const documents: Document[] = [
  {
    title: 'Private Placement Memorandum (PPM)',
    description: 'Complete disclosure document covering fund terms, risks, investment strategy, and DSCR loan details',
    filename: 'AXUSD_DSCR_Fund_PPM.md',
    required: true
  },
  {
    title: 'Subscription Agreement',
    description: 'Investment commitment contract between investor and the DSCR Rental Lending Fund',
    filename: 'Subscription_Agreement.md',
    required: true
  },
  {
    title: 'Accredited Investor Questionnaire',
    description: 'Verification form to confirm accredited investor status (506(c) requirement)',
    filename: 'Accredited_Investor_Questionnaire.md',
    required: true
  },
  {
    title: 'Risk Disclosure Supplement',
    description: 'Detailed risk factors specific to DSCR lending, rental properties, and AXUSD stablecoin',
    filename: 'Risk_Disclosure_Supplement.md',
    required: true
  },
  {
    title: 'Form D Filing Guide',
    description: 'SEC filing information and requirements for the offering',
    filename: 'Form_D_Filing_Guide.md',
    required: false
  },
  {
    title: 'Launch Checklist',
    description: 'Complete action plan for fund launch, compliance, and operations',
    filename: 'LAUNCH_CHECKLIST.md',
    required: false
  }
];

const cardStyle: CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #E5E7EB'
};

export default function DSCRFundDocs() {
  const downloadDocument = async (filename: string) => {
    try {
      const response = await fetch(`/api/dscr/documents/${filename}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error downloading document:', error);
    }
  };

  return (
    <>
      <Head>
        <title>Fund Documents | DSCR Rental Lending Fund</title>
        <meta name="description" content="Access PPM, subscription agreement, and other legal documents for the AXUSD DSCR Rental Lending Fund." />
      </Head>

      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <Link href="/dscr/investor/dashboard" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Investor Dashboard
            </Link>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginTop: '16px' }}>
              DSCR Fund Documents
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', marginTop: '8px' }}>
              Review all legal documents before investing. Documents marked as required must be acknowledged and signed.
            </p>
          </div>

          <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%)', color: 'white', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#D4AF37' }}>Fund Overview</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Fund Name</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>Series B: DSCR Rental Lending</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Minimum Investment</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>$25,000 AXUSD</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Target Return</div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#D4AF37' }}>10-14% Annual</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Offering Type</div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>SEC Reg D 506(c)</div>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, background: '#FEF3C7', border: '1px solid #FCD34D', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '24px' }}>⚠️</div>
              <div>
                <h3 style={{ fontWeight: 600, marginBottom: '8px', color: '#92400E' }}>Important Notice</h3>
                <p style={{ fontSize: '14px', color: '#92400E', lineHeight: 1.6, margin: 0 }}>
                  This offering is available only to verified accredited investors under SEC Rule 506(c).
                  Please read all documents carefully before investing. Securities have not been registered
                  under the Securities Act of 1933 and involve substantial risk including possible loss of principal.
                  Target returns are not guaranteed.
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
            {documents.map((doc) => (
              <div
                key={doc.filename}
                style={{ ...cardStyle }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e', margin: 0 }}>{doc.title}</h3>
                      {doc.required && (
                        <span style={{ 
                          padding: '2px 8px', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          borderRadius: '4px', 
                          background: '#FEE2E2', 
                          color: '#DC2626' 
                        }}>
                          Required
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>{doc.description}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link
                      href={`/api/dscr/documents/${doc.filename}?view=true`}
                      target="_blank"
                      style={{
                        padding: '10px 20px',
                        background: '#F3F4F6',
                        color: '#374151',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 500,
                        textDecoration: 'none'
                      }}
                    >
                      View
                    </Link>
                    <button
                      onClick={() => downloadDocument(doc.filename)}
                      style={{
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={cardStyle}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px', color: '#1a1a2e' }}>Investment Process</h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {[
                { step: 1, title: 'Review Documents', description: 'Read the PPM and Risk Disclosure carefully', status: 'current' },
                { step: 2, title: 'Complete Questionnaire', description: 'Fill out the Accredited Investor Questionnaire with supporting documentation', status: 'pending' },
                { step: 3, title: 'Sign Subscription Agreement', description: 'Execute the investment commitment with your wallet signature', status: 'pending' },
                { step: 4, title: 'Transfer AXUSD', description: 'Send investment amount to the DSCRPoolVault contract', status: 'pending' },
                { step: 5, title: 'Receive Vault Shares', description: 'ERC-4626 shares are minted to your wallet representing your fund ownership', status: 'pending' }
              ].map(item => (
                <div key={item.step} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: item.status === 'current' ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' : '#E5E7EB',
                    color: item.status === 'current' ? '#FFFFFF' : '#6b7280',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {item.step}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a2e' }}>{item.title}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{item.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px' }}>
              <Link href="/dscr/onboarding" style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                Begin Investor Onboarding
              </Link>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#1a1a2e' }}>Smart Contract Information</h3>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px', lineHeight: 1.6 }}>
              The DSCR Rental Lending Fund operates through verified smart contracts on Arbitrum One. 
              All fund positions are represented as ERC-4626 vault shares, providing transparent on-chain tracking.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
              <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>DSCRPoolVault V2</div>
                <a 
                  href="https://arbiscan.io/address/0x5a09cb67518e6E28d8307D75174430939C044A7d"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#3B82F6', fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  0x5a09cb67518e6E28d8307D75174430939C044A7d
                </a>
              </div>
              <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '10px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>DSCRLoanManager</div>
                <a 
                  href="https://arbiscan.io/address/0x2657F688Af2fF327987dd7A8d4CCf1E781349052"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: '12px', color: '#3B82F6', fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  0x2657F688Af2fF327987dd7A8d4CCf1E781349052
                </a>
              </div>
            </div>
          </div>

          <div style={{ ...cardStyle, marginTop: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#1a1a2e' }}>Frequently Asked Questions</h3>
            
            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>What is a DSCR loan?</h4>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                  DSCR (Debt Service Coverage Ratio) loans are underwritten based on the property&apos;s rental income 
                  rather than the borrower&apos;s personal income. A DSCR of 1.20 means the property generates 20% more 
                  income than needed to cover the mortgage payment.
                </p>
              </div>
              
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>How are my returns generated?</h4>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                  Returns come from the interest payments made by borrowers on 30-year DSCR loans. With rates between 
                  7-9.5% APR and conservative underwriting (minimum 1.10 DSCR, maximum 75% LTV), the fund targets 
                  10-14% annual returns to investors.
                </p>
              </div>
              
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>What happens if I want to redeem early?</h4>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                  There is a 12-month lock-up period. After that, quarterly redemption requests are processed 
                  subject to available liquidity. Early redemption during the lock-up period incurs a 2% penalty.
                </p>
              </div>
              
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>What is AXUSD?</h4>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                  AXUSD is a USD-pegged stablecoin on the Arbitrum One blockchain. All fund investments and 
                  distributions are denominated in AXUSD, providing transparency, fast settlement, and 
                  programmable yield distribution.
                </p>
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px', color: '#6b7280', fontSize: '12px' }}>
            <p>Questions? Contact investors@axiomprotocol.app</p>
            <p style={{ marginTop: '8px' }}>Entity: Axiom Nexus LLC | State: Mississippi | Network: Arbitrum One</p>
          </div>
        </div>
      </div>
    </>
  );
}
