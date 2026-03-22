import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

interface CreditLine {
  credit_line_id: string;
  status: string;
  credit_limit_usd: string;
  drawn_amount_usd: string;
  available_balance_usd: string;
  outstanding_balance_usd: string;
  purpose: string;
  repayment_due_days: number;
  repayment_due_date: string | null;
  drawn_at: string | null;
  repaid_at: string | null;
  expires_at: string;
  gef_violation_flagged: boolean;
  interest_earned_usd: string | null;
  created_at: string;
  gef_tier_at_application: string;
  app_reference: string;
}

interface StatusResponse {
  success: boolean;
  walletAddress: string;
  gefTier: string;
  creditLimit: number;
  creditLines: CreditLine[];
  applications: unknown[];
  hasActiveLine: boolean;
}

interface ApplyResponse {
  success: boolean;
  approved?: boolean;
  applicationId?: string;
  creditLineId?: string;
  gefTier?: string;
  creditLimit?: number;
  approvedAmount?: number;
  purpose?: string;
  repaymentDueDays?: number;
  expiresAt?: string;
  rejectionReason?: string;
  message?: string;
}

const GEF_TIER_TABLE = [
  { tier: 'Observer', limit: '$0', eligible: false, desc: 'Complete the GEF qualification pathway to advance.' },
  { tier: 'Participant', limit: '$1,500', eligible: true, desc: 'First-cycle contributors. Entry bridge + contribution smoothing.' },
  { tier: 'Operator', limit: '$5,000', eligible: true, desc: 'Multi-cycle contributors with consistent execution record.' },
  { tier: 'Steward', limit: '$10,000', eligible: true, desc: 'Group facilitators. All three use cases available.' },
  { tier: 'Architect', limit: '$25,000', eligible: true, desc: 'Protocol builders. Earnest money up to $25K.' },
];

const USE_CASES = [
  {
    id: 'wealth_practice_entry',
    title: 'Wealth Practice Entry Bridge',
    range: '$500 – $1,500',
    repayment: '30 days',
    desc: 'You have a steady W-2 income but no immediate liquidity for your first Wealth Practice contribution. A short-term income-backed credit line covers the initial contribution. Repaid from your next paycheck.',
    tier: 'Participant+',
  },
  {
    id: 'contribution_smoothing',
    title: 'Contribution Smoothing',
    range: '$50 – $500',
    repayment: '60 days',
    desc: 'A payroll timing mismatch means you would miss a cycle. A micro credit line keeps your Wealth Practice group active and your record clean. Repaid within 60 days.',
    tier: 'Participant+',
  },
  {
    id: 'earnest_money',
    title: 'Earnest Money Deposit',
    range: '$3,000 – $25,000',
    repayment: '90 days',
    desc: 'You found a property through Deal Flow and need earnest money before your financing closes. Income-backed bridge covers the deposit. Repaid at closing or within 90 days.',
    tier: 'Operator+',
  },
];

const PURPOSE_LABELS: Record<string, string> = {
  wealth_practice_entry: 'Wealth Practice Entry Bridge',
  contribution_smoothing: 'Contribution Smoothing',
  earnest_money: 'Earnest Money Deposit',
};

const STATUS_STYLES: Record<string, string> = {
  active: 'border border-dl-forest text-dl-forest',
  drawn: 'border border-dl-gold text-dl-gold',
  repaid: 'border border-dl-navy text-dl-navy',
  defaulted: 'border border-red-600 text-red-600',
  expired: 'border border-dl-gray text-dl-gray',
};

function getEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum ?? null;
}

async function getSignedHeaders(walletAddress: string): Promise<Record<string, string> | null> {
  try {
    const eth = getEthereum();
    if (!eth) return null;
    const nonceRes = await fetch(`/api/community-credit/nonce?walletAddress=${encodeURIComponent(walletAddress)}`);
    if (!nonceRes.ok) return null;
    const { message } = await nonceRes.json();
    if (!message) return null;
    const sig = await eth.request({
      method: 'personal_sign',
      params: [message, walletAddress],
    });
    return {
      'x-wallet-signature': sig,
      'x-wallet-message': message,
    };
  } catch {
    return null;
  }
}

export default function CommunityCreditPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [walletInput, setWalletInput] = useState('');
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  const [form, setForm] = useState({
    statedMonthlyIncomeUsd: '',
    requestedAmountUsd: '',
    requestedPurpose: 'wealth_practice_entry',
  });
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResponse | null>(null);
  const [applyError, setApplyError] = useState('');

  useEffect(() => {
    const eth = getEthereum();
    if (eth) {
      eth.request({ method: 'eth_accounts' }).then((result) => {
        const accounts = result as string[];
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletInput(accounts[0]);
          fetchStatus(accounts[0]);
        }
      }).catch(() => {});
    }
  }, []);

  const fetchStatus = async (addr: string) => {
    setStatusLoading(true);
    setStatusError('');
    setStatus(null);
    try {
      const authHeaders = await getSignedHeaders(addr);
      if (!authHeaders) {
        setStatusError('Connect a wallet with MetaMask to view your credit status. Signature required.');
        setStatusLoading(false);
        return;
      }
      const res = await fetch(`/api/community-credit/status?walletAddress=${encodeURIComponent(addr)}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      } else {
        setStatusError(data.error || 'Failed to load status');
      }
    } catch {
      setStatusError('Failed to load status');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleLookup = () => {
    const addr = walletInput.trim();
    if (!addr) return;
    setWalletAddress(addr);
    fetchStatus(addr);
  };

  const handleApply = async () => {
    if (!walletAddress) {
      setApplyError('Enter a wallet address first');
      return;
    }
    if (!form.requestedAmountUsd || !form.requestedPurpose) {
      setApplyError('Requested amount and purpose are required');
      return;
    }
    setApplying(true);
    setApplyError('');
    setApplyResult(null);
    try {
      const authHeaders = await getSignedHeaders(walletAddress);
      if (!authHeaders) {
        setApplyError('Wallet signature required. Connect MetaMask and approve the signature request to continue.');
        setApplying(false);
        return;
      }
      const res = await fetch('/api/community-credit/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          walletAddress,
          statedMonthlyIncomeUsd: form.statedMonthlyIncomeUsd || undefined,
          requestedAmountUsd: parseFloat(form.requestedAmountUsd),
          requestedPurpose: form.requestedPurpose,
        }),
      });
      const data = await res.json();
      setApplyResult(data);
      if (data.approved) {
        fetchStatus(walletAddress);
      }
    } catch {
      setApplyError('Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Community Entry Credit — Axiom Protocol</title>
        <meta name="description" content="Income-backed micro credit lines for W-2 earners entering the Wealth Practice. No crypto collateral required." />
      </Head>

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-4 font-dl-mono">Community Infrastructure — Stage 0</p>
        <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Community Entry Credit
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed mb-4">
          An income-backed micro credit line for W-2 earners who are ready to start building wealth through real estate
          but need short-term liquidity to take the first step. No crypto collateral required. Your GEF tier is your credit score.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/start">
            <SolidButton variant="secondary">View the Full Journey</SolidButton>
          </Link>
          <Link href="/wealth-practice">
            <SolidButton variant="secondary">Join a Wealth Practice Group</SolidButton>
          </Link>
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>How the Credit Line Works</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-dl-border">
          {[
            { num: '1', title: 'Qualify', desc: 'Your GEF tier determines your credit limit. No bank check, no collateral, no crypto overcollateralization.' },
            { num: '2', title: 'Apply', desc: 'Connect your wallet, sign a proof of ownership, state your W-2 income, and request a credit line. The Evaluation Agent reviews instantly.' },
            { num: '3', title: 'Draw', desc: 'Once approved, draw down your credit line. AXUSD is disbursed from the protocol treasury to your wallet.' },
            { num: '4', title: 'Repay', desc: 'Repay within 30, 60, or 90 days depending on purpose. Interest is distributed to the community junior pool.' },
          ].map((step, i) => (
            <div key={step.num} className={`px-5 py-5 border-t-4 border-t-dl-forest ${i < 3 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}>
              <p className="font-dl-mono text-2xl text-dl-forest font-bold mb-2">{step.num}</p>
              <h3 className="font-dl-serif text-sm text-dl-navy font-medium mb-1">{step.title}</h3>
              <p className="text-xs text-dl-gray leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Three Use Cases</SectionHeading>
        <div className="border border-dl-border">
          {USE_CASES.map((uc, i) => (
            <div key={uc.id} className={`px-6 py-5 ${i < USE_CASES.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'} border-l-4 border-l-dl-forest`}>
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 mb-2">
                <h3 className="font-dl-serif text-base text-dl-navy font-medium">{uc.title}</h3>
                <div className="flex gap-3 text-xs font-dl-mono text-dl-gray whitespace-nowrap">
                  <span>{uc.range}</span>
                  <span>|</span>
                  <span>Repay in {uc.repayment}</span>
                  <span>|</span>
                  <span>{uc.tier}</span>
                </div>
              </div>
              <p className="text-sm text-dl-gray leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Credit Limits by GEF Tier</SectionHeading>
        <div className="border border-dl-border">
          {GEF_TIER_TABLE.map((row, i) => (
            <div key={row.tier} className={`px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 ${i < GEF_TIER_TABLE.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
              <div className="flex items-center gap-4">
                <span className={`font-dl-mono text-xs px-2 py-0.5 border ${row.eligible ? 'border-dl-forest text-dl-forest' : 'border-dl-gray text-dl-gray'}`}>
                  {row.tier}
                </span>
                <p className="text-sm text-dl-gray">{row.desc}</p>
              </div>
              <p className={`font-dl-mono text-lg font-bold whitespace-nowrap ${row.eligible ? 'text-dl-navy' : 'text-dl-gray'}`}>
                {row.limit}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-dl-gray mt-3">
          GEF tier is your cumulative participation record in the Graduated Execution Framework.{' '}
          <Link href="/start" className="text-dl-navy underline">Learn how to advance your tier &rarr;</Link>
        </p>
      </div>

      <div className="mb-12">
        <SectionHeading>Enforcement — The GEF Violation Mechanism</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt border-l-4 border-l-dl-gold">
          <p className="text-sm text-dl-gray leading-relaxed mb-3">
            Community Entry Credit does not use crypto overcollateralization or court-enforced collateral seizure in V1.
            The enforcement mechanism is behavioral: unpaid balances past the due date trigger a GEF violation flag on your wallet.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed mb-3">
            A GEF violation flag pauses tier advancement — you cannot advance from Participant to Operator while a balance is outstanding.
            Lines more than 60 days past due are marked as defaulted.
            The flag is automatically cleared when the outstanding balance is fully repaid.
          </p>
          <p className="text-sm text-dl-gray leading-relaxed">
            This design prioritizes community trust over token seizure. The credit line is a tool for people who are building —
            not a mechanism for platform capture of collateral.
          </p>
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>The Community Flywheel</SectionHeading>
        <div className="border border-dl-border">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
            {[
              { label: 'New Member', desc: 'Needs capital to join Wealth Practice. Gets income-backed credit line.' },
              { label: 'Senior Tranche', desc: 'Protocol treasury (AXUSD) funds the disbursement at origination.' },
              { label: 'Junior Tranche', desc: 'Wealth Practice graduates fund the junior tranche. Earn yield from interest on new member loans.' },
              { label: 'Cycle Closes', desc: 'Member repays. Graduate earns yield. Member advances GEF tier. Next entrant joins.' },
            ].map((item, i) => (
              <div key={item.label} className={`p-5 ${i < 3 ? 'md:border-r border-b md:border-b-0 border-dl-border' : ''}`}>
                <p className="font-dl-mono text-xs text-dl-forest uppercase tracking-wider mb-2">{item.label}</p>
                <p className="text-sm text-dl-gray leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-dl-border px-5 py-3 bg-dl-bg-alt">
            <p className="text-xs text-dl-gray">
              Graduated Wealth Practice members can participate in the community junior LP pool. Interest distributions are processed on repayment.{' '}
              <Link href="/lending-fund" className="text-dl-navy underline">View the community junior tranche &rarr;</Link>
            </p>
          </div>
        </div>
      </div>

      <div className="mb-12">
        <SectionHeading>Check Your Credit Status</SectionHeading>
        <div className="border border-dl-border p-6">
          <p className="text-xs text-dl-gray mb-4 border border-dl-border px-3 py-2 bg-dl-bg-alt">
            Wallet signature required to view credit status. Your signature proves wallet ownership and protects your financial data.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              type="text"
              placeholder="0x wallet address"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="flex-1 border border-dl-border bg-dl-bg px-4 py-2.5 text-sm font-dl-mono text-dl-navy focus:outline-none min-h-[44px]"
            />
            <button
              onClick={handleLookup}
              className="border border-dl-navy bg-dl-bg text-dl-navy px-6 py-2.5 min-h-[44px] text-sm font-bold hover:bg-dl-navy hover:text-white"
            >
              Sign &amp; Look Up
            </button>
          </div>

          {statusLoading && <p className="text-sm text-dl-gray">Requesting wallet signature...</p>}
          {statusError && <p className="text-sm" style={{ color: '#991b1b' }}>{statusError}</p>}

          {status && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-0 border border-dl-border mb-4">
                <div className="px-4 py-3 bg-dl-bg border-r border-dl-border">
                  <p className="text-xs text-dl-gray mb-1">GEF Tier</p>
                  <p className="font-dl-mono text-sm font-bold text-dl-navy">{status.gefTier}</p>
                </div>
                <div className="px-4 py-3 bg-dl-bg-alt border-r border-dl-border">
                  <p className="text-xs text-dl-gray mb-1">Credit Limit</p>
                  <p className="font-dl-mono text-sm font-bold text-dl-navy">
                    {status.creditLimit === 0 ? 'Not eligible' : `$${status.creditLimit.toLocaleString()}`}
                  </p>
                </div>
                <div className="px-4 py-3 bg-dl-bg col-span-2 md:col-span-1">
                  <p className="text-xs text-dl-gray mb-1">Active Line</p>
                  <p className="font-dl-mono text-sm font-bold text-dl-navy">{status.hasActiveLine ? 'Yes' : 'None'}</p>
                </div>
              </div>

              {status.creditLines?.length > 0 && (
                <div>
                  <p className="text-xs text-dl-gray uppercase font-dl-mono tracking-wider mb-2">Credit Lines</p>
                  <div className="border border-dl-border">
                    {status.creditLines.map((line, i) => (
                      <div key={line.credit_line_id} className={`px-4 py-3 ${i < status.creditLines.length - 1 ? 'border-b border-dl-border' : ''} ${i % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-dl-mono text-xs text-dl-gray">{line.credit_line_id}</p>
                            <p className="text-sm text-dl-navy">{PURPOSE_LABELS[line.purpose] || line.purpose}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-0.5 font-dl-mono ${STATUS_STYLES[line.status] || ''}`}>
                              {line.status?.toUpperCase()}
                            </span>
                            <p className="font-dl-mono text-sm text-dl-navy">
                              ${parseFloat(line.outstanding_balance_usd || '0').toFixed(2)} owed
                            </p>
                          </div>
                        </div>
                        {line.repayment_due_date && (
                          <p className="text-xs text-dl-gray mt-1">
                            Repayment due: {new Date(line.repayment_due_date).toLocaleDateString()}
                          </p>
                        )}
                        {line.gef_violation_flagged && (
                          <p className="text-xs mt-1" style={{ color: '#991b1b' }}>
                            GEF violation flag active — tier advancement paused until balance is repaid
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {status && status.creditLimit > 0 && !status.hasActiveLine && (
        <div className="mb-12">
          <SectionHeading>Apply for a Credit Line</SectionHeading>
          <div className="border border-dl-border p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-dl-mono text-dl-gray uppercase mb-1">Purpose</label>
                <select
                  value={form.requestedPurpose}
                  onChange={(e) => setForm((f) => ({ ...f, requestedPurpose: e.target.value }))}
                  className="w-full border border-dl-border bg-dl-bg px-3 py-2.5 text-sm text-dl-navy focus:outline-none min-h-[44px]"
                >
                  <option value="wealth_practice_entry">Wealth Practice Entry Bridge (30-day repayment)</option>
                  <option value="contribution_smoothing">Contribution Smoothing (60-day repayment)</option>
                  <option value="earnest_money">Earnest Money Deposit (90-day repayment)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-gray uppercase mb-1">Requested Amount (USD)</label>
                <input
                  type="number"
                  value={form.requestedAmountUsd}
                  onChange={(e) => setForm((f) => ({ ...f, requestedAmountUsd: e.target.value }))}
                  placeholder={`Up to $${status.creditLimit.toLocaleString()}`}
                  max={status.creditLimit}
                  className="w-full border border-dl-border bg-dl-bg px-3 py-2.5 text-sm font-dl-mono text-dl-navy focus:outline-none min-h-[44px]"
                />
              </div>
              <div>
                <label className="block text-xs font-dl-mono text-dl-gray uppercase mb-1">Monthly W-2 Income (USD, optional)</label>
                <input
                  type="number"
                  value={form.statedMonthlyIncomeUsd}
                  onChange={(e) => setForm((f) => ({ ...f, statedMonthlyIncomeUsd: e.target.value }))}
                  placeholder="e.g. 4500"
                  className="w-full border border-dl-border bg-dl-bg px-3 py-2.5 text-sm font-dl-mono text-dl-navy focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            {applyError && <p className="text-sm mb-3" style={{ color: '#991b1b' }}>{applyError}</p>}

            {applyResult && (
              <div className={`border p-4 mb-4 ${applyResult.approved ? 'border-dl-forest bg-green-50' : 'border-red-300 bg-red-50'}`}>
                <p className="text-sm font-medium mb-1" style={{ color: applyResult.approved ? '#2d5016' : '#991b1b' }}>
                  {applyResult.approved ? 'Application Approved' : 'Application Not Approved'}
                </p>
                <p className="text-sm text-dl-gray">{applyResult.message || applyResult.rejectionReason}</p>
                {applyResult.approved && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-dl-mono">
                    <div>
                      <p className="text-dl-gray">Approved Amount</p>
                      <p className="text-dl-navy font-bold">${parseFloat(applyResult.approvedAmount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-dl-gray">Repayment Period</p>
                      <p className="text-dl-navy font-bold">{applyResult.repaymentDueDays} days after draw</p>
                    </div>
                    <div>
                      <p className="text-dl-gray">Credit Line ID</p>
                      <p className="text-dl-navy font-bold truncate">{applyResult.creditLineId}</p>
                    </div>
                    <div>
                      <p className="text-dl-gray">Expires</p>
                      <p className="text-dl-navy font-bold">{new Date(applyResult.expiresAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleApply}
              disabled={applying}
              className="border border-dl-navy bg-dl-navy text-white px-6 py-2.5 min-h-[44px] text-sm font-bold hover:opacity-90 disabled:opacity-50"
            >
              {applying ? 'Signing & Submitting...' : 'Sign & Submit Application'}
            </button>
            <p className="text-xs text-dl-gray mt-2">
              Your wallet will be asked to sign a message proving ownership. No gas is spent. By submitting, you acknowledge the GEF violation mechanism governs repayment enforcement.
            </p>
          </div>
        </div>
      )}

      <div className="mb-8">
        <SectionHeading>Disclosure</SectionHeading>
        <div className="border border-dl-border p-6 bg-dl-bg-alt border-l-4 border-l-dl-error">
          <p className="text-xs text-dl-gray leading-relaxed">
            Community Entry Credit is an early-stage protocol product. Credit lines are denominated in AXUSD and disbursed from the protocol treasury.
            This is not a bank product and is not FDIC insured. It does not constitute a consumer credit product under Regulation Z in its current form.
            All participation carries risk. The GEF violation mechanism is a platform-level enforcement tool, not a legal debt instrument.
            Review the full disclosure documentation before participating.
          </p>
        </div>
      </div>
    </DesignLawLayout>
  );
}
