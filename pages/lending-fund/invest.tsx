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
                  href="/lending-fund/docs"
                  target="_blank"
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
                  href="/api/realestate/documents/Risk_Disclosure_Supplement.md?view=true"
                  target="_blank"
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
                Under SEC Rule 506(c), we must verify your accredited investor status.
                Please complete the verification questionnaire.
              </p>

              <div className="border border-dl-border bg-dl-bg-alt p-4 mb-6">
                <h4 className="font-medium text-dl-navy mb-2">Accredited Investor Qualifications</h4>
                <ul className="text-sm space-y-2 text-dl-navy">
                  <li>• Income: $200K+ individual or $300K+ joint for past 2 years</li>
                  <li>• Net Worth: $1M+ (excluding primary residence)</li>
                  <li>• Professional: Series 7, 65, or 82 license holder</li>
                  <li>• Entity: $5M+ in assets, or all owners are accredited</li>
                </ul>
              </div>

              <Link
                href="/api/realestate/documents/Accredited_Investor_Questionnaire.md?view=true"
                target="_blank"
                className="block p-4 bg-dl-bg border border-dl-border mb-6"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-dl-navy">Accredited Investor Questionnaire</div>
                    <div className="text-sm text-dl-gray">Download and complete this form</div>
                  </div>
                  <span className="text-dl-navy">Download →</span>
                </div>
              </Link>

              <p className="text-sm mb-4 text-dl-gray">
                For this demo, click below to proceed. In production, you would upload your verification documents.
              </p>

              <button
                onClick={completeAccreditation}
                className="w-full py-4 bg-dl-navy text-white font-medium"
              >
                Confirm Accredited Status
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
