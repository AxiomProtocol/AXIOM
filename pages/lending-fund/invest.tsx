import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { getVaultPosition, approveVault, depositToVault, PRODUCT_VAULTS } from '../../lib/web3/vaultService';
import { NETWORK_CONFIG } from '../../shared/contracts';

interface InvestmentStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface VaultPosition {
  shares: string;
  assetBalance: string;
  positionValue: string;
  allowance: string;
  minDeposit: string;
  needsApproval: boolean;
  decimals: number;
}

export default function InvestPage() {
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('100');
  const [axusdBalance, setAxusdBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [vaultPosition, setVaultPosition] = useState<VaultPosition | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'approving' | 'depositing' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const [steps, setSteps] = useState<InvestmentStep[]>([
    { id: 1, title: 'Connect Wallet', description: 'Connect your Web3 wallet', completed: false },
    { id: 2, title: 'Review Documents', description: 'Read and acknowledge PPM and risks', completed: false },
    { id: 3, title: 'Verify Accreditation', description: 'Complete accredited investor verification', completed: false },
    { id: 4, title: 'Set Amount', description: 'Choose investment amount', completed: false },
    { id: 5, title: 'Sign & Deposit', description: 'Sign subscription and deposit AXUSD', completed: false }
  ]);

  const [accreditationMethod, setAccreditationMethod] = useState<string>('');
  const [accreditationData, setAccreditationData] = useState({
    fullName: '',
    email: '',
    filingStatus: '',
    incomeThreshold: '',
    netWorthThreshold: '',
    entityAssetsThreshold: '',
    professionalCertification: '',
    selfCertified: false,
  });
  const [accreditationSubmitting, setAccreditationSubmitting] = useState(false);
  const [accreditationError, setAccreditationError] = useState('');

  const [acknowledgments, setAcknowledgments] = useState({
    readPPM: false,
    understandRisks: false,
    accreditedInvestor: false,
    noGuarantees: false
  });

  const { product } = router.query;
  const productKey = (product as string) || 'lending-fund';

  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          updateStep(1, true);
          setCurrentStep(2);
          fetchVaultPosition(accounts[0]);
        }
      } catch (error) {
        console.error('Wallet check error:', error);
      }
    }
  };

  const fetchVaultPosition = async (address: string) => {
    try {
      const position = await getVaultPosition(productKey, address);
      setVaultPosition(position);
      setAxusdBalance(position.assetBalance);
    } catch (error) {
      console.error('Failed to fetch vault position:', error);
    }
  };

  const handleApprove = async () => {
    if (!walletAddress) return;
    setTxStatus('approving');
    setTxError(null);
    try {
      const result = await approveVault(productKey, amount);
      setTxHash(result.txHash);
      await fetchVaultPosition(walletAddress);
      setTxStatus('idle');
    } catch (error: any) {
      setTxError(error.message || 'Approval failed');
      setTxStatus('error');
    }
  };

  const handleOnChainDeposit = async () => {
    if (!walletAddress) return;
    setTxStatus('depositing');
    setTxError(null);
    try {
      const result = await depositToVault(productKey, amount, walletAddress);
      setTxHash(result.txHash);
      setTxStatus('success');
      updateStep(5, true);
      await fetchVaultPosition(walletAddress);
    } catch (error: any) {
      setTxError(error.message || 'Deposit failed');
      setTxStatus('error');
    }
  };

  const connectWallet = async () => {
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        setLoading(true);
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletConnected(true);
          updateStep(1, true);
          setCurrentStep(2);
          fetchVaultPosition(accounts[0]);
        }
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      } finally {
        setLoading(false);
      }
    } else {
      alert('Please install MetaMask or another Web3 wallet');
    }
  };

  const checkNeedsApproval = () => {
    if (!vaultPosition) return true;
    const currentAmount = parseFloat(amount) || 0;
    const currentAllowance = parseFloat(vaultPosition.allowance) || 0;
    return currentAllowance < currentAmount;
  };

  const updateStep = (stepId: number, completed: boolean) => {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, completed } : s
    ));
  };

  const handleAcknowledgmentChange = (key: keyof typeof acknowledgments) => {
    setAcknowledgments(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allAcknowledged = Object.values(acknowledgments).every(Boolean);

  const completeDocumentReview = () => {
    if (allAcknowledged) {
      updateStep(2, true);
      setCurrentStep(3);
    }
  };

  const completeAccreditation = async () => {
    if (!accreditationMethod || !accreditationData.selfCertified) return;
    setAccreditationSubmitting(true);
    setAccreditationError('');
    try {
      const res = await fetch('/api/realestate/accreditation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          method: accreditationMethod,
          ...accreditationData,
          selfCertificationStatement: `I certify under penalty of perjury that I qualify as an accredited investor under SEC Rule 501(a) via the ${accreditationMethod} method.`,
        })
      });
      if (res.ok) {
        updateStep(3, true);
        setCurrentStep(4);
      } else {
        const data = await res.json();
        setAccreditationError(data.error || 'Failed to submit accreditation');
      }
    } catch {
      setAccreditationError('Network error. Please try again.');
    } finally {
      setAccreditationSubmitting(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    setAmount(num);
    if (parseInt(num) >= 100) {
      updateStep(4, true);
    } else {
      updateStep(4, false);
    }
  };

  const proceedToDeposit = () => {
    if (parseInt(amount) >= 100) {
      setCurrentStep(5);
    }
  };

  const formatUSD = (value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(num);
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Invest | AXUSD Fix & Flip Lending Fund</title>
        <meta name="description" content="Invest in the AXUSD Fix & Flip Lending Fund - Accredited investors only" />
      </Head>

      <div className="mb-8">
        <Link href="/lending-fund" className="text-sm text-dl-navy mb-4 inline-block">
          ← Back to Fund Overview
        </Link>
        <h1 className="font-dl-serif text-3xl text-dl-navy">Invest in the Fund</h1>
        <p className="mt-2 text-dl-gray">
          Complete the steps below to invest in the AXUSD Fix & Flip Lending Fund
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="p-6 sticky top-6 bg-dl-bg-alt border border-dl-border">
            <h3 className="font-dl-serif text-lg text-dl-navy font-bold mb-4">Investment Steps</h3>
            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 border ${
                    currentStep === step.id
                      ? 'bg-dl-bg-alt border-dl-navy'
                      : step.completed
                      ? 'bg-dl-bg-alt border-dl-border'
                      : 'bg-dl-bg border-dl-border'
                  }`}
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                      step.completed
                        ? 'bg-dl-forest text-white'
                        : currentStep === step.id
                        ? 'bg-dl-navy text-white'
                        : 'bg-dl-bg-alt text-dl-gray'
                    }`}
                  >
                    {step.completed ? '✓' : step.id}
                  </div>
                  <div>
                    <div
                      className={`font-medium text-sm ${
                        step.completed ? 'text-dl-forest' : currentStep === step.id ? 'text-dl-navy' : 'text-dl-gray'
                      }`}
                    >
                      {step.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {walletConnected && (
              <div className="mt-6 pt-6 border-t border-dl-border">
                <div className="text-sm mb-1 text-dl-gray">Your AXUSD Balance</div>
                <div className="text-xl font-bold text-dl-navy">{formatUSD(axusdBalance)}</div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-dl-border">
              <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-3">LP Onboarding Status</h4>
              <div className="space-y-2">
                {[
                  { label: 'Wallet Connected', done: walletConnected },
                  { label: 'Documents Reviewed', done: steps[1]?.completed || false },
                  { label: 'Accreditation Verified', done: steps[2]?.completed || false },
                  { label: 'Subscription Signed', done: steps[3]?.completed || false },
                  { label: 'Deposited', done: steps[4]?.completed || false },
                ].map((stage, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${stage.done ? 'bg-green-500' : 'bg-dl-border'}`} />
                    <span className={stage.done ? 'text-dl-navy' : 'text-dl-gray'}>{stage.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {currentStep === 1 && !walletConnected && (
            <StepCard title="Step 1: Connect Your Wallet">
              <p className="mb-6 text-dl-gray">
                Connect your Web3 wallet to begin the investment process. Make sure you're connected to Arbitrum One network.
              </p>
              <button
                onClick={connectWallet}
                disabled={loading}
                className="w-full py-4 bg-dl-navy text-white font-medium disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </StepCard>
          )}

          {currentStep === 2 && (
            <StepCard title="Step 2: Review Documents">
              <p className="mb-6 text-dl-gray">
                Please review the following documents and confirm your understanding:
              </p>

              <div className="space-y-4 mb-6">
                <Link
                  href="/lending-fund"
                  className="block p-4 bg-dl-bg border border-dl-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-dl-navy">Private Placement Memorandum</div>
                      <div className="text-sm text-dl-gray">Complete fund disclosure document</div>
                    </div>
                    <span className="text-dl-navy">View →</span>
                  </div>
                </Link>

                <Link
                  href="/lending-fund"
                  className="block p-4 bg-dl-bg border border-dl-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-dl-navy">Risk Disclosure Supplement</div>
                      <div className="text-sm text-dl-gray">Detailed risk factors</div>
                    </div>
                    <span className="text-dl-navy">View →</span>
                  </div>
                </Link>
              </div>

              <div className="space-y-3 mb-6">
                <AcknowledgmentCheckbox
                  checked={acknowledgments.readPPM}
                  onChange={() => handleAcknowledgmentChange('readPPM')}
                  label="I have read and understood the Private Placement Memorandum"
                />
                <AcknowledgmentCheckbox
                  checked={acknowledgments.understandRisks}
                  onChange={() => handleAcknowledgmentChange('understandRisks')}
                  label="I understand the risks involved, including possible loss of my entire investment"
                />
                <AcknowledgmentCheckbox
                  checked={acknowledgments.accreditedInvestor}
                  onChange={() => handleAcknowledgmentChange('accreditedInvestor')}
                  label="I am an accredited investor as defined by SEC Rule 501(a)"
                />
                <AcknowledgmentCheckbox
                  checked={acknowledgments.noGuarantees}
                  onChange={() => handleAcknowledgmentChange('noGuarantees')}
                  label="I understand there are no guarantees of returns"
                />
              </div>

              <button
                onClick={completeDocumentReview}
                disabled={!allAcknowledged}
                className="w-full py-4 bg-dl-navy text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue to Verification
              </button>
            </StepCard>
          )}

          {currentStep === 3 && (
            <StepCard title="Step 3: Accredited Investor Verification">
              <p className="mb-6 text-dl-gray">
                Under SEC Rule 506(c), we must verify your accredited investor status per SEC Rule 501(a).
                Please select your qualification method and complete the questionnaire.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-dl-navy mb-2">Your Name</label>
                <input
                  type="text"
                  value={accreditationData.fullName}
                  onChange={e => setAccreditationData(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Full legal name"
                  className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-dl-navy mb-2">Email Address</label>
                <input
                  type="email"
                  value={accreditationData.email}
                  onChange={e => setAccreditationData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-dl-navy mb-3">Qualification Method (SEC Rule 501)</label>
                <div className="space-y-3">
                  {[
                    { value: 'income', label: 'Income Test', desc: 'Individual income >$200K (or $300K joint) for each of the last 2 years with expectation of the same' },
                    { value: 'net-worth', label: 'Net Worth Test', desc: 'Individual or joint net worth >$1M, excluding primary residence' },
                    { value: 'professional', label: 'Professional Certification', desc: 'Hold a Series 7, Series 65, or Series 82 license in good standing' },
                    { value: 'entity', label: 'Entity Qualification', desc: 'Entity with >$5M in assets, or entity where all equity owners are accredited investors' },
                  ].map(opt => (
                    <label
                      key={opt.value}
                      className={`block p-4 border cursor-pointer ${
                        accreditationMethod === opt.value
                          ? 'border-dl-navy bg-dl-bg-alt'
                          : 'border-dl-border bg-dl-bg'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="accreditationMethod"
                          value={opt.value}
                          checked={accreditationMethod === opt.value}
                          onChange={() => setAccreditationMethod(opt.value)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-medium text-dl-navy text-sm">{opt.label}</div>
                          <div className="text-xs text-dl-gray mt-1">{opt.desc}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {accreditationMethod === 'income' && (
                <div className="border border-dl-border bg-dl-bg p-4 mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Filing Status</label>
                    <select
                      value={accreditationData.filingStatus}
                      onChange={e => setAccreditationData(prev => ({ ...prev, filingStatus: e.target.value }))}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="">Select...</option>
                      <option value="individual">Individual</option>
                      <option value="joint">Joint with Spouse/Partner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">
                      {accreditationData.filingStatus === 'joint' ? 'Joint Income for Each of Past 2 Years' : 'Individual Income for Each of Past 2 Years'}
                    </label>
                    <select
                      value={accreditationData.incomeThreshold}
                      onChange={e => setAccreditationData(prev => ({ ...prev, incomeThreshold: e.target.value }))}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="">Select income range...</option>
                      {accreditationData.filingStatus === 'joint' ? (
                        <>
                          <option value="under_300k">Under $300,000</option>
                          <option value="300k_500k">$300,000 - $500,000</option>
                          <option value="500k_1m">$500,000 - $1,000,000</option>
                          <option value="over_1m">Over $1,000,000</option>
                        </>
                      ) : (
                        <>
                          <option value="under_200k">Under $200,000</option>
                          <option value="200k_300k">$200,000 - $300,000</option>
                          <option value="300k_500k">$300,000 - $500,000</option>
                          <option value="500k_1m">$500,000 - $1,000,000</option>
                          <option value="over_1m">Over $1,000,000</option>
                        </>
                      )}
                    </select>
                  </div>
                  {accreditationData.incomeThreshold === 'under_200k' || accreditationData.incomeThreshold === 'under_300k' ? (
                    <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-800">
                      Based on your selection, you may not meet the income threshold for accredited investor status under SEC Rule 501(a).
                    </div>
                  ) : null}
                </div>
              )}

              {accreditationMethod === 'net-worth' && (
                <div className="border border-dl-border bg-dl-bg p-4 mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Net Worth (excluding primary residence)</label>
                    <select
                      value={accreditationData.netWorthThreshold}
                      onChange={e => setAccreditationData(prev => ({ ...prev, netWorthThreshold: e.target.value }))}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="">Select net worth range...</option>
                      <option value="under_1m">Under $1,000,000</option>
                      <option value="1m_2m">$1,000,000 - $2,000,000</option>
                      <option value="2m_5m">$2,000,000 - $5,000,000</option>
                      <option value="5m_10m">$5,000,000 - $10,000,000</option>
                      <option value="over_10m">Over $10,000,000</option>
                    </select>
                  </div>
                  {accreditationData.netWorthThreshold === 'under_1m' && (
                    <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-800">
                      Based on your selection, you may not meet the net worth threshold for accredited investor status under SEC Rule 501(a).
                    </div>
                  )}
                </div>
              )}

              {accreditationMethod === 'professional' && (
                <div className="border border-dl-border bg-dl-bg p-4 mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Professional Certification Held</label>
                    <select
                      value={accreditationData.professionalCertification}
                      onChange={e => setAccreditationData(prev => ({ ...prev, professionalCertification: e.target.value }))}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="">Select certification...</option>
                      <option value="series_7">Series 7 (General Securities Representative)</option>
                      <option value="series_65">Series 65 (Investment Adviser Representative)</option>
                      <option value="series_82">Series 82 (Private Securities Offerings Representative)</option>
                      <option value="none">None of the above</option>
                    </select>
                  </div>
                  {accreditationData.professionalCertification === 'none' && (
                    <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-800">
                      You must hold one of the listed certifications to qualify under the professional certification method.
                    </div>
                  )}
                </div>
              )}

              {accreditationMethod === 'entity' && (
                <div className="border border-dl-border bg-dl-bg p-4 mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-dl-navy mb-1">Entity Total Assets</label>
                    <select
                      value={accreditationData.entityAssetsThreshold}
                      onChange={e => setAccreditationData(prev => ({ ...prev, entityAssetsThreshold: e.target.value }))}
                      className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                    >
                      <option value="">Select total assets...</option>
                      <option value="under_5m">Under $5,000,000</option>
                      <option value="5m_10m">$5,000,000 - $10,000,000</option>
                      <option value="10m_50m">$10,000,000 - $50,000,000</option>
                      <option value="over_50m">Over $50,000,000</option>
                      <option value="all_owners_accredited">All equity owners are individually accredited</option>
                    </select>
                  </div>
                  {accreditationData.entityAssetsThreshold === 'under_5m' && (
                    <div className="p-3 bg-red-50 border border-red-200 text-sm text-red-800">
                      Entity must have over $5M in assets or all equity owners must be individually accredited.
                    </div>
                  )}
                </div>
              )}

              {accreditationMethod && (
                <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={accreditationData.selfCertified}
                      onChange={e => setAccreditationData(prev => ({ ...prev, selfCertified: e.target.checked }))}
                      className="w-5 h-5 mt-0.5"
                    />
                    <span className="text-sm text-dl-navy leading-relaxed">
                      I certify under penalty of perjury that the information provided is true and correct,
                      and that I qualify as an accredited investor under SEC Rule 501(a) of Regulation D.
                      I understand that this offering is made in reliance on an exemption from registration
                      under Section 4(a)(2) of the Securities Act of 1933 and Rule 506(c) of Regulation D.
                    </span>
                  </label>
                </div>
              )}

              {accreditationError && (
                <div className="border border-red-300 bg-red-50 p-3 mb-4 text-sm text-red-800">
                  {accreditationError}
                </div>
              )}

              <button
                onClick={completeAccreditation}
                disabled={!accreditationMethod || !accreditationData.selfCertified || accreditationSubmitting}
                className="w-full py-4 bg-dl-navy text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {accreditationSubmitting ? 'Submitting...' : 'Submit Accreditation & Continue'}
              </button>
            </StepCard>
          )}

          {currentStep === 4 && (
            <StepCard title="Step 4: Investment Amount">
              <p className="mb-6 text-dl-gray">
                Enter the amount you wish to invest. Minimum investment is {formatUSD(vaultPosition?.minDeposit || '100')} AXUSD.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-dl-navy mb-1">Investment Amount (AXUSD)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-dl-gray">$</span>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="w-full py-4 pl-10 pr-4 text-2xl font-bold border border-dl-border bg-dl-bg text-dl-navy focus:outline-none"
                    placeholder={vaultPosition?.minDeposit || '100'}
                  />
                </div>
                {parseFloat(amount) < parseFloat(vaultPosition?.minDeposit || '100') && (
                  <p className="text-sm mt-2 text-dl-error">Minimum investment is {formatUSD(vaultPosition?.minDeposit || '100')}</p>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-6">
                {['100', '500', '1000', '5000'].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handleAmountChange(preset)}
                    className={`py-2 font-medium ${
                      amount === preset
                        ? 'bg-dl-navy text-white'
                        : 'bg-dl-bg-alt text-dl-navy border border-dl-border'
                    }`}
                  >
                    ${parseInt(preset).toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="border border-dl-border bg-dl-bg p-4 mb-6">
                <h4 className="font-medium text-dl-navy mb-3">Investment Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-dl-gray">Investment Amount</span>
                    <span className="text-dl-navy">{formatUSD(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dl-gray">Target Annual Return</span>
                    <span className="text-dl-navy">10-14%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dl-gray">Lock-up Period</span>
                    <span className="text-dl-navy">12 months</span>
                  </div>
                </div>
              </div>

              {parseFloat(amount) >= 100 && (
                <div className="border border-dl-border bg-dl-bg mb-6">
                  <div className="px-4 py-3 border-b border-dl-border">
                    <h4 className="font-medium text-dl-navy text-sm">Projected Yield Schedule (Illustrative)</h4>
                    <p className="text-xs text-dl-gray mt-0.5">Based on 14% gross borrower rate, 10% net target LP distribution. Actual returns variable.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-dl-mono">
                      <thead>
                        <tr className="bg-dl-bg-alt">
                          <th className="px-3 py-2 text-left text-dl-gray font-normal">Period</th>
                          <th className="px-3 py-2 text-right text-dl-gray font-normal">Gross (14%)</th>
                          <th className="px-3 py-2 text-right text-dl-gray font-normal">Net (10%)</th>
                          <th className="px-3 py-2 text-right text-dl-gray font-normal">Cumulative</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[3, 6, 9, 12].map((months) => {
                          const inv = parseFloat(amount);
                          const grossYield = inv * 0.14 * (months / 12);
                          const netYield = inv * 0.10 * (months / 12);
                          const cumulative = inv + netYield;
                          return (
                            <tr key={months} className={months % 6 === 0 ? 'bg-dl-bg-alt' : 'bg-dl-bg'}>
                              <td className="px-3 py-2 text-dl-gray">{months}mo</td>
                              <td className="px-3 py-2 text-right text-dl-navy">+{grossYield.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-right text-dl-forest">+{netYield.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-right text-dl-navy font-semibold">{cumulative.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-2 border-t border-dl-border">
                    <p className="text-xs text-dl-gray">Gross = 14% borrower rate. Net = estimated LP distribution after fees and reserves. Not a guarantee of returns.</p>
                  </div>
                </div>
              )}

              <button
                onClick={proceedToDeposit}
                disabled={parseFloat(amount) < parseFloat(vaultPosition?.minDeposit || '100')}
                className="w-full py-4 bg-dl-navy text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Deposit
              </button>
            </StepCard>
          )}

          {currentStep === 5 && (
            <StepCard title="Step 5: Sign & Deposit">
              {txStatus === 'success' ? (
                <div className="text-center">
                  <div className="mb-6">
                    <span className="text-4xl text-dl-forest">✓</span>
                  </div>
                  <h3 className="font-dl-serif text-xl text-dl-navy mb-2">Deposit Successful!</h3>
                  <p className="mb-4 text-dl-gray">Your investment of {formatUSD(amount)} has been deposited.</p>
                  {txHash && (
                    <a
                      href={`${NETWORK_CONFIG.blockExplorer}/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline text-dl-navy"
                    >
                      View Transaction on Blockscout
                    </a>
                  )}
                  <div className="mt-6">
                    <Link href="/products" className="px-6 py-3 bg-dl-navy text-white font-medium">
                      Back to Products
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mb-6 text-dl-gray">
                    Review your investment details and complete the on-chain deposit.
                  </p>

                  <div className="border border-dl-border bg-dl-bg p-6 mb-6">
                    <h4 className="font-medium text-dl-navy mb-4">Investment Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-dl-border">
                        <span className="text-dl-gray">Investment Amount</span>
                        <span className="font-bold text-xl text-dl-navy">{formatUSD(amount)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-dl-border">
                        <span className="text-dl-gray">Vault</span>
                        <span className="text-dl-navy">{PRODUCT_VAULTS[productKey]?.name || 'Lending Fund'}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-dl-border">
                        <span className="text-dl-gray">Wallet</span>
                        <span className="font-dl-mono text-sm text-dl-navy">{walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-dl-border">
                        <span className="text-dl-gray">Network</span>
                        <span className="text-dl-navy">Arbitrum One</span>
                      </div>
                      {vaultPosition && (
                        <div className="flex justify-between py-2">
                          <span className="text-dl-gray">Your AXUSD Balance</span>
                          <span className="text-dl-navy">${parseFloat(vaultPosition.assetBalance).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {txError && (
                    <div className="border border-dl-error p-4 mb-4">
                      <p className="text-sm text-dl-error">{txError}</p>
                    </div>
                  )}

                  {!vaultPosition ? (
                    <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6">
                      <p className="text-sm text-dl-navy">Loading wallet position...</p>
                    </div>
                  ) : parseFloat(vaultPosition.assetBalance) < parseFloat(amount) ? (
                    <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
                      <h4 className="font-medium text-dl-navy mb-2">Insufficient AXUSD Balance</h4>
                      <p className="text-sm mb-4 text-dl-gray">
                        You need {formatUSD(amount)} AXUSD to invest, but your balance is ${parseFloat(vaultPosition.assetBalance).toLocaleString()}.
                      </p>
                      <p className="text-sm mb-4 text-dl-gray">
                        <strong>How to get AXUSD:</strong>
                      </p>
                      <ul className="text-sm space-y-2 mb-4 text-dl-gray">
                        <li>1. Swap USDC for AXUSD 1:1 via the <Link href="/axusd" className="text-dl-navy underline">PSM (Peg Stability Module)</Link></li>
                        <li>2. Mint AXUSD by depositing ETH/BTC collateral in the <Link href="/axusd" className="text-dl-navy underline">Vault Engine</Link></li>
                      </ul>
                      <Link
                        href="/axusd"
                        className="inline-block px-6 py-3 bg-dl-navy text-white font-medium"
                      >
                        Get AXUSD →
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6">
                        <p className="text-sm text-dl-navy">
                          {checkNeedsApproval()
                            ? "Step 1: Approve the vault to spend your AXUSD, then deposit."
                            : "Your AXUSD is approved. Click below to complete the deposit."}
                        </p>
                      </div>

                      {checkNeedsApproval() ? (
                        <button
                          onClick={handleApprove}
                          disabled={txStatus === 'approving'}
                          className="w-full py-4 bg-dl-navy text-white font-medium disabled:opacity-50"
                        >
                          {txStatus === 'approving' ? 'Approving...' : `Approve AXUSD for ${formatUSD(amount)}`}
                        </button>
                      ) : (
                        <button
                          onClick={handleOnChainDeposit}
                          disabled={txStatus === 'depositing'}
                          className="w-full py-4 bg-dl-navy text-white font-medium disabled:opacity-50"
                        >
                          {txStatus === 'depositing' ? 'Depositing...' : `Deposit ${formatUSD(amount)}`}
                        </button>
                      )}
                    </>
                  )}

                  <p className="text-sm text-center mt-4 text-dl-gray">
                    Deposits are made to ERC-4626 vaults on Arbitrum One
                  </p>
                </>
              )}
            </StepCard>
          )}
        </div>
      </div>
    </DesignLawLayout>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-dl-border bg-dl-bg-alt p-8">
      <h2 className="font-dl-serif text-xl text-dl-navy mb-6">{title}</h2>
      {children}
    </div>
  );
}

function AcknowledgmentCheckbox({ checked, onChange, label }: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
          checked ? 'bg-dl-navy border-dl-navy' : 'border-dl-border'
        }`}
      >
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={`text-sm ${checked ? 'text-dl-navy' : 'text-dl-gray'}`}>{label}</span>
    </label>
  );
}
