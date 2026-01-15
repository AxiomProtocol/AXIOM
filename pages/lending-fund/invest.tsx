import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
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
              <div className="rounded-xl p-6 sticky top-6" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: "#1a1a2e" }}>Investment Steps</h3>
                <div className="space-y-4">
                  {steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-3 p-3 rounded-lg transition-all"
                      style={
                        currentStep === step.id
                          ? { background: "rgba(0, 212, 170, 0.1)", border: "1px solid rgba(0, 212, 170, 0.5)" }
                          : step.completed
                          ? { background: "rgba(34, 197, 94, 0.1)", border: "1px solid transparent" }
                          : { background: "#ffffff", border: "1px solid #e5e7eb" }
                      }
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                        style={
                          step.completed
                            ? { background: "#22c55e", color: "#ffffff" }
                            : currentStep === step.id
                            ? { background: "#00D4AA", color: "#ffffff" }
                            : { background: "#e5e7eb", color: "#6b7280" }
                        }
                      >
                        {step.completed ? '✓' : step.id}
                      </div>
                      <div>
                        <div 
                          className="font-medium text-sm"
                          style={{ 
                            color: step.completed ? "#22c55e" : currentStep === step.id ? "#00D4AA" : "#6b7280" 
                          }}
                        >
                          {step.title}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {walletConnected && (
                  <div className="mt-6 pt-6" style={{ borderTop: "1px solid #e5e7eb" }}>
                    <div className="text-sm mb-1" style={{ color: "#6b7280" }}>Your AXUSD Balance</div>
                    <div className="text-xl font-bold" style={{ color: "#1a1a2e" }}>{formatUSD(axusdBalance)}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              {currentStep === 1 && !walletConnected && (
                <StepCard title="Step 1: Connect Your Wallet">
                  <p className="mb-6" style={{ color: "#6b7280" }}>
                    Connect your Web3 wallet to begin the investment process. Make sure you're connected to Arbitrum One network.
                  </p>
                  <button
                    onClick={connectWallet}
                    disabled={loading}
                    className="w-full py-4 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                    style={{ background: "#00D4AA" }}
                  >
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </StepCard>
              )}

              {currentStep === 2 && (
                <StepCard title="Step 2: Review Documents">
                  <p className="mb-6" style={{ color: "#6b7280" }}>
                    Please review the following documents and confirm your understanding:
                  </p>

                  <div className="space-y-4 mb-6">
                    <Link
                      href="/lending-fund/docs"
                      target="_blank"
                      className="block p-4 rounded-lg transition-all"
                      style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium" style={{ color: "#1a1a2e" }}>Private Placement Memorandum</div>
                          <div className="text-sm" style={{ color: "#6b7280" }}>Complete fund disclosure document</div>
                        </div>
                        <span style={{ color: "#00D4AA" }}>View →</span>
                      </div>
                    </Link>

                    <Link
                      href="/api/realestate/documents/Risk_Disclosure_Supplement.md?view=true"
                      target="_blank"
                      className="block p-4 rounded-lg transition-all"
                      style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium" style={{ color: "#1a1a2e" }}>Risk Disclosure Supplement</div>
                          <div className="text-sm" style={{ color: "#6b7280" }}>Detailed risk factors</div>
                        </div>
                        <span style={{ color: "#00D4AA" }}>View →</span>
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
                    className="w-full py-4 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "#00D4AA" }}
                  >
                    Continue to Verification
                  </button>
                </StepCard>
              )}

              {currentStep === 3 && (
                <StepCard title="Step 3: Accredited Investor Verification">
                  <p className="mb-6" style={{ color: "#6b7280" }}>
                    Under SEC Rule 506(c), we must verify your accredited investor status.
                    Please complete the verification questionnaire.
                  </p>

                  <div className="rounded-lg p-4 mb-6" style={{ background: "rgba(0, 212, 170, 0.1)", border: "1px solid rgba(0, 212, 170, 0.3)" }}>
                    <h4 className="font-bold mb-2" style={{ color: "#00D4AA" }}>Accredited Investor Qualifications</h4>
                    <ul className="text-sm space-y-2" style={{ color: "#374151" }}>
                      <li>• Income: $200K+ individual or $300K+ joint for past 2 years</li>
                      <li>• Net Worth: $1M+ (excluding primary residence)</li>
                      <li>• Professional: Series 7, 65, or 82 license holder</li>
                      <li>• Entity: $5M+ in assets, or all owners are accredited</li>
                    </ul>
                  </div>

                  <Link
                    href="/api/realestate/documents/Accredited_Investor_Questionnaire.md?view=true"
                    target="_blank"
                    className="block p-4 rounded-lg transition-all mb-6"
                    style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium" style={{ color: "#1a1a2e" }}>Accredited Investor Questionnaire</div>
                        <div className="text-sm" style={{ color: "#6b7280" }}>Download and complete this form</div>
                      </div>
                      <span style={{ color: "#00D4AA" }}>Download →</span>
                    </div>
                  </Link>

                  <p className="text-sm mb-4" style={{ color: "#6b7280" }}>
                    For this demo, click below to proceed. In production, you would upload your verification documents.
                  </p>

                  <button
                    onClick={completeAccreditation}
                    className="w-full py-4 text-white font-bold rounded-lg transition-all"
                    style={{ background: "#00D4AA" }}
                  >
                    Confirm Accredited Status
                  </button>
                </StepCard>
              )}

              {currentStep === 4 && (
                <StepCard title="Step 4: Investment Amount">
                  <p className="mb-6" style={{ color: "#6b7280" }}>
                    Enter the amount you wish to invest. Minimum investment is {formatUSD(vaultPosition?.minDeposit || '100')} USDC.
                  </p>

                  <div className="mb-6">
                    <label className="block text-sm mb-2" style={{ color: "#6b7280" }}>Investment Amount (USDC)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl" style={{ color: "#6b7280" }}>$</span>
                      <input
                        type="text"
                        value={amount}
                        onChange={(e) => handleAmountChange(e.target.value)}
                        className="w-full py-4 pl-10 pr-4 rounded-lg text-2xl font-bold focus:outline-none"
                        style={{ background: "#ffffff", border: "1px solid #e5e7eb", color: "#1a1a2e" }}
                        placeholder={vaultPosition?.minDeposit || '100'}
                      />
                    </div>
                    {parseFloat(amount) < parseFloat(vaultPosition?.minDeposit || '100') && (
                      <p className="text-sm mt-2" style={{ color: "#ef4444" }}>Minimum investment is {formatUSD(vaultPosition?.minDeposit || '100')}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-6">
                    {['100', '500', '1000', '5000'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleAmountChange(preset)}
                        className="py-2 rounded-lg font-medium transition-all"
                        style={amount === preset 
                          ? { background: "#00D4AA", color: "#ffffff" }
                          : { background: "#e5e7eb", color: "#374151" }
                        }
                      >
                        ${parseInt(preset).toLocaleString()}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-lg p-4 mb-6" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                    <h4 className="font-bold mb-3" style={{ color: "#1a1a2e" }}>Investment Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span style={{ color: "#6b7280" }}>Investment Amount</span>
                        <span style={{ color: "#1a1a2e" }}>{formatUSD(amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: "#6b7280" }}>Target Annual Return</span>
                        <span style={{ color: "#00D4AA" }}>10-14%</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: "#6b7280" }}>Lock-up Period</span>
                        <span style={{ color: "#1a1a2e" }}>12 months</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={proceedToDeposit}
                    disabled={parseFloat(amount) < parseFloat(vaultPosition?.minDeposit || '100')}
                    className="w-full py-4 text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ background: "#00D4AA" }}
                  >
                    Proceed to Deposit
                  </button>
                </StepCard>
              )}

              {currentStep === 5 && (
                <StepCard title="Step 5: Sign & Deposit">
                  {txStatus === 'success' ? (
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: "rgba(34, 197, 94, 0.15)" }}>
                        <span className="text-4xl" style={{ color: "#22c55e" }}>✓</span>
                      </div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: "#1a1a2e" }}>Deposit Successful!</h3>
                      <p className="mb-4" style={{ color: "#6b7280" }}>Your investment of {formatUSD(amount)} has been deposited.</p>
                      {txHash && (
                        <a
                          href={`${NETWORK_CONFIG.blockExplorer}/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm underline"
                          style={{ color: "#00D4AA" }}
                        >
                          View Transaction on Blockscout
                        </a>
                      )}
                      <div className="mt-6">
                        <Link href="/products" className="px-6 py-3 font-bold rounded-lg" style={{ background: "#00D4AA", color: "#FFFFFF" }}>
                          Back to Products
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mb-6" style={{ color: "#6b7280" }}>
                        Review your investment details and complete the on-chain deposit.
                      </p>

                      <div className="rounded-lg p-6 mb-6" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                        <h4 className="font-bold mb-4" style={{ color: "#1a1a2e" }}>Investment Summary</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <span style={{ color: "#6b7280" }}>Investment Amount</span>
                            <span className="font-bold text-xl" style={{ color: "#1a1a2e" }}>{formatUSD(amount)}</span>
                          </div>
                          <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <span style={{ color: "#6b7280" }}>Vault</span>
                            <span style={{ color: "#1a1a2e" }}>{PRODUCT_VAULTS[productKey]?.name || 'Lending Fund'}</span>
                          </div>
                          <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <span style={{ color: "#6b7280" }}>Wallet</span>
                            <span className="font-mono text-sm" style={{ color: "#1a1a2e" }}>{walletAddress?.slice(0, 10)}...{walletAddress?.slice(-8)}</span>
                          </div>
                          <div className="flex justify-between py-2" style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <span style={{ color: "#6b7280" }}>Network</span>
                            <span style={{ color: "#1a1a2e" }}>Arbitrum One</span>
                          </div>
                          {vaultPosition && (
                            <div className="flex justify-between py-2">
                              <span style={{ color: "#6b7280" }}>Your USDC Balance</span>
                              <span style={{ color: "#1a1a2e" }}>${parseFloat(vaultPosition.assetBalance).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {txError && (
                        <div className="rounded-lg p-4 mb-4" style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
                          <p className="text-sm" style={{ color: "#ef4444" }}>{txError}</p>
                        </div>
                      )}

                      {!vaultPosition ? (
                        <div className="rounded-lg p-4 mb-6" style={{ background: "rgba(0, 212, 170, 0.1)", border: "1px solid rgba(0, 212, 170, 0.3)" }}>
                          <p className="text-sm" style={{ color: "#00D4AA" }}>Loading wallet position...</p>
                        </div>
                      ) : (
                        <>
                          <div className="rounded-lg p-4 mb-6" style={{ background: "rgba(0, 212, 170, 0.1)", border: "1px solid rgba(0, 212, 170, 0.3)" }}>
                            <p className="text-sm" style={{ color: "#00D4AA" }}>
                              {checkNeedsApproval()
                                ? "Step 1: Approve the vault to spend your USDC, then deposit."
                                : "Your USDC is approved. Click below to complete the deposit."}
                            </p>
                          </div>

                          {checkNeedsApproval() ? (
                            <button
                              onClick={handleApprove}
                              disabled={txStatus === 'approving'}
                              className="w-full py-4 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                              style={{ background: "#d4af37" }}
                            >
                              {txStatus === 'approving' ? 'Approving...' : `Approve USDC for ${formatUSD(amount)}`}
                            </button>
                          ) : (
                            <button
                              onClick={handleOnChainDeposit}
                              disabled={txStatus === 'depositing'}
                              className="w-full py-4 text-white font-bold rounded-lg transition-all disabled:opacity-50"
                              style={{ background: "#00D4AA" }}
                            >
                              {txStatus === 'depositing' ? 'Depositing...' : `Deposit ${formatUSD(amount)}`}
                            </button>
                          )}
                        </>
                      )}

                      <p className="text-sm text-center mt-4" style={{ color: "#6b7280" }}>
                        Deposits are made to ERC-4626 vaults on Arbitrum One
                      </p>
                    </>
                  )}
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
    <div className="rounded-2xl p-8" style={{ background: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <h2 className="text-xl font-bold mb-6" style={{ color: "#1a1a2e" }}>{title}</h2>
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
        className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
        style={checked 
          ? { background: "#00D4AA", borderColor: "#00D4AA" } 
          : { borderColor: "#d1d5db" }
        }
      >
        {checked && <span className="text-white text-xs font-bold">✓</span>}
      </div>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="text-sm" style={{ color: checked ? "#1a1a2e" : "#6b7280" }}>{label}</span>
    </label>
  );
}
