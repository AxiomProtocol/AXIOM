/**
 * /rent-collection/pay/[slug]
 *
 * Tenant rent payment page.
 * 1. Fetches display-safe property info (address, landlord first name, default amount)
 * 2. Two-step form: Step 1 — amount + source bank; Step 2 — BSA identity
 * 3. Submits POST /api/axiom-rail/rent/pay
 * 4. Confirmation card with transaction ID and next steps
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law';

const NAVY = '#1e3a5f';
const MONO = 'monospace';
const SERIF = 'Georgia, serif';

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
};

type IdType = 'ssn' | 'passport';

interface PropertyInfo {
  slug: string;
  propertyAddress: string;
  landlordFirstName: string;
  defaultRentAmount: string | null;
}

interface ConfirmationData {
  transferId: string;
  memo: string;
  amountUsd: string;
  fee: string;
  amountOut: string;
  transferType: string;
  propertyAddress: string;
  message: string;
}

export default function TenantPayPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [propLoading, setPropLoading] = useState(true);
  const [propError, setPropError] = useState<string | null>(null);

  const [step, setStep] = useState<'bank' | 'identity' | 'submitting' | 'done' | 'error'>('bank');

  const [amountUsd, setAmountUsd] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [transferType, setTransferType] = useState<'ACH' | 'Wire'>('ACH');

  const [legalName, setLegalName] = useState('');
  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');
  const [idType, setIdType] = useState<IdType>('ssn');
  const [idNumber, setIdNumber] = useState('');

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationData | null>(null);

  useEffect(() => {
    if (!router.isReady || !slug) return;
    fetch(`/api/axiom-rail/rent/property/${slug}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setPropError(d.error); return; }
        setProperty(d as PropertyInfo);
        if (d.defaultRentAmount) setAmountUsd(d.defaultRentAmount);
      })
      .catch(() => setPropError('Could not load property information.'))
      .finally(() => setPropLoading(false));
  }, [router.isReady, slug]);

  function handleBankNext(e: React.FormEvent) {
    e.preventDefault();
    if (!legalName) setLegalName(accountName);
    setStep('identity');
  }

  async function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setStep('submitting');

    try {
      const res = await fetch('/api/axiom-rail/rent/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertySlug: slug,
          amountUsd,
          routingNumber,
          accountNumber,
          accountName,
          transferType,
          bsaLegalName: legalName,
          bsaDob: dob,
          bsaCountry: country,
          bsaIdType: idType,
          bsaIdNumber: idNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Payment submission failed');
        setStep('error');
        return;
      }
      setConfirmation(data as ConfirmationData);
      setStep('done');
    } catch {
      setSubmitError('Network error. Please try again.');
      setStep('error');
    }
  }

  const parsedAmt = parseFloat(amountUsd || '0');
  const fee = isNaN(parsedAmt) ? 0 : 0.50 + parsedAmt * 0.001;
  const amountOut = Math.max(0, parsedAmt - fee);

  if (propLoading) {
    return (
      <DesignLawLayout>
        <p style={{ fontFamily: MONO, fontSize: '0.8rem', color: '#888' }}>Loading property...</p>
      </DesignLawLayout>
    );
  }

  if (propError || !property) {
    return (
      <DesignLawLayout>
        <div style={{ background: '#fff0f0', border: '1px solid #cc3333', padding: '1.25rem', maxWidth: 520 }}>
          <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#cc3333', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>PROPERTY NOT FOUND</p>
          <p style={{ fontSize: '0.85rem', color: '#333', margin: 0 }}>
            {propError ?? 'The payment link you followed could not be found. Please check with your landlord.'}
          </p>
        </div>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      {/* Header */}
      <div style={{ borderBottom: `2px solid ${NAVY}`, paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>
          AXIOM RAIL / RENT COLLECTION
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: '1.8rem', fontWeight: 700, color: NAVY, marginBottom: '0.4rem' }}>
          Pay Rent
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#444', marginBottom: '0.25rem' }}>
          {property.propertyAddress}
        </p>
        <p style={{ fontFamily: MONO, fontSize: '0.78rem', color: '#666', margin: 0 }}>
          Landlord: {property.landlordFirstName}
        </p>

        {/* Step indicator */}
        {(step === 'bank' || step === 'identity') && (
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem' }}>
            {(['bank', 'identity'] as const).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <div style={{
                  width: 20, height: 20,
                  background: step === s ? NAVY : '#d1d5db',
                  border: `2px solid ${NAVY}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: '#fff', fontFamily: MONO, fontWeight: 700,
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 11, fontFamily: MONO, color: step === s ? NAVY : '#9ca3af', textTransform: 'uppercase' }}>
                  {s === 'bank' ? 'Payment Details' : 'Identity'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 560 }}>

        {/* ── STEP 1: Payment Details ──────────────────────────────────────── */}
        {step === 'bank' && (
          <form onSubmit={handleBankNext}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Payment Amount (USD)</label>
              <input
                type="number"
                required
                min="10"
                max="25000"
                step="0.01"
                value={amountUsd}
                onChange={e => setAmountUsd(e.target.value)}
                placeholder="e.g. 1500.00"
                style={inputStyle}
              />
              {parsedAmt >= 10 && (
                <p style={{ fontFamily: MONO, fontSize: '0.72rem', color: '#666', marginTop: '0.35rem' }}>
                  Fee: ${fee.toFixed(2)} — You pay ${parsedAmt.toFixed(2)}, landlord receives ${amountOut.toFixed(2)}
                </p>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Your Name (Account Holder)</label>
              <input
                type="text"
                required
                value={accountName}
                onChange={e => setAccountName(e.target.value)}
                placeholder="Name on your sending bank account"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Your ABA Routing Number</label>
              <input
                type="text"
                required
                value={routingNumber}
                onChange={e => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                placeholder="9 digits"
                maxLength={9}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Your Account Number</label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Your bank account number"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Transfer Method</label>
              <select
                value={transferType}
                onChange={e => setTransferType(e.target.value as 'ACH' | 'Wire')}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="ACH">ACH — 1–3 business days</option>
                <option value="Wire">Wire — same business day ($15 wire fee applies)</option>
              </select>
            </div>

            <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.78rem', color: '#555', lineHeight: 1.6 }}>
              Axiom Rail charges $0.50 + 0.1% per transaction. Minimum payment $10.
            </div>

            <button type="submit" style={primaryBtn}>
              CONTINUE TO IDENTITY VERIFICATION
            </button>
          </form>
        )}

        {/* ── STEP 2: BSA Identity ─────────────────────────────────────────── */}
        {step === 'identity' && (
          <form onSubmit={handleIdentitySubmit}>
            <div style={{ background: '#f8f9fb', border: `1px solid ${NAVY}`, padding: '1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#374151', lineHeight: 1.6 }}>
              <p style={{ fontFamily: MONO, fontSize: '0.68rem', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 0.4rem', fontWeight: 700 }}>
                Regulatory Notice — Bank Secrecy Act
              </p>
              Federal law requires money service businesses to collect and retain sender
              identity records for payment transactions. This information is retained solely
              for compliance with US Bank Secrecy Act requirements and is never sold or
              shared for marketing purposes.
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Full Legal Name</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={e => setLegalName(e.target.value)}
                placeholder="As it appears on your government-issued ID"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Date of Birth</label>
              <input
                type="date"
                required
                value={dob}
                onChange={e => setDob(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Country of Residence</label>
              <input
                type="text"
                required
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="e.g. United States"
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>ID Type</label>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: '#374151', cursor: 'pointer' }}>
                  <input type="radio" name="idType" value="ssn" checked={idType === 'ssn'} onChange={() => { setIdType('ssn'); setIdNumber(''); }} />
                  US Person — SSN (last 4 digits)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.83rem', color: '#374151', cursor: 'pointer' }}>
                  <input type="radio" name="idType" value="passport" checked={idType === 'passport'} onChange={() => { setIdType('passport'); setIdNumber(''); }} />
                  Non-US — Passport
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>{idType === 'ssn' ? 'Last 4 Digits of SSN' : 'Passport Number'}</label>
              <input
                type="text"
                required
                value={idNumber}
                onChange={e => {
                  const v = e.target.value;
                  if (idType === 'ssn') setIdNumber(v.replace(/\D/g, '').slice(0, 4));
                  else setIdNumber(v.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                }}
                placeholder={idType === 'ssn' ? '4 digits' : 'Passport number'}
                maxLength={idType === 'ssn' ? 4 : 20}
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" onClick={() => setStep('bank')} style={outlineBtn}>
                BACK
              </button>
              <button type="submit" style={{ ...primaryBtn, flex: 1 }}>
                SUBMIT RENT PAYMENT
              </button>
            </div>
          </form>
        )}

        {/* ── Submitting ───────────────────────────────────────────────────── */}
        {step === 'submitting' && (
          <div style={{ padding: '3rem 0', textAlign: 'center' }}>
            <p style={{ fontFamily: MONO, color: NAVY, fontSize: '0.85rem' }}>Submitting payment...</p>
          </div>
        )}

        {/* ── Confirmation ─────────────────────────────────────────────────── */}
        {step === 'done' && confirmation && (
          <div>
            <div style={{ background: '#f0fdf4', border: '1px solid #166534', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#166534', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
                PAYMENT RECORDED
              </p>
              <p style={{ fontSize: '0.88rem', color: '#333', lineHeight: 1.7, margin: 0 }}>
                {confirmation.message}
              </p>
            </div>

            <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <tbody>
                  {[
                    ['Transaction ID', confirmation.transferId],
                    ['Reference / Memo', confirmation.memo],
                    ['Amount', `$${confirmation.amountUsd}`],
                    ['Fee', `$${confirmation.fee}`],
                    ['Net to Landlord', `$${confirmation.amountOut}`],
                    ['Method', confirmation.transferType],
                    ['Property', confirmation.propertyAddress],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderTop: '1px solid #dde3ed' }}>
                      <td style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', padding: '0.5rem 0.5rem 0.5rem 0', width: '40%', textTransform: 'uppercase' }}>{label}</td>
                      <td style={{ fontFamily: MONO, fontSize: '0.8rem', color: NAVY, padding: '0.5rem 0', wordBreak: 'break-all' }}>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={{ fontFamily: SERIF, fontSize: '1rem', color: NAVY, marginBottom: '0.75rem' }}>Next Steps</h2>
            <ol style={{ fontSize: '0.84rem', color: '#444', lineHeight: 1.8, paddingLeft: '1.25rem' }}>
              <li>Your landlord will be notified that your payment has been submitted.</li>
              <li>Axiom Rail operations will settle funds to your landlord via {confirmation.transferType === 'Wire' ? 'same-day domestic wire' : 'ACH (1–3 business days)'}.</li>
              <li>Save your Transaction ID <strong style={{ fontFamily: MONO }}>{confirmation.transferId}</strong> for your records.</li>
            </ol>

            <p style={{ fontSize: '0.78rem', color: '#888', marginTop: '1.5rem' }}>
              Questions? Contact{' '}
              <a href="mailto:support@axiomprotocol.app" style={{ color: NAVY }}>support@axiomprotocol.app</a>
            </p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────────────────────── */}
        {step === 'error' && (
          <div>
            <div style={{ background: '#fff0f0', border: '1px solid #cc3333', padding: '1rem', marginBottom: '1rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.78rem', color: '#cc3333', margin: 0 }}>{submitError}</p>
            </div>
            <button onClick={() => { setStep('bank'); setSubmitError(null); }} style={outlineBtn}>
              TRY AGAIN
            </button>
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
