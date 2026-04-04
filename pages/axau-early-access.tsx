import Head from 'next/head';
import { useEffect, useState } from 'react';
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

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'GH', name: 'Ghana' },
  { code: 'KE', name: 'Kenya' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'TT', name: 'Trinidad & Tobago' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'JP', name: 'Japan' },
  { code: 'KR', name: 'South Korea' },
  { code: 'IN', name: 'India' },
  { code: 'OTHER', name: 'Other' },
];

const DOC_TYPES = [
  { value: 'passport',         label: 'Passport' },
  { value: 'drivers_license',  label: "Driver's License" },
  { value: 'national_id',      label: 'National ID Card' },
  { value: 'residence_permit', label: 'Residence Permit' },
];

type Step = 'form' | 'submitted' | 'full' | 'already_submitted';

interface SlotData {
  cap: number;
  approved: number;
  remaining: number;
  isFull: boolean;
}

function SlotMeter({ slots }: { slots: SlotData }) {
  const pct = Math.min(100, Math.round((slots.approved / slots.cap) * 100));
  const barColor = slots.isFull ? C.red : slots.remaining <= 10 ? '#b45309' : C.gold;

  return (
    <div style={{
      background: C.goldBg, border: `1px solid ${C.gold}40`,
      padding: '20px 24px', marginBottom: 32,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.gold, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          EARLY ACCESS SLOTS
        </span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 13, color: C.navy, fontWeight: 700 }}>
          {slots.approved} <span style={{ color: C.muted, fontWeight: 400 }}>of {slots.cap} claimed</span>
        </span>
      </div>
      <div style={{ height: 6, background: '#e5e7eb', position: 'relative' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: barColor, transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted }}>
          {slots.isFull
            ? 'Early Access is full'
            : slots.remaining <= 10
            ? `Only ${slots.remaining} spot${slots.remaining === 1 ? '' : 's'} remaining`
            : `${slots.remaining} spots available`}
        </span>
        {!slots.isFull && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.12em',
            color: C.green, textTransform: 'uppercase',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            OPEN
          </span>
        )}
      </div>
    </div>
  );
}

function SuccessScreen({ submissionId, emailQueued }: { submissionId: string; emailQueued: boolean }) {
  const shortId = submissionId.slice(0, 8).toUpperCase();
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: C.greenBg, border: `2px solid #16a34a`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M6 14l6 6 10-12" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>
        Application Approved
      </h2>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 440, margin: '0 auto 28px', lineHeight: 1.7 }}>
        Your application has been approved and is queued for on-chain identity registration. You will receive a confirmation email once your wallet is activated and minting is enabled.
      </p>

      <div style={{
        display: 'inline-block', textAlign: 'left',
        background: C.bgAlt, border: `1px solid ${C.border}`,
        padding: '20px 28px', marginBottom: 32, minWidth: 280,
      }}>
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', margin: '0 0 10px' }}>
          CONFIRMATION
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.muted }}>Reference ID</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.navy, fontWeight: 700 }}>#{shortId}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 6 }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.muted }}>Status</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.green, fontWeight: 700 }}>APPROVED</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 6 }}>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: C.muted }}>Confirmation</span>
          <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: emailQueued ? C.green : C.muted, fontWeight: 700 }}>
            {emailQueued ? 'EMAIL SENT' : 'NO EMAIL'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        <a href="/axau" style={{
          display: 'inline-block', padding: '11px 24px',
          background: C.navy, color: '#fff',
          fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
        }}>
          VIEW AXAU PAGE →
        </a>
        <a href="/" style={{
          display: 'inline-block', padding: '11px 24px',
          border: `1px solid ${C.border}`, color: C.navy,
          fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
          textTransform: 'uppercase', textDecoration: 'none', background: C.bg,
        }}>
          GO TO DASHBOARD
        </a>
      </div>
    </div>
  );
}

function FullScreen() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: C.redBg, border: `2px solid #dc2626`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="10" stroke="#dc2626" strokeWidth="2.5" />
          <path d="M14 8v7M14 18v1" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>
        Early Access is Full
      </h2>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.7 }}>
        All 100 early access spots have been claimed. New applications are not currently being accepted.
      </p>
      <a href="/axau" style={{
        display: 'inline-block', padding: '11px 24px',
        background: C.navy, color: '#fff',
        fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
        textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
      }}>
        VIEW AXAU →
      </a>
    </div>
  );
}

function AlreadySubmittedScreen() {
  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#eff6ff', border: `2px solid ${C.navy}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="10" stroke={C.navy} strokeWidth="2.5" />
          <path d="M14 9v6M14 17v2" stroke={C.navy} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 26, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>
        Already Approved
      </h2>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.7 }}>
        This wallet has already been approved for AXAU early access. Go to the mint terminal to deposit PAXG and receive AXAU.
      </p>
      <a href="/axau" style={{
        display: 'inline-block', padding: '11px 24px',
        background: C.navy, color: '#fff',
        fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
        textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
      }}>
        VIEW AXAU →
      </a>
    </div>
  );
}

export default function AxauAccessPage() {
  const { address, isConnected } = useAccount();

  const [slots, setSlots] = useState<SlotData | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [submissionId, setSubmissionId] = useState('');
  const [emailQueued, setEmailQueued] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    walletAddress: '',
    email: '',
    fullName: '',
    dateOfBirth: '',
    country: 'US',
    documentType: '',
  });

  useEffect(() => {
    if (isConnected && address) {
      setForm(f => ({ ...f, walletAddress: address }));
    }
  }, [address, isConnected]);

  useEffect(() => {
    fetch('/api/axau/access-slots')
      .then(r => r.json())
      .then((d: SlotData) => {
        setSlots(d);
        if (d.isFull) setStep('full');
      })
      .catch(() => {});
  }, []);

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/erc3643/identity/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.isFull) {
          setStep('full');
          return;
        }
        if (res.status === 409 && !json.isFull) {
          setStep('already_submitted');
          return;
        }
        setError(json.error || 'Submission failed. Please try again.');
        return;
      }
      setSubmissionId(json.data.id ?? '');
      setEmailQueued(json.data.emailQueued === true);
      setStep('submitted');
    } catch {
      setError('Network error — please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px',
    border: `1px solid ${C.border}`, background: C.bg,
    fontFamily: 'Georgia, serif', fontSize: 14, color: C.text,
    outline: 'none', boxSizing: 'border-box',
    appearance: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: '"Courier New", monospace', fontSize: 10,
    letterSpacing: '0.13em', textTransform: 'uppercase',
    color: C.muted, marginBottom: 6,
  };

  return (
    <DesignLawLayout>
      <Head>
        <title>AXAU Early Access — Axiom Protocol</title>
        <meta name="description" content="Apply for AXAU Early Access — the first 100 verified participants can mint AXAU, a gold reserve unit backed by PAXG on Arbitrum One." />
      </Head>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '48px 0 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <p style={{
            fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.18em',
            color: C.gold, textTransform: 'uppercase', margin: '0 0 10px',
          }}>
            AXAU RESERVE · ARBITRUM ONE
          </p>
          <h1 style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 700,
            color: C.navy, lineHeight: 1.1, margin: '0 0 14px',
          }}>
            Early Access
          </h1>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, lineHeight: 1.7, margin: 0, maxWidth: 540 }}>
            AXAU is a gold reserve unit backed 1:1 by PAXG on Arbitrum One. The first 100 verified participants can mint AXAU directly from the gold vault. Submit your details below to apply.
          </p>
        </div>

        {/* Slot meter */}
        {slots && <SlotMeter slots={slots} />}

        {/* How it works — 3 steps */}
        {step === 'form' && (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
            marginBottom: 36,
          }}>
            {[
              { n: '1', title: 'Apply', body: 'Submit your wallet and identity details. No document upload required.' },
              { n: '2', title: 'Approved', body: 'Applications are approved automatically. Your wallet is queued for on-chain identity activation.' },
              { n: '3', title: 'Mint', body: 'Go to the AXAU mint terminal and deposit PAXG to receive AXAU directly to your wallet.' },
            ].map(s => (
              <div key={s.n} style={{
                padding: '18px 16px',
                border: `1px solid ${C.border}`, background: C.bgAlt,
              }}>
                <div style={{
                  width: 28, height: 28, background: C.navy, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: '"Courier New", monospace', fontSize: 12, fontWeight: 700,
                  marginBottom: 10,
                }}>
                  {s.n}
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, fontWeight: 700, color: C.navy, margin: '0 0 5px' }}>
                  {s.title}
                </p>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.6 }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Main content based on step */}
        {step === 'full' && <FullScreen />}
        {step === 'submitted' && <SuccessScreen submissionId={submissionId} emailQueued={emailQueued} />}
        {step === 'already_submitted' && <AlreadySubmittedScreen />}

        {step === 'form' && (
          <form onSubmit={handleSubmit} style={{
            border: `1px solid ${C.border}`, background: C.bg, padding: '32px 36px',
          }}>
            <p style={{
              fontFamily: '"Courier New", monospace', fontSize: 10,
              letterSpacing: '0.14em', textTransform: 'uppercase',
              color: C.muted, margin: '0 0 24px', paddingBottom: 14,
              borderBottom: `1px solid ${C.border}`,
            }}>
              IDENTITY VERIFICATION APPLICATION
            </p>

            {/* Row 1: Wallet + Email */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Wallet Address *</label>
                <input
                  required
                  type="text"
                  placeholder="0x..."
                  {...field('walletAddress')}
                  pattern="^0x[a-fA-F0-9]{40}$"
                  title="Enter a valid Ethereum wallet address starting with 0x"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Email Address *</label>
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  {...field('email')}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Row 2: Full Name */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Full Legal Name *</label>
              <input
                required
                type="text"
                placeholder="As it appears on your government-issued ID"
                {...field('fullName')}
                minLength={2}
                style={inputStyle}
              />
            </div>

            {/* Row 3: DOB + Country */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Date of Birth *</label>
                <input
                  required
                  type="date"
                  {...field('dateOfBirth')}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Country of Residence *</label>
                <select required {...field('country')} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 4: Document type */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Government ID Type *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {DOC_TYPES.map(d => {
                  const selected = form.documentType === d.value;
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, documentType: d.value }))}
                      style={{
                        padding: '11px 14px', textAlign: 'left', cursor: 'pointer',
                        border: selected ? `2px solid ${C.navy}` : `1px solid ${C.border}`,
                        background: selected ? '#f0f4fa' : C.bg,
                        fontFamily: 'Georgia, serif', fontSize: 13,
                        color: selected ? C.navy : C.text, fontWeight: selected ? 700 : 400,
                      }}
                    >
                      {selected && (
                        <span style={{ marginRight: 6, color: C.navy, fontSize: 11 }}>✓</span>
                      )}
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px', background: C.redBg, border: `1px solid #fca5a5`,
                marginBottom: 20,
                fontFamily: 'Georgia, serif', fontSize: 13, color: C.red, lineHeight: 1.5,
              }}>
                {error}
              </div>
            )}

            {/* Disclosure note */}
            <p style={{
              fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted,
              lineHeight: 1.6, margin: '0 0 20px',
              padding: '12px 14px', background: C.bgAlt, border: `1px solid ${C.border}`,
            }}>
              By submitting, you confirm that the information provided is accurate and that you are at least 18 years old. Approved applications are queued for on-chain identity activation — you will be notified by email once your wallet is enabled. Identity verification is required for all AXAU participants. No document upload is required at this stage.
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !form.documentType}
              style={{
                width: '100%', padding: '14px',
                background: submitting || !form.documentType ? '#94a3b8' : C.navy,
                color: '#fff', border: 'none', cursor: submitting || !form.documentType ? 'not-allowed' : 'pointer',
                fontFamily: '"Courier New", monospace', fontSize: 12,
                letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700,
              }}
            >
              {submitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION →'}
            </button>
          </form>
        )}

        {/* Already have access link */}
        {step === 'form' && (
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 20 }}>
            Already approved?{' '}
            <a href="/axau#mint-terminal" style={{ color: C.navy, fontWeight: 700 }}>
              Go to the AXAU mint terminal →
            </a>
          </p>
        )}
      </div>
    </DesignLawLayout>
  );
}
