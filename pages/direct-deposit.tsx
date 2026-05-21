'use client';

import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { DesignLawLayout, SectionHeading } from '../components/design-law';
import { SolidButton } from '../components/design-law/SolidButton';

// ─── Types ─────────────────────────────────────────────────────────────────────

type Step = 'amount' | 'identity' | 'kyc_pending' | 'instructions' | 'error';
type Tab  = 'deposit' | 'accounts';

interface DepositInstructions {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountName: string;
  memo: string;
  amountFormatted: string;
  expiresAt: string;
}

interface TransferRow {
  id: string;
  direction: string;
  status: string;
  fiat_amount_cents: number;
  crypto_asset: string;
  bridge_state: string | null;
  deposit_bank_name: string | null;
  deposit_routing_num: string | null;
  deposit_account_num: string | null;
  deposit_memo: string | null;
  created_at: string;
  completed_at: string | null;
  failed_at: string | null;
}

interface VirtualAccount {
  id: string;
  deposit_bank_name: string | null;
  deposit_account_number: string | null;
  deposit_routing_number: string | null;
  deposit_memo: string | null;
  destination_address: string;
  destination_currency: string;
  status: string;
  created_at: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    initiated:       'Initiated',
    ach_pending:     'ACH Pending',
    ach_settled:     'ACH Settled',
    crypto_pending:  'Converting',
    completed:       'Completed',
    failed:          'Failed',
    canceled:        'Canceled',
  };
  return map[status] ?? status;
}

function statusColor(status: string) {
  if (status === 'completed') return 'text-dl-forest';
  if (status === 'failed' || status === 'canceled') return 'text-red-600';
  return 'text-dl-gold';
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function DirectDepositPage() {
  const { address, isConnected } = useAccount();

  const [tab,           setTab]           = useState<Tab>('deposit');
  const [step,          setStep]          = useState<Step>('amount');
  const [amountDollars, setAmountDollars] = useState('');
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [instructions,  setInstructions]  = useState<DepositInstructions | null>(null);
  const [kycUrl,        setKycUrl]        = useState('');
  const [transferId,    setTransferId]    = useState('');
  const [history,       setHistory]       = useState<TransferRow[]>([]);
  const [virtAccts,     setVirtAccts]     = useState<VirtualAccount[]>([]);
  const [histLoading,   setHistLoading]   = useState(false);
  const [custStatus,    setCustStatus]    = useState<{ kycStatus?: string } | null>(null);

  const amountCents = Math.round(parseFloat(amountDollars || '0') * 100);
  const validAmount = amountCents >= 1000 && amountCents <= 2_500_000;
  const feeCents    = Math.round(amountCents * 0.005);
  const netCents    = amountCents - feeCents;

  // Load customer status + history once wallet connected
  useEffect(() => {
    if (!isConnected || !address) return;
    loadCustomerStatus();
    loadHistory();
  }, [isConnected, address]);

  async function loadCustomerStatus() {
    try {
      const res = await fetch('/api/bridge/customers');
      if (res.ok) {
        const data = await res.json();
        if (data.customer) setCustStatus({ kycStatus: data.customer.kyc_status });
      }
    } catch { /* silent */ }
  }

  async function loadHistory() {
    setHistLoading(true);
    try {
      const [histRes, vaRes] = await Promise.all([
        fetch('/api/bridge/history'),
        fetch('/api/bridge/virtual-accounts'),
      ]);
      if (histRes.ok) {
        const d = await histRes.json();
        setHistory((d.transfers ?? []).filter((t: TransferRow) => t.direction === 'fiat_to_crypto'));
      }
      if (vaRes.ok) {
        const d = await vaRes.json();
        setVirtAccts(d.accounts ?? []);
      }
    } catch { /* silent */ }
    setHistLoading(false);
  }

  function reset() {
    setStep('amount');
    setAmountDollars('');
    setInstructions(null);
    setTransferId('');
    setError('');
  }

  // ── Submit deposit ──────────────────────────────────────────────────────────

  async function submitDeposit(nameOverride?: string, emailOverride?: string) {
    if (!address) { setError('Connect your wallet first.'); return; }
    if (!validAmount) { setError('Enter an amount between $10 and $25,000.'); return; }

    setLoading(true);
    setError('');

    try {
      const body: Record<string, unknown> = {
        direction: 'fiat_to_crypto',
        fiatAmountCents: amountCents,
        cryptoAsset: 'AXUSD',
        bitgoWalletId: address,
      };
      if (nameOverride)  body.fullName = nameOverride;
      if (emailOverride) body.email    = emailOverride;

      const res  = await fetch('/api/bridge/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (data.kycRequired) {
        if (data.kycUrl) { setKycUrl(data.kycUrl); setStep('kyc_pending'); }
        else             { setStep('identity'); }
        return;
      }
      if (!data.success) { setError(data.error ?? 'Transfer failed.'); setStep('error'); return; }

      setInstructions(data.depositInfo ?? null);
      setTransferId(data.transferId ?? '');
      setStep('instructions');
      loadHistory();
    } catch (e: any) {
      setError(e.message ?? 'Network error. Try again.');
      setStep('error');
    } finally {
      setLoading(false);
    }
  }

  // ── Create identity + re-submit ──────────────────────────────────────────────

  async function submitIdentity() {
    if (!fullName.trim() || !email.trim()) { setError('Name and email are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/bridge/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Account creation failed.'); return; }
      setCustStatus({ kycStatus: data.kycStatus });
      if (data.kycRequired && data.kycUrl) { setKycUrl(data.kycUrl); setStep('kyc_pending'); }
      else if (!data.kycRequired)           { await submitDeposit(fullName, email); }
      else                                  { setError('Identity verification is required. Complete KYC to enable ACH deposits.'); }
    } catch { setError('Network error. Try again.'); }
    finally  { setLoading(false); }
  }

  // ── Create virtual account ───────────────────────────────────────────────────

  async function createVirtualAccount() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/bridge/virtual-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationAddress: address }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Failed to create virtual account.'); return; }
      loadHistory();
      setTab('accounts');
    } catch { setError('Network error. Try again.'); }
    finally  { setLoading(false); }
  }

  // ─── Not connected ──────────────────────────────────────────────────────────
  if (!isConnected) {
    return (
      <DesignLawLayout>
        <Head><title>Direct Deposit | Axiom Protocol</title></Head>
        <div className="border border-dl-border bg-dl-bg-alt px-8 py-12 text-center max-w-2xl mx-auto mt-12">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-4">Settlement Rails</p>
          <h1 className="font-dl-serif text-2xl text-dl-navy mb-4">Direct Deposit (ACH)</h1>
          <p className="text-sm text-dl-gray leading-relaxed">Connect your wallet to access ACH deposit rails.</p>
        </div>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <Head><title>Direct Deposit | Axiom Protocol</title></Head>

      <div className="mb-4 border-b border-dl-border pb-2">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-1">Settlement Rails · Bridge.xyz</p>
        <h2 className="font-dl-serif text-xl text-dl-navy">Direct Deposit — ACH Rail</h2>
        <p className="font-dl-mono text-xs text-dl-gray mt-1 leading-relaxed">Fund your Arbitrum One wallet via ACH bank transfer. USD settles as AXUSD within 1–3 business days.</p>
      </div>

      {/* ── KYC status banner ──────────────────────────────────────────────── */}
      {custStatus && custStatus.kycStatus && custStatus.kycStatus !== 'approved' && (
        <div className="mb-6 border border-amber-300 bg-amber-50 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-dl-mono text-xs text-amber-700 uppercase tracking-widest">Identity Status</p>
            <p className="font-dl-mono text-xs text-amber-800 mt-1">
              KYC: <strong>{custStatus.kycStatus.replace('_', ' ').toUpperCase()}</strong> — Complete verification to enable ACH deposits.
            </p>
          </div>
          <a
            href="/api/bridge/customers/kyc"
            onClick={async e => {
              e.preventDefault();
              setLoading(true);
              try {
                const r = await fetch('/api/bridge/customers/kyc', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
                const d = await r.json();
                if (d.kycUrl) window.open(d.kycUrl, '_blank');
              } catch { /* silent */ }
              setLoading(false);
            }}
            className="font-dl-mono text-xs text-amber-700 border border-amber-400 px-4 py-2 hover:bg-amber-100 cursor-pointer"
          >
            Verify Identity →
          </a>
        </div>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-dl-border mb-8">
        {(['deposit', 'accounts'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`font-dl-mono text-xs uppercase tracking-widest px-6 py-3 border-b-2 -mb-px transition-none ${
              tab === t ? 'border-dl-navy text-dl-navy' : 'border-transparent text-dl-gray hover:text-dl-navy'
            }`}
          >
            {t === 'deposit' ? 'ACH Deposit' : 'Accounts & History'}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DEPOSIT
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'deposit' && (
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 space-y-0">

            {/* ── Step: Amount ────────────────────────────────────────────── */}
            {step === 'amount' && (
              <div className="border border-dl-border bg-dl-bg-alt">
                <div className="px-6 py-4 border-b border-dl-border">
                  <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Step 1 of 2 — Enter Amount</p>
                </div>
                <div className="px-6 py-6 space-y-5">
                  <div>
                    <label className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest block mb-2">
                      Deposit Amount (USD)
                    </label>
                    <div className="flex items-center border border-dl-border bg-white">
                      <span className="px-4 font-dl-mono text-sm text-dl-gray border-r border-dl-border py-3">$</span>
                      <input
                        type="number"
                        min="10"
                        max="25000"
                        step="1"
                        value={amountDollars}
                        onChange={e => { setAmountDollars(e.target.value); setError(''); }}
                        placeholder="100.00"
                        className="flex-1 px-4 py-3 font-dl-mono text-sm text-dl-navy outline-none bg-transparent"
                      />
                      <span className="px-4 font-dl-mono text-xs text-dl-gray">USD</span>
                    </div>
                    <p className="font-dl-mono text-xs text-dl-gray mt-2">Min $10 · Max $25,000 per transfer</p>
                  </div>

                  {amountCents > 0 && validAmount && (
                    <dl className="border border-dl-border divide-y divide-dl-border">
                      <div className="flex justify-between px-4 py-2">
                        <dt className="font-dl-mono text-xs text-dl-gray">Gross Amount</dt>
                        <dd className="font-dl-mono text-xs text-dl-navy">{fmt(amountCents)}</dd>
                      </div>
                      <div className="flex justify-between px-4 py-2">
                        <dt className="font-dl-mono text-xs text-dl-gray">Protocol Fee (0.50%)</dt>
                        <dd className="font-dl-mono text-xs text-dl-navy">− {fmt(feeCents)}</dd>
                      </div>
                      <div className="flex justify-between px-4 py-2 bg-white">
                        <dt className="font-dl-mono text-xs text-dl-navy font-semibold">You Receive (AXUSD)</dt>
                        <dd className="font-dl-mono text-xs text-dl-navy font-semibold">{(netCents / 100).toFixed(2)} AXUSD</dd>
                      </div>
                    </dl>
                  )}

                  {error && (
                    <p className="font-dl-mono text-xs text-red-600 border border-red-200 bg-red-50 px-4 py-3">{error}</p>
                  )}

                  <SolidButton
                    onClick={() => submitDeposit()}
                    disabled={!validAmount || loading}
                    className="w-full"
                  >
                    {loading ? 'Processing…' : 'Get Deposit Instructions →'}
                  </SolidButton>
                </div>
              </div>
            )}

            {/* ── Step: Identity ──────────────────────────────────────────── */}
            {step === 'identity' && (
              <div className="border border-dl-border bg-dl-bg-alt">
                <div className="px-6 py-4 border-b border-dl-border">
                  <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Step 1 of 2 — Identity Required</p>
                </div>
                <div className="px-6 py-6 space-y-5">
                  <p className="text-sm text-dl-gray leading-relaxed">
                    A one-time identity verification is required to open your settlement account. Provide your legal name and email — you will receive a KYC link.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest block mb-2">Legal Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder="Jane Smith"
                        className="w-full border border-dl-border bg-white px-4 py-3 font-dl-mono text-sm text-dl-navy outline-none"
                      />
                    </div>
                    <div>
                      <label className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest block mb-2">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="jane@example.com"
                        className="w-full border border-dl-border bg-white px-4 py-3 font-dl-mono text-sm text-dl-navy outline-none"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="font-dl-mono text-xs text-red-600 border border-red-200 bg-red-50 px-4 py-3">{error}</p>
                  )}

                  <div className="flex gap-3">
                    <SolidButton
                      onClick={submitIdentity}
                      disabled={loading || !fullName.trim() || !email.includes('@')}
                      className="flex-1"
                    >
                      {loading ? 'Creating Account…' : 'Continue'}
                    </SolidButton>
                    <button
                      onClick={() => { setStep('amount'); setError(''); }}
                      className="px-6 py-2 border border-dl-border font-dl-mono text-xs text-dl-gray hover:text-dl-navy"
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step: KYC Pending ───────────────────────────────────────── */}
            {step === 'kyc_pending' && (
              <div className="border border-dl-border bg-dl-bg-alt">
                <div className="px-6 py-4 border-b border-dl-border">
                  <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Identity Verification Required</p>
                </div>
                <div className="px-6 py-8 space-y-6 text-center">
                  <h2 className="font-dl-serif text-xl text-dl-navy">Complete KYC to Activate Rail</h2>
                  <p className="text-sm text-dl-gray leading-relaxed max-w-md mx-auto">
                    Your settlement account has been created. Complete the one-time identity check to enable ACH deposits — typically takes 1–3 minutes.
                  </p>
                  {kycUrl && (
                    <a
                      href={kycUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-dl-navy text-white font-dl-mono text-xs px-8 py-3 hover:bg-dl-forest"
                    >
                      Complete Identity Verification →
                    </a>
                  )}
                  <p className="font-dl-mono text-xs text-dl-gray">
                    Once approved, return here and resubmit your deposit.
                  </p>
                  <button
                    onClick={() => { setStep('amount'); setError(''); }}
                    className="font-dl-mono text-xs text-dl-gray underline block mx-auto"
                  >
                    ← Back to deposit form
                  </button>
                </div>
              </div>
            )}

            {/* ── Step: Instructions ──────────────────────────────────────── */}
            {step === 'instructions' && instructions && (
              <div className="border border-dl-border bg-dl-bg-alt">
                <div className="px-6 py-4 border-b border-dl-border flex items-center gap-3">
                  <span className="w-5 h-5 bg-dl-forest text-white flex items-center justify-center text-xs font-dl-mono">✓</span>
                  <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Step 2 of 2 — Initiate Bank Transfer</p>
                </div>
                <div className="px-6 py-6 space-y-5">
                  <p className="text-sm text-dl-gray leading-relaxed">
                    Log in to your bank and send exactly <strong className="text-dl-navy">{instructions.amountFormatted}</strong> via ACH using the details below. Include the memo exactly as shown.
                  </p>

                  <dl className="border border-dl-border divide-y divide-dl-border">
                    {([
                      ['Bank',             instructions.bankName],
                      ['Routing Number',   instructions.routingNumber],
                      ['Account Number',   instructions.accountNumber],
                      ['Account Name',     instructions.accountName],
                      ['Memo / Reference', instructions.memo],
                      ['Amount',           instructions.amountFormatted],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex justify-between px-4 py-3">
                        <dt className="font-dl-mono text-xs text-dl-gray w-36 shrink-0">{label}</dt>
                        <dd className="font-dl-mono text-xs text-dl-navy font-semibold text-right select-all break-all">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="font-dl-mono text-xs text-amber-700">
                      Include the exact memo above. Do not modify the amount.
                      These instructions expire {new Date(instructions.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.
                    </p>
                  </div>

                  {transferId && (
                    <p className="font-dl-mono text-xs text-dl-gray">
                      Transfer ID: <span className="text-dl-navy select-all">{transferId}</span>
                    </p>
                  )}

                  <SolidButton onClick={reset} className="w-full">
                    New Deposit
                  </SolidButton>
                </div>
              </div>
            )}

            {/* ── Step: Error ─────────────────────────────────────────────── */}
            {step === 'error' && (
              <div className="border border-red-200 bg-red-50">
                <div className="px-6 py-4 border-b border-red-200">
                  <p className="font-dl-mono text-xs text-red-600 uppercase tracking-widest">Transfer Error</p>
                </div>
                <div className="px-6 py-6 space-y-4">
                  <p className="text-sm text-red-700">{error}</p>
                  <SolidButton onClick={reset}>Try Again</SolidButton>
                </div>
              </div>
            )}
          </div>

          {/* ── Rail Info ─────────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-0">
            <div className="border border-dl-border divide-y divide-dl-border">
              <div className="px-5 py-3 bg-dl-bg-alt">
                <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Rail Parameters</p>
              </div>
              {[
                ['Settlement',  '1–3 business days'],
                ['Rail',        'ACH (US domestic)'],
                ['Destination', 'AXUSD on Arbitrum One'],
                ['Minimum',     '$10.00'],
                ['Maximum',     '$25,000'],
                ['Fee',         '0.50%'],
                ['KYC',         'Required (one-time)'],
                ['Custodian',   'Bridge.xyz by Stripe'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-5 py-3">
                  <span className="font-dl-mono text-xs text-dl-gray">{k}</span>
                  <span className="font-dl-mono text-xs text-dl-navy">{v}</span>
                </div>
              ))}
            </div>

            {custStatus?.kycStatus === 'approved' && virtAccts.length === 0 && (
              <div className="border border-dl-border mt-0 border-t-0">
                <div className="px-5 py-3 bg-dl-bg-alt border-b border-dl-border">
                  <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Persistent Deposit Account</p>
                </div>
                <div className="px-5 py-5 space-y-3">
                  <p className="font-dl-mono text-xs text-dl-gray leading-relaxed">
                    A virtual account gives you a dedicated routing and account number — any ACH push to it automatically converts to AXUSD.
                  </p>
                  <SolidButton onClick={createVirtualAccount} disabled={loading} className="w-full">
                    {loading ? 'Creating…' : 'Create Permanent Account →'}
                  </SolidButton>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: ACCOUNTS & HISTORY
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'accounts' && (
        <div className="space-y-8">

          {/* Virtual accounts */}
          <div className="border border-dl-border">
            <div className="px-6 py-4 border-b border-dl-border flex items-center justify-between">
              <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Permanent ACH Deposit Accounts</p>
              {custStatus?.kycStatus === 'approved' && (
                <button
                  onClick={createVirtualAccount}
                  disabled={loading}
                  className="font-dl-mono text-xs text-dl-navy border border-dl-border px-4 py-2 hover:bg-dl-bg-alt disabled:opacity-50"
                >
                  {loading ? 'Creating…' : '+ New Account'}
                </button>
              )}
            </div>

            {histLoading && (
              <p className="font-dl-mono text-xs text-dl-gray px-6 py-6">Loading…</p>
            )}

            {!histLoading && virtAccts.length === 0 && (
              <div className="px-6 py-8 text-center">
                <p className="font-dl-mono text-xs text-dl-gray">
                  {custStatus?.kycStatus === 'approved'
                    ? 'No permanent deposit accounts yet. Create one to get a dedicated routing and account number.'
                    : 'Identity verification required to create a permanent deposit account.'}
                </p>
              </div>
            )}

            {!histLoading && virtAccts.length > 0 && (
              <div className="divide-y divide-dl-border">
                {virtAccts.map(va => (
                  <div key={va.id} className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="font-dl-mono text-xs text-dl-gray mb-1">Bank</p>
                      <p className="font-dl-mono text-xs text-dl-navy">{va.deposit_bank_name ?? '—'}</p>
                    </div>
                    <div>
                      <p className="font-dl-mono text-xs text-dl-gray mb-1">Routing</p>
                      <p className="font-dl-mono text-xs text-dl-navy select-all">{va.deposit_routing_number ?? '—'}</p>
                    </div>
                    <div>
                      <p className="font-dl-mono text-xs text-dl-gray mb-1">Account</p>
                      <p className="font-dl-mono text-xs text-dl-navy select-all">{va.deposit_account_number ?? '—'}</p>
                    </div>
                    <div>
                      <p className="font-dl-mono text-xs text-dl-gray mb-1">Status</p>
                      <p className={`font-dl-mono text-xs ${va.status === 'active' ? 'text-dl-forest' : 'text-dl-gray'}`}>
                        {va.status.toUpperCase()}
                      </p>
                    </div>
                    {va.deposit_memo && (
                      <div className="col-span-2 md:col-span-4">
                        <p className="font-dl-mono text-xs text-dl-gray mb-1">Memo</p>
                        <p className="font-dl-mono text-xs text-dl-navy select-all">{va.deposit_memo}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transfer history */}
          <div className="border border-dl-border">
            <div className="px-6 py-4 border-b border-dl-border">
              <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Transfer History</p>
            </div>

            {histLoading && (
              <p className="font-dl-mono text-xs text-dl-gray px-6 py-6">Loading…</p>
            )}

            {!histLoading && history.length === 0 && (
              <p className="font-dl-mono text-xs text-dl-gray px-6 py-8 text-center">No transfers yet.</p>
            )}

            {!histLoading && history.length > 0 && (
              <div className="divide-y divide-dl-border overflow-x-auto">
                <div className="grid grid-cols-5 px-6 py-2 bg-dl-bg-alt">
                  {['Date', 'Amount', 'Asset', 'Status', 'Rail State'].map(h => (
                    <span key={h} className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider">{h}</span>
                  ))}
                </div>
                {history.map(tx => (
                  <div key={tx.id} className="grid grid-cols-5 px-6 py-3 hover:bg-dl-bg-alt">
                    <span className="font-dl-mono text-xs text-dl-gray">
                      {new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="font-dl-mono text-xs text-dl-navy">{fmt(tx.fiat_amount_cents)}</span>
                    <span className="font-dl-mono text-xs text-dl-navy">{tx.crypto_asset}</span>
                    <span className={`font-dl-mono text-xs ${statusColor(tx.status)}`}>
                      {statusLabel(tx.status)}
                    </span>
                    <span className="font-dl-mono text-xs text-dl-gray">
                      {tx.bridge_state?.replace(/_/g, ' ') ?? '—'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DesignLawLayout>
  );
}
