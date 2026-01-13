import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import RebuildLayout from '../../components/axiomRebuild/RebuildLayout';

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
}

const ACCREDITATION_METHODS = [
  { id: 'income', label: 'Income', description: '$200K+ individual or $300K+ joint for past 2 years' },
  { id: 'net_worth', label: 'Net Worth', description: '$1M+ (excluding primary residence)' },
  { id: 'professional', label: 'Professional License', description: 'Hold Series 7, 65, or 82 license' },
  { id: 'entity', label: 'Entity Investor', description: 'Entity with $5M+ in assets' }
];

const DOCUMENT_LIST = [
  { id: 'ppm', name: 'Private Placement Memorandum', required: true },
  { id: 'risk_disclosure', name: 'Risk Disclosure Supplement', required: true },
  { id: 'subscription', name: 'Subscription Agreement', required: true }
];

const DOCUMENT_HASHES: Record<string, string> = {
  ppm: 'b8e7c9f4d2a6e8b3c5f7d9a2e4b6c8f0d2a4e6b8c0f2d4a6e8b0c2f4d6a8e0b2',
  risk_disclosure: 'c9f8e7d6b5a4c3e2f1d0b9a8c7e6f5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8',
  subscription: 'd0a9b8c7e6f5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9'
};

function generateNonce(): string {
  return crypto.randomUUID();
}

async function hashData(data: any): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

async function signMessage(message: string, walletAddress: string): Promise<string> {
  return (window as any).ethereum.request({
    method: 'personal_sign',
    params: [message, walletAddress]
  });
}

export default function InvestorOnboarding() {
  const [step, setStep] = useState<OnboardingStep>('connect');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [investorStatus, setInvestorStatus] = useState<any>(null);
  
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
    professionalLicense: ''
  });

  const [acknowledgedDocs, setAcknowledgedDocs] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkWallet();
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchInvestorStatus();
    }
  }, [walletAddress]);

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

  const fetchInvestorStatus = async () => {
    try {
      const res = await fetch(`/api/realestate/investor-onboarding?walletAddress=${walletAddress}`);
      const data = await res.json();
      setInvestorStatus(data);
      
      if (data.investor) {
        setFormData(prev => ({
          ...prev,
          legalName: data.investor.legalName || '',
          email: data.investor.email || ''
        }));
        
        if (data.investor.ppmAcknowledged) acknowledgedDocs.add('ppm');
        if (data.investor.riskDisclosureAcknowledged) acknowledgedDocs.add('risk_disclosure');
        if (data.investor.subscriptionSigned) acknowledgedDocs.add('subscription');
        setAcknowledgedDocs(new Set(acknowledgedDocs));
        
        if (data.status === 'verified' || data.status === 'under_review') {
          setStep('complete');
        } else if (data.investor.questionnaireCompleted) {
          setStep('documents');
        } else if (data.investor.legalName) {
          setStep('accreditation');
        }
      }
    } catch (err) {
      console.error('Error fetching investor status:', err);
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
      
      const message = `AXUSD Lending Fund - Submit Personal Information

Wallet: ${normalizedWallet}
Name: ${formData.legalName}
Email: ${formData.email}
Data Hash: ${dataHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

By signing, I confirm this information is accurate.`;
      
      const signature = await signMessage(message, walletAddress);
      
      const res = await fetch('/api/realestate/investor-onboarding', {
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
      
      const responses = {
        incomeAmount: formData.incomeAmount,
        netWorthAmount: formData.netWorthAmount,
        professionalLicense: formData.professionalLicense
      };
      
      const responsesHashData = {
        method: formData.accreditationMethod,
        incomeAmount: formData.incomeAmount || '',
        netWorthAmount: formData.netWorthAmount || '',
        professionalLicense: formData.professionalLicense || ''
      };
      const responsesHash = await hashData(responsesHashData);
      
      const message = `AXUSD Lending Fund - Accreditation Declaration

Wallet: ${normalizedWallet}
Method: ${formData.accreditationMethod}
Responses Hash: ${responsesHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

I declare under penalty of perjury that I qualify as an accredited investor under SEC Rule 501(a) and that the information provided is true and complete.`;
      
      const signature = await signMessage(message, walletAddress);
      
      const res = await fetch('/api/realestate/investor-onboarding', {
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
            responses
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
      
      const message = `AXUSD Lending Fund - Document Acknowledgment

Wallet: ${normalizedWallet}
Document: ${docId}
Version: ${docVersion}
Document Hash: ${docHash}
Timestamp: ${timestamp}
Nonce: ${nonce}

I have read and understood this document.`;
      
      const signature = await signMessage(message, walletAddress);
      
      const res = await fetch('/api/realestate/investor-onboarding', {
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
            documentVersion: docVersion
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
      
      const signatureMessage = `AXUSD Fix & Flip Lending Fund - Subscription Agreement

I, ${formData.legalName}, holder of wallet ${normalizedWallet}, hereby:

1. Confirm I am an accredited investor under SEC Rule 501(a)
2. Agree to the terms of the Subscription Agreement
3. Acknowledge all risk disclosures in the Private Placement Memorandum
4. Authorize my investment in the AXUSD Fix & Flip Lending Fund

Timestamp: ${timestamp}
Nonce: ${nonce}

This signature constitutes my legally binding electronic signature.`;
      
      const signature = await signMessage(signatureMessage, walletAddress);
      
      const res = await fetch('/api/realestate/investor-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: 'signature',
          walletAddress,
          signature,
          timestamp,
          nonce,
          data: {}
        })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit signature');
      
      setStep('complete');
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Signature rejected by user');
      } else {
        setError(err.message || 'Failed to sign subscription');
      }
    } finally {
      setLoading(false);
    }
  };

  const allDocsAcknowledged = DOCUMENT_LIST.filter(d => d.required)
    .every(d => acknowledgedDocs.has(d.id));

  return (
    <RebuildLayout>
      <Head>
        <title>Investor Onboarding | AXUSD Fix & Flip Lending Fund</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/lending-fund" className="text-yellow-400 hover:text-yellow-300 mb-4 inline-block">
              ← Back to Fund Overview
            </Link>
            <h1 className="text-3xl font-bold text-white">Investor Onboarding</h1>
            <p className="text-gray-400 mt-2">
              SEC Reg D 506(c) - Accredited Investor Verification Required
            </p>
          </div>

          <div className="flex gap-2 mb-8">
            {['connect', 'personal', 'accreditation', 'documents', 'signature', 'complete'].map((s, i) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${
                  step === s ? 'bg-yellow-500' :
                  ['connect', 'personal', 'accreditation', 'documents', 'signature', 'complete'].indexOf(step) > i
                    ? 'bg-green-500' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
            {step === 'connect' && (
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
                <p className="text-gray-400 mb-8">
                  Connect your Web3 wallet to begin the investor verification process.
                  Your wallet signature will authenticate each step.
                </p>
                <button
                  onClick={connectWallet}
                  disabled={loading}
                  className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              </div>
            )}

            {step === 'personal' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Personal Information</h2>
                <p className="text-gray-400 text-sm mb-4">
                  Your wallet will sign this information to prove ownership. Each signature includes a unique nonce to prevent replay attacks.
                </p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Legal Full Name *</label>
                      <input
                        type="text"
                        value={formData.legalName}
                        onChange={(e) => handleInputChange('legalName', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Email Address *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Phone</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-sm mb-1">Street Address</label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-sm mb-1">ZIP Code</label>
                      <input
                        type="text"
                        value={formData.zipCode}
                        onChange={(e) => handleInputChange('zipCode', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.isEntity}
                        onChange={(e) => handleInputChange('isEntity', e.target.checked)}
                        className="w-5 h-5 rounded border-gray-700 bg-gray-900 text-yellow-500 focus:ring-yellow-500"
                      />
                      <span className="text-white">I am investing as an entity (LLC, Trust, Corporation)</span>
                    </label>
                  </div>

                  {formData.isEntity && (
                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Entity Name</label>
                        <input
                          type="text"
                          value={formData.entityName}
                          onChange={(e) => handleInputChange('entityName', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">Entity Type</label>
                        <select
                          value={formData.entityType}
                          onChange={(e) => handleInputChange('entityType', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                        >
                          <option value="">Select type</option>
                          <option value="llc">LLC</option>
                          <option value="corporation">Corporation</option>
                          <option value="trust">Trust</option>
                          <option value="partnership">Partnership</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-400 text-sm mb-1">State of Formation</label>
                        <input
                          type="text"
                          value={formData.entityState}
                          onChange={(e) => handleInputChange('entityState', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:border-yellow-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={submitPersonalInfo}
                  disabled={loading || !formData.legalName || !formData.email}
                  className="w-full mt-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing & Saving...' : 'Sign & Continue to Accreditation'}
                </button>
              </div>
            )}

            {step === 'accreditation' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Accredited Investor Verification</h2>
                <p className="text-gray-400 mb-6">
                  Under SEC Rule 506(c), we must verify your accredited investor status.
                  Select the qualification that applies to you:
                </p>

                <div className="space-y-3 mb-8">
                  {ACCREDITATION_METHODS.map((method) => (
                    <label
                      key={method.id}
                      className={`block p-4 border rounded-lg cursor-pointer transition-all ${
                        formData.accreditationMethod === method.id
                          ? 'border-yellow-500 bg-yellow-500/10'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="accreditationMethod"
                          value={method.id}
                          checked={formData.accreditationMethod === method.id}
                          onChange={(e) => handleInputChange('accreditationMethod', e.target.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-white font-medium">{method.label}</div>
                          <div className="text-gray-400 text-sm">{method.description}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {formData.accreditationMethod === 'income' && (
                  <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
                    <label className="block text-gray-400 text-sm mb-2">
                      Annual Income (past 2 years average)
                    </label>
                    <select
                      value={formData.incomeAmount}
                      onChange={(e) => handleInputChange('incomeAmount', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="">Select income range</option>
                      <option value="200k-300k">$200,000 - $300,000</option>
                      <option value="300k-500k">$300,000 - $500,000</option>
                      <option value="500k-1m">$500,000 - $1,000,000</option>
                      <option value="1m+">$1,000,000+</option>
                    </select>
                  </div>
                )}

                {formData.accreditationMethod === 'net_worth' && (
                  <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
                    <label className="block text-gray-400 text-sm mb-2">
                      Net Worth (excluding primary residence)
                    </label>
                    <select
                      value={formData.netWorthAmount}
                      onChange={(e) => handleInputChange('netWorthAmount', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="">Select net worth range</option>
                      <option value="1m-2m">$1,000,000 - $2,000,000</option>
                      <option value="2m-5m">$2,000,000 - $5,000,000</option>
                      <option value="5m-10m">$5,000,000 - $10,000,000</option>
                      <option value="10m+">$10,000,000+</option>
                    </select>
                  </div>
                )}

                {formData.accreditationMethod === 'professional' && (
                  <div className="mb-6 p-4 bg-gray-900/50 rounded-lg">
                    <label className="block text-gray-400 text-sm mb-2">
                      Professional License Held
                    </label>
                    <select
                      value={formData.professionalLicense}
                      onChange={(e) => handleInputChange('professionalLicense', e.target.value)}
                      className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white"
                    >
                      <option value="">Select license</option>
                      <option value="series7">Series 7</option>
                      <option value="series65">Series 65</option>
                      <option value="series82">Series 82</option>
                    </select>
                  </div>
                )}

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
                  <p className="text-blue-400 text-sm">
                    Note: Under 506(c), your accreditation status will be verified by our compliance team.
                    You may be asked to provide supporting documentation such as tax returns, bank statements, 
                    or a letter from your CPA/attorney.
                  </p>
                </div>

                <button
                  onClick={submitAccreditation}
                  disabled={loading || !formData.accreditationMethod}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing & Submitting...' : 'Sign & Continue to Documents'}
                </button>
              </div>
            )}

            {step === 'documents' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Review & Acknowledge Documents</h2>
                <p className="text-gray-400 mb-6">
                  Please review each document and sign with your wallet to acknowledge.
                  Each acknowledgment is cryptographically linked to the specific document version.
                </p>

                <div className="space-y-4 mb-8">
                  {DOCUMENT_LIST.map((doc) => (
                    <div
                      key={doc.id}
                      className={`p-4 border rounded-lg ${
                        acknowledgedDocs.has(doc.id)
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium flex items-center gap-2">
                            {doc.name}
                            {doc.required && <span className="text-red-400 text-xs">Required</span>}
                          </div>
                          <div className="text-gray-500 text-xs mt-1 font-mono">
                            Hash: {DOCUMENT_HASHES[doc.id]?.slice(0, 16)}...
                          </div>
                          {acknowledgedDocs.has(doc.id) && (
                            <div className="text-green-400 text-sm mt-1">Signed & Acknowledged</div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/lending-fund/docs?doc=${doc.id}`}
                            target="_blank"
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                          >
                            View
                          </Link>
                          {!acknowledgedDocs.has(doc.id) && (
                            <button
                              onClick={() => acknowledgeDocument(doc.id)}
                              disabled={loading}
                              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                              Sign to Acknowledge
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setStep('signature')}
                  disabled={!allDocsAcknowledged}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Final Signature
                </button>
              </div>
            )}

            {step === 'signature' && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Sign Subscription Agreement</h2>
                <p className="text-gray-400 mb-6">
                  By signing below, you agree to the terms of the Subscription Agreement and
                  confirm that you meet the accredited investor requirements.
                </p>

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-8">
                  <h3 className="text-white font-bold mb-4">Subscription Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Investor</span>
                      <span className="text-white">{formData.legalName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Fund</span>
                      <span className="text-white">AXUSD Fix & Flip Lending Fund</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Wallet</span>
                      <span className="text-white font-mono text-xs">
                        {walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Accreditation</span>
                      <span className="text-yellow-400">Pending Verification</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-400 text-sm">
                    Your wallet signature serves as your legally binding electronic signature 
                    on the Subscription Agreement. The signature includes a unique nonce and 
                    timestamp for security and will be cryptographically verified.
                  </p>
                </div>

                <button
                  onClick={signSubscription}
                  disabled={loading}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50"
                >
                  {loading ? 'Signing...' : 'Sign Subscription Agreement'}
                </button>
              </div>
            )}

            {step === 'complete' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl text-green-400">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Onboarding Complete!</h2>
                <p className="text-gray-400 mb-8">
                  Your application has been submitted. Our compliance team will verify your 
                  accredited investor status within 2-3 business days. You will be notified 
                  once approved to invest.
                </p>
                <div className="flex gap-4 justify-center">
                  <Link
                    href="/lending-fund"
                    className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg"
                  >
                    Back to Fund
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </RebuildLayout>
  );
}
