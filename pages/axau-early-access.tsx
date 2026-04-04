import Head from 'next/head';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { DesignLawLayout } from '../components/design-law';

const C = {
  navy:    '#1e3a5f',
  navyDeep:'#0d1f36',
  gold:    '#b8860b',
  goldPale:'#d4a017',
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
      background: C.goldBg,
      border: `1px solid ${C.gold}60`,
      borderLeft: `4px solid ${C.gold}`,
      padding: '20px 24px',
      marginBottom: 40,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: C.gold, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          EARLY ACCESS SLOTS
        </span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 14, color: C.navy, fontWeight: 700 }}>
          {slots.approved} <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>of {slots.cap} claimed</span>
        </span>
      </div>
      <div style={{ height: 5, background: '#e5e7eb', position: 'relative' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: barColor }} />
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted }}>
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
    <div>
      {/* Cinematic approved icon */}
      <div style={{
        position: 'relative', width: '100%', height: 220,
        overflow: 'hidden', marginBottom: 0,
        border: `1px solid ${C.border}`,
        borderBottom: 'none',
      }}>
        <Image
          src="/axau-early-access/icon-approved.png"
          alt="AXAU approved"
          fill
          sizes="(max-width: 768px) 100vw, 680px"
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, ${C.navyDeep}22 0%, ${C.navyDeep}cc 100%)`,
        }} />
        <div style={{ position: 'absolute', bottom: 24, left: 28 }}>
          <span style={{
            fontFamily: '"Courier New", monospace', fontSize: 10,
            letterSpacing: '0.18em', color: '#ffffff99', textTransform: 'uppercase',
          }}>
            APPLICATION STATUS
          </span>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6,
            background: C.navy, padding: '4px 12px',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.goldPale, display: 'inline-block' }} />
            <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.14em', color: '#fff', fontWeight: 700 }}>
              RECEIVED
            </span>
          </div>
        </div>
      </div>

      <div style={{
        border: `1px solid ${C.border}`, borderTop: `3px solid ${C.gold}`,
        padding: '36px 40px', marginBottom: 0,
      }}>
        <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 32, fontWeight: 700, color: C.navy, margin: '0 0 14px' }}>
          Application Received
        </h2>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 500, margin: '0 0 32px', lineHeight: 1.75 }}>
          Your application has been received and is queued for ops review. You will receive a confirmation email once your identity has been verified and your wallet is activated for minting.
        </p>

        <div style={{
          background: C.bgAlt, border: `1px solid ${C.border}`,
          padding: '20px 24px', marginBottom: 32,
        }}>
          <p style={{ fontFamily: '"Courier New", monospace', fontSize: 10, letterSpacing: '0.14em', color: C.muted, textTransform: 'uppercase', margin: '0 0 14px' }}>
            CONFIRMATION RECEIPT
          </p>
          {[
            { label: 'Reference ID', value: `#${shortId}` },
            { label: 'Status', value: 'SUBMITTED', color: C.navy },
            { label: 'Confirmation', value: emailQueued ? 'EMAIL SENT' : 'NO EMAIL', color: emailQueued ? C.green : C.muted },
          ].map(row => (
            <div key={row.label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 0', borderBottom: `1px solid ${C.border}`,
            }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 11, color: C.muted }}>{row.label}</span>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 12, color: row.color ?? C.navy, fontWeight: 700 }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a href="/axau" style={{
            display: 'inline-block', padding: '12px 28px',
            background: C.navy, color: '#fff',
            fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
          }}>
            VIEW AXAU PAGE →
          </a>
          <a href="/" style={{
            display: 'inline-block', padding: '12px 28px',
            border: `1px solid ${C.border}`, color: C.navy,
            fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
            textTransform: 'uppercase', textDecoration: 'none', background: C.bg,
          }}>
            GO TO DASHBOARD
          </a>
        </div>
      </div>
    </div>
  );
}

function FullScreen() {
  return (
    <div style={{ border: `1px solid ${C.border}`, padding: '48px 40px', textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, background: C.redBg, border: `2px solid #dc2626`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
      }}>
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="10" stroke="#dc2626" strokeWidth="2.5" />
          <path d="M14 8v7M14 18v1" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 30, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>
        Early Access is Full
      </h2>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.75 }}>
        All 100 early access spots have been claimed. New applications are not currently being accepted.
      </p>
      <a href="/axau" style={{
        display: 'inline-block', padding: '12px 28px', background: C.navy, color: '#fff',
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
    <div style={{ border: `1px solid ${C.border}`, padding: '48px 40px', textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, background: '#eff6ff', border: `2px solid ${C.navy}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
      }}>
        <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
          <circle cx="14" cy="14" r="10" stroke={C.navy} strokeWidth="2.5" />
          <path d="M14 9v6M14 17v2" stroke={C.navy} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 30, fontWeight: 700, color: C.navy, margin: '0 0 12px' }}>
        Application on File
      </h2>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: 15, color: C.muted, maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.75 }}>
        This wallet already has an active AXAU early access application on file. You will be notified by email once your wallet is activated.
      </p>
      <a href="/axau" style={{
        display: 'inline-block', padding: '12px 28px', background: C.navy, color: '#fff',
        fontFamily: '"Courier New", monospace', fontSize: 11, letterSpacing: '0.12em',
        textTransform: 'uppercase', textDecoration: 'none', fontWeight: 700,
      }}>
        VIEW AXAU PAGE →
      </a>
    </div>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Apply',
    body: 'Submit your wallet address and identity details. No document upload required at this stage.',
    img: '/axau-early-access/icon-apply.png',
    alt: 'Apply icon — golden document',
  },
  {
    n: '02',
    title: 'Review',
    body: 'Your application is reviewed by the ops team. You will be notified by email once your wallet is cleared for on-chain identity activation.',
    img: '/axau-early-access/icon-approved.png',
    alt: 'Review icon — golden seal',
  },
  {
    n: '03',
    title: 'Mint',
    body: 'Go to the AXAU mint terminal and deposit PAXG to receive AXAU directly to your wallet.',
    img: '/axau-early-access/icon-mint.png',
    alt: 'Mint icon — gold coin being struck',
  },
];

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
        if (json.isFull) { setStep('full'); return; }
        if (res.status === 409 && !json.isFull) { setStep('already_submitted'); return; }
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
    width: '100%', padding: '12px 14px',
    border: `1px solid ${C.border}`, background: C.bg,
    fontFamily: 'Georgia, serif', fontSize: 14, color: C.text,
    outline: 'none', boxSizing: 'border-box', appearance: 'none',
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

      {/* ── CINEMATIC HERO ── */}
      <div style={{
        position: 'relative', width: '100%',
        height: 'clamp(260px, 40vw, 480px)',
        overflow: 'hidden', marginBottom: 0,
      }}>
        <Image
          src="/axau-early-access/hero-vault.png"
          alt="AXAU gold reserve vault"
          fill
          sizes="100vw"
          style={{ objectFit: 'cover', objectPosition: 'center 40%' }}
          priority
        />
        {/* Cinematic overlay — navy vignette bottom */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(to bottom, transparent 30%, ${C.navyDeep}e0 100%)`,
        }} />
        {/* Left text overlay */}
        <div style={{ position: 'absolute', bottom: 36, left: 36, right: '40%' }}>
          <p style={{
            fontFamily: '"Courier New", monospace', fontSize: 10,
            letterSpacing: '0.2em', color: `${C.goldPale}`, textTransform: 'uppercase',
            margin: '0 0 10px',
          }}>
            AXAU RESERVE · ARBITRUM ONE
          </p>
          <h1 style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 700,
            color: '#ffffff', lineHeight: 1.05, margin: '0 0 12px',
            textShadow: `0 2px 12px ${C.navyDeep}cc`,
          }}>
            Early Access
          </h1>
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 13,
            color: '#ffffffcc', lineHeight: 1.65, margin: 0, maxWidth: 420,
          }}>
            The first 100 verified participants can mint AXAU — a gold reserve unit backed 1:1 by PAXG on Arbitrum One.
          </p>
        </div>
        {/* Corner stamp */}
        <div style={{
          position: 'absolute', top: 20, right: 24,
          fontFamily: '"Courier New", monospace', fontSize: 9,
          letterSpacing: '0.2em', color: `${C.goldPale}cc`,
          textTransform: 'uppercase', textAlign: 'right',
        }}>
          <div>ARBITRUM ONE</div>
          <div style={{ marginTop: 3 }}>ERC-3643</div>
        </div>
      </div>

      {/* Thin gold rule under hero */}
      <div style={{ height: 3, background: C.gold, marginBottom: 48 }} />

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 0 80px' }}>

        {/* Slot meter */}
        {slots && <SlotMeter slots={slots} />}

        {/* ── 3-STEP PROCESS CARDS ── */}
        {step === 'form' && (
          <div style={{ marginBottom: 44 }}>
            <p style={{
              fontFamily: '"Courier New", monospace', fontSize: 10,
              letterSpacing: '0.18em', textTransform: 'uppercase', color: C.muted,
              margin: '0 0 16px',
            }}>
              HOW IT WORKS
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 0,
              border: `1px solid ${C.border}`,
            }}>
              {STEPS.map((s, i) => (
                <div key={s.n} style={{
                  borderRight: i < STEPS.length - 1 ? `1px solid ${C.border}` : 'none',
                }}>
                  {/* 3D icon image */}
                  <div style={{
                    position: 'relative', width: '100%', paddingTop: '62%',
                    overflow: 'hidden', borderBottom: `1px solid ${C.border}`,
                    background: C.navyDeep,
                  }}>
                    <Image
                      src={s.img}
                      alt={s.alt}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      style={{ objectFit: 'cover', objectPosition: 'center' }}
                    />
                    {/* Step number stamp */}
                    <div style={{
                      position: 'absolute', top: 10, left: 12,
                      fontFamily: '"Courier New", monospace', fontSize: 9,
                      letterSpacing: '0.16em', color: `${C.goldPale}cc`,
                      textTransform: 'uppercase',
                    }}>
                      STEP {s.n}
                    </div>
                  </div>
                  {/* Text body */}
                  <div style={{ padding: '18px 20px', background: C.bgAlt }}>
                    <p style={{
                      fontFamily: '"Cormorant Garamond", Georgia, serif',
                      fontSize: 16, fontWeight: 700, color: C.navy,
                      margin: '0 0 7px',
                    }}>
                      {s.title}
                    </p>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.65 }}>
                      {s.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STATE SCREENS ── */}
        {step === 'full' && <FullScreen />}
        {step === 'submitted' && <SuccessScreen submissionId={submissionId} emailQueued={emailQueued} />}
        {step === 'already_submitted' && <AlreadySubmittedScreen />}

        {/* ── APPLICATION FORM ── */}
        {step === 'form' && (
          <div>
            {/* Gold bar accent above form */}
            <div style={{
              position: 'relative', width: '100%', height: 120,
              overflow: 'hidden', marginBottom: 0,
              border: `1px solid ${C.border}`, borderBottom: 'none',
            }}>
              <Image
                src="/axau-early-access/gold-bar-aerial.png"
                alt="AXAU gold reserve bar"
                fill
                sizes="(max-width: 768px) 100vw, 760px"
                style={{ objectFit: 'cover', objectPosition: 'center 30%' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(to right, ${C.navyDeep}cc 0%, ${C.navyDeep}44 60%, transparent 100%)`,
              }} />
              <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, display: 'flex', alignItems: 'center', padding: '0 28px' }}>
                <div>
                  <p style={{
                    fontFamily: '"Courier New", monospace', fontSize: 9,
                    letterSpacing: '0.2em', color: C.goldPale, textTransform: 'uppercase',
                    margin: '0 0 4px',
                  }}>
                    IDENTITY VERIFICATION
                  </p>
                  <p style={{
                    fontFamily: '"Cormorant Garamond", Georgia, serif',
                    fontSize: 18, fontWeight: 700, color: '#ffffff', margin: 0,
                  }}>
                    Application
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{
              border: `1px solid ${C.border}`, borderTop: `3px solid ${C.gold}`,
              background: C.bg, padding: '32px 36px',
            }}>
              <p style={{
                fontFamily: '"Courier New", monospace', fontSize: 10,
                letterSpacing: '0.14em', textTransform: 'uppercase',
                color: C.muted, margin: '0 0 28px', paddingBottom: 14,
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
              <div style={{ marginBottom: 28 }}>
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
                          padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                          border: selected ? `2px solid ${C.navy}` : `1px solid ${C.border}`,
                          background: selected ? '#eef2f8' : C.bg,
                          fontFamily: 'Georgia, serif', fontSize: 13,
                          color: selected ? C.navy : C.text, fontWeight: selected ? 700 : 400,
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                      >
                        {selected && (
                          <span style={{
                            width: 16, height: 16, background: C.navy,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                              <path d="M1 3.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
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

              {/* Disclosure */}
              <p style={{
                fontFamily: 'Georgia, serif', fontSize: 12, color: C.muted,
                lineHeight: 1.65, margin: '0 0 24px',
                padding: '12px 16px', background: C.bgAlt, border: `1px solid ${C.border}`,
              }}>
                By submitting, you confirm the information is accurate and that you are at least 18 years old. Approved applications are queued for on-chain identity activation — you will be notified by email once your wallet is enabled. No document upload is required at this stage.
              </p>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !form.documentType}
                style={{
                  width: '100%', padding: '15px',
                  background: submitting || !form.documentType ? '#94a3b8' : C.navy,
                  color: '#fff', border: 'none',
                  cursor: submitting || !form.documentType ? 'not-allowed' : 'pointer',
                  fontFamily: '"Courier New", monospace', fontSize: 12,
                  letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700,
                }}
              >
                {submitting ? 'SUBMITTING...' : 'SUBMIT APPLICATION →'}
              </button>
            </form>
          </div>
        )}

        {/* Already have access link */}
        {step === 'form' && (
          <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 24 }}>
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
