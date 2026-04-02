import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import {
  getCreditMarketPosition,
  approveCreditMarket,
  depositToCreditMarket,
  type CreditMarketPosition,
} from '../../lib/web3/creditMarketService';
import { NETWORK_CONFIG } from '../../shared/contracts';
import { CREDIT_MARKET_ADDRESS } from '../../src/config/activeContracts.generated';

function IcoWallet() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
    </svg>
  );
}
function IcoDocument() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
function IcoVerify() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}
function IcoAmount() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function IcoDeposit() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}
function IcoShield() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

const STEP_ICONS = [<IcoWallet key="1" />, <IcoDocument key="2" />, <IcoVerify key="3" />, <IcoAmount key="4" />, <IcoDeposit key="5" />];

/** EIP-1193 browser provider — typed to avoid `any` escape. */
interface EthProvider {
  request(args: { method: 'eth_accounts' }): Promise<string[]>;
  request(args: { method: 'eth_requestAccounts' }): Promise<string[]>;
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

function getEth(): EthProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { ethereum?: EthProvider }).ethereum ?? null;
}

interface InvestmentStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

export default function InvestPage() {
  const router = useRouter();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [amount, setAmount] = useState('100');
  const [axusdBalance, setAxusdBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [vaultPosition, setVaultPosition] = useState<CreditMarketPosition | null>(null);
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

  /** Live protocol rate from fund-stats API (basis points). Null while loading. */
  const [fundRateBps, setFundRateBps] = useState<number | null>(null);
  /** Pool utilization % for context display. */
  const [poolUtilizationPct, setPoolUtilizationPct] = useState<string | null>(null);

  /** Primary entry mode: Euler Earn vault or Phase 6 direct deposit */
  const [investMode, setInvestMode] = useState<'earn-vault' | 'phase6'>('earn-vault');

  const [lpParticipant, setLpParticipant] = useState<{
    participantRef: string; fullName: string;
    cardStatus: string | null; cardLast4: string | null;
    accountBalance: { availableBalanceCents: number; currentBalanceCents: number; currency: string } | null;
    accountAccessMode: 'dedicated' | 'virtual-only';
    depositInstructions: { routingNumber: string; accountNumber?: string; bankName: string; accountName: string; memo: string; hasVirtualAccount?: boolean };
  } | null>(null);
  const [lpRegForm, setLpRegForm] = useState({
    fullName: '', email: '',
    dateOfBirth: '', ssn: '', addressLine1: '', city: '', state: '', zip: '',
  });
  const [lpRegLoading, setLpRegLoading] = useState(false);
  const [lpRegMsg, setLpRegMsg] = useState('');
  const [lpRegError, setLpRegError] = useState('');
  const [lpParticipantLoading, setLpParticipantLoading] = useState(false);

  interface EarnStatsData {
    vaultAddress: string;
    deployed: boolean;
    status: string;
    tvlUsd: number;
    blendedApyPct: string;
    blendedApyLabel: string;
    perfFeeBps: number;
    perfFeeRecipient: string;
    perfFeeCollectedUsd: number;
    ameRegime: string | null;
    ameConfidence: number | null;
    smearingPeriodDays: number;
    deployInstructions: string | null;
    strategies: Array<{
      id: string;
      label: string;
      address: string;
      weightPct: string;
      isDeployed: boolean;
      tvlUsd: number;
      description: string;
      riskTier: string;
    }>;
  }
  const [earnStats, setEarnStats] = useState<EarnStatsData | null>(null);
  const [earnLoading, setEarnLoading] = useState(true);

  const { product } = router.query;
  const productKey = (product as string) || 'lending-fund';

  useEffect(() => {
    checkWalletConnection();
    fetch('/api/realestate/fund-stats')
      .then(r => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        const bps = data?.riskParams?.interestRateBps ?? null;
        if (typeof bps === 'number') setFundRateBps(bps);
        const totalAssets = parseFloat(data?.totalAssets || '0');
        const locked = parseFloat(data?.lockedInLoans || '0');
        if (totalAssets > 0) setPoolUtilizationPct(((locked / totalAssets) * 100).toFixed(1));
      })
      .catch(() => {});
    fetch('/api/euler/earn-stats')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setEarnStats(d as EarnStatsData); })
      .catch(() => {})
      .finally(() => setEarnLoading(false));
  }, []);

  const fetchLpParticipant = async (address: string) => {
    if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) return;
    setLpParticipantLoading(true);
    try {
      const res = await fetch(`/api/banking/participant/status?wallet=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (data.registered) {
        setLpParticipant({
          participantRef: data.participantRef,
          fullName: data.fullName,
          cardStatus: data.cardStatus ?? null,
          cardLast4: data.cardLast4 ?? null,
          accountBalance: data.accountBalance ?? null,
          accountAccessMode: data.accountAccessMode ?? 'virtual-only',
          depositInstructions: {
            routingNumber: data.virtualRoutingNumber,
            accountNumber: data.virtualAccountNumber,
            bankName: 'First Internet Bank',
            accountName: 'Axiom Protocol LLC — Nexus Account',
            memo: data.participantRef,
            hasVirtualAccount: data.hasVirtualAccount,
            note: data.hasVirtualAccount
              ? `Use your dedicated Axiom Nexus account number ${data.virtualAccountNumber} with routing ${data.virtualRoutingNumber}. No memo required.`
              : `Include your reference code "${data.participantRef}" in the ACH memo field.`,
          },
        });
      } else {
        setLpParticipant(null);
      }
    } catch { setLpParticipant(null); }
    finally { setLpParticipantLoading(false); }
  };

  const handleLpRegister = async () => {
    if (!walletAddress) { setLpRegError('Wallet not connected'); return; }
    if (!lpRegForm.fullName.trim()) { setLpRegError('Full legal name required'); return; }
    if (!lpRegForm.email.trim() || !lpRegForm.email.includes('@')) { setLpRegError('Valid email required'); return; }
    if (!lpRegForm.dateOfBirth || !/^\d{4}-\d{2}-\d{2}$/.test(lpRegForm.dateOfBirth)) { setLpRegError('Date of birth required (YYYY-MM-DD)'); return; }
    if (!lpRegForm.ssn || lpRegForm.ssn.replace(/\D/g, '').length !== 4) { setLpRegError('Last 4 digits of SSN required'); return; }
    if (!lpRegForm.addressLine1.trim()) { setLpRegError('Street address required'); return; }
    if (!lpRegForm.city.trim()) { setLpRegError('City required'); return; }
    if (!lpRegForm.state || !/^[A-Z]{2}$/.test(lpRegForm.state)) { setLpRegError('State required (2-letter code, e.g. TX)'); return; }
    if (!lpRegForm.zip || !/^\d{5}$/.test(lpRegForm.zip)) { setLpRegError('ZIP code required (5 digits)'); return; }
    setLpRegLoading(true); setLpRegError(''); setLpRegMsg('');
    try {
      const res = await fetch('/api/banking/participant/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          fullName: lpRegForm.fullName.trim(),
          email: lpRegForm.email.trim(),
          dateOfBirth: lpRegForm.dateOfBirth,
          ssn: lpRegForm.ssn.replace(/\D/g, ''),
          addressLine1: lpRegForm.addressLine1.trim(),
          city: lpRegForm.city.trim(),
          state: lpRegForm.state.trim().toUpperCase(),
          zip: lpRegForm.zip.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLpRegMsg('Axiom Nexus account provisioned. Your dedicated account number is ready.');
        await fetchLpParticipant(walletAddress);
      } else {
        setLpRegError(data.error || 'Registration failed');
      }
    } catch { setLpRegError('Registration failed'); }
    finally { setLpRegLoading(false); }
  };

  const checkWalletConnection = async () => {
    const eth = getEth();
    if (!eth) return;
    try {
      const accounts = await eth.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
        updateStep(1, true);
        setCurrentStep(2);
        fetchVaultPosition(accounts[0]);
        restoreAccreditationState(accounts[0]);
        fetchLpParticipant(accounts[0]);
      }
    } catch (error) {
      console.error('Wallet check error:', error);
    }
  };

  const fetchVaultPosition = async (address: string) => {
    try {
      const position = await getCreditMarketPosition(address);
      setVaultPosition(position);
      setAxusdBalance(position.axusdBalanceUsd);
    } catch (error) {
      console.error('Failed to fetch credit market position:', error);
    }
  };

  const restoreAccreditationState = async (address: string) => {
    try {
      const res = await fetch(`/api/realestate/accreditation?walletAddress=${encodeURIComponent(address)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.records && data.records.length > 0) {
        updateStep(3, true);
      }
    } catch {
      // Silently fail — accreditation state defaults to incomplete
    }
  };

  const handleApprove = async () => {
    if (!walletAddress) return;
    setTxStatus('approving');
    setTxError(null);
    try {
      const result = await approveCreditMarket(amount);
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
      const result = await depositToCreditMarket(amount, walletAddress);
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
    const eth = getEth();
    if (!eth) {
      alert('Please install MetaMask or another Web3 wallet');
      return;
    }
    try {
      setLoading(true);
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setWalletConnected(true);
        updateStep(1, true);
        setCurrentStep(2);
        fetchVaultPosition(accounts[0]);
        restoreAccreditationState(accounts[0]);
        fetchLpParticipant(accounts[0]);
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkNeedsApproval = () => {
    if (!vaultPosition) return true;
    const currentAmount = parseFloat(amount) || 0;
    const currentAllowance = parseFloat(vaultPosition.allowanceUsd) || 0;
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

      <div className="mb-8 border-b border-dl-border pb-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
          <div className="py-8 pr-0 lg:pr-10">
            <Link href="/lending-fund" className="text-xs text-dl-gray uppercase tracking-widest mb-5 inline-block font-dl-mono">
              ← Back to Fund Overview
            </Link>
            <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy mb-3">Invest in the Fund</h1>
            <p className="text-sm text-dl-gray leading-relaxed mb-6 max-w-lg">
              Accredited investors can provide capital to the Axiom Bridge Lending Pool.
              Your AXUSD is deployed as property-secured bridge loans and earns pro-rata interest that accumulates daily.
            </p>
            <div className="grid grid-cols-3 gap-0 border border-dl-border mb-6">
              <div className="px-4 py-3 border-r border-dl-border">
                <p className="text-xs text-dl-gray font-dl-mono mb-1">Target Rate</p>
                <p className="font-dl-serif text-lg text-dl-navy font-semibold">
                  {fundRateBps !== null ? `${(fundRateBps / 100).toFixed(0)}%` : '10–14%'}
                </p>
                <p className="text-xs text-dl-gray">Variable / Annual</p>
              </div>
              <div className="px-4 py-3 border-r border-dl-border">
                <p className="text-xs text-dl-gray font-dl-mono mb-1">Utilization</p>
                <p className="font-dl-serif text-lg text-dl-navy font-semibold">
                  {poolUtilizationPct !== null ? `${poolUtilizationPct}%` : '—'}
                </p>
                <p className="text-xs text-dl-gray">Pool Deployed</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-xs text-dl-gray font-dl-mono mb-1">Network</p>
                <p className="font-dl-serif text-lg text-dl-navy font-semibold">Arbitrum</p>
                <p className="text-xs text-dl-gray">On-Chain Settlement</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { icon: <IcoShield />, label: 'SEC Reg D 506(c)' },
                { icon: <IcoShield />, label: 'ERC-3643 Gated' },
                { icon: <IcoShield />, label: 'Max 70% LTV' },
              ].map(item => (
                <span key={item.label} className="flex items-center gap-1.5 px-3 py-1 text-xs font-dl-mono text-dl-gray border border-dl-border bg-dl-bg">
                  <span className="text-dl-forest">{item.icon}</span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
          <div className="hidden lg:block border-l border-dl-border relative overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?auto=format&fit=crop&w=700&q=80"
              alt="Real estate investment and property acquisition"
              className="w-full h-full object-cover"
              style={{ minHeight: '320px', maxHeight: '420px' }}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-dl-navy px-5 py-3">
              <p className="text-xs text-white font-dl-mono opacity-80">Bridge Lending · First-Lien Position · Property Secured</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Entry Mode Selector ─────────────────────────────────────────── */}
      <div className="flex gap-0 border-b border-dl-border mb-8">
        <button
          onClick={() => setInvestMode('earn-vault')}
          className={`px-5 py-3 text-sm font-dl-mono border-b-2 -mb-px ${investMode === 'earn-vault' ? 'border-dl-navy text-dl-navy font-semibold' : 'border-transparent text-dl-gray hover:text-dl-navy'}`}
        >
          AXUSD Earn Vault
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-dl-bg-alt text-dl-forest border border-dl-border">Recommended</span>
        </button>
        <button
          onClick={() => setInvestMode('phase6')}
          className={`px-5 py-3 text-sm font-dl-mono border-b-2 -mb-px ${investMode === 'phase6' ? 'border-dl-navy text-dl-navy font-semibold' : 'border-transparent text-dl-gray hover:text-dl-navy'}`}
        >
          Phase 6 Credit Pool
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-dl-bg-alt text-dl-gray border border-dl-border">Advanced</span>
        </button>
      </div>

      {/* ── Euler Earn Vault Panel ────────────────────────────────────────── */}
      {investMode === 'earn-vault' && (
        <div className="mb-10">
          <div className="mb-5">
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-2">AXUSD Earn Vault</h2>
            <p className="text-sm text-dl-gray leading-relaxed max-w-2xl">
              A multi-strategy yield aggregation vault built on Euler Earn. Your AXUSD is automatically
              allocated across three on-chain strategies — the Phase 6 Credit Market, the EVK Open Money Market,
              and a T-Bill reserve — to optimize risk-adjusted yield. Blended returns are variable and distributed
              after a {earnStats?.smearingPeriodDays ?? 14}-day smoothing window.
            </p>
          </div>

          {earnLoading && (
            <div className="border border-dl-border p-6 text-center">
              <p className="text-sm text-dl-gray font-dl-mono">Loading vault data...</p>
            </div>
          )}

          {!earnLoading && earnStats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-6">
                <div className="px-4 py-3 border-r border-dl-border bg-dl-bg">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Vault Status</p>
                  <p className={`font-dl-mono text-sm font-bold ${earnStats.deployed ? 'text-dl-forest' : 'text-dl-gold'}`}>
                    {earnStats.status}
                  </p>
                </div>
                <div className="px-4 py-3 border-r border-dl-border bg-dl-bg">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Total Capital</p>
                  <p className="font-dl-mono text-sm font-bold text-dl-navy">
                    ${earnStats.tvlUsd.toLocaleString()} AXUSD
                  </p>
                </div>
                <div className="px-4 py-3 border-r border-dl-border bg-dl-bg">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Blended Yield</p>
                  <p className="font-dl-mono text-sm font-bold text-dl-forest">
                    {earnStats.blendedApyPct}% <span className="text-dl-gray font-normal text-xs">({earnStats.blendedApyLabel})</span>
                  </p>
                  <p className="text-xs text-dl-gray">Net of 10% perf fee</p>
                </div>
                <div className="px-4 py-3 bg-dl-bg">
                  <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">AME Regime</p>
                  <p className="font-dl-mono text-sm font-bold text-dl-navy">
                    {earnStats.ameRegime ?? '—'}
                  </p>
                  {earnStats.ameConfidence != null && (
                    <p className="text-xs text-dl-gray">conf {(earnStats.ameConfidence * 100).toFixed(0)}%</p>
                  )}
                </div>
              </div>

              <div className="border border-dl-border mb-6">
                <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                  <p className="text-xs font-semibold text-dl-navy font-dl-mono uppercase">Strategy Allocation</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-dl-mono">
                    <thead>
                      <tr className="bg-dl-bg-alt border-b border-dl-border">
                        <th className="px-4 py-2 text-left text-dl-gray font-normal">Strategy</th>
                        <th className="px-4 py-2 text-right text-dl-gray font-normal">Target Weight</th>
                        <th className="px-4 py-2 text-left text-dl-gray font-normal">Risk Tier</th>
                        <th className="px-4 py-2 text-left text-dl-gray font-normal">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {earnStats.strategies.map((s, i) => (
                        <tr key={s.id} className={`border-b border-dl-border ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                          <td className="px-4 py-3">
                            <p className="text-dl-navy font-semibold">{s.label}</p>
                            <p className="text-dl-gray text-xs mt-0.5 leading-relaxed">{s.description}</p>
                          </td>
                          <td className="px-4 py-3 text-right text-dl-navy font-bold">{s.weightPct}%</td>
                          <td className="px-4 py-3">
                            <span className={s.riskTier === 'LOW' ? 'text-dl-forest' : s.riskTier === 'MEDIUM' ? 'text-dl-gold' : 'text-dl-error'}>
                              {s.riskTier}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={s.isDeployed ? 'text-dl-forest' : 'text-dl-gold'}>
                              {s.isDeployed ? 'LIVE' : 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t border-dl-border bg-dl-bg-alt">
                  <p className="text-xs text-dl-gray">
                    Performance fee: {earnStats.perfFeeBps / 100}% of yield → AxiomFeeBurner.
                    Yield distributed after {earnStats.smearingPeriodDays}-day smoothing window. Returns variable — not a guarantee.
                  </p>
                </div>
              </div>

              <div className="border border-dl-border mb-6">
                <div className="px-4 py-3 bg-dl-bg-alt border-b border-dl-border">
                  <p className="text-xs font-semibold text-dl-navy font-dl-mono uppercase">ERC-3643 Identity Gate</p>
                </div>
                <div className="px-4 py-4 bg-dl-bg">
                  <p className="text-xs text-dl-gray leading-relaxed mb-3">
                    The Euler Earn AXUSD vault only accepts ERC-3643 compliant AXUSD. Depositors must pass the
                    Axiom identity verification process before the vault can accept a transfer. This ensures
                    every participant in the vault has completed KYC and satisfies compliance requirements.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'ERC-3643 Gated',
                      'KYC Required',
                      'Axiom Identity Verified',
                      '14-Day Yield Smearing',
                    ].map(badge => (
                      <span key={badge} className="px-2 py-1 text-xs font-dl-mono text-dl-gray border border-dl-border bg-dl-bg-alt">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {earnStats.deployed ? (
                  <a
                    href={`https://app.euler.finance/vault/${earnStats.vaultAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-dl-navy text-white px-8 py-3 font-dl-mono text-sm text-center hover:bg-[#1a2530]"
                  >
                    Deposit via Euler Finance →
                  </a>
                ) : (
                  <div className="border border-dl-gold px-8 py-3 font-dl-mono text-sm text-dl-gold">
                    Vault Deployment Pending — Available Soon
                  </div>
                )}
                <button
                  onClick={() => setInvestMode('phase6')}
                  className="border border-dl-border px-8 py-3 font-dl-mono text-sm text-dl-gray hover:text-dl-navy hover:border-dl-navy"
                >
                  Phase 6 Direct Deposit (Advanced) →
                </button>
              </div>

              <div className="mt-6 border border-dl-border bg-dl-bg-alt p-4">
                <p className="text-xs text-dl-gray leading-relaxed">
                  <span className="font-semibold text-dl-navy">How it works:</span> Depositors receive
                  <span className="font-dl-mono"> earnAXUSD</span> shares representing proportional ownership of the vault.
                  The vault curator (Axiom Sentinel) periodically rebalances allocations across the three strategies based on
                  current AME regime, utilization, and yield conditions. Withdrawals are processed
                  according to Euler Earn liquidity constraints. This is not a guaranteed return product.
                  Review the <Link href="/disclosure" className="underline text-dl-navy">Disclosure</Link> before depositing.
                </p>
              </div>

              {/* LP Banking / Fiat Deposit Panel */}
              {walletConnected && (
                <div className="mt-6 border border-dl-navy">
                  <div className="px-5 py-3 bg-dl-navy flex items-center justify-between">
                    <p className="font-dl-mono text-xs text-white uppercase tracking-wider">Fiat Deposit</p>
                    <span className="font-dl-mono text-xs text-white opacity-60">Axiom Nexus Account</span>
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-dl-gray leading-relaxed mb-5">
                      Accredited participants may fund their limited partner position via USD bank transfer (ACH or wire) to the
                      <span className="font-semibold text-dl-navy"> Axiom Nexus Account</span> — an FDIC-insured institutional
                      checking account at First Internet Bank. Your deposit is logged against your wallet address and applied
                      to your LP record within 1-2 business days of confirmed receipt.
                    </p>

                    {/* How it works — steps */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-dl-border mb-5">
                      {[
                        { step: '1', title: 'Register', body: 'Get your unique AXM-XXXXXXXX reference code — assigned once per wallet.' },
                        { step: '2', title: 'Initiate ACH', body: 'Log your intended deposit amount here, then send ACH to the Nexus Account with your reference code in the memo.' },
                        { step: '3', title: 'Operations Reviews', body: 'Axiom Operations matches your deposit to your reference code on the incoming ACH ledger.' },
                        { step: '4', title: 'LP Record Updated', body: 'Your LP deposit record is marked received and applied within 1-2 business days of settlement.' },
                      ].map((s, i, arr) => (
                        <div key={s.step} className={`p-4 ${i < arr.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''}`}>
                          <div className="font-dl-mono text-xs text-dl-gold mb-1">Step {s.step}</div>
                          <div className="text-dl-navy font-semibold text-sm mb-1">{s.title}</div>
                          <div className="text-dl-gray text-xs leading-relaxed">{s.body}</div>
                        </div>
                      ))}
                    </div>

                    {lpParticipantLoading && <p className="text-dl-gray text-xs">Loading your banking record...</p>}

                    {!lpParticipantLoading && !lpParticipant && (
                      <div className="border border-dl-gold p-4">
                        <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-wider mb-2">Account Registration Required</p>
                        <p className="text-dl-gray text-xs mb-1">Provision your dedicated Axiom Nexus banking account. Required for all LP deposit instructions.</p>
                        <p className="text-dl-gray text-xs mb-4 font-dl-mono border-l-2 border-dl-gold pl-3">Your information provisions a dedicated FDIC-insured account via Increase. Submitted once — for LP identity verification.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                          <input type="text" placeholder="Full legal name" value={lpRegForm.fullName} onChange={(e) => setLpRegForm({ ...lpRegForm, fullName: e.target.value })} className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none" />
                          <input type="email" placeholder="Email address" value={lpRegForm.email} onChange={(e) => setLpRegForm({ ...lpRegForm, email: e.target.value })} className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none" />
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-dl-gray font-dl-mono uppercase">Date of Birth</label>
                            <input type="date" value={lpRegForm.dateOfBirth} onChange={(e) => setLpRegForm({ ...lpRegForm, dateOfBirth: e.target.value })} className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] text-dl-gray font-dl-mono uppercase">Last 4 of SSN</label>
                            <input type="password" autoComplete="off" placeholder="••••" maxLength={4} value={lpRegForm.ssn} onChange={(e) => setLpRegForm({ ...lpRegForm, ssn: e.target.value.replace(/\D/g, '').slice(0, 4) })} className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none font-dl-mono tracking-widest" />
                          </div>
                          <input type="text" placeholder="Street address (123 Main St)" value={lpRegForm.addressLine1} onChange={(e) => setLpRegForm({ ...lpRegForm, addressLine1: e.target.value })} className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none md:col-span-2" />
                          <input type="text" placeholder="City" value={lpRegForm.city} onChange={(e) => setLpRegForm({ ...lpRegForm, city: e.target.value })} className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none" />
                          <div className="grid grid-cols-2 gap-3">
                            <input type="text" placeholder="State (TX)" maxLength={2} value={lpRegForm.state} onChange={(e) => setLpRegForm({ ...lpRegForm, state: e.target.value.toUpperCase().slice(0, 2) })} className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none font-dl-mono uppercase" />
                            <input type="text" placeholder="ZIP (77001)" maxLength={5} value={lpRegForm.zip} onChange={(e) => setLpRegForm({ ...lpRegForm, zip: e.target.value.replace(/\D/g, '').slice(0, 5) })} className="border border-dl-border bg-dl-bg px-4 py-2 text-sm text-dl-navy focus:outline-none font-dl-mono" />
                          </div>
                        </div>
                        {lpRegError && <p className="text-xs mb-2" style={{ color: '#991b1b' }}>{lpRegError}</p>}
                        {lpRegMsg && <p className="text-dl-forest text-xs mb-2">{lpRegMsg}</p>}
                        <button
                          onClick={handleLpRegister}
                          disabled={lpRegLoading}
                          className="border border-dl-navy bg-dl-navy text-white px-5 py-2 text-xs font-bold font-dl-mono uppercase hover:bg-dl-bg hover:text-dl-navy transition-none disabled:opacity-50"
                        >
                          {lpRegLoading ? 'Provisioning account...' : 'Register Axiom Nexus Account'}
                        </button>
                      </div>
                    )}

                    {lpParticipant && (
                      <>
                        <div className="border border-dl-forest p-3 mb-4 flex items-center justify-between">
                          <p className="text-dl-forest text-xs font-dl-mono">
                            {lpParticipant.depositInstructions.hasVirtualAccount
                              ? 'Your dedicated Axiom Nexus account is provisioned — no memo required.'
                              : `Registered as ${lpParticipant.fullName} · Ref: ${lpParticipant.participantRef}`}
                          </p>
                          <a href="/banking/my-account" className="text-xs text-dl-navy font-dl-mono underline hover:no-underline shrink-0 ml-4">
                            My Full Account →
                          </a>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-dl-border mb-5">
                          <div className="px-4 py-4 border-b md:border-b-0 md:border-r border-dl-border">
                            <p className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Reference Code</p>
                            <p className="font-dl-mono text-dl-navy font-bold text-lg">{lpParticipant.participantRef}</p>
                            <p className="text-dl-gray text-xs mt-1">Backup memo identifier</p>
                          </div>
                          <div className="px-4 py-4 border-b md:border-b-0 md:border-r border-dl-border">
                            <p className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Routing Number</p>
                            <p className="font-dl-mono text-dl-navy font-bold">{lpParticipant.depositInstructions.routingNumber}</p>
                            <p className="text-dl-gray text-xs mt-1">{lpParticipant.depositInstructions.bankName}</p>
                          </div>
                          <div className="px-4 py-4 border-b md:border-b-0 md:border-r border-dl-border">
                            <p className="text-dl-gray text-xs font-dl-mono uppercase mb-1">
                              {lpParticipant.depositInstructions.hasVirtualAccount ? 'Your Account Number' : 'Account Number'}
                            </p>
                            {lpParticipant.depositInstructions.hasVirtualAccount && lpParticipant.depositInstructions.accountNumber ? (
                              <>
                                <p className="font-dl-mono text-dl-navy font-bold">{lpParticipant.depositInstructions.accountNumber}</p>
                                <p className="text-dl-forest text-xs mt-1">Dedicated to you — no memo needed</p>
                              </>
                            ) : (
                              <>
                                <p className="font-dl-mono text-dl-navy font-bold text-xs">See secure message</p>
                                <p className="text-dl-gray text-xs mt-1">Sent after registration</p>
                              </>
                            )}
                          </div>
                          <div className="px-4 py-4">
                            <p className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Payee Name</p>
                            <p className="font-dl-mono text-dl-navy font-bold text-xs">{lpParticipant.depositInstructions.accountName}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border mb-5">
                          <div className="px-4 py-4 border-b md:border-b-0 md:border-r border-dl-border">
                            <p className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Account Balance</p>
                            {lpParticipant.accountBalance ? (
                              <p className="font-dl-mono text-dl-navy font-bold">
                                ${(lpParticipant.accountBalance.availableBalanceCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            ) : (
                              <p className="font-dl-mono text-dl-gray">—</p>
                            )}
                            <p className="text-dl-gray text-xs mt-1">Available · {lpParticipant.accountAccessMode === 'dedicated' ? 'Dedicated account' : 'Virtual account'}</p>
                          </div>
                          <div className="px-4 py-4">
                            <p className="text-dl-gray text-xs font-dl-mono uppercase mb-1">Debit Card</p>
                            {lpParticipant.cardStatus === 'active' && lpParticipant.cardLast4 ? (
                              <p className="font-dl-mono text-dl-navy font-bold">••••&nbsp;{lpParticipant.cardLast4}</p>
                            ) : lpParticipant.cardStatus === 'issued' ? (
                              <p className="font-dl-mono text-dl-forest">Issued — activation pending</p>
                            ) : (
                              <p className="font-dl-mono text-dl-gray">Not issued</p>
                            )}
                            <p className="text-dl-gray text-xs mt-1">Axiom Nexus Debit · {lpParticipant.cardStatus ?? 'not requested'}</p>
                          </div>
                        </div>

                        {/* What happens after you send */}
                        <div className="border border-dl-border p-4 mb-5">
                          <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-3">After You Send</p>
                          <ol className="space-y-2">
                            {[
                              'Your bank initiates the ACH — typically settles in 1-2 business days.',
                              'Axiom Operations receives the transfer and matches it to your reference code on the incoming ledger.',
                              'Your LP deposit record is updated to "received" status and notated with the confirmed amount.',
                              'Operations applies the deposit to your LP position. You will receive confirmation via the email on file.',
                              'Your capital is deployed into the Lending Fund strategies as part of the next allocation cycle.',
                            ].map((item, i) => (
                              <li key={i} className="flex gap-3 text-xs text-dl-gray leading-relaxed">
                                <span className="font-dl-mono text-dl-gold shrink-0">{i + 1}.</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <p className="text-xs text-dl-gray leading-relaxed">
                          Questions about your deposit? Contact Axiom Operations with your reference code and the date of transfer.
                          ACH deposits are non-refundable once applied to your LP record. Review the{' '}
                          <Link href="/disclosure" className="underline text-dl-navy">Disclosure</Link> before committing capital.
                          This is a Reg D 506(c) offering — for accredited investors only.
                        </p>
                      </>
                    )}

                    {/* FAQ */}
                    <div className="mt-6 border-t border-dl-border pt-5">
                      <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-wider mb-4">ACH Deposit FAQ</p>
                      <div className="space-y-4">
                        {[
                          {
                            q: 'Why do I need a reference code?',
                            a: 'The Axiom Nexus Account receives ACH transfers from many participants. Your reference code is how Operations uniquely identifies your deposit and applies it to your LP record — without it, your transfer cannot be matched. Always include it in the ACH memo or wire OBI field.'
                          },
                          {
                            q: 'What is the minimum LP deposit?',
                            a: 'The minimum initial deposit via the ACH path is $100. There is no published maximum for the ACH path, though large positions ($50,000+) may require coordination with Operations. On-chain deposits via Euler Finance have their own limits set by vault parameters.'
                          },
                          {
                            q: 'Is my deposit FDIC insured while it is in transit?',
                            a: 'Funds held in the Axiom Nexus Account at First Internet Bank are FDIC-insured up to $250,000. Once capital is deployed into lending strategies (on-chain), it is governed by the smart contract terms and is not FDIC-covered.'
                          },
                          {
                            q: 'Can I deposit via wire instead of ACH?',
                            a: 'Yes. Wire transfers are accepted. Use the same routing number (071006486) and payee name, and include your reference code in the wire OBI (originator-to-beneficiary information) field. Contact Operations for the full wire details including account number.'
                          },
                          {
                            q: 'How are returns distributed?',
                            a: 'Distributions from the Lending Fund are calculated based on your pro-rata share of the deployed capital pool. Operations initiates ACH credits to participants on a schedule determined by the fund. Review the fund terms in the Disclosure for current distribution frequency.'
                          },
                          {
                            q: 'What if I already deposited via Euler Finance on-chain?',
                            a: 'On-chain deposits via Euler Finance and ACH deposits via the Nexus Account are two separate paths. They are not interchangeable. If you deposited on-chain, your position is tracked by the Euler vault contract. The ACH path is for participants who prefer traditional banking rails.'
                          },
                        ].map(({ q, a }) => (
                          <div key={q} className="border-b border-dl-border pb-4 last:border-b-0 last:pb-0">
                            <p className="text-dl-navy text-sm font-semibold mb-1">{q}</p>
                            <p className="text-dl-gray text-xs leading-relaxed">{a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {!earnLoading && !earnStats && (
            <div className="border border-dl-border p-6 text-center">
              <p className="text-sm text-dl-gray">Vault data unavailable. Try refreshing the page.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Phase 6 Credit Pool (5-step direct deposit wizard) ────────────── */}
      {investMode === 'phase6' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-dl-bg-alt border border-dl-border">
            <div className="px-5 py-4 border-b border-dl-border bg-dl-navy">
              <p className="font-dl-mono text-xs text-white opacity-70 uppercase tracking-widest mb-0.5">Onboarding</p>
              <h3 className="font-dl-serif text-base text-white font-semibold">Investment Steps</h3>
            </div>
            <div className="p-4 space-y-1">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-3 py-3 border ${
                    currentStep === step.id
                      ? 'bg-white border-dl-navy'
                      : step.completed
                      ? 'bg-dl-bg border-dl-border'
                      : 'bg-dl-bg-alt border-transparent'
                  }`}
                >
                  <div
                    className={`w-8 h-8 flex items-center justify-center flex-shrink-0 text-sm ${
                      step.completed
                        ? 'bg-dl-forest text-white'
                        : currentStep === step.id
                        ? 'bg-dl-navy text-white'
                        : 'bg-dl-border text-dl-gray'
                    }`}
                  >
                    {step.completed ? '✓' : <span className="w-5 h-5 flex items-center justify-center">{STEP_ICONS[idx]}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`font-medium text-sm leading-tight ${
                        step.completed ? 'text-dl-forest' : currentStep === step.id ? 'text-dl-navy' : 'text-dl-gray'
                      }`}
                    >
                      {step.title}
                    </div>
                    {currentStep === step.id && (
                      <div className="text-xs text-dl-gray mt-0.5">{step.description}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {walletConnected && (
              <div className="border-t border-dl-border px-4 py-4 bg-dl-bg">
                <p className="text-xs text-dl-gray font-dl-mono uppercase tracking-widest mb-2">Your Position</p>
                <div className="flex items-baseline gap-2">
                  <div className="font-dl-mono text-xl font-bold text-dl-navy">{formatUSD(axusdBalance)}</div>
                  <div className="text-xs text-dl-gray">AXUSD Balance</div>
                </div>
                {vaultPosition?.isVerified === false && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-dl-error">
                    <IcoShield /> Wallet not KYC-verified for this pool
                  </div>
                )}
                {vaultPosition?.isVerified === true && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-dl-forest">
                    <IcoShield /> Identity verified for this pool
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-dl-border px-4 py-4">
              <h4 className="text-xs text-dl-gray font-dl-mono uppercase tracking-widest mb-3">Completion Status</h4>
              <div className="space-y-2">
                {[
                  { label: 'Wallet Connected', done: walletConnected },
                  { label: 'Documents Reviewed', done: steps[1]?.completed || false },
                  { label: 'Accreditation Verified', done: steps[2]?.completed || false },
                  { label: 'Subscription Signed', done: steps[3]?.completed || false },
                  { label: 'Deposited', done: steps[4]?.completed || false },
                ].map((stage, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className={`w-2.5 h-2.5 flex-shrink-0 border ${stage.done ? 'bg-dl-forest border-dl-forest' : 'border-dl-border bg-dl-bg'}`} />
                    <span className={stage.done ? 'text-dl-navy' : 'text-dl-gray'}>{stage.label}</span>
                    {stage.done && <span className="text-dl-forest ml-auto">✓</span>}
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
              {steps[2]?.completed ? (
                <div className="border border-dl-border bg-dl-bg p-6 mb-6">
                  <p className="text-xs text-dl-gray uppercase tracking-widest font-dl-mono mb-2">Verification On File</p>
                  <p className="text-sm text-dl-gray mb-4 leading-relaxed">
                    Your accredited investor self-certification has been received and is under review.
                    No further action is required at this step.
                  </p>
                  <button
                    onClick={() => { updateStep(3, true); setCurrentStep(4); }}
                    className="px-6 py-2 bg-dl-navy text-white text-sm font-medium"
                  >
                    Continue to Invest
                  </button>
                </div>
              ) : (
              <>
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
              </>
              )}
            </StepCard>
          )}

          {currentStep === 4 && (
            <StepCard title="Step 4: Investment Amount">
              <p className="mb-6 text-dl-gray">
                Enter the amount you wish to invest. Minimum investment is {formatUSD('100')} AXUSD.
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
                    placeholder="100"
                  />
                </div>
                {parseFloat(amount) < 100 && (
                  <p className="text-sm mt-2 text-dl-error">Minimum investment is {formatUSD('100')}</p>
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

              {parseFloat(amount) >= 100 && (() => {
                // Live rate: protocol configured rate from fund-stats API (riskParams.interestRateBps).
                // Gross = actual configured borrower rate. Net ≈ 70% of gross (after reserve, protocol fees, servicing).
                // Falls back to the protocol floor (14% / 1400 bps) if the API hasn't responded yet.
                const grossRateAnnual = fundRateBps != null ? fundRateBps / 10000 : 0.14;
                const netRateAnnual = grossRateAnnual * 0.70; // conservative LP yield after deductions
                const grossPct = (grossRateAnnual * 100).toFixed(1);
                const netPct = (netRateAnnual * 100).toFixed(1);
                const dataSource = fundRateBps != null
                  ? `Live loan book rate (${poolUtilizationPct ?? '?'}% pool utilization)`
                  : 'Protocol floor rate (pending live data)';
                return (
                  <div className="border border-dl-border bg-dl-bg mb-6">
                    <div className="px-4 py-3 border-b border-dl-border">
                      <h4 className="font-medium text-dl-navy text-sm">Projected Yield Schedule — Illustrative</h4>
                      <p className="text-xs text-dl-gray mt-0.5">
                        Source: {dataSource}. Gross = configured borrower rate ({grossPct}%); Net = estimated LP distribution after reserve and protocol fees ({netPct}%). Actual returns variable.
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-dl-mono">
                        <thead>
                          <tr className="bg-dl-bg-alt">
                            <th className="px-3 py-2 text-left text-dl-gray font-normal">Period</th>
                            <th className="px-3 py-2 text-right text-dl-gray font-normal">Gross ({grossPct}%)</th>
                            <th className="px-3 py-2 text-right text-dl-gray font-normal">Net ({netPct}%)</th>
                            <th className="px-3 py-2 text-right text-dl-gray font-normal">Cumulative</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[3, 6, 9, 12].map((months) => {
                            const inv = parseFloat(amount);
                            const grossYield = inv * grossRateAnnual * (months / 12);
                            const netYield = inv * netRateAnnual * (months / 12);
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
                      <p className="text-xs text-dl-gray">
                        Rate sourced from live protocol configuration. Net = gross less ~30% for reserves, protocol fees, and servicing. Not a guarantee of returns.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={proceedToDeposit}
                disabled={parseFloat(amount) < 100}
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
                        <span className="text-dl-gray">Pool</span>
                        <span className="text-dl-navy">AXIOMCreditMarket — Fix &amp; Flip Lending Fund</span>
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
                          <span className="text-dl-navy">${parseFloat(vaultPosition.axusdBalanceUsd).toLocaleString()}</span>
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
                  ) : parseFloat(vaultPosition.axusdBalanceUsd) < parseFloat(amount) ? (
                    <div className="border border-dl-border bg-dl-bg-alt p-6 mb-6">
                      <h4 className="font-medium text-dl-navy mb-2">Insufficient AXUSD Balance</h4>
                      <p className="text-sm mb-4 text-dl-gray">
                        You need {formatUSD(amount)} AXUSD to invest, but your balance is ${parseFloat(vaultPosition.axusdBalanceUsd).toLocaleString()}.
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
                            ? "Step 1: Approve AXIOMCreditMarket to spend your AXUSD, then deposit."
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
                    Deposits go directly to AXIOMCreditMarket on Arbitrum One
                    {' · '}
                    <a
                      href={`https://arbitrum.blockscout.com/address/${CREDIT_MARKET_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-dl-navy"
                    >
                      View contract
                    </a>
                  </p>
                </>
              )}
            </StepCard>
          )}
        </div>
      </div>
      )}
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
