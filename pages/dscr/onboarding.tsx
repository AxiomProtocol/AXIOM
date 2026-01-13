import React, { useState, useEffect, CSSProperties } from 'react';
import Head from 'next/head';
import Link from 'next/link';

type OnboardingStep = 'connect' | 'personal' | 'accreditation' | 'documents' | 'signature' | 'complete';

interface FormData {
  legalName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isEntity: boolean;
  entityName: string;
  entityType: string;
  entityState: string;
  accreditationMethod: string;
  incomeAmount: string;
  netWorthAmount: string;
  professionalLicense: string;
  investmentAmount: string;
}

const ACCREDITATION_METHODS = [
  { id: 'income', label: 'Income', description: '$200K+ individual or $300K+ joint for past 2 years' },
  { id: 'net_worth', label: 'Net Worth', description: '$1M+ (excluding primary residence)' },
  { id: 'professional', label: 'Professional License', description: 'Hold Series 7, 65, or 82 license' },
  { id: 'minimum_investment', label: 'Minimum Investment', description: '$200K+ investment (2025 SEC Guidance)' },
  { id: 'entity', label: 'Entity Investor', description: 'Entity with $5M+ in assets' }
];

const DOCUMENT_LIST = [
  { id: 'ppm', name: 'Private Placement Memorandum', required: true },
  { id: 'risk_disclosure', name: 'Risk Disclosure Supplement', required: true },
  { id: 'subscription', name: 'Subscription Agreement', required: true }
];

const DOCUMENT_HASHES: Record<string, string> = {
  ppm: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
  risk_disclosure: 'b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3',
  subscription: 'c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4'
};

function generateNonce(): string {
  return crypto.randomUUID();
}

async function hashData(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function signMessage(message: string, walletAddress: string): Promise<string> {
  return (window as any).ethereum.request({
    method: 'personal_sign',
    params: [message, walletAddress]
  });
}

const cardStyle: CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid #E5E7EB',
  marginBottom: '20px'
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  fontSize: '14px',
  marginTop: '6px'
};

const labelStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
  display: 'block'
};

const buttonStyle: CSSProperties = {
  padding: '14px 28px',
  background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
  color: '#FFFFFF',
  borderRadius: '10px',
  border: 'none',
  fontSize: '16px',
  fontWeight: 600,
  cursor: 'pointer'
};

export default function DSCRInvestorOnboarding() {
  const [step, setStep] = useState<OnboardingStep>('connect');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    legalName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    isEntity: false,
    entityName: '',
    entityType: '',
    entityState: '',
    accreditationMethod: '',
    incomeAmount: '',
    netWorthAmount: '',
    professionalLicense: '',
    investmentAmount: ''
  });

  const [acknowledgedDocs, setAcknowledgedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkWallet();
  }, []);

  const checkWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setStep('personal');
        }
      } catch (err) {
        console.error('Wallet check error:', err);
      }
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setLoading(true);
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setStep('personal');
        }
      } catch (err) {
        setError('Failed to connect wallet');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please install MetaMask');
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const submitPersonalInfo = async () => {
    if (!formData.legalName || !formData.email) {
      setError('Legal name and email are required');
      return;
    }
    
    if (!walletAddress) {
      setError('Wallet not connected');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const timestamp = Date.now();
      const nonce = generateNonce();
      const normalizedWallet = walletAddress.toLowerCase();
      
      const dataForHash = {
        legalName: formData.legalName,
        email: formData.email,
        phone: formData.phone || '',
        dateOfBirth: formData.dateOfBirth || '',
        street: formData.street || '',
        city: formData.city || '',
        state: formData.state || '',
        zipCode: formData.zipCode || '',
        country: formData.country || 'USA',
        isEntity: !!formData.isEntity,
        entityName: formData.entityName || '',
        entityType: formData.entityType || '',
        entityState: formData.entityState || ''
      };
      const dataHash = await hashData(dataForHash);
      
      const message = `AXUSD DSCR Rental Lending Fund - Submit Personal Information

Wallet: ${normalizedWallet}
Name: ${formData.legalName}
Email: ${formData.email}
Data Hash: ${dataHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing, I confirm this information is accurate.`;
      
      const signature = await signMessage(message, walletAddress);
      
      const res = await fetch('/api/dscr/investor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'personal_info',
          walletAddress,
          signature,
          timestamp,
          nonce,
          data: formData
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to save personal info');
      
      setStep('accreditation');
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Signature rejected');
      } else {
        setError(err.message || 'Failed to save information');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitAccreditation = async () => {
    if (!formData.accreditationMethod) {
      setError('Please select an accreditation method');
      return;
    }
    
    if (!walletAddress) {
      setError('Wallet not connected');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const timestamp = Date.now();
      const nonce = generateNonce();
      const normalizedWallet = walletAddress.toLowerCase();
      
      const responsesHashData = {
        method: formData.accreditationMethod,
        incomeAmount: formData.incomeAmount || '',
        netWorthAmount: formData.netWorthAmount || '',
        professionalLicense: formData.professionalLicense || '',
        investmentAmount: formData.investmentAmount || ''
      };
      const responsesHash = await hashData(responsesHashData);
      
      const message = `AXUSD DSCR Rental Lending Fund - Accreditation Declaration

Wallet: ${normalizedWallet}
Method: ${formData.accreditationMethod}
Responses Hash: ${responsesHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

I declare under penalty of perjury that I qualify as an accredited investor under SEC Rule 501(a) and that the information provided is true and complete.`;
      
      const signature = await signMessage(message, walletAddress);
      
      const res = await fetch('/api/dscr/investor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'accreditation',
          walletAddress,
          signature,
          timestamp,
          nonce,
          data: {
            method: formData.accreditationMethod,
            incomeAmount: formData.incomeAmount,
            netWorthAmount: formData.netWorthAmount,
            professionalLicense: formData.professionalLicense,
            investmentAmount: formData.investmentAmount
          }
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit accreditation');
      
      setStep('documents');
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Signature rejected');
      } else {
        setError(err.message || 'Failed to submit accreditation');
      }
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeDocument = async (docId: string) => {
    if (!walletAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const timestamp = Date.now();
      const nonce = generateNonce();
      const normalizedWallet = walletAddress.toLowerCase();
      const docVersion = '1.0';
      const docHash = DOCUMENT_HASHES[docId] || 'unknown';
      
      const message = `AXUSD DSCR Rental Lending Fund - Document Acknowledgment

Wallet: ${normalizedWallet}
Document: ${docId}
Version: ${docVersion}
Document Hash: ${docHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

I have read and understood this document.`;
      
      const signature = await signMessage(message, walletAddress);
      
      const res = await fetch('/api/dscr/investor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'documents',
          walletAddress,
          signature,
          timestamp,
          nonce,
          data: {
            documentType: docId,
            documentVersion: docVersion,
            documentHash: docHash
          }
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to acknowledge document');
      
      setAcknowledgedDocs(prev => new Set(prev).add(docId));
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Signature rejected');
      } else {
        setError(err.message || 'Failed to acknowledge document');
      }
    } finally {
      setLoading(false);
    }
  };

  const signSubscription = async () => {
    const allDocsAcknowledged = DOCUMENT_LIST.filter(d => d.required)
      .every(d => acknowledgedDocs.has(d.id));
    
    if (!allDocsAcknowledged) {
      setError('Please acknowledge all required documents');
      return;
    }
    
    if (!walletAddress) {
      setError('Wallet not connected');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const timestamp = Date.now();
      const nonce = generateNonce();
      const normalizedWallet = walletAddress.toLowerCase();
      
      const message = `AXUSD DSCR Rental Lending Fund - Subscription Agreement

Wallet: ${normalizedWallet}
Subscription Amount: $${formData.investmentAmount || '25,000'}
Fund: Series B - DSCR Rental Lending Fund
Minimum Investment: $25,000
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing, I agree to subscribe for Membership Interests in the AXUSD DSCR Rental Lending Fund on the terms set forth in the Private Placement Memorandum and Subscription Agreement.

I represent that I am an accredited investor and have read and understood all fund documents.`;
      
      const signature = await signMessage(message, walletAddress);
      
      const res = await fetch('/api/dscr/investor/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'signature',
          walletAddress,
          signature,
          timestamp,
          nonce,
          data: {
            investmentAmount: formData.investmentAmount || '25000'
          }
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to sign subscription');
      
      setStep('complete');
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Signature rejected');
      } else {
        setError(err.message || 'Failed to sign subscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const allDocsAcknowledged = DOCUMENT_LIST.filter(d => d.required)
    .every(d => acknowledgedDocs.has(d.id));

  const stepNumber = step === 'connect' ? 1 : step === 'personal' ? 2 : step === 'accreditation' ? 3 : step === 'documents' ? 4 : 5;

  return (
    <>
      <Head>
        <title>Investor Onboarding | DSCR Rental Lending Fund</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#F8FAFC', padding: '20px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Link href="/dscr/investor/dashboard" style={{ color: '#6b7280', fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Dashboard
            </Link>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginTop: '16px' }}>
              DSCR Fund Investor Onboarding
            </h1>
            <p style={{ fontSize: '16px', color: '#6b7280', marginTop: '8px' }}>
              Complete these steps to invest in the AXUSD DSCR Rental Lending Fund
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
            {[1, 2, 3, 4, 5].map(num => (
              <div key={num} style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '14px',
                background: num <= stepNumber ? 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)' : '#E5E7EB',
                color: num <= stepNumber ? '#FFFFFF' : '#6b7280'
              }}>
                {num < stepNumber ? '✓' : num}
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '10px', padding: '16px', marginBottom: '20px', color: '#DC2626' }}>
              {error}
            </div>
          )}

          {step === 'connect' && (
            <div style={{ ...cardStyle, textAlign: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Connect Your Wallet</h2>
              <p style={{ color: '#6b7280', marginBottom: '24px' }}>
                Connect your Ethereum wallet to begin the onboarding process. Your wallet will be used for investment tracking and distributions.
              </p>
              <button onClick={connectWallet} disabled={loading} style={buttonStyle}>
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          )}

          {step === 'personal' && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '20px' }}>Personal Information</h2>
              
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Legal Name *</label>
                    <input style={inputStyle} value={formData.legalName} onChange={e => handleInputChange('legalName', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input style={inputStyle} type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} />
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={inputStyle} value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date of Birth</label>
                    <input style={inputStyle} type="date" value={formData.dateOfBirth} onChange={e => handleInputChange('dateOfBirth', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Street Address</label>
                  <input style={inputStyle} value={formData.street} onChange={e => handleInputChange('street', e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={labelStyle}>City</label>
                    <input style={inputStyle} value={formData.city} onChange={e => handleInputChange('city', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>State</label>
                    <input style={inputStyle} value={formData.state} onChange={e => handleInputChange('state', e.target.value)} />
                  </div>
                  <div>
                    <label style={labelStyle}>ZIP</label>
                    <input style={inputStyle} value={formData.zipCode} onChange={e => handleInputChange('zipCode', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '8px' }}>
                    <input type="checkbox" checked={formData.isEntity} onChange={e => handleInputChange('isEntity', e.target.checked)} />
                    <span style={{ fontSize: '14px' }}>Investing as a business entity (LLC, Corporation, Trust, IRA)</span>
                  </label>
                </div>

                {formData.isEntity && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', background: '#F9FAFB', padding: '16px', borderRadius: '10px' }}>
                    <div>
                      <label style={labelStyle}>Entity Name</label>
                      <input style={inputStyle} value={formData.entityName} onChange={e => handleInputChange('entityName', e.target.value)} />
                    </div>
                    <div>
                      <label style={labelStyle}>Entity Type</label>
                      <select style={inputStyle} value={formData.entityType} onChange={e => handleInputChange('entityType', e.target.value)}>
                        <option value="">Select...</option>
                        <option value="LLC">LLC</option>
                        <option value="Corporation">Corporation</option>
                        <option value="Trust">Trust</option>
                        <option value="Partnership">Partnership</option>
                        <option value="IRA">Self-Directed IRA</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>State of Formation</label>
                      <input style={inputStyle} value={formData.entityState} onChange={e => handleInputChange('entityState', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={submitPersonalInfo} disabled={loading || !formData.legalName || !formData.email} style={{
                  ...buttonStyle,
                  opacity: loading || !formData.legalName || !formData.email ? 0.5 : 1
                }}>
                  {loading ? 'Saving...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {step === 'accreditation' && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Accredited Investor Verification</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                SEC Rule 506(c) requires verification of accredited investor status. Select your qualification method below.
              </p>
              
              <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                {ACCREDITATION_METHODS.map(method => (
                  <div 
                    key={method.id}
                    onClick={() => handleInputChange('accreditationMethod', method.id)}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      border: formData.accreditationMethod === method.id ? '2px solid #D4AF37' : '1px solid #E5E7EB',
                      background: formData.accreditationMethod === method.id ? '#FFFBEB' : '#FFFFFF',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a2e' }}>{method.label}</div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>{method.description}</div>
                  </div>
                ))}
              </div>

              {formData.accreditationMethod === 'income' && (
                <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                  <label style={labelStyle}>Annual Income (approximate)</label>
                  <input style={inputStyle} type="number" placeholder="$200,000+" value={formData.incomeAmount} onChange={e => handleInputChange('incomeAmount', e.target.value)} />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>You will be asked to provide tax returns or W-2s for verification.</p>
                </div>
              )}

              {formData.accreditationMethod === 'net_worth' && (
                <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                  <label style={labelStyle}>Net Worth (excluding primary residence)</label>
                  <input style={inputStyle} type="number" placeholder="$1,000,000+" value={formData.netWorthAmount} onChange={e => handleInputChange('netWorthAmount', e.target.value)} />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>You will be asked to provide bank/brokerage statements for verification.</p>
                </div>
              )}

              {formData.accreditationMethod === 'professional' && (
                <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                  <label style={labelStyle}>Professional License Number</label>
                  <input style={inputStyle} placeholder="Series 7, 65, or 82" value={formData.professionalLicense} onChange={e => handleInputChange('professionalLicense', e.target.value)} />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Your license will be verified via FINRA BrokerCheck.</p>
                </div>
              )}

              {formData.accreditationMethod === 'minimum_investment' && (
                <div style={{ background: '#F9FAFB', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
                  <label style={labelStyle}>Investment Amount</label>
                  <input style={inputStyle} type="number" placeholder="$200,000+" value={formData.investmentAmount} onChange={e => handleInputChange('investmentAmount', e.target.value)} />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Per 2025 SEC guidance, investments of $200K+ may qualify with self-certification that funds are not financed.</p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
                <button onClick={() => setStep('personal')} style={{ ...buttonStyle, background: '#E5E7EB', color: '#374151' }}>Back</button>
                <button onClick={submitAccreditation} disabled={loading || !formData.accreditationMethod} style={{
                  ...buttonStyle,
                  opacity: loading || !formData.accreditationMethod ? 0.5 : 1
                }}>
                  {loading ? 'Submitting...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {step === 'documents' && (
            <div style={cardStyle}>
              <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Review & Acknowledge Documents</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Please review each document and sign to acknowledge you have read and understood its contents.
              </p>

              <div style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
                {DOCUMENT_LIST.map(doc => (
                  <div key={doc.id} style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: acknowledgedDocs.has(doc.id) ? '2px solid #22C55E' : '1px solid #E5E7EB',
                    background: acknowledgedDocs.has(doc.id) ? '#F0FDF4' : '#FFFFFF'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a2e' }}>
                          {doc.name} {doc.required && <span style={{ color: '#EF4444' }}>*</span>}
                        </div>
                        <Link href={`/api/dscr/documents/${doc.id === 'ppm' ? 'AXUSD_DSCR_Fund_PPM.md' : doc.id === 'risk_disclosure' ? 'Risk_Disclosure_Supplement.md' : 'Subscription_Agreement.md'}?view=true`} 
                          target="_blank" 
                          style={{ fontSize: '13px', color: '#3B82F6' }}
                        >
                          View Document →
                        </Link>
                      </div>
                      {acknowledgedDocs.has(doc.id) ? (
                        <div style={{ color: '#22C55E', fontWeight: 600, fontSize: '14px' }}>✓ Signed</div>
                      ) : (
                        <button onClick={() => acknowledgeDocument(doc.id)} disabled={loading} style={{
                          padding: '8px 16px',
                          background: '#1a1a2e',
                          color: '#FFFFFF',
                          borderRadius: '8px',
                          border: 'none',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}>
                          Sign to Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep('accreditation')} style={{ ...buttonStyle, background: '#E5E7EB', color: '#374151' }}>Back</button>
                <button onClick={signSubscription} disabled={loading || !allDocsAcknowledged} style={{
                  ...buttonStyle,
                  opacity: loading || !allDocsAcknowledged ? 0.5 : 1
                }}>
                  {loading ? 'Signing...' : 'Sign Subscription Agreement'}
                </button>
              </div>
            </div>
          )}

          {step === 'complete' && (
            <div style={{ ...cardStyle, textAlign: 'center' }}>
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
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a2e', marginBottom: '12px' }}>
                Onboarding Complete!
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
                Thank you for completing the investor onboarding for the AXUSD DSCR Rental Lending Fund.
                Our team will review your accreditation documentation and contact you within 2-3 business days.
              </p>

              <div style={{ background: '#F9FAFB', borderRadius: '10px', padding: '20px', textAlign: 'left', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>What Happens Next</h3>
                <ol style={{ margin: 0, paddingLeft: '20px', color: '#374151', lineHeight: 1.8 }}>
                  <li>We verify your accredited investor documentation</li>
                  <li>You receive final subscription confirmation</li>
                  <li>Transfer AXUSD to the DSCRPoolVault contract</li>
                  <li>Vault shares are issued to your wallet</li>
                  <li>Begin earning monthly distributions</li>
                </ol>
              </div>

              <div style={{ background: '#FEF3C7', borderRadius: '10px', padding: '16px', textAlign: 'left', marginBottom: '24px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#92400E', marginBottom: '8px' }}>Fund Deposit Address</h4>
                <code style={{ fontSize: '12px', color: '#92400E', wordBreak: 'break-all' }}>
                  DSCRPoolVault V2: 0x5a09cb67518e6E28d8307D75174430939C044A7d
                </code>
                <p style={{ fontSize: '12px', color: '#92400E', marginTop: '8px', marginBottom: 0 }}>
                  Network: Arbitrum One | Minimum: $25,000 AXUSD
                </p>
              </div>

              <Link href="/dscr/investor/dashboard" style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                color: '#FFFFFF',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: 600,
                textDecoration: 'none'
              }}>
                View Investor Dashboard
              </Link>
            </div>
          )}

          <div style={{ ...cardStyle, background: '#FFFBEB', border: '1px solid #FCD34D', marginTop: '24px' }}>
            <div style={{ fontSize: '13px', color: '#92400E', lineHeight: 1.6 }}>
              <strong>SEC Reg D 506(c) Notice:</strong> This investment is available to verified accredited investors only. 
              Securities have not been registered under the Securities Act of 1933. Investment involves substantial risk 
              including possible loss of principal. Target returns are not guaranteed. Past performance does not guarantee 
              future results.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
