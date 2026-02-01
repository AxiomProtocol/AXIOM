import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface TermSheetData {
  applicationNumber: string;
  borrower: {
    name: string;
    email: string;
    phone?: string;
    isEntity: boolean;
  };
  property: {
    address: string;
    type: string;
    units: number;
    appraisedValue: string;
  };
  loan: {
    amount: string;
    tier: string;
    interestRate: number;
    termMonths: number;
    monthlyPayment: string;
    dscr: number;
    ltv: number;
  };
  conditions: string[];
  status: string;
  expiresAt: string;
  generatedAt: string;
}

export default function TermSheetPage() {
  const router = useRouter();
  const { id } = router.query;
  const [termSheet, setTermSheet] = useState<TermSheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchTermSheet();
    }
  }, [id]);

  const fetchTermSheet = async () => {
    try {
      const res = await fetch(`/api/dscr/term-sheet/${id}`);
      const data = await res.json();
      if (res.ok) {
        setTermSheet(data.termSheet);
      } else {
        setError(data.error || 'Failed to load term sheet');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch(`/api/dscr/term-sheet/${id}`, { method: 'POST' });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TermSheet-${termSheet?.applicationNumber || id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        setError('Failed to download PDF');
      }
    } catch (err) {
      setError('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    border: '1px solid #E5E7EB'
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !termSheet) {
    return (
      <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', color: '#EF4444', marginBottom: '16px' }}>{error || 'Term sheet not found'}</div>
          <Link href="/lending-fund" style={{ color: '#D4AF37' }}>Return to Lending Fund</Link>
        </div>
      </div>
    );
  }

  const isExpired = new Date(termSheet.expiresAt) < new Date();

  return (
    <>
      <Head>
        <title>Term Sheet {termSheet.applicationNumber} | AXUSD DSCR Loan</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>AXUSD REAL ESTATE LENDING FUND</div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#D4AF37', marginBottom: '8px' }}>
              Conditional Term Sheet
            </h1>
            <div style={{ fontSize: '16px', color: '#6b7280' }}>Application #{termSheet.applicationNumber}</div>
          </div>

          {isExpired && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '16px', marginBottom: '20px', textAlign: 'center' }}>
              <div style={{ color: '#DC2626', fontWeight: 600 }}>This term sheet has expired</div>
              <div style={{ color: '#991B1B', fontSize: '14px' }}>Please contact us to request an updated term sheet.</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Generated</div>
              <div style={{ fontSize: '14px', fontWeight: 500 }}>{new Date(termSheet.generatedAt).toLocaleDateString()}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>Expires</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: isExpired ? '#DC2626' : '#22C55E' }}>
                {new Date(termSheet.expiresAt).toLocaleDateString()}
              </div>
            </div>
            <button onClick={downloadPDF} disabled={downloading} style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
              color: '#FFFFFF',
              borderRadius: '10px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: downloading ? 'wait' : 'pointer'
            }}>
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1a1a2e' }}>Borrower Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Name</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>{termSheet.borrower.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Email</div>
                <div style={{ fontSize: '15px' }}>{termSheet.borrower.email}</div>
              </div>
              {termSheet.borrower.phone && (
                <div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>Phone</div>
                  <div style={{ fontSize: '15px' }}>{termSheet.borrower.phone}</div>
                </div>
              )}
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1a1a2e' }}>Property Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Address</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>{termSheet.property.address}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Type</div>
                <div style={{ fontSize: '15px' }}>{termSheet.property.type?.toUpperCase()}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Units</div>
                <div style={{ fontSize: '15px' }}>{termSheet.property.units}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Appraised Value</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>${Number(termSheet.property.appraisedValue).toLocaleString()}</div>
              </div>
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1a1a2e' }}>Loan Terms</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Loan Amount</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#D4AF37' }}>${Number(termSheet.loan.amount).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Product Tier</div>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{termSheet.loan.tier}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Interest Rate</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>{(termSheet.loan.interestRate * 100).toFixed(2)}% Fixed</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Loan Term</div>
                <div style={{ fontSize: '15px' }}>{termSheet.loan.termMonths / 12} Years</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Monthly Payment</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>${Number(termSheet.loan.monthlyPayment).toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>DSCR</div>
                <div style={{ fontSize: '15px', fontWeight: 500, color: termSheet.loan.dscr >= 1.1 ? '#22C55E' : '#EF4444' }}>
                  {termSheet.loan.dscr.toFixed(2)}x
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>LTV</div>
                <div style={{ fontSize: '15px', fontWeight: 500 }}>{(termSheet.loan.ltv * 100).toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {termSheet.conditions && termSheet.conditions.length > 0 && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1a1a2e' }}>Conditions to Close</h2>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {termSheet.conditions.map((condition, i) => (
                  <li key={i} style={{ fontSize: '14px', marginBottom: '8px', color: '#374151' }}>{condition}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ ...cardStyle, background: '#FFFBEB', borderColor: '#FCD34D' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#92400E' }}>Funding Availability Notice</h3>
            <p style={{ fontSize: '13px', color: '#78350F', lineHeight: 1.6, margin: 0 }}>
              This term sheet is subject to availability of funds in the AXUSD DSCR Pool Vault. Funding is first-come, first-served. 
              The fund reserves the right to decline funding if vault liquidity is insufficient at time of closing.
            </p>
          </div>

          <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginTop: '32px', lineHeight: 1.6 }}>
            <p>This Conditional Term Sheet does not constitute a commitment to lend.</p>
            <p>All terms subject to underwriting, appraisal, and final credit approval.</p>
            <p style={{ marginTop: '16px' }}>
              <strong>AXUSD Real Estate Lending Fund</strong><br />
              Axiom Nexus LLC | Mississippi | SEC Reg D 506(c)
            </p>
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href="/lending-fund" style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: '#FFFFFF',
              color: '#6b7280',
              borderRadius: '10px',
              border: '1px solid #E5E7EB',
              fontSize: '16px',
              fontWeight: 600,
              textDecoration: 'none'
            }}>
              Return to Lending Fund
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
