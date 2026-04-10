/**
 * /dao-payroll/run
 *
 * DAO Contributor Payroll — run interface.
 *
 * Auth gate (step 0): checks for SEP-10 JWT in localStorage on mount.
 * If absent, directs user to /axiom-rail/deposit (new tab) where their Stellar
 * wallet authenticates via SEP-10. deposit.tsx saves the JWT to localStorage
 * on receipt; this page polls localStorage every 1.5s and advances when found.
 *
 * Multi-step form (steps 1–4): run metadata → BSA operator identity
 * → recipient list with inline fee preview → review & submit → result.
 *
 * Security:
 *  - JWT checked before form entry (not only at submit)
 *  - All records bound to JWT subject (senderAccount) on the server
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law';

// ─── Constants ────────────────────────────────────────────────────────────────

const JWT_STORAGE_KEY = 'axiom_rail_jwt';
const FEE_FIXED = 0.50;
const FEE_PCT = 0.001;

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipientRow {
  name: string;
  routingNumber: string;
  accountNumber: string;
  amountUsd: string;
  transferType: 'ACH' | 'Wire';
}

interface RunMeta {
  orgName: string;
  runLabel: string;
  runDate: string;
}

interface BsaFields {
  legalName: string;
  dob: string;
  country: string;
  idType: 'ssn' | 'passport';
  idNumber: string;
}

interface ResultRecipient {
  index: number;
  name: string;
  transferId: string;
  memo: string;
  amountUsd: string;
  fee: string;
  amountOut: string;
}

interface BatchResult {
  runId: string;
  orgName: string;
  runLabel: string;
  runDate: string;
  stellarDepositAccount: string;
  status: string;
  recipientCount: number;
  totalAmountUsd: string;
  recipients: ResultRecipient[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcFee(amountStr: string) {
  const amt = parseFloat(amountStr);
  if (isNaN(amt) || amt <= 0) return null;
  const fee = FEE_FIXED + amt * FEE_PCT;
  const net = Math.max(0, amt - fee);
  return { gross: amt, fee, net };
}

function decodeJwtSub(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ['Run Details', 'Identity (BSA)', 'Recipients', 'Review'];
  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: '2rem' }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done = step > idx;
        return (
          <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#2d7a2d' : active ? '#1e3a5f' : '#e8edf5',
                color: done || active ? '#fff' : '#888',
                fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem',
              }}>
                {done ? '✓' : idx}
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: active ? '#1e3a5f' : '#888', marginTop: 4, letterSpacing: '0.04em', textAlign: 'center' }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ height: 2, flex: 0.5, background: done ? '#2d7a2d' : '#e8edf5', marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldGroup({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontFamily: 'monospace', fontSize: '0.72rem', color: '#555', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
        {label}
      </label>
      {children}
      {hint && !error && <p style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#888', marginTop: '0.3rem' }}>{hint}</p>}
      {error && <p style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#cc3333', marginTop: '0.3rem' }}>{error}</p>}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  color: '#1e3a5f',
  background: '#fff',
  border: '1px solid #bbc8da',
  padding: '0.5rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

// ─── Auth Gate ────────────────────────────────────────────────────────────────
// Auth flow explanation:
//  1. User clicks "Authenticate via Axiom Rail" — opens /axiom-rail/deposit in a new tab
//  2. In that tab, their Stellar wallet sends the JWT via postMessage; deposit.tsx
//     receives it, stores it in localStorage('axiom_rail_jwt'), and shows the deposit form
//  3. This page polls localStorage every 1.5s; once the JWT appears it proceeds automatically
//  4. User can also click "I've authenticated" to trigger an immediate check

function AuthGate({ onAuthenticated }: { onAuthenticated: (token: string) => void }) {
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll localStorage while waiting — deposit/withdraw pages save the JWT there
  // when they receive it from the wallet via postMessage
  useEffect(() => {
    if (!waiting) return;
    const interval = setInterval(() => {
      const stored = localStorage.getItem(JWT_STORAGE_KEY);
      if (stored && stored.split('.').length === 3) {
        onAuthenticated(stored);
        setWaiting(false);
        clearInterval(interval);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [waiting, onAuthenticated]);

  function openAuthTab() {
    setError(null);
    setWaiting(true);
    window.open('/axiom-rail/deposit', '_blank', 'noopener');
  }

  function checkNow() {
    const stored = localStorage.getItem(JWT_STORAGE_KEY);
    if (stored && stored.split('.').length === 3) {
      onAuthenticated(stored);
    } else {
      setError('No session found yet. Complete authentication in the Axiom Rail tab first, then return here.');
    }
  }

  return (
    <div style={{ maxWidth: 540 }}>
      <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
          AUTHENTICATION REQUIRED
        </p>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1e3a5f', fontWeight: 700, marginBottom: '0.5rem' }}>
          SEP-10 Session Required
        </p>
        <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.7, marginBottom: '0.75rem' }}>
          Payroll runs are bound to your Stellar public key via a SEP-10 session token.
          Authenticate once through Axiom Rail — your token is stored in this browser
          and reused for all payroll runs in this session.
        </p>
        <p style={{ fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>
          Click below to open the Axiom Rail deposit page in a new tab. Connect your Stellar
          wallet there. Once authenticated, return to this tab — it will advance automatically.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #cc3333', padding: '0.9rem', marginBottom: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#cc3333' }}>{error}</p>
        </div>
      )}

      {waiting && (
        <div style={{ background: '#fffbea', border: '1px solid #b8860b', padding: '0.9rem', marginBottom: '1rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#7a5a00' }}>
            Waiting for authentication... After your wallet authenticates in the new tab, this page will advance automatically.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={openAuthTab} style={{
          background: '#1e3a5f', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem',
          fontWeight: 700, padding: '0.65rem 1.75rem', border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
        }}>
          AUTHENTICATE VIA AXIOM RAIL
        </button>
        {waiting && (
          <button onClick={checkNow} style={{
            background: 'transparent', border: '1px solid #1e3a5f', color: '#1e3a5f',
            fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700,
            padding: '0.65rem 1.25rem', cursor: 'pointer', letterSpacing: '0.04em',
          }}>
            I'VE AUTHENTICATED
          </button>
        )}
      </div>

      <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', marginTop: '1rem' }}>
        Already authenticated?{' '}
        <button onClick={checkNow} style={{ background: 'none', border: 'none', color: '#1e3a5f', fontFamily: 'monospace', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
          Check session
        </button>
      </p>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DaoPayrollRunPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [authorizedAccount, setAuthorizedAccount] = useState<string | null>(null);

  const [step, setStep] = useState(1);
  const [meta, setMeta] = useState<RunMeta>({ orgName: '', runLabel: '', runDate: '' });
  const [bsa, setBsa] = useState<BsaFields>({ legalName: '', dob: '', country: '', idType: 'ssn', idNumber: '' });
  const [recipients, setRecipients] = useState<RecipientRow[]>([
    { name: '', routingNumber: '', accountNumber: '', amountUsd: '', transferType: 'ACH' },
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResult | null>(null);

  // ── Auth check on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(JWT_STORAGE_KEY);
    if (stored) {
      setJwt(stored);
      setAuthorizedAccount(decodeJwtSub(stored));
    }
    setAuthChecked(true);
  }, []);

  const handleAuthenticated = useCallback((token: string) => {
    setJwt(token);
    setAuthorizedAccount(decodeJwtSub(token));
  }, []);

  // ── Recipient list helpers ──────────────────────────────────────────────────

  const addRecipient = useCallback(() => {
    setRecipients(prev => [...prev, { name: '', routingNumber: '', accountNumber: '', amountUsd: '', transferType: 'ACH' }]);
  }, []);

  const removeRecipient = useCallback((idx: number) => {
    setRecipients(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const updateRecipient = useCallback((idx: number, field: keyof RecipientRow, value: string) => {
    setRecipients(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }, []);

  // ── Step validation ─────────────────────────────────────────────────────────

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!meta.orgName.trim()) e.orgName = 'Organization name is required';
    if (!meta.runLabel.trim()) e.runLabel = 'Run label is required';
    if (!meta.runDate || !/^\d{4}-\d{2}-\d{2}$/.test(meta.runDate)) e.runDate = 'Run date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2(): boolean {
    const e: Record<string, string> = {};
    if (!bsa.legalName.trim()) e.legalName = 'Legal name is required';
    if (!bsa.dob || !/^\d{4}-\d{2}-\d{2}$/.test(bsa.dob)) e.dob = 'Date of birth required (YYYY-MM-DD)';
    if (!bsa.country.trim()) e.country = 'Country is required';
    if (!bsa.idNumber.trim()) e.idNumber = 'ID number is required';
    if (bsa.idType === 'ssn' && !/^\d{4}$/.test(bsa.idNumber)) e.idNumber = 'SSN: enter last 4 digits only';
    if (bsa.idType === 'passport' && !/^[A-Z0-9]{3,20}$/i.test(bsa.idNumber)) e.idNumber = 'Passport: 3–20 alphanumeric characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep3(): boolean {
    const e: Record<string, string> = {};
    recipients.forEach((r, i) => {
      if (!r.name.trim()) e[`r${i}_name`] = 'Required';
      if (!/^\d{9}$/.test(r.routingNumber)) e[`r${i}_routing`] = '9 digits required';
      if (!r.accountNumber.trim()) e[`r${i}_account`] = 'Required';
      const amt = parseFloat(r.amountUsd);
      if (isNaN(amt) || amt < 10) e[`r${i}_amount`] = 'Min $10.00';
      if (!isNaN(amt) && amt > 25000) e[`r${i}_amount`] = 'Max $25,000';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Step navigation ─────────────────────────────────────────────────────────

  function nextStep() {
    setErrors({});
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    if (step === 3 && !validateStep3()) return;
    setStep(s => s + 1);
  }

  function prevStep() {
    setErrors({});
    setStep(s => s - 1);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setApiError(null);
    const currentJwt = jwt ?? localStorage.getItem(JWT_STORAGE_KEY);
    if (!currentJwt) {
      setApiError('Session expired. Please re-authenticate.');
      setJwt(null);
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/axiom-rail/payroll/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentJwt}`,
        },
        body: JSON.stringify({
          orgName: meta.orgName.trim(),
          runLabel: meta.runLabel.trim(),
          runDate: meta.runDate,
          bsa: {
            legalName: bsa.legalName.trim(),
            dob: bsa.dob,
            country: bsa.country.trim(),
            idType: bsa.idType,
            idNumber: bsa.idNumber.trim(),
          },
          recipients: recipients.map(r => ({
            name: r.name.trim(),
            routingNumber: r.routingNumber,
            accountNumber: r.accountNumber.trim(),
            amountUsd: parseFloat(r.amountUsd),
            transferType: r.transferType,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 403) {
          setApiError('Session expired. Please re-authenticate.');
          setJwt(null);
          localStorage.removeItem(JWT_STORAGE_KEY);
          return;
        }
        setApiError(data.error ?? 'Payroll submission failed');
        if (data.details) setApiError(`${data.error}: ${(data.details as string[]).join('; ')}`);
        return;
      }
      setResult(data as BatchResult);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Totals for review ───────────────────────────────────────────────────────

  const totalGross = recipients.reduce((s, r) => s + (parseFloat(r.amountUsd) || 0), 0);
  const totalFee = recipients.reduce((s, r) => {
    const amt = parseFloat(r.amountUsd) || 0;
    return s + FEE_FIXED + amt * FEE_PCT;
  }, 0);
  const totalNet = Math.max(0, totalGross - totalFee);

  // ── Result view ─────────────────────────────────────────────────────────────

  if (result) {
    return (
      <DesignLawLayout>
        <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#666', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>PAYROLL RUN CREATED</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.8rem', fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>
            {result.orgName} — {result.runLabel}
          </h1>
        </div>

        <div style={{ background: '#f0faf0', border: '1px solid #2d7a2d', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', color: '#1a5c1a', fontWeight: 700, marginBottom: '0.5rem' }}>
            Payroll run submitted successfully.
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: '#555' }}>
            Run ID: <strong>{result.runId}</strong>
          </p>
        </div>

        <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>STELLAR DEPOSIT ACCOUNT</p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#1e3a5f', wordBreak: 'break-all', fontWeight: 700 }}>
            {result.stellarDepositAccount}
          </p>
          <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#666', marginTop: '0.5rem' }}>
            Send USDC to this account on Stellar Mainnet using each recipient's unique memo below.
          </p>
        </div>

        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: '#1e3a5f', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
            Recipients ({result.recipientCount})
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'monospace', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                  {['Recipient', 'Gross', 'Fee', 'Net (USD)', 'Memo (28 chars)', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 0.9rem', textAlign: 'left', fontWeight: 600, letterSpacing: '0.06em', fontSize: '0.7rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.recipients.map((r, i) => (
                  <tr key={r.transferId} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb', borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#1e3a5f', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#444' }}>${parseFloat(r.amountUsd).toFixed(2)}</td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#7a5a00' }}>${parseFloat(r.fee).toFixed(2)}</td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#2d7a2d', fontWeight: 700 }}>${parseFloat(r.amountOut).toFixed(2)}</td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#1e3a5f', letterSpacing: '0.04em' }}>{r.memo}</td>
                    <td style={{ padding: '0.65rem 0.9rem', color: '#888' }}>PENDING</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/dao-payroll/history" style={{
            display: 'inline-block', background: '#1e3a5f', color: '#fff',
            fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700,
            padding: '0.65rem 1.5rem', textDecoration: 'none', letterSpacing: '0.04em',
          }}>
            VIEW RUN HISTORY
          </Link>
          <button onClick={() => {
            setResult(null);
            setStep(1);
            setMeta({ orgName: '', runLabel: '', runDate: '' });
            setRecipients([{ name: '', routingNumber: '', accountNumber: '', amountUsd: '', transferType: 'ACH' }]);
          }} style={{
            background: 'transparent', border: '1px solid #1e3a5f', color: '#1e3a5f',
            fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700,
            padding: '0.65rem 1.5rem', cursor: 'pointer', letterSpacing: '0.04em',
          }}>
            RUN ANOTHER PAYROLL
          </button>
        </div>
      </DesignLawLayout>
    );
  }

  // ── Base layout wrapper ─────────────────────────────────────────────────────

  return (
    <DesignLawLayout>
      <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#666', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
          AXIOM RAIL / PAYROLL MODULE
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2rem', fontWeight: 700, color: '#1e3a5f', lineHeight: 1.2 }}>
            Run Payroll
          </h1>
          {authorizedAccount && (
            <div style={{ background: '#f0faf0', border: '1px solid #2d7a2d', padding: '0.4rem 0.9rem' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#888', display: 'block', letterSpacing: '0.08em' }}>AUTHORIZED ACCOUNT</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#1a5c1a', fontWeight: 700, wordBreak: 'break-all' }}>
                {authorizedAccount.slice(0, 8)}...{authorizedAccount.slice(-6)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Auth gate — shown until JWT is present ─────────────────────── */}
      {authChecked && !jwt && (
        <AuthGate onAuthenticated={handleAuthenticated} />
      )}

      {/* ── Multi-step form — only shown when authenticated ────────────── */}
      {authChecked && jwt && (
        <>
          <StepIndicator step={step} />

          {/* Step 1: Run Details */}
          {step === 1 && (
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: '#1e3a5f', marginBottom: '1.5rem' }}>
                Run Details
              </h2>
              <FieldGroup label="ORGANIZATION NAME" error={errors.orgName}>
                <input type="text" value={meta.orgName} onChange={e => setMeta(m => ({ ...m, orgName: e.target.value }))} placeholder="Axiom DAO Treasury" style={inputStyle} />
              </FieldGroup>
              <FieldGroup label="RUN LABEL" hint="A short description for this payroll run (e.g. Q2 2026 Core Team)" error={errors.runLabel}>
                <input type="text" value={meta.runLabel} onChange={e => setMeta(m => ({ ...m, runLabel: e.target.value }))} placeholder="April 2026 Core Contributor" style={inputStyle} />
              </FieldGroup>
              <FieldGroup label="PAY DATE" hint="The effective pay date (YYYY-MM-DD)" error={errors.runDate}>
                <input type="date" value={meta.runDate} onChange={e => setMeta(m => ({ ...m, runDate: e.target.value }))} style={inputStyle} />
              </FieldGroup>
              <button onClick={nextStep} style={{
                background: '#1e3a5f', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem',
                fontWeight: 700, padding: '0.65rem 2rem', border: 'none', cursor: 'pointer', letterSpacing: '0.04em',
              }}>
                NEXT: IDENTITY
              </button>
            </div>
          )}

          {/* Step 2: BSA Identity */}
          {step === 2 && (
            <div style={{ maxWidth: 560 }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: '#1e3a5f', marginBottom: '0.5rem' }}>
                Operator Identity (BSA)
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Bank Secrecy Act recordkeeping requires the identity of the person authorizing this
                payroll disbursement. This information is stored securely and never shared.
              </p>
              <FieldGroup label="LEGAL FULL NAME" error={errors.legalName}>
                <input type="text" value={bsa.legalName} onChange={e => setBsa(b => ({ ...b, legalName: e.target.value }))} placeholder="Jane A. Smith" style={inputStyle} />
              </FieldGroup>
              <FieldGroup label="DATE OF BIRTH" hint="YYYY-MM-DD" error={errors.dob}>
                <input type="date" value={bsa.dob} onChange={e => setBsa(b => ({ ...b, dob: e.target.value }))} style={inputStyle} />
              </FieldGroup>
              <FieldGroup label="COUNTRY OF RESIDENCE" error={errors.country}>
                <input type="text" value={bsa.country} onChange={e => setBsa(b => ({ ...b, country: e.target.value }))} placeholder="United States" style={inputStyle} />
              </FieldGroup>
              <FieldGroup label="GOVERNMENT ID TYPE" error={errors.idType}>
                <select value={bsa.idType} onChange={e => setBsa(b => ({ ...b, idType: e.target.value as 'ssn' | 'passport', idNumber: '' }))} style={selectStyle}>
                  <option value="ssn">SSN (last 4 digits)</option>
                  <option value="passport">Passport Number</option>
                </select>
              </FieldGroup>
              <FieldGroup
                label={bsa.idType === 'ssn' ? 'LAST 4 DIGITS OF SSN' : 'PASSPORT NUMBER'}
                hint={bsa.idType === 'ssn' ? 'Enter only the last 4 digits' : '3–20 alphanumeric characters'}
                error={errors.idNumber}
              >
                <input type="text" value={bsa.idNumber} onChange={e => setBsa(b => ({ ...b, idNumber: e.target.value }))} placeholder={bsa.idType === 'ssn' ? '1234' : 'A1234567'} maxLength={bsa.idType === 'ssn' ? 4 : 20} style={inputStyle} />
              </FieldGroup>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={prevStep} style={{ background: 'transparent', border: '1px solid #bbc8da', color: '#555', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, padding: '0.65rem 1.5rem', cursor: 'pointer', letterSpacing: '0.04em' }}>BACK</button>
                <button onClick={nextStep} style={{ background: '#1e3a5f', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, padding: '0.65rem 2rem', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}>NEXT: RECIPIENTS</button>
              </div>
            </div>
          )}

          {/* Step 3: Recipient List */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: '#1e3a5f', marginBottom: '0.5rem' }}>
                Recipients
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Add up to 200 contributors. Each recipient receives a unique Stellar memo for their payment.
                Fee: $0.50 flat + 0.1% per recipient.
              </p>
              {recipients.map((r, i) => {
                const preview = calcFee(r.amountUsd);
                return (
                  <div key={i} style={{ border: '1px solid #dde3ed', padding: '1.25rem', marginBottom: '1rem', background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', letterSpacing: '0.1em' }}>RECIPIENT {i + 1}</span>
                      {recipients.length > 1 && (
                        <button onClick={() => removeRecipient(i)} style={{ background: 'transparent', border: 'none', color: '#cc3333', fontFamily: 'monospace', fontSize: '0.72rem', cursor: 'pointer', padding: 0 }}>REMOVE</button>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <FieldGroup label="FULL NAME" error={errors[`r${i}_name`]}>
                        <input type="text" value={r.name} onChange={e => updateRecipient(i, 'name', e.target.value)} placeholder="Jane Smith" style={inputStyle} />
                      </FieldGroup>
                      <FieldGroup label="ROUTING NUMBER (9 DIGITS)" error={errors[`r${i}_routing`]}>
                        <input type="text" value={r.routingNumber} onChange={e => updateRecipient(i, 'routingNumber', e.target.value)} placeholder="021000021" maxLength={9} style={inputStyle} />
                      </FieldGroup>
                      <FieldGroup label="ACCOUNT NUMBER" error={errors[`r${i}_account`]}>
                        <input type="text" value={r.accountNumber} onChange={e => updateRecipient(i, 'accountNumber', e.target.value)} placeholder="12345678" style={inputStyle} />
                      </FieldGroup>
                      <FieldGroup label="AMOUNT (USD)" error={errors[`r${i}_amount`]}>
                        <input type="number" value={r.amountUsd} onChange={e => updateRecipient(i, 'amountUsd', e.target.value)} placeholder="500.00" min="10" max="25000" step="0.01" style={inputStyle} />
                      </FieldGroup>
                      <FieldGroup label="TRANSFER TYPE">
                        <select value={r.transferType} onChange={e => updateRecipient(i, 'transferType', e.target.value)} style={selectStyle}>
                          <option value="ACH">ACH (1–3 business days)</option>
                          <option value="Wire">Wire (same day)</option>
                        </select>
                      </FieldGroup>
                    </div>
                    {preview && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: '#f8f9fb', padding: '0.6rem 0.9rem', borderTop: '1px solid #e8edf5' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>Gross: <strong style={{ color: '#1e3a5f' }}>${preview.gross.toFixed(2)}</strong></span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>Fee: <strong style={{ color: '#7a5a00' }}>${preview.fee.toFixed(2)}</strong></span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888' }}>Net to recipient: <strong style={{ color: '#2d7a2d' }}>${preview.net.toFixed(2)}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={addRecipient} style={{ background: 'transparent', border: '1px dashed #1e3a5f', color: '#1e3a5f', fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, padding: '0.6rem 1.5rem', cursor: 'pointer', letterSpacing: '0.04em', marginBottom: '1.5rem', display: 'block', width: '100%' }}>
                + ADD RECIPIENT
              </button>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={prevStep} style={{ background: 'transparent', border: '1px solid #bbc8da', color: '#555', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, padding: '0.65rem 1.5rem', cursor: 'pointer', letterSpacing: '0.04em' }}>BACK</button>
                <button onClick={nextStep} style={{ background: '#1e3a5f', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, padding: '0.65rem 2rem', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}>REVIEW</button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Submit */}
          {step === 4 && (
            <div style={{ maxWidth: 700 }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.1rem', color: '#1e3a5f', marginBottom: '1.5rem' }}>
                Review & Submit
              </h2>
              <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>RUN DETAILS</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Organization', value: meta.orgName },
                    { label: 'Run Label', value: meta.runLabel },
                    { label: 'Pay Date', value: meta.runDate },
                    { label: 'Recipients', value: String(recipients.length) },
                    { label: 'Gross Total', value: `$${totalGross.toFixed(2)}` },
                    { label: 'Total Fees', value: `$${totalFee.toFixed(2)}` },
                    { label: 'Net Disbursed', value: `$${totalNet.toFixed(2)}` },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#888', marginBottom: '0.2rem' }}>{item.label}</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e3a5f', fontWeight: 700 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.25rem', marginBottom: '1.5rem' }}>
                <p style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>AUTHORIZING OPERATOR (BSA)</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  {[
                    { label: 'Legal Name', value: bsa.legalName },
                    { label: 'Country', value: bsa.country },
                    { label: 'ID Type', value: bsa.idType.toUpperCase() },
                    { label: 'ID Number', value: bsa.idType === 'ssn' ? `xxxx-xx-${bsa.idNumber}` : bsa.idNumber },
                  ].map(item => (
                    <div key={item.label}>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#888', marginBottom: '0.2rem' }}>{item.label}</p>
                      <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#1e3a5f', fontWeight: 700 }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {apiError && (
                <div style={{ background: '#fff0f0', border: '1px solid #cc3333', padding: '1rem', marginBottom: '1.25rem' }}>
                  <p style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#cc3333' }}>{apiError}</p>
                </div>
              )}
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={prevStep} style={{ background: 'transparent', border: '1px solid #bbc8da', color: '#555', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, padding: '0.65rem 1.5rem', cursor: 'pointer', letterSpacing: '0.04em' }}>BACK</button>
                <button onClick={handleSubmit} disabled={submitting} style={{ background: submitting ? '#4a6a8f' : '#1e3a5f', color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, padding: '0.65rem 2rem', border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing: '0.04em' }}>
                  {submitting ? 'SUBMITTING...' : 'SUBMIT PAYROLL RUN'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </DesignLawLayout>
  );
}
