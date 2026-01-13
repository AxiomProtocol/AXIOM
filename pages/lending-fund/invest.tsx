import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

interface InvestmentStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export default function InvestPage() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('10000');
  const [axusdBalance, setAxusdBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [steps, setSteps] = useState<InvestmentStep[]>([
    { id: 1, title: 'Connect Wallet', description: 'Connect your Web3 wallet', completed: false },
    { id: 2, title: 'Review Documents', description: 'Read and acknowledge PPM and risks', completed: false },
    { id: 3, title: 'Verify Accreditation', description: 'Complete accredited investor verification', completed: false },
    { id: 4, title: 'Set Amount', description: 'Choose investment amount (min $10,000)', completed: false },
    { id: 5, title: 'Sign & Deposit', description: 'Sign subscription and deposit AXUSD', completed: false }
  ]);

  const [acknowledgments, setAcknowledgments] = useState({
    readPPM: false,
    understandRisks: false,
    accreditedInvestor: false,
    noGuarantees: false
  });

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
          fetchBalance(accounts[0]);
        }
      } catch (error) {
        console.error('Wallet check error:', error);
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
          setWalletConnected(true);
          updateStep(1, true);
          setCurrentStep(2);
          fetchBalance(accounts[0]);
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

  const fetchBalance = async (address: string) => {
    try {
      const res = await fetch(`/api/axusd/balance?address=${address}`);
      if (res.ok) {
        const data = await res.json();
        setAxusdBalance(data.balance || '0');
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
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

  const completeAccreditation = () => {
    updateStep(3, true);
    setCurrentStep(4);
  };

  const handleAmountChange = (value: string) => {
    const num = value.replace(/[^0-9]/g, '');
    setAmount(num);
    if (parseInt(num) >= 10000) {
      updateStep(4, true);
    } else {
      updateStep(4, false);
    }
  };

  const proceedToDeposit = () => {
    if (parseInt(amount) >= 10000) {
      setCurrentStep(5);
    }
  };

  const handleDeposit = async () => {
    setLoading(true);
    try {
      alert('Deposit functionality will be connected to smart contracts after deployment');
    } catch (error) {
      console.error('Deposit error:', error);
    } finally {
      setLoading(false);
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
    <>
      <Head>
        <title>Invest | AXUSD Fix & Flip Lending Fund</title>
        <meta name="description" content="Invest in the AXUSD Fix & Flip Lending Fund - Accredited investors only" />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }} className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link href="/lending-fund" className="mb-4 inline-block" style={{ color: "#00D4AA" }}>
              ← Back to Fund Overview
            </Link>
            <h1 className="text-3xl font-bold" style={{ color: "#1a1a2e" }}>Invest in the Fund</h1>
            <p className="mt-2" style={{ color: "#6b7280" }}>
              Complete the steps below to invest in the AXUSD Fix & Flip Lending Fund
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 sticky top-6">
                <h3 className="text-lg font-bold text-white mb-4">Investment Steps</h3>
                <div className="space-y-4">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        currentStep === step.id
                          ? 'bg-yellow-500/20 border border-yellow-500/50'
                          : step.completed
                          ? 'bg-green-500/10'
                          : 'bg-gray-900/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                        step.completed
                          ? 'bg-green-500 text-white'
                          : currentStep === step.id
                          ? 'bg-yellow-500 text-black'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {step.completed ? '✓' : step.id}
                      </div>
                      <div>
                        <div className={`font-medium text-sm ${
                          step.completed ? 'text-green-400' :
                          currentStep === step.id ? 'text-yellow-400' :
                          'text-gray-500'
                        }`}>
                          {step.title}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {walletConnected && (
                  <div className="mt-6 pt-6 border-t border-gray-700">
                    <div className="text-gray-400 text-sm mb-1">Your AXUSD Balance</div>
                    <div className="text-xl font-bold text-white">{formatUSD(axusdBalance)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {currentStep === 1 && !walletConnected && (
                <StepCard title="Step 1: Connect Your Wallet">
                  <p className="text-gray-400 mb-6">
                    Connect your Web3 wallet to begin the investment process. Make sure you're connected to Arbitrum One network.
                  </p>
                  <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </StepCard>
              )}

              {currentStep === 2 && (
                <StepCard title="Step 2: Review Documents">
                  <p className="text-gray-400 mb-6">
                    Please review the following documents and confirm your understanding:
                  </p>

                  <div className="space-y-4 mb-6">
                    <Link
                      href="/lending-fund/docs"
                      target="_blank"
                      className="block p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-yellow-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">Private Placement Memorandum</div>
                          <div className="text-gray-500 text-sm">Complete fund disclosure document</div>
                        </div>
                        <span className="text-yellow-400">View →</span>
                      </div>
                    </Link>

                    <Link
                      href="/api/realestate/documents/Risk_Disclosure_Supplement.md?view=true"
                      target="_blank"
                      className="block p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-yellow-500/50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium">Risk Disclosure Supplement</div>
                          <div className="text-gray-500 text-sm">Detailed risk factors</div>
                        </div>
                        <span className="text-yellow-400">View →</span>
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
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue to Verification
                  </button>
                </StepCard>
              )}

              {currentStep === 3 && (
                <StepCard title="Step 3: Accredited Investor Verification">
                  <p className="text-gray-400 mb-6">
                    Under SEC Rule 506(c), we must verify your accredited investor status.
                    Please complete the verification questionnaire.
                  </p>

                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                    <h4 className="text-yellow-400 font-bold mb-2">Accredited Investor Qualifications</h4>
                    <ul className="text-gray-300 text-sm space-y-2">
                      <li>• Income: $200K+ individual or $300K+ joint for past 2 years</li>
                      <li>• Net Worth: $1M+ (excluding primary residence)</li>
                      <li>• Professional: Series 7, 65, or 82 license holder</li>
                      <li>• Entity: $5M+ in assets, or all owners are accredited</li>
                    </ul>
                  </div>

                  <Link
                    href="/api/realestate/documents/Accredited_Investor_Questionnaire.md?view=true"
                    target="_blank"
                    className="block p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-yellow-500/50 transition-all mb-6"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">Accredited Investor Questionnaire</div>
                        <div className="text-gray-500 text-sm">Download and complete this form</div>
                      </div>
                      <span className="text-yellow-400">Download →</span>
                    </div>
                  </Link>

                  <p className="text-gray-500 text-sm mb-4">
                    For this demo, click below to proceed. In production, you would upload your verification documents.
                  </p>

                  <button
                    onClick={completeAccreditation}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all"
                  >
                    Confirm Accredited Status
                  </button>
                </StepCard>
              )}

              {currentStep === 4 && (
                <StepCard title="Step 4: Investment Amount">
                  <p className="text-gray-400 mb-6">
                    Enter the amount you wish to invest. Minimum investment is $10,000 AXUSD.
                  </p>

                  <div className="mb-6">
                    <label className="block text-gray-400 text-sm mb-2">Investment Amount (AXUSD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-xl">$</span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="w-full py-4 pl-10 pr-4 bg-gray-900 border border-gray-700 rounded-lg text-white text-2xl font-bold focus:border-yellow-500 focus:outline-none"
                        placeholder="10000"
                      />
                    </div>
                    {parseInt(amount) < 10000 && (
                      <p className="text-red-400 text-sm mt-2">Minimum investment is $10,000</p>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {['10000', '25000', '50000', '100000'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleAmountChange(preset)}
                        className={`py-2 rounded-lg font-medium transition-all ${
                          amount === preset
                            ? 'bg-yellow-500 text-black'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        ${parseInt(preset).toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 mb-6">
                    <h4 className="text-white font-bold mb-3">Investment Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Investment Amount</span>
                        <span className="text-white">{formatUSD(amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Target Annual Return</span>
                        <span className="text-yellow-400">10-14%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Lock-up Period</span>
                        <span className="text-white">12 months</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={proceedToDeposit}
                    disabled={parseInt(amount) < 10000}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Proceed to Deposit
                  </button>
                </StepCard>
              )}

              {currentStep === 5 && (
                <StepCard title="Step 5: Sign & Deposit">
                  <p className="text-gray-400 mb-6">
                    Review your investment details and complete the deposit.
                  </p>

                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mb-6">
                    <h4 className="text-white font-bold mb-4">Final Investment Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-700">
                        <span className="text-gray-400">Investment Amount</span>
                        <span className="text-white font-bold text-xl">{formatUSD(amount)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-700">
                        <span className="text-gray-400">Wallet Address</span>
                        <span className="text-white font-mono text-sm">{walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-700">
                        <span className="text-gray-400">Network</span>
                        <span className="text-white">Arbitrum One</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-gray-400">Fund</span>
                        <span className="text-white">AXUSD Fix & Flip Lending Fund</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 mb-6">
                    <p className="text-yellow-400 text-sm">
                      By clicking "Sign & Deposit", you agree to the terms of the Subscription Agreement
                      and authorize the transfer of {formatUSD(amount)} AXUSD to the fund.
                    </p>
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={loading}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-lg transition-all disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : `Sign & Deposit ${formatUSD(amount)}`}
                  </button>

                  <p className="text-gray-500 text-sm text-center mt-4">
                    Smart contract deposit will be enabled after mainnet deployment
                  </p>
                </StepCard>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function StepCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
      <h2 className="text-xl font-bold text-white mb-6">{title}</h2>
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
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
        checked ? 'bg-yellow-500 border-yellow-500' : 'border-gray-600 group-hover:border-yellow-500/50'
      }`}>
        {checked && <span className="text-black text-xs font-bold">✓</span>}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className={`text-sm ${checked ? 'text-white' : 'text-gray-400'}`}>{label}</span>
    </label>
  );
}
