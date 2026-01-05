import React, { useState, useEffect } from 'react';

interface Disclosure {
  id: string;
  title: string;
  text: string;
  required: boolean;
}

interface ComplianceProps {
  userId: number;
  campaignId: number;
  minInvestment: number;
  onEligibilityCheck: (eligible: boolean, maxAmount: number) => void;
}

const theme = {
  primary: "#00D4AA",
  secondary: "#7B68EE",
  dark: "#1a1a2e",
  muted: "#64748b",
  warning: "#f59e0b",
  error: "#ef4444",
  success: "#10b981"
};

export function InvestmentCompliance({ userId, campaignId, minInvestment, onEligibilityCheck }: ComplianceProps) {
  const [step, setStep] = useState<'kyc' | 'disclosures' | 'complete'>('kyc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [kycStatus, setKycStatus] = useState<'not_submitted' | 'pending' | 'verified' | 'rejected'>('not_submitted');
  const [disclosures, setDisclosures] = useState<Disclosure[]>([]);
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [maxInvestment, setMaxInvestment] = useState(0);
  
  const [kycForm, setKycForm] = useState({
    fullName: '',
    dateOfBirth: '',
    annualIncome: '',
    netWorth: '',
    employmentStatus: '',
    investmentExperience: ''
  });

  useEffect(() => {
    checkEligibility();
    fetchDisclosures();
  }, [userId, campaignId]);

  const checkEligibility = async () => {
    try {
      const response = await fetch(
        `/api/land-acquisition/compliance?action=investment_eligibility&userId=${userId}&campaignId=${campaignId}`
      );
      const data = await response.json();
      
      if (data.success) {
        const { kycVerified, disclosuresAcknowledged, maxInvestment: max } = data.data;
        setMaxInvestment(max);
        
        if (kycVerified) {
          setKycStatus('verified');
          if (disclosuresAcknowledged) {
            setStep('complete');
            onEligibilityCheck(true, max);
          } else {
            setStep('disclosures');
          }
        }
      }
    } catch (err) {
      console.error('Error checking eligibility:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDisclosures = async () => {
    try {
      const response = await fetch('/api/land-acquisition/compliance?action=disclosures');
      const data = await response.json();
      if (data.success) {
        setDisclosures(data.data.disclosures);
      }
    } catch (err) {
      console.error('Error fetching disclosures:', err);
    }
  };

  const handleKycSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/land-acquisition/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_kyc',
          userId,
          ...kycForm,
          annualIncome: parseFloat(kycForm.annualIncome) || 0,
          netWorth: parseFloat(kycForm.netWorth) || 0
        })
      });

      const data = await response.json();
      if (data.success) {
        setKycStatus('pending');
        
        const limitResponse = await fetch('/api/land-acquisition/compliance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'calculate_limit',
            annualIncome: parseFloat(kycForm.annualIncome) || 0,
            netWorth: parseFloat(kycForm.netWorth) || 0,
            accredited: false
          })
        });
        const limitData = await limitResponse.json();
        if (limitData.success) {
          setMaxInvestment(limitData.data.maxInvestment);
        }
        
        setStep('disclosures');
      } else {
        setError(data.error || 'Failed to submit KYC');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisclosureAcknowledge = (id: string) => {
    setAcknowledged(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDisclosuresSubmit = async () => {
    const requiredIds = disclosures.filter(d => d.required).map(d => d.id);
    const missing = requiredIds.filter(id => !acknowledged.includes(id));
    
    if (missing.length > 0) {
      setError('Please acknowledge all required disclosures');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/land-acquisition/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge_disclosures',
          userId,
          campaignId,
          acknowledgedDisclosures: acknowledged
        })
      });

      const data = await response.json();
      if (data.success) {
        setStep('complete');
        onEligibilityCheck(true, maxInvestment);
      } else {
        setError(data.error || 'Failed to submit acknowledgments');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '15px',
    marginTop: '6px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: theme.dark,
    marginBottom: '4px'
  };

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{
          width: 40,
          height: 40,
          border: '3px solid #e2e8f0',
          borderTopColor: theme.primary,
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />
        <p style={{ marginTop: 16, color: theme.muted }}>Checking eligibility...</p>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div style={{
        padding: 24,
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 12,
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: theme.success,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff'
          }}>
            ✓
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Ready to Invest</h3>
            <p style={{ margin: 0, fontSize: 14, color: theme.muted }}>
              Verification complete - You may invest up to ${maxInvestment.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid #e2e8f0',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '20px 24px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>
          {step === 'kyc' ? 'Investor Verification' : 'Risk Disclosures'}
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: 14, color: theme.muted }}>
          {step === 'kyc' 
            ? 'Required by SEC Regulation CF for all investors'
            : 'Please read and acknowledge the following disclosures'
          }
        </p>
      </div>

      <div style={{ padding: 24 }}>
        {error && (
          <div style={{
            padding: 12,
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 8,
            color: theme.error,
            fontSize: 14,
            marginBottom: 20
          }}>
            {error}
          </div>
        )}

        {step === 'kyc' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Full Legal Name *</label>
              <input
                type="text"
                value={kycForm.fullName}
                onChange={e => setKycForm({ ...kycForm, fullName: e.target.value })}
                style={inputStyle}
                placeholder="John Smith"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Date of Birth *</label>
              <input
                type="date"
                value={kycForm.dateOfBirth}
                onChange={e => setKycForm({ ...kycForm, dateOfBirth: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Annual Income ($) *</label>
                <input
                  type="number"
                  value={kycForm.annualIncome}
                  onChange={e => setKycForm({ ...kycForm, annualIncome: e.target.value })}
                  style={inputStyle}
                  placeholder="75000"
                />
              </div>
              <div>
                <label style={labelStyle}>Net Worth ($) *</label>
                <input
                  type="number"
                  value={kycForm.netWorth}
                  onChange={e => setKycForm({ ...kycForm, netWorth: e.target.value })}
                  style={inputStyle}
                  placeholder="150000"
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Employment Status</label>
              <select
                value={kycForm.employmentStatus}
                onChange={e => setKycForm({ ...kycForm, employmentStatus: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select...</option>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-Employed</option>
                <option value="retired">Retired</option>
                <option value="student">Student</option>
                <option value="unemployed">Unemployed</option>
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Investment Experience</label>
              <select
                value={kycForm.investmentExperience}
                onChange={e => setKycForm({ ...kycForm, investmentExperience: e.target.value })}
                style={inputStyle}
              >
                <option value="">Select...</option>
                <option value="none">No experience</option>
                <option value="limited">Limited (1-2 years)</option>
                <option value="moderate">Moderate (3-5 years)</option>
                <option value="extensive">Extensive (5+ years)</option>
              </select>
            </div>

            <button
              onClick={handleKycSubmit}
              disabled={!kycForm.fullName || !kycForm.dateOfBirth || !kycForm.annualIncome || !kycForm.netWorth}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: (!kycForm.fullName || !kycForm.dateOfBirth || !kycForm.annualIncome || !kycForm.netWorth) 
                  ? '#ccc' : theme.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 16,
                cursor: (!kycForm.fullName || !kycForm.dateOfBirth || !kycForm.annualIncome || !kycForm.netWorth) 
                  ? 'not-allowed' : 'pointer'
              }}
            >
              Continue to Disclosures
            </button>
          </div>
        )}

        {step === 'disclosures' && (
          <div>
            {maxInvestment > 0 && (
              <div style={{
                padding: 16,
                background: 'rgba(0, 212, 170, 0.1)',
                borderRadius: 12,
                marginBottom: 24
              }}>
                <p style={{ margin: 0, fontSize: 14, color: theme.dark }}>
                  Based on your income and net worth, you may invest up to{' '}
                  <strong style={{ color: theme.primary }}>${maxInvestment.toLocaleString()}</strong>
                  {' '}per 12-month period under SEC Regulation CF.
                </p>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              {disclosures.map(disclosure => (
                <div
                  key={disclosure.id}
                  style={{
                    padding: 16,
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                    marginBottom: 12,
                    background: acknowledged.includes(disclosure.id) ? 'rgba(16, 185, 129, 0.05)' : '#fff'
                  }}
                >
                  <div style={{ display: 'flex', gap: 12 }}>
                    <input
                      type="checkbox"
                      id={disclosure.id}
                      checked={acknowledged.includes(disclosure.id)}
                      onChange={() => handleDisclosureAcknowledge(disclosure.id)}
                      style={{ marginTop: 4, width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <label htmlFor={disclosure.id} style={{ cursor: 'pointer', flex: 1 }}>
                      <h4 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600 }}>
                        {disclosure.title}
                        {disclosure.required && <span style={{ color: theme.error }}> *</span>}
                      </h4>
                      <p style={{ margin: 0, fontSize: 14, color: theme.muted, lineHeight: 1.5 }}>
                        {disclosure.text}
                      </p>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleDisclosuresSubmit}
              disabled={disclosures.filter(d => d.required).some(d => !acknowledged.includes(d.id))}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: disclosures.filter(d => d.required).some(d => !acknowledged.includes(d.id))
                  ? '#ccc' : theme.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 16,
                cursor: disclosures.filter(d => d.required).some(d => !acknowledged.includes(d.id))
                  ? 'not-allowed' : 'pointer'
              }}
            >
              I Understand - Proceed to Invest
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function InvestmentLimitCalculator() {
  const [income, setIncome] = useState('');
  const [netWorth, setNetWorth] = useState('');
  const [result, setResult] = useState<{
    maxInvestment: number;
    explanation: string;
  } | null>(null);

  const calculate = async () => {
    if (!income || !netWorth) return;

    try {
      const response = await fetch('/api/land-acquisition/compliance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'calculate_limit',
          annualIncome: parseFloat(income),
          netWorth: parseFloat(netWorth),
          accredited: false
        })
      });

      const data = await response.json();
      if (data.success) {
        setResult(data.data);
      }
    } catch (err) {
      console.error('Error calculating limit:', err);
    }
  };

  return (
    <div style={{
      padding: 24,
      background: '#f8fafc',
      borderRadius: 16,
      border: '1px solid #e2e8f0'
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 600 }}>
        Investment Limit Calculator
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: 14, color: theme.muted }}>
        SEC Regulation CF limits how much non-accredited investors can invest annually.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
            Annual Income
          </label>
          <input
            type="number"
            value={income}
            onChange={e => setIncome(e.target.value)}
            placeholder="$75,000"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 15
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
            Net Worth
          </label>
          <input
            type="number"
            value={netWorth}
            onChange={e => setNetWorth(e.target.value)}
            placeholder="$150,000"
            style={{
              width: '100%',
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              fontSize: 15
            }}
          />
        </div>
      </div>

      <button
        onClick={calculate}
        disabled={!income || !netWorth}
        style={{
          width: '100%',
          padding: '12px 20px',
          background: (!income || !netWorth) ? '#ccc' : theme.secondary,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: (!income || !netWorth) ? 'not-allowed' : 'pointer'
        }}
      >
        Calculate My Limit
      </button>

      {result && (
        <div style={{
          marginTop: 20,
          padding: 16,
          background: 'rgba(0, 212, 170, 0.1)',
          borderRadius: 12
        }}>
          <p style={{ margin: '0 0 8px', fontSize: 14, color: theme.muted }}>
            Your maximum annual investment limit:
          </p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: theme.primary }}>
            ${result.maxInvestment.toLocaleString()}
          </p>
          <p style={{ margin: '12px 0 0', fontSize: 13, color: theme.muted, lineHeight: 1.5 }}>
            {result.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
