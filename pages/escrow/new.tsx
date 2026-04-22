/**
 * /escrow/new
 *
 * Escrow creation form. Two-step: Step 1 — escrow details + bank; Step 2 — BSA identity.
 * On success: displays escrow URL and party tokens (shown once).
 */

import { useState } from 'react';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law';

const NAVY = '#1e3a5f';
const MONO = 'monospace';

const inputStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  fontFamily: MONO,
  fontSize: '0.85rem',
  color: NAVY,
  background: '#fff',
  border: '1px solid #bbc8da',
  padding: '0.5rem 0.75rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: MONO,
  fontSize: '0.7rem',
  color: NAVY,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '0.35rem',
};

const primaryBtn: React.CSSProperties = {
  background: NAVY,
  color: '#fff',
  fontFamily: MONO,
  fontSize: '0.85rem',
  fontWeight: 700,
  letterSpacing: '0.06em',
  padding: '0.65rem 1.75rem',
  border: 'none',
  cursor: 'pointer',
};

const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#fff',
  color: NAVY,
  border: `1px solid ${NAVY}`,
  textDecoration: 'none',
  display: 'inline-block',
};

type Purpose = 'security_deposit' | 'earnest_money' | 'milestone';
type ReleaseCondition = 'bilateral_approval' | 'deadline';
type IdType = 'ssn' | 'passport';
type Step = 'details' | 'identity' | 'submitting' | 'done' | 'error';

interface EscrowResult {
  escrowId: string;
  escrowUrl: string;
  initiatorToken: string;
  amountUsd: string;
  purpose: string;
  releaseCondition: string;
  deadline: string | null;
  counterpartyName: string;
  counterpartyEmail: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <button onClick={copy} style={{ ...outlineBtn, padding: '0.3rem 0.9rem', fontSize: '0.75rem' }}>
      {copied ? 'Copied' : label}
    </button>
  );
}

const purposeOptions: { value: Purpose; label: string }[] = [
  { value: 'security_deposit', label: 'Security Deposit' },
  { value: 'earnest_money', label: 'Earnest Money' },
  { value: 'milestone', label: 'Milestone Payment' },
];

const purposeLabels: Record<string, string> = {
  security_deposit: 'Security Deposit',
  earnest_money: 'Earnest Money',
  milestone: 'Milestone Payment',
};

export default function EscrowNewPage() {
  const [step, setStep] = useState<Step>('details');

  const [initiatorName, setInitiatorName] = useState('');
  const [counterpartyName, setCounterpartyName] = useState('');
  const [counterpartyEmail, setCounterpartyEmail] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [purpose, setPurpose] = useState<Purpose>('security_deposit');
  const [releaseCondition, setReleaseCondition] = useState<ReleaseCondition>('bilateral_approval');
  const [deadline, setDeadline] = useState('');
  const [beneficiaryRouting, setBeneficiaryRouting] = useState('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState('');
  const [beneficiaryBankName, setBeneficiaryBankName] = useState('');

  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [idType, setIdType] = useState<IdType>('ssn');
  const [idNumber, setIdNumber] = useState('');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<EscrowResult | null>(null);

  const [urlCopied, setUrlCopied] = useState(false);
  const [tokenACopied, setTokenACopied] = useState(false);

  function handleDetailsNext(e: React.FormEvent) {
    e.preventDefault();
    if (!legalName) setLegalName(initiatorName);
    setStep('identity');
  }

  async function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setStep('submitting');

    try {
      const body: Record<string, string> = {
        initiatorName: initiatorName.trim(),
        counterpartyName: counterpartyName.trim(),
        counterpartyEmail: counterpartyEmail.trim(),
        amountUsd: amountUsd.trim(),
        purpose,
        releaseCondition,
        beneficiaryRouting: beneficiaryRouting.trim(),
        beneficiaryAccount: beneficiaryAccount.trim(),
        beneficiaryBankName: beneficiaryBankName.trim(),
        bsaLegalName: legalName.trim(),
        bsaDob: dob.trim(),
        bsaCountry: country.trim(),
        bsaIdType: idType,
        bsaIdNumber: idNumber.trim(),
      };
      if (releaseCondition === 'deadline' && deadline) {
        body.deadline = new Date(deadline).toISOString();
      }

      const res = await fetch('/api/axiom-rail/escrow/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to create escrow.');
        setStep('error');
        return;
      }

      setResult(data as EscrowResult);
      setStep('done');
    } catch {
      setSubmitError('Network error. Please try again.');
      setStep('error');
    }
  }

  function renderStep() {
    if (step === 'done' && result) {
      return (
        <div>
          <div style={{ background: '#e8f0e9', border: '1px solid #4caf50', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.85rem', color: '#1a4a1a', margin: 0 }}>
              Escrow created successfully. An invitation email with their access token has been sent to <strong>{result.counterpartyEmail}</strong>.
              Save your initiator token below — it is shown only once.
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Escrow ID</div>
            <div style={{ fontFamily: MONO, fontSize: '0.85rem', color: NAVY, wordBreak: 'break-all' }}>{result.escrowId}</div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Shareable Escrow Link</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: MONO, fontSize: '0.8rem', color: NAVY, wordBreak: 'break-all' }}>{result.escrowUrl}</span>
              <CopyButton text={result.escrowUrl} label="Copy Link" />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem', background: '#fef9e7', border: '1px solid #f39c12', padding: '1rem 1.25rem' }}>
            <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#7d4a00', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Your Initiator Token — Save Now</div>
            <p style={{ fontFamily: MONO, fontSize: '0.75rem', color: '#7d4a00', margin: '0 0 0.75rem' }}>
              Use this token to confirm funding and approve the release of escrow funds.
              Your counterparty's token was sent directly to their email — they cannot be approved by you.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: MONO, fontSize: '0.75rem', wordBreak: 'break-all', background: '#fff', padding: '0.4rem 0.6rem', border: '1px solid #e0c080' }}>{result.initiatorToken}</span>
              <CopyButton text={result.initiatorToken} label="Copy" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Amount', value: `$${result.amountUsd}` },
              { label: 'Purpose', value: purposeLabels[result.purpose] ?? result.purpose },
              { label: 'Release', value: result.releaseCondition === 'bilateral_approval' ? 'Bilateral Approval' : 'Deadline' },
              { label: 'Counterparty', value: result.counterpartyName },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#f8f9fb', border: '1px solid #dde4ee', padding: '0.75rem' }}>
                <div style={{ fontFamily: MONO, fontSize: '0.65rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem' }}>{label}</div>
                <div style={{ fontFamily: MONO, fontSize: '0.85rem', color: NAVY, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Link href={result.escrowUrl.replace(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://axiomprotocol.app', '')} style={{ ...primaryBtn }}>
              View Escrow Status
            </Link>
            <Link href="/escrow/dashboard" style={{ ...outlineBtn }}>
              My Dashboard
            </Link>
          </div>
        </div>
      );
    }

    if (step === 'error') {
      return (
        <div>
          <div style={{ background: '#fdecea', border: '1px solid #e57373', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.85rem', color: '#7d1c1c', margin: 0 }}>{submitError}</p>
          </div>
          <button style={outlineBtn} onClick={() => setStep('details')}>Back to Form</button>
        </div>
      );
    }

    if (step === 'submitting') {
      return (
        <div style={{ fontFamily: MONO, fontSize: '0.85rem', color: NAVY, padding: '2rem 0' }}>
          Creating escrow…
        </div>
      );
    }

    if (step === 'identity') {
      return (
        <form onSubmit={handleIdentitySubmit}>
          <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
            Step 2 of 2 — Identity Verification (BSA Compliance)
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Legal Name</label>
            <input style={inputStyle} value={legalName} onChange={e => setLegalName(e.target.value)} required placeholder="Full legal name" />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Date of Birth (YYYY-MM-DD)</label>
            <input style={inputStyle} value={dob} onChange={e => setDob(e.target.value)} required placeholder="1980-01-15" pattern="\d{4}-\d{2}-\d{2}" />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Country of Residence</label>
            <input style={inputStyle} value={country} onChange={e => setCountry(e.target.value)} required placeholder="US" />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>ID Type</label>
            <select style={inputStyle} value={idType} onChange={e => setIdType(e.target.value as IdType)} required>
              <option value="ssn">SSN (last 4 digits)</option>
              <option value="passport">Passport Number</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={labelStyle}>{idType === 'ssn' ? 'Last 4 Digits of SSN' : 'Passport Number'}</label>
            <input
              style={inputStyle}
              value={idNumber}
              onChange={e => setIdNumber(e.target.value)}
              required
              placeholder={idType === 'ssn' ? '4321' : 'A12345678'}
              maxLength={idType === 'ssn' ? 4 : 20}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="submit" style={primaryBtn}>Create Escrow</button>
            <button type="button" style={outlineBtn} onClick={() => setStep('details')}>Back</button>
          </div>

          <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#7a8fa8', marginTop: '1rem' }}>
            Identity data is hashed and stored for BSA compliance only. It is never exposed in API responses.
          </p>
        </form>
      );
    }

    return (
      <form onSubmit={handleDetailsNext}>
        <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1.25rem' }}>
          Step 1 of 2 — Escrow Details
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Your Name (Initiator)</label>
            <input style={inputStyle} value={initiatorName} onChange={e => setInitiatorName(e.target.value)} required placeholder="Jane Smith" />
          </div>
          <div>
            <label style={labelStyle}>Counterparty Name</label>
            <input style={inputStyle} value={counterpartyName} onChange={e => setCounterpartyName(e.target.value)} required placeholder="John Doe" />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Counterparty Email</label>
          <input style={inputStyle} type="email" value={counterpartyEmail} onChange={e => setCounterpartyEmail(e.target.value)} required placeholder="john@example.com" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Amount (USD)</label>
            <input style={inputStyle} type="number" min="1" max="500000" step="0.01" value={amountUsd} onChange={e => setAmountUsd(e.target.value)} required placeholder="5000.00" />
          </div>
          <div>
            <label style={labelStyle}>Purpose</label>
            <select style={inputStyle} value={purpose} onChange={e => setPurpose(e.target.value as Purpose)} required>
              {purposeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Release Condition</label>
          <select style={inputStyle} value={releaseCondition} onChange={e => setReleaseCondition(e.target.value as ReleaseCondition)} required>
            <option value="bilateral_approval">Bilateral Approval (both parties agree)</option>
            <option value="deadline">Deadline Auto-Release (funds release on date)</option>
          </select>
        </div>

        {releaseCondition === 'deadline' && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Release Deadline</label>
            <input style={inputStyle} type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} required />
          </div>
        )}

        <div style={{ borderTop: '1px solid #dde4ee', paddingTop: '1.25rem', marginTop: '0.5rem', marginBottom: '1rem' }}>
          <div style={{ fontFamily: MONO, fontSize: '0.7rem', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>Beneficiary Bank (Receiving Account)</div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Bank Name</label>
            <input style={inputStyle} value={beneficiaryBankName} onChange={e => setBeneficiaryBankName(e.target.value)} required placeholder="Chase Bank" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Routing Number (9 digits)</label>
              <input style={inputStyle} value={beneficiaryRouting} onChange={e => setBeneficiaryRouting(e.target.value)} required placeholder="021000021" maxLength={9} pattern="\d{9}" />
            </div>
            <div>
              <label style={labelStyle}>Account Number</label>
              <input style={inputStyle} value={beneficiaryAccount} onChange={e => setBeneficiaryAccount(e.target.value)} required placeholder="000123456789" />
            </div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <button type="submit" style={primaryBtn}>Next: Verify Identity</button>
        </div>
      </form>
    );
  }

  return (
    <DesignLawLayout>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '0.5rem', fontFamily: MONO, fontSize: '0.7rem', color: '#7a8fa8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Axiom Rail / Escrow
        </div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', color: NAVY, fontWeight: 700, margin: '0 0 0.4rem' }}>
          Open New Escrow
        </h1>
        <p style={{ fontFamily: MONO, fontSize: '0.82rem', color: '#4a6080', marginBottom: '2rem' }}>
          Hold funds in a neutral on-chain position with conditional release. No title company or attorney required.
        </p>

        {renderStep()}
      </div>
    </DesignLawLayout>
  );
}
