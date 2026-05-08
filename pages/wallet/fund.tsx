import Head from 'next/head';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

const ADMIN_KEY_STORAGE = 'axiom_wallet_fund_key';
const PRESET_AMOUNTS = [25, 50, 100, 250, 500];

interface WalletBalance {
  available_cents: number;
  pending_cents: number;
  available_usd: number;
  pending_usd: number;
  lifetime_deposited_cents: number;
  lifetime_allocated_cents: number;
  updated_at: string;
}

interface WalletTxn {
  id: string;
  type: string;
  amount_cents: number;
  direction: 'CREDIT' | 'DEBIT';
  balance_after_cents: number;
  status: string;
  reference_type: string | null;
  notes: string | null;
  created_at: string;
}

function fmt(cents: number): string {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

function fmtDate(s: string): string {
  return new Date(s).toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC');
}

export default function WalletFundPage() {
  const [adminKey, setAdminKey]           = useState('');
  const [keyInput, setKeyInput]           = useState('');
  const [balance, setBalance]             = useState<WalletBalance | null>(null);
  const [txns, setTxns]                   = useState<WalletTxn[]>([]);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [txnsLoading, setTxnsLoading]     = useState(false);
  const [topupLoading, setTopupLoading]   = useState(false);
  const [customAmount, setCustomAmount]   = useState('');
  const [error, setError]                 = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(100);

  // Restore persisted key on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(ADMIN_KEY_STORAGE);
      if (stored) { setAdminKey(stored); setKeyInput(stored); }
    } catch { /* sessionStorage unavailable (SSR) */ }
  }, []);

  const loadBalance = useCallback(async (key: string) => {
    if (!key) return;
    setBalanceLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/wallet/balance', { headers: { 'x-admin-key': key } });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
      setBalance(json.data as WalletBalance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Balance fetch failed');
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const loadTxns = useCallback(async (key: string) => {
    if (!key) return;
    setTxnsLoading(true);
    try {
      const res  = await fetch('/api/wallet/transactions?limit=20', { headers: { 'x-admin-key': key } });
      const json = await res.json();
      if (json.success) setTxns(json.data as WalletTxn[]);
    } catch { /* silent */ }
    finally { setTxnsLoading(false); }
  }, []);

  const handleUnlock = () => {
    if (!keyInput.trim()) return;
    const key = keyInput.trim();
    setAdminKey(key);
    try { sessionStorage.setItem(ADMIN_KEY_STORAGE, key); } catch { /* ok */ }
    loadBalance(key);
    loadTxns(key);
  };

  const handleRefresh = () => {
    loadBalance(adminKey);
    loadTxns(adminKey);
  };

  const resolvedCents = (): number | null => {
    if (customAmount !== '') {
      const v = Math.round(parseFloat(customAmount) * 100);
      return Number.isFinite(v) && v >= 2500 && v <= 250000 ? v : null;
    }
    return selectedPreset !== null ? selectedPreset * 100 : null;
  };

  const amountCents = resolvedCents();
  const canTopup = adminKey && amountCents !== null && !topupLoading;

  const handleTopup = async () => {
    if (!canTopup || amountCents === null) return;
    setTopupLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/wallet/topup/checkout', {
        method: 'POST',
        headers: { 'x-admin-key': adminKey, 'content-type': 'application/json' },
        body: JSON.stringify({ amount_cents: amountCents }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
      window.open(json.checkout_url as string, '_blank', 'noopener');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>Fund Axiom Balance — Founder Ops</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="max-w-3xl">
        <h1 className="text-3xl font-serif mb-1">Axiom Balance Top-Up</h1>
        <p className="font-dl-mono text-sm text-dl-gray mb-6">
          Load USD via debit card into your internal Axiom balance. Funds are available
          immediately after Stripe payment confirms and feed directly into the Reserves
          tab allocation engine on{' '}
          <Link href="/founder-ops" className="underline text-dl-navy">Founder Ops</Link>.
        </p>

        {/* ── Admin key gate ── */}
        {!adminKey ? (
          <div className="border border-dl-border p-6 mb-6">
            <p className="font-dl-mono text-[10px] uppercase tracking-wider text-dl-gray mb-3">
              Admin access required
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                placeholder="Enter admin key"
                className="font-dl-mono text-sm border border-dl-border px-3 py-2 flex-1 outline-none bg-white"
              />
              <button
                onClick={handleUnlock}
                className="font-dl-mono text-sm border border-dl-navy bg-dl-navy text-white px-5 py-2 uppercase tracking-wider hover:opacity-90"
              >
                Unlock
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ── Balance card ── */}
            <div className="border border-dl-border mb-6">
              <div className="px-5 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray">
                  Current Balance
                </p>
                <button
                  onClick={handleRefresh}
                  disabled={balanceLoading}
                  className="font-dl-mono text-[9px] text-dl-gray uppercase tracking-wider hover:text-dl-navy disabled:opacity-50"
                >
                  {balanceLoading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
              <div className="px-5 py-5 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div>
                  <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray mb-0.5">Available</p>
                  <p className="font-serif text-2xl text-dl-navy">
                    {balance ? fmt(balance.available_cents) : balanceLoading ? '…' : '$0.00'}
                  </p>
                </div>
                <div>
                  <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray mb-0.5">Pending</p>
                  <p className="font-dl-mono text-lg text-dl-gray">
                    {balance ? fmt(balance.pending_cents) : '—'}
                  </p>
                </div>
                <div>
                  <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray mb-0.5">Total Deposited</p>
                  <p className="font-dl-mono text-sm text-dl-navy">
                    {balance ? fmt(balance.lifetime_deposited_cents) : '—'}
                  </p>
                </div>
                <div>
                  <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray mb-0.5">Total Allocated</p>
                  <p className="font-dl-mono text-sm text-dl-navy">
                    {balance ? fmt(balance.lifetime_allocated_cents) : '—'}
                  </p>
                </div>
              </div>
              {balance && (
                <div className="px-5 py-2 border-t border-dl-border bg-dl-bg-alt">
                  <p className="font-dl-mono text-[8px] text-dl-gray">
                    Last updated: {fmtDate(balance.updated_at)}
                  </p>
                </div>
              )}
            </div>

            {/* ── Top-up form ── */}
            <div className="border border-dl-border mb-6">
              <div className="px-5 py-3 border-b border-dl-border bg-dl-bg-alt">
                <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray">
                  Top Up via Debit Card (Stripe)
                </p>
              </div>
              <div className="px-5 py-5">
                {/* Preset buttons */}
                <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray mb-2">
                  Quick amounts
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {PRESET_AMOUNTS.map(p => (
                    <button
                      key={p}
                      onClick={() => { setSelectedPreset(p); setCustomAmount(''); }}
                      className={`font-dl-mono text-sm px-5 py-2 border transition-colors ${
                        selectedPreset === p && customAmount === ''
                          ? 'bg-dl-navy text-white border-dl-navy'
                          : 'border-dl-border text-dl-navy hover:bg-dl-bg-alt'
                      }`}
                    >
                      ${p}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray mb-1.5">
                  Custom amount ($25 – $2,500)
                </p>
                <div className="flex items-stretch border border-dl-border mb-5 max-w-xs">
                  <span className="font-dl-mono text-sm px-3 py-2 bg-dl-bg-alt border-r border-dl-border">$</span>
                  <input
                    type="number"
                    min="25"
                    max="2500"
                    step="1"
                    value={customAmount}
                    onChange={e => { setCustomAmount(e.target.value); setSelectedPreset(null); }}
                    placeholder="0"
                    className="font-dl-mono text-sm flex-1 px-3 py-2 outline-none bg-white"
                  />
                </div>

                {/* Summary row */}
                {amountCents !== null && (
                  <div className="border border-dl-forest bg-dl-forest/5 px-4 py-3 mb-5 flex items-center justify-between">
                    <div>
                      <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-forest mb-0.5">
                        Amount to load
                      </p>
                      <p className="font-dl-mono text-lg text-dl-forest">{fmt(amountCents)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-dl-mono text-[9px] text-dl-gray">After top-up, available balance</p>
                      <p className="font-dl-mono text-sm text-dl-navy">
                        {balance ? fmt(balance.available_cents + amountCents) : fmt(amountCents)}
                      </p>
                    </div>
                  </div>
                )}

                {customAmount !== '' && resolvedCents() === null && (
                  <p className="font-dl-mono text-[10px] text-dl-error mb-3">
                    Enter an amount between $25 and $2,500.
                  </p>
                )}

                {error && (
                  <p className="font-dl-mono text-[10px] text-dl-error mb-3">{error}</p>
                )}

                <button
                  onClick={handleTopup}
                  disabled={!canTopup}
                  className={`w-full font-dl-mono text-sm uppercase tracking-wider py-3 transition-colors ${
                    canTopup
                      ? 'bg-dl-navy text-white hover:opacity-90 cursor-pointer'
                      : 'bg-dl-bg-alt text-dl-gray cursor-not-allowed border border-dl-border'
                  }`}
                >
                  {topupLoading
                    ? 'Opening Stripe checkout…'
                    : amountCents === null
                    ? 'Select an amount'
                    : `Continue to payment — ${fmt(amountCents)}`}
                </button>

                <p className="font-dl-mono text-[9px] text-dl-gray mt-3 leading-relaxed">
                  Payment processed by Stripe. Funds credited to your Axiom balance within
                  seconds of payment confirmation. Returns to Founder Ops → Reserves on success.
                  Stripe card processing fee (≈2.9% + 30¢) applies and is charged separately.
                </p>
              </div>
            </div>

            {/* ── Transaction history ── */}
            <div className="border border-dl-border">
              <div className="px-5 py-3 border-b border-dl-border bg-dl-bg-alt flex items-center justify-between">
                <p className="font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray">
                  Transaction History
                </p>
                {txnsLoading && (
                  <p className="font-dl-mono text-[9px] text-dl-gray">Loading…</p>
                )}
              </div>
              {txns.length === 0 && !txnsLoading ? (
                <p className="font-dl-mono text-[10px] text-dl-gray px-5 py-4">
                  No transactions yet. Your first top-up will appear here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-dl-bg-alt">
                      <tr>
                        {['Date', 'Type', 'Dir', 'Amount', 'Balance After', 'Status'].map(h => (
                          <th key={h} className="text-left font-dl-mono text-[9px] uppercase tracking-wider text-dl-gray px-4 py-2">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {txns.map((t, i) => (
                        <tr key={t.id} className={`border-t border-dl-border ${i % 2 === 0 ? 'bg-white' : 'bg-dl-bg-alt'}`}>
                          <td className="font-dl-mono text-[9px] text-dl-gray px-4 py-2 whitespace-nowrap">
                            {fmtDate(t.created_at)}
                          </td>
                          <td className="font-dl-mono text-[10px] text-dl-navy px-4 py-2">{t.type}</td>
                          <td className={`font-dl-mono text-[10px] font-bold px-4 py-2 ${t.direction === 'CREDIT' ? 'text-dl-forest' : 'text-dl-error'}`}>
                            {t.direction === 'CREDIT' ? '+' : '−'}
                          </td>
                          <td className="font-dl-mono text-[10px] text-dl-navy px-4 py-2 text-right">
                            {fmt(t.amount_cents)}
                          </td>
                          <td className="font-dl-mono text-[10px] text-dl-navy px-4 py-2 text-right">
                            {fmt(t.balance_after_cents)}
                          </td>
                          <td className={`font-dl-mono text-[9px] px-4 py-2 uppercase tracking-wider ${
                            t.status === 'SETTLED' ? 'text-dl-forest' :
                            t.status === 'FAILED'  ? 'text-dl-error'  : 'text-dl-gray'
                          }`}>
                            {t.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Cross-links */}
            <div className="mt-6 font-dl-mono text-[10px] text-dl-gray space-y-1">
              <p>
                <Link href="/founder-ops" className="underline text-dl-navy">← Founder Ops</Link>
                {' — navigate to the Reserves tab to allocate your balance.'}
              </p>
              <p>
                <Link href="/treasury/fund/card" className="underline text-dl-navy">Fund On-Chain Treasury</Link>
                {' — send card funds directly to the Arbitrum treasury wallet (Coinbase Onramp).'}
              </p>
            </div>
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}
