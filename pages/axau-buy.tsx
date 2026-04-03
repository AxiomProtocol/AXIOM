import Head from 'next/head';
import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';

const C = {
  navy:    '#1e3a5f',
  gold:    '#b8860b',
  goldBg:  '#fdf8ee',
  border:  '#d1d5db',
  bg:      '#ffffff',
  bgAlt:   '#fafaf8',
  text:    '#111827',
  muted:   '#6b7280',
  green:   '#166534',
  greenBg: '#f0fdf4',
  red:     '#991b1b',
  redBg:   '#fef2f2',
};

interface QuoteData {
  axusdAmount: number;
  axauOut: number;
  axauOutFormatted: string;
  mintNavPerToken: string;
  xauUsdPrice: string;
  coverageRatioPct: string;
  mintPaused: boolean;
  isSolvent: boolean;
}

type Step = 'form' | 'submitted' | 'error';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 16px',
  border: `1px solid ${C.border}`, background: C.bg,
  fontFamily: '"Courier New", monospace', fontSize: 15,
  color: C.text, outline: 'none', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: '"Courier New", monospace', fontSize: 10,
  letterSpacing: '0.13em', textTransform: 'uppercase',
  color: C.muted, marginBottom: 6,
};

function LivePriceBar({ quote }: { quote: QuoteData | null }) {
  if (!quote) return null;
  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 0,
      borderBottom: `1px solid ${C.border}`, marginBottom: 36,
      background: C.bgAlt,
    }}>
      {[
        { label: 'XAU / USD', value: `$${parseFloat(quote.xauUsdPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: 'MINT NAV', value: `$${parseFloat(quote.mintNavPerToken).toFixed(4)}` },
        { label: 'COVERAGE', value: quote.coverageRatioPct },
        { label: 'MINT STATUS', value: quote.mintPaused ? 'PAUSED' : 'ACTIVE', color: quote.mintPaused ? C.red : C.green },
      ].map((item, i) => (
        <div key={i} style={{
          padding: '12px 20px', borderRight: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
        }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', margin: '0 0 3px' }}>
            {item.label}
          </p>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 13, fontWeight: 700, color: item.color || C.navy, margin: 0 }}>
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function QuoteCard({ axusdInput, quote, loading }: { axusdInput: string; quote: QuoteData | null; loading: boolean }) {
  const amount = parseFloat(axusdInput);
  const hasAmount = !isNaN(amount) && amount > 0;

  return (
    <div style={{
      background: C.goldBg, border: `1px solid ${C.gold}40`,
      padding: '24px 28px', marginBottom: 24,
    }}>
      <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em', color: C.gold, textTransform: 'uppercase', margin: '0 0 16px' }}>
        LIVE QUOTE
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted, margin: '0 0 4px' }}>YOU SPEND</p>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 22, fontWeight: 700, color: C.navy, margin: 0 }}>
            {hasAmount ? `${parseFloat(axusdInput).toLocaleString()} AXUSD` : '—'}
          </p>
        </div>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 18, color: C.gold, margin: 0 }}>→</p>
        <div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted, margin: '0 0 4px' }}>YOU RECEIVE</p>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 22, fontWeight: 700, color: C.gold, margin: 0 }}>
            {loading ? '...' : quote && hasAmount ? `${quote.axauOutFormatted} AXAU` : '—'}
          </p>
        </div>
      </div>
      {quote && hasAmount && (
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, margin: '12px 0 0', lineHeight: 1.5 }}>
          At the current Mint NAV of ${parseFloat(quote.mintNavPerToken).toFixed(4)} per AXAU (XAU/USD ${parseFloat(quote.xauUsdPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).
          Final amount locked at execution.
        </p>
      )}
    </div>
  );
}

function SuccessScreen({ requestId, axusdAmount, axauQuoted }: { requestId: string; axusdAmount: string; axauQuoted: string }) {
  const shortId = requestId.slice(0, 8).toUpperCase();
  return (
    <div style={{ textAlign: 'center', padding: '52px 24px' }}>
      <div style={{
        width: 72, height: 72,
        background: C.goldBg, border: `2px solid ${C.gold}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px', borderRadius: '50%',
      }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path d="M7 16l7 7 11-14" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 32, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>
        Request Submitted
      </h2>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.7 }}>
        The Axiom Protocol will deposit the gold reserve to the vault and mint <strong>{axauQuoted} AXAU</strong> to your wallet. You will receive an email once fulfilled.
      </p>

      <div style={{
        display: 'inline-block', textAlign: 'left',
        background: C.bgAlt, border: `1px solid ${C.border}`,
        padding: '22px 32px', marginBottom: 36, minWidth: 300,
      }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', margin: '0 0 12px' }}>
          ORDER SUMMARY
        </p>
        {[
          { label: 'Reference ID', value: `#${shortId}` },
          { label: 'AXUSD Spent', value: `${parseFloat(axusdAmount).toLocaleString()} AXUSD` },
          { label: 'AXAU Quoted', value: `${axauQuoted} AXAU` },
          { label: 'Status', value: 'PENDING FULFILLMENT', color: C.gold },
        ].map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 7 }}>
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.muted }}>{row.label}</span>
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: row.color || C.navy, fontWeight: 700 }}>{row.value}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/axau" style={{
          display: 'inline-block', padding: '12px 28px',
          background: C.navy, color: '#fff',
          fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
        }}>
          VIEW AXAU PAGE →
        </a>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '12px 28px', border: `1px solid ${C.border}`,
            color: C.navy, cursor: 'pointer',
            fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', background: C.bg,
          }}
        >
          NEW REQUEST
        </button>
      </div>
    </div>
  );
}

export default function AxauBuyPage() {
  const { address, isConnected } = useAccount();
  const [step, setStep] = useState<Step>('form');
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState('');

  const [form, setForm] = useState({
    axusdAmount: '',
    walletAddress: '',
    email: '',
  });

  const [submittedData, setSubmittedData] = useState({ axusdAmount: '', axauQuoted: '' });

  useEffect(() => {
    if (isConnected && address) {
      setForm(f => ({ ...f, walletAddress: address }));
    }
  }, [address, isConnected]);

  const fetchQuote = useCallback(async (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setQuote(null); return; }
    setQuoteLoading(true);
    try {
      const res = await fetch(`/api/axau/buy-quote?axusdAmount=${num}`);
      const data = await res.json();
      if (res.ok) setQuote(data);
      else setQuote(null);
    } catch {
      setQuote(null);
    } finally {
      setQuoteLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (form.axusdAmount) fetchQuote(form.axusdAmount); }, 500);
    return () => clearTimeout(t);
  }, [form.axusdAmount, fetchQuote]);

  useEffect(() => { fetchQuote(''); }, [fetchQuote]);

  useEffect(() => {
    fetch('/api/axau/buy-quote?axusdAmount=1')
      .then(r => r.json())
      .then(d => { if (d.xauUsdPrice) setQuote({ ...d, axusdAmount: 0, axauOut: 0, axauOutFormatted: '0.000000' }); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/axau/purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: form.walletAddress,
          email: form.email,
          axusdAmount: form.axusdAmount,
          axauQuoted: quote?.axauOutFormatted || '0',
          xauUsdPrice: quote?.xauUsdPrice?.replace(/,/g, '') || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Submission failed. Please try again.');
        return;
      }
      setRequestId(json.data.id);
      setSubmittedData({ axusdAmount: form.axusdAmount, axauQuoted: json.data.axauQuoted });
      setStep('submitted');
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = form.axusdAmount && form.walletAddress && quote && !quote.mintPaused && !submitting;

  return (
    <DesignLawLayout>
      <Head>
        <title>Buy AXAU — Axiom Protocol</title>
        <meta name="description" content="Buy AXAU gold reserve units using AXUSD. No gold market experience required — the Axiom Protocol handles everything." />
      </Head>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '48px 0 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.18em', color: C.gold, textTransform: 'uppercase', margin: '0 0 10px' }}>
            AXAU RESERVE · GOLD BACKED
          </p>
          <h1 style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 700,
            color: C.navy, lineHeight: 1.08, margin: '0 0 14px',
          }}>
            Buy AXAU with AXUSD
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
            Use your AXUSD to purchase AXAU — a gold reserve unit backed by physical gold on Arbitrum One. No knowledge of gold markets or DeFi required. The protocol handles the rest.
          </p>
        </div>

        {/* Live price bar */}
        <LivePriceBar quote={quote} />

        {step === 'submitted' && (
          <SuccessScreen
            requestId={requestId}
            axusdAmount={submittedData.axusdAmount}
            axauQuoted={submittedData.axauQuoted}
          />
        )}

        {step === 'form' && (
          <>
            {/* How it works */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 32 }}>
              {[
                { n: '1', title: 'Enter Amount', body: 'Type how much AXUSD you want to spend. See the live AXAU quote update instantly.' },
                { n: '2', title: 'Submit Request', body: 'The protocol deposits a gold reserve to the vault and mints AXAU directly to your wallet.' },
                { n: '3', title: 'Receive Gold', body: 'AXAU arrives in your wallet. Each unit represents a verifiable share of physical gold.' },
              ].map(s => (
                <div key={s.n} style={{ padding: '16px 14px', border: `1px solid ${C.border}`, background: C.bgAlt }}>
                  <div style={{
                    width: 26, height: 26, background: C.navy, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"Courier New", monospace', fontSize: 11, fontWeight: 700,
                    marginBottom: 8,
                  }}>
                    {s.n}
                  </div>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, fontWeight: 700, color: C.navy, margin: '0 0 4px' }}>{s.title}</p>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.55 }}>{s.body}</p>
                </div>
              ))}
            </div>

            {/* Quote card */}
            <QuoteCard axusdInput={form.axusdAmount} quote={quote} loading={quoteLoading} />

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ border: `1px solid ${C.border}`, background: C.bg, padding: '32px 36px' }}>
              <p style={{
                fontFamily: '"Courier New", monospace', fontSize: 10,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: C.muted, margin: '0 0 24px', paddingBottom: 14,
                borderBottom: `1px solid ${C.border}`,
              }}>
                PURCHASE ORDER
              </p>

              {/* AXUSD Amount */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>AXUSD Amount *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    required
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 500"
                    value={form.axusdAmount}
                    onChange={e => setForm(f => ({ ...f, axusdAmount: e.target.value }))}
                    style={{ ...inputStyle, paddingRight: 80 }}
                  />
                  <span style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted,
                    pointerEvents: 'none', letterSpacing: '0.08em',
                  }}>
                    AXUSD
                  </span>
                </div>
              </div>

              {/* Quick amounts */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {['25', '50', '100', '250', '500', '1000', '2500'].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, axusdAmount: amt }))}
                    style={{
                      padding: '7px 14px', cursor: 'pointer',
                      border: form.axusdAmount === amt ? `2px solid ${C.navy}` : `1px solid ${C.border}`,
                      background: form.axusdAmount === amt ? '#f0f4fa' : C.bg,
                      fontFamily: '"Courier New", monospace', fontSize: 11,
                      color: form.axusdAmount === amt ? C.navy : C.muted,
                      fontWeight: form.axusdAmount === amt ? 700 : 400,
                    }}
                  >
                    {parseInt(amt).toLocaleString()}
                  </button>
                ))}
              </div>

              {/* Row: Wallet + Email */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>Receiving Wallet *</label>
                  <input
                    required
                    type="text"
                    placeholder="0x..."
                    value={form.walletAddress}
                    onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))}
                    pattern="^0x[a-fA-F0-9]{40}$"
                    title="Valid Ethereum address (0x...)"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email for Confirmation</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    style={inputStyle}
                  />
                </div>
              </div>

              {/* Mint paused warning */}
              {quote?.mintPaused && (
                <div style={{ padding: '12px 16px', background: '#fff7ed', border: '1px solid #fed7aa', marginBottom: 20 }}>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: '#92400e', margin: 0 }}>
                    MINT PAUSED — The AXAU mint is temporarily paused. Requests can still be submitted and will be fulfilled once minting resumes.
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div style={{ padding: '12px 16px', background: C.redBg, border: '1px solid #fca5a5', marginBottom: 20 }}>
                  <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.red, margin: 0 }}>{error}</p>
                </div>
              )}

              {/* Disclosure */}
              <p style={{
                fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted,
                lineHeight: 1.6, margin: '0 0 20px',
                padding: '12px 14px', background: C.bgAlt, border: `1px solid ${C.border}`,
              }}>
                AXAU purchase requests are fulfilled by the Axiom Protocol operations team. The quoted AXAU amount is based on the live Mint NAV at time of request and may vary slightly at execution. Processing typically completes within 1 business day. Your wallet must be KYC-verified to receive AXAU.
              </p>

              <button
                type="submit"
                disabled={!canSubmit}
                style={{
                  width: '100%', padding: '15px',
                  background: !canSubmit ? '#94a3b8' : C.navy,
                  color: '#fff', border: 'none',
                  cursor: !canSubmit ? 'not-allowed' : 'pointer',
                  fontFamily: '"Courier New", monospace', fontSize: 12,
                  letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
                }}
              >
                {submitting ? 'SUBMITTING...' : `BUY ${quote && form.axusdAmount ? `${quote.axauOutFormatted} AXAU` : 'AXAU'} →`}
              </button>
            </form>

            {/* Footer links */}
            <div style={{ display: 'flex', gap: 24, marginTop: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/axau" style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, textDecoration: 'none' }}>
                AXAU Reserve page
              </a>
              <a href="/axusd-3643" style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, textDecoration: 'none' }}>
                Get AXUSD
              </a>
              <a href="/axau-access" style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, textDecoration: 'none' }}>
                Apply for Early Access
              </a>
            </div>
          </>
        )}
      </div>
    </DesignLawLayout>
  );
}
