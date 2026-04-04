import Head from 'next/head';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';
import { IdentityBadge, useIdentityStatus } from '../components/design-law/IdentityBadge';
import { useDirectMint, type DirectMintState } from '../hooks/axau/useDirectMint';
import { useRedeem, type RedeemState } from '../hooks/axau/useRedeem';

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
  amber:   '#92400e',
  amberBg: '#fff7ed',
};

type ActiveTab = 'direct-mint' | 'redeem' | 'assisted-mint';

interface MintQuote {
  paxgAmount: string;
  axauOut: number;
  axauOutFormatted: string;
  mintNavPerToken: string;
  xauUsdPrice: string;
  coverageRatioPct: string;
  mintPaused: boolean;
  isSolvent: boolean;
  oracleStale: boolean;
  quoteMath: 'exact' | 'estimated';
}

interface RedeemQuote {
  reserveOut: string;
  reserveOutFormatted: string;
  backingNavFormatted: string;
  redeemPaused: boolean;
}

interface AssistedQuote {
  axusdAmount: number;
  axauOut: number;
  axauOutFormatted: string;
  mintNavPerToken: string;
  xauUsdPrice: string;
  coverageRatioPct: string;
  mintPaused: boolean;
  oracleStale: boolean;
}

type AssistedStep = 'form' | 'submitted';

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: '"Courier New", monospace', fontSize: 10,
  letterSpacing: '0.13em', textTransform: 'uppercase',
  color: C.muted, marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '13px 16px',
  border: `1px solid ${C.border}`, background: C.bg,
  fontFamily: '"Courier New", monospace', fontSize: 15,
  color: C.text, outline: 'none', boxSizing: 'border-box',
};

function OracleStaleBanner() {
  return (
    <div style={{ padding: '12px 16px', background: C.amberBg, border: '1px solid #fed7aa', marginBottom: 20 }}>
      <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.amber, margin: 0, lineHeight: 1.5 }}>
        ORACLE STALE — The XAU/USD price feed has not been updated recently. Minting is temporarily unavailable. Please retry in ~90 seconds.
      </p>
    </div>
  );
}

function TxBadge({ hash }: { hash: string }) {
  const short = `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  return (
    <a
      href={`https://arbiscan.io/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, letterSpacing: '0.1em', textDecoration: 'none', borderBottom: `1px solid ${C.border}` }}
    >
      TX: {short} ↗
    </a>
  );
}

function PhaseBar({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0, display: 'inline-block',
        background: done ? '#16a34a' : active ? C.gold : '#d1d5db',
      }} />
      <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.11em', color: done ? C.green : active ? C.gold : C.muted, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

interface DirectMintTabProps {
  address: string | null;
  isConnected: boolean;
  state: DirectMintState;
  execute: (paxgAmount: string) => Promise<void>;
  reset: () => void;
}

function DirectMintTab({ address, isConnected, state, execute, reset }: DirectMintTabProps) {
  const [paxgInput, setPaxgInput] = useState('');
  const [quote, setQuote]         = useState<MintQuote | null>(null);
  const [quoteLoading, setQL]     = useState(false);
  const [quoteError, setQE]       = useState<string | null>(null);
  const [oracleStale, setOS]      = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const identityStatus            = useIdentityStatus(address);
  const identityVerified          = identityStatus === 'verified';

  const fetchQuote = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || isNaN(parseFloat(trimmed)) || parseFloat(trimmed) <= 0) {
      setQuote(null); setQE(null); setOS(false); return;
    }
    setQL(true); setQE(null); setOS(false);
    try {
      const res  = await fetch(`/api/axau/buy-quote?paxgAmount=${encodeURIComponent(trimmed)}`);
      const body = await res.json();
      if (res.status === 503 && body.oracleStale) { setOS(true); setQuote(null); setQL(false); return; }
      if (!res.ok) { setQE(body.error || 'Quote unavailable'); setQuote(null); }
      else          { setQuote(body as MintQuote); setQE(null); }
    } catch { setQE('Network error — could not fetch quote'); }
    finally   { setQL(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuote(paxgInput), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [paxgInput, fetchQuote]);

  const busy = state.phase === 'approving' || state.phase === 'minting';

  const canExecute =
    isConnected &&
    identityVerified &&
    paxgInput.trim() !== '' &&
    parseFloat(paxgInput) > 0 &&
    quote !== null &&
    !quote.mintPaused &&
    !quote.oracleStale &&
    !oracleStale &&
    !busy &&
    state.phase !== 'done' &&
    state.phase !== 'error';

  if (state.phase === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: 64, height: 64, background: C.goldBg, border: `2px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', borderRadius: '50%' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14l6 6 10-12" stroke={C.gold} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 28, fontWeight: 700, color: C.navy, margin: '0 0 10px' }}>
          Mint Confirmed
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.7 }}>
          AXAU has been minted directly to your wallet on Arbitrum One.
        </p>
        {(state.mintedAxau || state.paxgSpent) && (
          <div style={{ display: 'inline-block', textAlign: 'left', background: C.bgAlt, border: `1px solid ${C.border}`, padding: '20px 28px', marginBottom: 24, minWidth: 280 }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', margin: '0 0 10px' }}>TRANSACTION SUMMARY</p>
            {state.paxgSpent   && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 6 }}><span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted }}>PAXG Deposited</span><span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.navy, fontWeight: 700 }}>{state.paxgSpent} PAXG</span></div>}
            {state.mintedAxau  && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 6 }}><span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted }}>AXAU Received</span><span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.gold, fontWeight: 700 }}>{state.mintedAxau} AXAU</span></div>}
            {state.txHash && <div style={{ marginTop: 8 }}><TxBadge hash={state.txHash} /></div>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/axau" style={{ display: 'inline-block', padding: '11px 24px', background: C.navy, color: '#fff', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>VIEW AXAU PAGE →</a>
          <button onClick={() => { reset(); setPaxgInput(''); setQuote(null); }} style={{ padding: '11px 24px', border: `1px solid ${C.border}`, color: C.navy, cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', background: C.bg, fontWeight: 700 }}>MINT AGAIN</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.65, margin: '0 0 24px', maxWidth: 540 }}>
        Deposit PAXG directly to the gold vault and receive AXAU in the same transaction. Requires an identity-verified wallet on Arbitrum One.
      </p>

      {oracleStale && <OracleStaleBanner />}

      {/* Pre-flight checklist */}
      <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <IdentityBadge address={address} />
        {quote && (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: `1px solid ${C.border}`, background: C.bg, color: quote.mintPaused ? C.red : C.green }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: quote.mintPaused ? '#dc2626' : '#16a34a', display: 'inline-block', flexShrink: 0 }} />
              Mint {quote.mintPaused ? 'Paused' : 'Active'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: `1px solid ${C.border}`, background: C.bg, color: C.navy }}>
              XAU ${parseFloat(quote.xauUsdPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </>
        )}
      </div>

      {/* PAXG input */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>PAXG Amount</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 0.01"
            value={paxgInput}
            onChange={e => {
              const v = e.target.value;
              if (/^[0-9]*\.?[0-9]*$/.test(v)) setPaxgInput(v);
            }}
            disabled={busy}
            style={{ ...inputStyle, paddingRight: 68, opacity: busy ? 0.6 : 1 }}
          />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted, pointerEvents: 'none', letterSpacing: '0.08em' }}>
            PAXG
          </span>
        </div>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, margin: '5px 0 0' }}>
          PAXG is the Paxos Gold token (1 PAXG ≈ 1 troy oz gold). Deposited to the AXGold Vault on Arbitrum One.
        </p>
      </div>

      {/* Quick amounts */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['0.001', '0.005', '0.01', '0.05', '0.1', '0.5', '1'].map(amt => (
          <button
            key={amt}
            type="button"
            disabled={busy}
            onClick={() => setPaxgInput(amt)}
            style={{ padding: '7px 12px', cursor: busy ? 'not-allowed' : 'pointer', border: paxgInput === amt ? `2px solid ${C.navy}` : `1px solid ${C.border}`, background: paxgInput === amt ? '#f0f4fa' : C.bg, fontFamily: '"Courier New", monospace', fontSize: 10, color: paxgInput === amt ? C.navy : C.muted, fontWeight: paxgInput === amt ? 700 : 400, opacity: busy ? 0.5 : 1 }}
          >
            {amt}
          </button>
        ))}
      </div>

      {/* Quote result */}
      {(quote || quoteLoading || quoteError) && (
        <div style={{ background: C.goldBg, border: `1px solid ${C.gold}40`, padding: '20px 24px', marginBottom: 24 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.14em', color: C.gold, textTransform: 'uppercase', margin: '0 0 12px' }}>LIVE QUOTE · EXACT</p>
          {quoteLoading ? (
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 14, color: C.muted, margin: 0 }}>Fetching quote...</p>
          ) : quoteError ? (
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.red, margin: 0 }}>{quoteError}</p>
          ) : quote ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.muted, margin: '0 0 3px' }}>YOU DEPOSIT</p>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>{paxgInput} PAXG</p>
                </div>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 18, color: C.gold, margin: 0 }}>→</p>
                <div>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.muted, margin: '0 0 3px' }}>YOU RECEIVE</p>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 20, fontWeight: 700, color: C.gold, margin: 0 }}>{quote.axauOutFormatted} AXAU</p>
                </div>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, margin: 0 }}>
                Mint NAV: ${parseFloat(quote.mintNavPerToken).toFixed(4)} per AXAU · Coverage: {quote.coverageRatioPct} · Quote locked at execution.
              </p>
            </>
          ) : null}
        </div>
      )}

      {/* TX lifecycle */}
      {busy && (
        <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, padding: '16px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PhaseBar label="Approve PAXG" active={state.phase === 'approving'} done={state.phase === 'minting' || (state.phase as string) === 'done'} />
          <PhaseBar label="Mint AXAU on-chain" active={state.phase === 'minting'} done={(state.phase as string) === 'done'} />
          {state.txHash && <div style={{ marginTop: 4 }}><TxBadge hash={state.txHash} /></div>}
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
            {state.phase === 'approving'
              ? 'Approve PAXG spending in your wallet. This is the first of two transactions.'
              : 'Confirm the mint transaction in your wallet. AXAU will appear in your wallet once confirmed.'}
          </p>
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && state.error && (
        <div style={{ padding: '12px 16px', background: C.redBg, border: '1px solid #fca5a5', marginBottom: 20 }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.red, margin: '0 0 8px' }}>{state.error}</p>
          <button onClick={reset} style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            RESET ↺
          </button>
        </div>
      )}

      {/* Mint paused notice */}
      {quote?.mintPaused && (
        <div style={{ padding: '12px 16px', background: C.amberBg, border: '1px solid #fed7aa', marginBottom: 20 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.amber, margin: 0 }}>
            MINT PAUSED — Direct minting is temporarily paused. Use the Assisted Mint tab to submit a purchase request handled by the operations team.
          </p>
        </div>
      )}

      {/* Disclosure */}
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, lineHeight: 1.65, margin: '0 0 20px', padding: '12px 14px', background: C.bgAlt, border: `1px solid ${C.border}` }}>
        Direct minting requires an identity-verified wallet on Arbitrum One. The quoted AXAU amount is fixed at time of execution and may differ from the displayed quote due to price movement. Fees apply — see the coverage ratio on the AXAU page. This interface is non-custodial.
      </p>

      <button
        type="button"
        onClick={() => { if (canExecute) execute(paxgInput); }}
        disabled={!canExecute}
        style={{ width: '100%', padding: '15px', background: !canExecute ? '#94a3b8' : C.navy, color: '#fff', border: 'none', cursor: !canExecute ? 'not-allowed' : 'pointer', fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}
      >
        {busy
          ? (state.phase === 'approving' ? 'APPROVING PAXG...' : 'MINTING ON-CHAIN...')
          : !isConnected
          ? 'CONNECT WALLET TO MINT'
          : identityStatus === 'loading'
          ? 'CHECKING IDENTITY...'
          : !identityVerified && address
          ? 'IDENTITY VERIFICATION REQUIRED →'
          : `MINT ${quote ? `${quote.axauOutFormatted} AXAU` : 'AXAU'} WITH PAXG →`}
      </button>
    </div>
  );
}

interface RedeemTabProps {
  address: string | null;
  isConnected: boolean;
  state: RedeemState;
  execute: (axauAmount: string) => Promise<void>;
  reset: () => void;
}

function RedeemTab({ address, isConnected, state, execute, reset }: RedeemTabProps) {
  const [axauInput, setAxauInput] = useState('');
  const [quote, setQuote]         = useState<RedeemQuote | null>(null);
  const [quoteLoading, setQL]     = useState(false);
  const [quoteError, setQE]       = useState<string | null>(null);
  const [redeemStale, setRS]      = useState(false);
  const debounceRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const identityStatus            = useIdentityStatus(address);
  const identityVerified          = identityStatus === 'verified';

  const fetchQuote = useCallback(async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || isNaN(parseFloat(trimmed)) || parseFloat(trimmed) <= 0) {
      setQuote(null); setQE(null); setRS(false); return;
    }
    setQL(true); setQE(null); setRS(false);
    try {
      const res  = await fetch(`/api/axau/quote?action=redeem&amount=${encodeURIComponent(trimmed)}`);
      const body = await res.json();
      if (res.status === 503 && body.oracleStale) { setRS(true); setQuote(null); setQL(false); return; }
      if (!res.ok) { setQE(body.error || 'Quote unavailable'); setQuote(null); }
      else          { setQuote(body as RedeemQuote); setQE(null); }
    } catch { setQE('Network error — could not fetch quote'); }
    finally   { setQL(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchQuote(axauInput), 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [axauInput, fetchQuote]);

  const busy = state.phase === 'approving' || state.phase === 'redeeming';

  const canExecute =
    isConnected &&
    identityVerified &&
    axauInput.trim() !== '' &&
    parseFloat(axauInput) > 0 &&
    quote !== null &&
    !quote.redeemPaused &&
    !redeemStale &&
    !busy &&
    state.phase !== 'done' &&
    state.phase !== 'error';

  if (state.phase === 'done') {
    return (
      <div style={{ textAlign: 'center', padding: '48px 24px' }}>
        <div style={{ width: 64, height: 64, background: C.greenBg, border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', borderRadius: '50%' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none"><path d="M6 14l6 6 10-12" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 28, fontWeight: 700, color: C.navy, margin: '0 0 10px' }}>
          Redemption Confirmed
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: C.muted, maxWidth: 440, margin: '0 auto 24px', lineHeight: 1.7 }}>
          AXAU has been redeemed. PAXG has been returned to your wallet on Arbitrum One.
        </p>
        {(state.paxgReceived || state.axauBurned) && (
          <div style={{ display: 'inline-block', textAlign: 'left', background: C.bgAlt, border: `1px solid ${C.border}`, padding: '20px 28px', marginBottom: 24, minWidth: 280 }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', margin: '0 0 10px' }}>TRANSACTION SUMMARY</p>
            {state.axauBurned   && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 6 }}><span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted }}>AXAU Redeemed</span><span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.navy, fontWeight: 700 }}>{state.axauBurned} AXAU</span></div>}
            {state.paxgReceived && <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 6 }}><span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted }}>PAXG Received</span><span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.green, fontWeight: 700 }}>{state.paxgReceived} PAXG</span></div>}
            {state.txHash && <div style={{ marginTop: 8 }}><TxBadge hash={state.txHash} /></div>}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/axau" style={{ display: 'inline-block', padding: '11px 24px', background: C.navy, color: '#fff', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>VIEW AXAU PAGE →</a>
          <button onClick={() => { reset(); setAxauInput(''); setQuote(null); }} style={{ padding: '11px 24px', border: `1px solid ${C.border}`, color: C.navy, cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', background: C.bg, fontWeight: 700 }}>REDEEM AGAIN</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.65, margin: '0 0 24px', maxWidth: 540 }}>
        Return AXAU to the vault and receive PAXG in the same on-chain transaction. Requires an identity-verified wallet on Arbitrum One.
      </p>

      {redeemStale && <OracleStaleBanner />}

      {/* Pre-flight */}
      <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, padding: '14px 18px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <IdentityBadge address={address} />
        {quote && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', border: `1px solid ${C.border}`, background: C.bg, color: quote.redeemPaused ? C.red : C.green }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: quote.redeemPaused ? '#dc2626' : '#16a34a', display: 'inline-block', flexShrink: 0 }} />
            Redeem {quote.redeemPaused ? 'Paused' : 'Active'}
          </span>
        )}
      </div>

      {/* AXAU input */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>AXAU Amount to Redeem</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="e.g. 0.5"
            value={axauInput}
            onChange={e => {
              const v = e.target.value;
              if (/^[0-9]*\.?[0-9]*$/.test(v)) setAxauInput(v);
            }}
            disabled={busy}
            style={{ ...inputStyle, paddingRight: 68, opacity: busy ? 0.6 : 1 }}
          />
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted, pointerEvents: 'none', letterSpacing: '0.08em' }}>
            AXAU
          </span>
        </div>
      </div>

      {/* Quote result */}
      {(quote || quoteLoading || quoteError) && (
        <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, padding: '20px 24px', marginBottom: 24 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.14em', color: C.gold, textTransform: 'uppercase', margin: '0 0 12px' }}>REDEEM QUOTE</p>
          {quoteLoading ? (
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 14, color: C.muted, margin: 0 }}>Fetching quote...</p>
          ) : quoteError ? (
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.red, margin: 0 }}>{quoteError}</p>
          ) : quote ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                <div>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.muted, margin: '0 0 3px' }}>YOU BURN</p>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>{axauInput} AXAU</p>
                </div>
                <p style={{ fontFamily: '"Courier New", monospace', fontSize: 18, color: C.gold, margin: 0 }}>→</p>
                <div>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.muted, margin: '0 0 3px' }}>YOU RECEIVE</p>
                  <p style={{ fontFamily: '"Courier New", monospace', fontSize: 20, fontWeight: 700, color: C.green, margin: 0 }}>{quote.reserveOutFormatted} PAXG</p>
                </div>
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, margin: 0 }}>
                Backing NAV: ${quote.backingNavFormatted} per AXAU · Quote locked at execution.
              </p>
            </>
          ) : null}
        </div>
      )}

      {/* TX lifecycle */}
      {busy && (
        <div style={{ background: C.bgAlt, border: `1px solid ${C.border}`, padding: '16px 20px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PhaseBar label="Approve AXAU" active={state.phase === 'approving'} done={state.phase === 'redeeming' || (state.phase as string) === 'done'} />
          <PhaseBar label="Redeem on-chain" active={state.phase === 'redeeming'} done={(state.phase as string) === 'done'} />
          {state.txHash && <div style={{ marginTop: 4 }}><TxBadge hash={state.txHash} /></div>}
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, margin: '4px 0 0' }}>
            {state.phase === 'approving'
              ? 'Approve AXAU spending in your wallet. This is the first of two transactions.'
              : 'Confirm the redemption in your wallet. PAXG will return to your wallet once confirmed.'}
          </p>
        </div>
      )}

      {/* Error */}
      {state.phase === 'error' && state.error && (
        <div style={{ padding: '12px 16px', background: C.redBg, border: '1px solid #fca5a5', marginBottom: 20 }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.red, margin: '0 0 8px' }}>{state.error}</p>
          <button onClick={reset} style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.navy, background: 'none', border: 'none', cursor: 'pointer', padding: 0, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            RESET ↺
          </button>
        </div>
      )}

      {/* Redeem paused notice */}
      {quote?.redeemPaused && (
        <div style={{ padding: '12px 16px', background: C.amberBg, border: '1px solid #fed7aa', marginBottom: 20 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.amber, margin: 0 }}>
            REDEEM PAUSED — Redemptions are temporarily paused. Check the AXAU reserve page for current system status.
          </p>
        </div>
      )}

      {/* Disclosure */}
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, lineHeight: 1.65, margin: '0 0 20px', padding: '12px 14px', background: C.bgAlt, border: `1px solid ${C.border}` }}>
        Redemption requires an identity-verified wallet on Arbitrum One. The PAXG amount received may differ from the displayed quote due to price movement at execution. Fees apply. This interface is non-custodial.
      </p>

      <button
        type="button"
        onClick={() => { if (canExecute) execute(axauInput); }}
        disabled={!canExecute}
        style={{ width: '100%', padding: '15px', background: !canExecute ? '#94a3b8' : C.navy, color: '#fff', border: 'none', cursor: !canExecute ? 'not-allowed' : 'pointer', fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}
      >
        {busy
          ? (state.phase === 'approving' ? 'APPROVING AXAU...' : 'REDEEMING ON-CHAIN...')
          : !isConnected
          ? 'CONNECT WALLET TO REDEEM'
          : identityStatus === 'loading'
          ? 'CHECKING IDENTITY...'
          : !identityVerified && address
          ? 'IDENTITY VERIFICATION REQUIRED →'
          : `REDEEM ${quote ? `${quote.reserveOutFormatted} PAXG` : 'AXAU'} →`}
      </button>
    </div>
  );
}

function AssistedMintTab({ address, isConnected }: { address: string | null; isConnected: boolean }) {
  const [step, setStep]             = useState<AssistedStep>('form');
  const [quote, setQuote]           = useState<AssistedQuote | null>(null);
  const [quoteLoading, setQL]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [requestId, setRequestId]   = useState('');
  const [submittedData, setSubmittedData] = useState({ axusdAmount: '', axauQuoted: '' });
  const [oracleStale, setOS]        = useState(false);
  const debounceRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({ axusdAmount: '', walletAddress: '', email: '' });

  useEffect(() => {
    if (isConnected && address) setForm(f => ({ ...f, walletAddress: address }));
  }, [address, isConnected]);

  const fetchQuote = useCallback(async (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) { setQuote(null); setOS(false); return; }
    setQL(true); setOS(false);
    try {
      const res  = await fetch(`/api/axau/buy-quote?axusdAmount=${num}`);
      const body = await res.json();
      if (res.status === 503 && body.oracleStale) { setOS(true); setQuote(null); }
      else if (res.ok) setQuote(body as AssistedQuote);
      else setQuote(null);
    } catch { setQuote(null); }
    finally   { setQL(false); }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (form.axusdAmount) fetchQuote(form.axusdAmount);
      else { setQuote(null); setOS(false); }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.axusdAmount, fetchQuote]);

  useEffect(() => {
    fetch('/api/axau/buy-quote?axusdAmount=1')
      .then(r => r.json())
      .then(d => { if (d.xauUsdPrice && !d.oracleStale) setQuote({ ...d as AssistedQuote, axusdAmount: 0, axauOut: 0, axauOutFormatted: '0.000000' }); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSubmitting(true);
    try {
      const res = await fetch('/api/axau/purchase-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: form.walletAddress, email: form.email, axusdAmount: form.axusdAmount, axauQuoted: quote?.axauOutFormatted || '0', xauUsdPrice: quote?.xauUsdPrice?.replace(/,/g, '') || null }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Submission failed. Please try again.'); return; }
      setRequestId(json.data.id);
      setSubmittedData({ axusdAmount: form.axusdAmount, axauQuoted: json.data.axauQuoted });
      setStep('submitted');
    } catch { setError('Network error — please check your connection and try again.'); }
    finally   { setSubmitting(false); }
  }

  const canSubmit = form.axusdAmount && form.walletAddress && quote && !quote.mintPaused && !submitting && !oracleStale;

  if (step === 'submitted') {
    const shortId = requestId.slice(0, 8).toUpperCase();
    return (
      <div style={{ textAlign: 'center', padding: '52px 24px' }}>
        <div style={{ width: 72, height: 72, background: C.goldBg, border: `2px solid ${C.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', borderRadius: '50%' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><path d="M7 16l7 7 11-14" stroke={C.gold} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 32, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>
          Request Submitted
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 460, margin: '0 auto 32px', lineHeight: 1.7 }}>
          Your purchase request has been received. The operations team will complete the on-chain fulfillment — typically within 1 business day. You will receive an email once fulfilled.
        </p>
        <div style={{ display: 'inline-block', textAlign: 'left', background: C.bgAlt, border: `1px solid ${C.border}`, padding: '22px 32px', marginBottom: 36, minWidth: 300 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', margin: '0 0 12px' }}>ORDER SUMMARY</p>
          {[
            { label: 'Reference ID', value: `#${shortId}` },
            { label: 'AXUSD Spent', value: `${parseFloat(submittedData.axusdAmount).toLocaleString()} AXUSD` },
            { label: 'AXAU Estimated', value: `${submittedData.axauQuoted} AXAU` },
            { label: 'Status', value: 'PENDING FULFILLMENT', color: C.gold },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 32, marginBottom: 7 }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.muted }}>{row.label}</span>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: row.color || C.navy, fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/axau" style={{ display: 'inline-block', padding: '12px 28px', background: C.navy, color: '#fff', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700 }}>
            VIEW AXAU PAGE →
          </a>
          <button
            onClick={() => { setStep('form'); setForm(f => ({ ...f, axusdAmount: '', email: '' })); setQuote(null); }}
            style={{ padding: '12px 28px', border: `1px solid ${C.border}`, color: C.navy, cursor: 'pointer', fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', background: C.bg }}
          >
            NEW REQUEST
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, lineHeight: 1.65, margin: '0 0 24px', maxWidth: 540 }}>
        Submit a purchase request using AXUSD. Our operations team acquires PAXG, deposits it to the vault, and mints AXAU to your wallet — typically within 1 business day.
      </p>

      {oracleStale && <OracleStaleBanner />}

      {/* Quote display */}
      <div style={{ background: C.goldBg, border: `1px solid ${C.gold}40`, padding: '20px 24px', marginBottom: 24 }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 9, letterSpacing: '0.14em', color: C.gold, textTransform: 'uppercase', margin: '0 0 12px' }}>INDICATIVE QUOTE</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.muted, margin: '0 0 3px' }}>YOU SPEND</p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 20, fontWeight: 700, color: C.navy, margin: 0 }}>
              {form.axusdAmount && parseFloat(form.axusdAmount) > 0 ? `${parseFloat(form.axusdAmount).toLocaleString()} AXUSD` : '—'}
            </p>
          </div>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 18, color: C.gold, margin: 0 }}>→</p>
          <div>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.muted, margin: '0 0 3px' }}>ESTIMATED AXAU</p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 20, fontWeight: 700, color: C.gold, margin: 0 }}>
              {quoteLoading ? '...' : quote && form.axusdAmount && parseFloat(form.axusdAmount) > 0 ? `${quote.axauOutFormatted} AXAU` : '—'}
            </p>
          </div>
        </div>
        {quote && form.axusdAmount && parseFloat(form.axusdAmount) > 0 && (
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, margin: '10px 0 0' }}>
            At Mint NAV ${parseFloat(quote.mintNavPerToken).toFixed(4)} (XAU/USD ${parseFloat(quote.xauUsdPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}). Estimated — final amount set by the operations team at fulfillment.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ border: `1px solid ${C.border}`, background: C.bg, padding: '28px 32px' }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.muted, margin: '0 0 24px', paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
          PURCHASE REQUEST
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>AXUSD Amount *</label>
          <div style={{ position: 'relative' }}>
            <input required type="number" min="1" step="any" placeholder="e.g. 500" value={form.axusdAmount} onChange={e => setForm(f => ({ ...f, axusdAmount: e.target.value }))} style={{ ...inputStyle, paddingRight: 80 }} />
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted, pointerEvents: 'none', letterSpacing: '0.08em' }}>AXUSD</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
          {['25', '50', '100', '250', '500', '1000', '2500'].map(amt => (
            <button key={amt} type="button" onClick={() => setForm(f => ({ ...f, axusdAmount: amt }))} style={{ padding: '7px 14px', cursor: 'pointer', border: form.axusdAmount === amt ? `2px solid ${C.navy}` : `1px solid ${C.border}`, background: form.axusdAmount === amt ? '#f0f4fa' : C.bg, fontFamily: '"Courier New", monospace', fontSize: 11, color: form.axusdAmount === amt ? C.navy : C.muted, fontWeight: form.axusdAmount === amt ? 700 : 400 }}>
              {parseInt(amt).toLocaleString()}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div>
            <label style={labelStyle}>Receiving Wallet *</label>
            <input required type="text" placeholder="0x..." value={form.walletAddress} onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))} pattern="^0x[a-fA-F0-9]{40}$" title="Valid Ethereum address (0x...)" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Email for Confirmation</label>
            <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
          </div>
        </div>

        {quote?.mintPaused && (
          <div style={{ padding: '12px 16px', background: C.amberBg, border: '1px solid #fed7aa', marginBottom: 20 }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.amber, margin: 0 }}>
              MINT PAUSED — Fulfillment may be delayed. Requests are still recorded and will be processed once minting resumes.
            </p>
          </div>
        )}

        {error && (
          <div style={{ padding: '12px 16px', background: C.redBg, border: '1px solid #fca5a5', marginBottom: 20 }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.red, margin: 0 }}>{error}</p>
          </div>
        )}

        <p style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: C.muted, lineHeight: 1.6, margin: '0 0 20px', padding: '12px 14px', background: C.bgAlt, border: `1px solid ${C.border}` }}>
          This is an assisted purchase request. The operations team acquires PAXG, deposits it to the vault, and mints AXAU to your wallet. Your wallet must be identity-verified on Arbitrum One to receive AXAU. The quoted amount is indicative and may differ at fulfillment.
        </p>

        <button type="submit" disabled={!canSubmit} style={{ width: '100%', padding: '15px', background: !canSubmit ? '#94a3b8' : C.navy, color: '#fff', border: 'none', cursor: !canSubmit ? 'not-allowed' : 'pointer', fontFamily: '"Courier New", monospace', fontSize: 12, letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
          {submitting ? 'SUBMITTING...' : `SUBMIT REQUEST${quote && form.axusdAmount && parseFloat(form.axusdAmount) > 0 ? ` · ${quote.axauOutFormatted} AXAU EST.` : ''} →`}
        </button>
      </form>
    </div>
  );
}

export default function AxauBuyPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<ActiveTab>('direct-mint');

  const mint   = useDirectMint();
  const redeem = useRedeem();

  const directBusy = mint.state.phase === 'approving' || mint.state.phase === 'minting';
  const redeemBusy = redeem.state.phase === 'approving' || redeem.state.phase === 'redeeming';
  const anyBusy    = directBusy || redeemBusy;

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'direct-mint',   label: 'Direct Mint (PAXG)' },
    { id: 'redeem',        label: 'Redeem AXAU' },
    { id: 'assisted-mint', label: 'Assisted Mint (AXUSD)' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Buy &amp; Redeem AXAU — Axiom Protocol</title>
        <meta name="description" content="Mint AXAU directly with PAXG, redeem AXAU for PAXG, or submit an assisted purchase request using AXUSD on Arbitrum One." />
      </Head>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 0 80px' }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.18em', color: C.gold, textTransform: 'uppercase', margin: '0 0 10px' }}>
            AXAU RESERVE · ARBITRUM ONE
          </p>
          <h1 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 'clamp(28px, 5vw, 46px)', fontWeight: 700, color: C.navy, lineHeight: 1.08, margin: '0 0 14px' }}>
            AXAU Mint &amp; Redeem
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, lineHeight: 1.7, margin: 0, maxWidth: 520 }}>
            Mint AXAU by depositing PAXG directly to the gold vault, or redeem AXAU to recover PAXG. Both operations settle on-chain on Arbitrum One. Requires an identity-verified wallet.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: `2px solid ${C.border}`, marginBottom: 32 }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            const disabled = anyBusy && tab.id !== activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { if (!disabled) setActiveTab(tab.id); }}
                disabled={disabled}
                style={{
                  padding: '12px 18px',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontFamily: '"Courier New", monospace', fontSize: 10,
                  letterSpacing: '0.11em', textTransform: 'uppercase',
                  color: isActive ? C.navy : C.muted,
                  fontWeight: isActive ? 700 : 400,
                  background: 'none', border: 'none',
                  borderBottom: isActive ? `2px solid ${C.navy}` : '2px solid transparent',
                  marginBottom: '-2px',
                  opacity: disabled ? 0.45 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {anyBusy && (
          <div style={{ padding: '10px 14px', background: C.amberBg, border: '1px solid #fed7aa', marginBottom: 20 }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.amber, margin: 0, letterSpacing: '0.1em' }}>
              A transaction is in progress — tab switching is disabled until it completes.
            </p>
          </div>
        )}

        {activeTab === 'direct-mint' && (
          <DirectMintTab
            address={address ?? null}
            isConnected={isConnected}
            state={mint.state}
            execute={mint.execute}
            reset={mint.reset}
          />
        )}
        {activeTab === 'redeem' && (
          <RedeemTab
            address={address ?? null}
            isConnected={isConnected}
            state={redeem.state}
            execute={redeem.execute}
            reset={redeem.reset}
          />
        )}
        {activeTab === 'assisted-mint' && (
          <AssistedMintTab address={address ?? null} isConnected={isConnected} />
        )}

        <div style={{ display: 'flex', gap: 24, marginTop: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/axau" style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, textDecoration: 'none' }}>AXAU Reserve page</a>
          <a href="/axusd-3643" style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, textDecoration: 'none' }}>Get AXUSD</a>
          <a href="/axau-access" style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, textDecoration: 'none' }}>Apply for Identity Verification</a>
        </div>
      </div>
    </DesignLawLayout>
  );
}
