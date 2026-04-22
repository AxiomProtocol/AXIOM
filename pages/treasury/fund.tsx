import { useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

const QUICK_AMOUNTS = [5, 10, 25, 100, 500];

type Intent = 'TREASURY_FUND' | 'AXUSD_MINT';

export default function FundTreasuryPage() {
  const { address } = useAccount();
  const [intent, setIntent] = useState<Intent>('TREASURY_FUND');
  const [amountUsd, setAmountUsd] = useState<string>('10');
  const [email, setEmail] = useState<string>('');
  const [walletOverride, setWalletOverride] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountCents = useMemo(() => {
    const n = Number(amountUsd);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
  }, [amountUsd]);

  const targetWallet = (walletOverride || address || '').trim();
  const walletValid = /^0x[a-fA-F0-9]{40}$/.test(targetWallet);
  const needsWallet = intent === 'AXUSD_MINT';
  const canSubmit =
    amountCents >= 100 &&
    amountCents <= 1_000_000 &&
    (!needsWallet || walletValid);

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/capinfra/treasury/card-deposit/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountCents,
          intent,
          buyerEmail: email || null,
          targetWalletAddress: needsWallet ? targetWallet : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message ?? data?.error ?? 'Checkout failed');
      if (!data.checkoutUrl) throw new Error('No checkout URL returned');
      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? 'Checkout failed');
      setSubmitting(false);
    }
  }

  return (
    <DesignLawLayout>
      <Head><title>Fund with Card — Axiom</title></Head>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-serif mb-2">Card Onramp</h1>
        <p className="text-sm text-dl-muted mb-6 font-mono">
          Card payment via Stripe. Choose a destination below.
        </p>

        <div className="border border-dl-line p-6 mb-6">
          <label className="block text-xs uppercase tracking-wide mb-2">Destination</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
            <button
              type="button"
              onClick={() => setIntent('TREASURY_FUND')}
              className={`text-left border p-3 font-mono text-sm ${
                intent === 'TREASURY_FUND'
                  ? 'border-dl-ink bg-dl-surface'
                  : 'border-dl-line hover:bg-dl-surface'
              }`}
            >
              <div className="font-bold">USD &rarr; Treasury</div>
              <div className="text-xs text-dl-muted mt-1">
                Funds the Axiom Nexus operating account at Increase. T+2 to T+4 to settle.
              </div>
            </button>
            <button
              type="button"
              onClick={() => setIntent('AXUSD_MINT')}
              className={`text-left border p-3 font-mono text-sm ${
                intent === 'AXUSD_MINT'
                  ? 'border-dl-ink bg-dl-surface'
                  : 'border-dl-line hover:bg-dl-surface'
              }`}
            >
              <div className="font-bold">USD &rarr; AXUSD (your wallet)</div>
              <div className="text-xs text-dl-muted mt-1">
                Mints AXUSD 1:1 to your Arbitrum wallet on payment confirmation.
              </div>
            </button>
          </div>

          {needsWallet && (
            <>
              <label className="block text-xs uppercase tracking-wide mb-2">Recipient wallet</label>
              <input
                type="text"
                value={walletOverride || address || ''}
                onChange={(e) => setWalletOverride(e.target.value)}
                placeholder="0x…"
                className="w-full border border-dl-line px-3 py-2 font-mono text-sm mb-1"
              />
              <div className="text-xs text-dl-muted font-mono mb-4">
                {address
                  ? `Connected wallet detected — override above to mint to a different address.`
                  : `Connect a wallet via the header, or paste a 0x… address.`}
              </div>
            </>
          )}

          <label className="block text-xs uppercase tracking-wide mb-2">Amount (USD)</label>
          <div className="flex gap-2 mb-2">
            {QUICK_AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmountUsd(String(a))}
                className="px-3 py-1 border border-dl-line text-sm font-mono hover:bg-dl-surface"
              >
                ${a}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amountUsd}
            onChange={(e) => setAmountUsd(e.target.value)}
            min={1}
            max={10000}
            step="0.01"
            className="w-full border border-dl-line px-3 py-2 font-mono mb-4"
          />

          <label className="block text-xs uppercase tracking-wide mb-2">Email (optional, for receipt)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-dl-line px-3 py-2 font-mono mb-6 text-sm"
          />

          {error && (
            <div className="border border-red-700 bg-red-50 text-red-900 px-3 py-2 text-sm font-mono mb-4">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={submit}
            className="w-full bg-dl-ink text-dl-surface px-4 py-3 font-mono text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting
              ? 'Redirecting to Stripe…'
              : `Continue with Card — $${(amountCents / 100).toFixed(2)}`}
          </button>
        </div>

        <div className="border border-dl-line p-4 mb-6">
          <div className="text-xs uppercase tracking-wide mb-2">Other onramp options</div>
          <p className="text-sm font-mono mb-3">
            For card &rarr; USDC via Coinbase, see the dedicated onramp.
          </p>
          <Link
            href="/onramp"
            className="inline-block px-4 py-2 border border-dl-line font-mono text-sm uppercase tracking-wide hover:bg-dl-surface"
          >
            Coinbase Onramp &rarr;
          </Link>
        </div>

        <div className="text-xs text-dl-muted font-mono space-y-2">
          <p><strong>Min:</strong> $1.00 · <strong>Max:</strong> $10,000 per card payment.</p>
          <p>Stripe processing fee (~2.9% + $0.30) is borne by the protocol.</p>
          <p>This page does not store card details. All payment processing happens on Stripe.</p>
          <p>
            AXUSD mint is performed by the protocol deployer EOA after Stripe confirms
            the payment. Mint failures are recorded on the deposit row and surfaced to operators.
          </p>
        </div>
      </div>
    </DesignLawLayout>
  );
}
