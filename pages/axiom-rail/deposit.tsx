/**
 * /axiom-rail/deposit
 *
 * SEP-24 interactive deposit page — opened by Stellar wallets.
 * Active entry rails: Coinbase Pay (card → on-chain USDC) and
 * Stripe (card → internal Axiom balance).
 *
 * ACH and wire transfer rails are not currently active on this rail.
 *
 * Token delivery:
 *  SEP-10 JWT is delivered exclusively via window.postMessage from the
 *  wallet app. The origin is validated before the token is accepted.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { isPostMessageOriginAllowed } from '../../lib/multichain/stellar/axiom-rail/corsUtils';

const WALLET_KEY_STORAGE = 'axiom_wallet_fund_key';
const TOPUP_PRESETS = [25, 50, 100, 250, 500];

interface WalletMessage {
  transaction?: { token?: string };
  token?: string;
}

export default function AxiomRailDeposit() {
  const router = useRouter();

  const [id, setId]       = useState('');
  const [account, setAccount] = useState('');
  const [asset, setAsset] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('');
  const tokenRef = useRef('');

  // ── Axiom wallet top-up (Stripe card) ──────────────────────────────────
  const [walletAdminKey, setWalletAdminKey]         = useState('');
  const [walletKeyInput, setWalletKeyInput]         = useState('');
  const [walletPreset, setWalletPreset]             = useState<number>(100);
  const [walletTopupLoading, setWalletTopupLoading] = useState(false);
  const [walletTopupError, setWalletTopupError]     = useState<string | null>(null);
  const [walletTopupDone, setWalletTopupDone]       = useState(false);

  // Restore admin key from session
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(WALLET_KEY_STORAGE);
      if (stored) { setWalletAdminKey(stored); setWalletKeyInput(stored); }
    } catch { /* SSR / private browsing */ }
  }, []);

  // Token delivery: postMessage with origin validation
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isPostMessageOriginAllowed(event.origin)) return;
      const trustedSource = event.source === window.parent || event.source === window.opener;
      if (!trustedSource) return;
      const data = event.data as WalletMessage | undefined;
      if (!data) return;
      const received = data?.transaction?.token ?? data?.token ?? '';
      if (received && !tokenRef.current) {
        tokenRef.current = received;
        setToken(received);
        try { localStorage.setItem('axiom_rail_jwt', received); } catch { /* ignore */ }
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Query param hydration — token is NOT read from URL
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    setId((q.id as string) ?? '');
    setAccount((q.account as string) ?? '');
    setAsset((q.asset as string) ?? 'USDC');
    setAmount((q.amount as string) ?? '');
  }, [router.isReady, router.query]);

  const handleWalletTopup = useCallback(async () => {
    const key = walletAdminKey || walletKeyInput.trim();
    if (!key || walletTopupLoading) return;
    if (walletAdminKey !== key) {
      setWalletAdminKey(key);
      try { sessionStorage.setItem(WALLET_KEY_STORAGE, key); } catch { /* ok */ }
    }
    setWalletTopupLoading(true);
    setWalletTopupError(null);
    setWalletTopupDone(false);
    try {
      const res  = await fetch('/api/wallet/topup/checkout', {
        method: 'POST',
        headers: { 'x-admin-key': key, 'content-type': 'application/json' },
        body: JSON.stringify({ amount_cents: walletPreset * 100 }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);
      window.open(json.checkout_url as string, '_blank', 'noopener');
      setWalletTopupDone(true);
    } catch (e) {
      setWalletTopupError(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setWalletTopupLoading(false);
    }
  }, [walletAdminKey, walletKeyInput, walletPreset, walletTopupLoading]);

  // Suppress unused-var warning — token is retained for postMessage plumbing
  void token;

  const shortAccount = account ? `${account.slice(0, 6)}...${account.slice(-6)}` : '';

  return (
    <>
      <Head>
        <title>Axiom Rail — Deposit</title>
        <meta name="robots" content="noindex" />
        <meta name="referrer" content="strict-origin" />
      </Head>

      <div style={{ fontFamily: 'Georgia, serif', background: '#fff', minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: 560, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '1rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>
            Axiom Rail · Deposit
          </p>
          <h1 style={{ fontSize: 22, color: '#1e3a5f', margin: '0.5rem 0 0' }}>
            Deposit USD → {asset}
          </h1>
          {amount && (
            <p style={{ fontSize: 14, color: '#374151', margin: '0.25rem 0 0' }}>
              Amount: <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>${parseFloat(amount).toFixed(2)} USD</span>
            </p>
          )}
          {shortAccount && (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0.2rem 0 0', fontFamily: 'monospace' }}>
              Destination: {shortAccount}
            </p>
          )}
          {id && (
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0.2rem 0 0', fontFamily: 'monospace' }}>
              Transaction ID: {id}
            </p>
          )}
        </div>

        {/* ── Card Entry Options ──────────────────────────────────────────── */}

        {/* Coinbase Pay — card → on-chain USDC */}
        <div style={{ border: '1px solid #b8860b', marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div style={{ position: 'relative', height: '110px' }}>
            <img
              src="/images/coinbase/coinbase-pay-card.png"
              alt="Coinbase Pay — debit card and smartphone"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 35%', display: 'block' }}
            />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to right, rgba(30,58,95,0.92) 0%, rgba(30,58,95,0.5) 55%, transparent 100%)',
              display: 'flex', alignItems: 'flex-end', padding: '0.6rem 1rem'
            }}>
              <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                Card → On-Chain (Coinbase Pay)
              </p>
            </div>
          </div>
          <div style={{ background: '#fffbf0', padding: '0.75rem 1rem' }}>
            <p style={{ fontSize: 12, color: '#374151', margin: '0 0 0.4rem', lineHeight: 1.6 }}>
              Buy USDC directly with a debit or credit card — no Coinbase account required. USDC arrives in your wallet on Arbitrum One within minutes.
            </p>
            <p style={{ fontSize: 12, color: '#374151', margin: '0 0 0.6rem', lineHeight: 1.6 }}>
              Once you have USDC, convert it 1:1 to {asset} through the Peg Stability Module in the same guided flow.
            </p>
            <a
              href="/onramp"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: 'monospace', fontSize: 12, color: '#1e3a5f', textDecoration: 'underline' }}
            >
              Capital Stack Entry (Coinbase Pay)
            </a>
          </div>
        </div>

        {/* ── Axiom Balance top-up (Stripe) ───────────────────────────────── */}
        <div style={{ border: '1px solid #1e3a5f', marginBottom: '1.25rem', overflow: 'hidden' }}>
          <div style={{ background: '#1e3a5f', padding: '0.6rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
              Fund Axiom Balance — Debit Card (Stripe)
            </p>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 1 }}>Instant</span>
          </div>
          <div style={{ background: '#f8fafc', padding: '0.85rem 1rem' }}>
            <p style={{ fontSize: 12, color: '#374151', margin: '0 0 0.75rem', lineHeight: 1.6 }}>
              Load USD into your internal Axiom balance with a debit card. Funds are credited the moment Stripe confirms payment and feed directly into the{' '}
              <strong>Reserves tab allocation engine</strong> on Founder Ops.
            </p>

            {/* Amount presets */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {TOPUP_PRESETS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setWalletPreset(p)}
                  style={{
                    fontFamily: 'monospace', fontSize: 12,
                    padding: '0.3rem 0.75rem',
                    border: `1px solid ${walletPreset === p ? '#1e3a5f' : '#d1d5db'}`,
                    background: walletPreset === p ? '#1e3a5f' : '#fff',
                    color: walletPreset === p ? '#fff' : '#1e3a5f',
                    cursor: 'pointer',
                  }}
                >
                  ${p}
                </button>
              ))}
            </div>

            {/* Admin key — auto-filled from sessionStorage if available */}
            {!walletAdminKey && (
              <div style={{ marginBottom: '0.75rem' }}>
                <input
                  type="password"
                  value={walletKeyInput}
                  onChange={e => setWalletKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleWalletTopup()}
                  placeholder="Admin key"
                  style={{ ...inputStyle, padding: '0.35rem 0.6rem', fontSize: 12 }}
                />
              </div>
            )}

            {walletTopupError && (
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#b91c1c', margin: '0 0 0.5rem' }}>
                {walletTopupError}
              </p>
            )}

            {walletTopupDone && (
              <p style={{ fontFamily: 'monospace', fontSize: 11, color: '#166534', margin: '0 0 0.5rem' }}>
                Stripe checkout opened — complete payment to credit your balance.
              </p>
            )}

            <button
              type="button"
              disabled={walletTopupLoading || (!walletAdminKey && !walletKeyInput.trim())}
              onClick={handleWalletTopup}
              style={{
                fontFamily: 'monospace', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1,
                padding: '0.5rem 1.25rem',
                background: (walletTopupLoading || (!walletAdminKey && !walletKeyInput.trim())) ? '#9ca3af' : '#1e3a5f',
                color: '#fff', border: 'none', cursor: walletTopupLoading ? 'wait' : 'pointer',
                width: '100%',
              }}
            >
              {walletTopupLoading ? 'Opening Stripe…' : `Load $${walletPreset} → Axiom Balance`}
            </button>

            <p style={{ fontSize: 10, color: '#9ca3af', margin: '0.5rem 0 0', lineHeight: 1.5 }}>
              Stripe card fee (≈2.9% + 30¢) applies. Funds appear in your balance within seconds of payment confirmation.
            </p>
          </div>
        </div>

        {/* ── Rail status notice ──────────────────────────────────────────── */}
        <div style={{ border: '1px solid #e5e7eb', padding: '0.75rem 1rem', background: '#f9fafb' }}>
          <p style={{ fontFamily: 'monospace', fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 0.35rem' }}>
            Rail Status
          </p>
          <p style={{ fontSize: 12, color: '#374151', margin: 0, lineHeight: 1.6 }}>
            <strong>Active:</strong> Stripe card onramp, Coinbase Pay card-to-crypto.
            <br />
            <strong>Not currently active:</strong> ACH, wire transfer, virtual bank accounts.
          </p>
        </div>

        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: '1.5rem', lineHeight: 1.5 }}>
          Questions? Contact{' '}
          <a href="mailto:support@axiomprotocol.app" style={{ color: '#1e3a5f' }}>
            support@axiomprotocol.app
          </a>
        </p>
      </div>
    </>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  border: '1px solid #d1d5db',
  fontFamily: 'monospace',
  fontSize: 14,
  color: '#1e3a5f',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box',
};
