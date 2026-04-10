/**
 * /rent-collection/setup
 *
 * Landlord property registration. Single form → POST /api/axiom-rail/rent/setup.
 * On success: displays shareable payment URL and one-time management token.
 */

import { useState } from 'react';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law';

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
  textDecoration: 'none',
  display: 'inline-block',
};

interface SetupResult {
  slug: string;
  paymentUrl: string;
  managementToken: string;
  landlordName: string;
  propertyAddress: string;
  defaultRentAmount: string | null;
}

export default function RentCollectionSetupPage() {
  const [landlordName, setLandlordName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [defaultRent, setDefaultRent] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/axiom-rail/rent/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          landlordName: landlordName.trim(),
          propertyAddress: propertyAddress.trim(),
          receivingBankRouting: routingNumber.trim(),
          receivingBankAccount: accountNumber.trim(),
          receivingBankName: bankName.trim(),
          defaultRentAmount: defaultRent.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Setup failed');
        return;
      }
      setResult(data as SetupResult);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function copyToken() {
    if (!result) return;
    navigator.clipboard.writeText(result.managementToken).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  }

  function copyUrl() {
    if (!result) return;
    navigator.clipboard.writeText(result.paymentUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  }

  if (result) {
    return (
      <DesignLawLayout>
        <div style={{ borderBottom: `2px solid ${NAVY}`, paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
            AXIOM RAIL / RENT COLLECTION
          </p>
          <h1 style={{ fontFamily: SERIF, fontSize: '1.8rem', fontWeight: 700, color: NAVY, marginBottom: '0.5rem' }}>
            Property Registered
          </h1>
          <p style={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.7 }}>
            {result.landlordName} — {result.propertyAddress}
          </p>
        </div>

        {/* Payment URL */}
        <section style={{ marginBottom: '2rem' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
            TENANT PAYMENT LINK
          </p>
          <div style={{ background: '#f8f9fb', border: `1px solid #dde3ed`, padding: '1.25rem', marginBottom: '0.75rem' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.85rem', color: NAVY, wordBreak: 'break-all', margin: 0, fontWeight: 700 }}>
              {result.paymentUrl}
            </p>
          </div>
          <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.75rem' }}>
            Share this link with your tenant. They can use it every month — it is permanent and always points to your property.
          </p>
          <button onClick={copyUrl} style={primaryBtn}>
            {urlCopied ? 'COPIED' : 'COPY PAYMENT LINK'}
          </button>
        </section>

        {/* Management Token — one-time warning */}
        <section style={{ marginBottom: '2rem' }}>
          <div style={{ background: '#fffbea', border: `1px solid #b8860b`, padding: '1.25rem', marginBottom: '0.75rem' }}>
            <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#7a5a00', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              MANAGEMENT TOKEN — SHOWN ONCE
            </p>
            <p style={{ fontFamily: MONO, fontSize: '0.88rem', color: NAVY, wordBreak: 'break-all', fontWeight: 700, marginBottom: '0.5rem' }}>
              {result.managementToken}
            </p>
            <p style={{ fontSize: '0.8rem', color: '#7a5a00', margin: 0, lineHeight: 1.6 }}>
              This token grants access to your landlord dashboard. It is shown here once and never again — store it in a secure location (password manager, encrypted note, etc.). It cannot be recovered if lost.
            </p>
          </div>
          <button onClick={copyToken} style={{ ...primaryBtn, background: '#b8860b' }}>
            {tokenCopied ? 'COPIED' : 'COPY MANAGEMENT TOKEN'}
          </button>
        </section>

        {/* Actions */}
        <section style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', paddingTop: '1.5rem', borderTop: '1px solid #dde3ed' }}>
          <Link href="/rent-collection/dashboard" style={primaryBtn}>
            GO TO DASHBOARD
          </Link>
          <Link href="/rent-collection/setup" style={outlineBtn}>
            ADD ANOTHER PROPERTY
          </Link>
          <Link href="/rent-collection" style={{ ...outlineBtn, border: 'none', color: '#888' }}>
            Back to Rent Collection
          </Link>
        </section>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <div style={{ borderBottom: `2px solid ${NAVY}`, paddingBottom: '1.5rem', marginBottom: '2rem' }}>
        <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
          AXIOM RAIL / RENT COLLECTION
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: '1.8rem', fontWeight: 700, color: NAVY, marginBottom: '0.5rem' }}>
          Set Up Rent Collection
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#444', lineHeight: 1.7, maxWidth: 560 }}>
          Register your property and receiving bank once. You will receive a shareable
          tenant payment URL and a management token for your dashboard.
        </p>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #cc3333', padding: '0.9rem', marginBottom: '1.5rem' }}>
          <p style={{ fontFamily: MONO, fontSize: '0.78rem', color: '#cc3333', margin: 0 }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.75rem' }}>
          <legend style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            LANDLORD &amp; PROPERTY
          </legend>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Landlord / Owner Name</label>
            <input
              type="text"
              required
              value={landlordName}
              onChange={e => setLandlordName(e.target.value)}
              placeholder="Full name as it appears on your bank account"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Property Address</label>
            <input
              type="text"
              required
              value={propertyAddress}
              onChange={e => setPropertyAddress(e.target.value)}
              placeholder="123 Main St, Unit 4B, Austin TX 78701"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <label style={labelStyle}>Default Monthly Rent (optional)</label>
            <input
              type="number"
              min="10"
              max="25000"
              step="0.01"
              value={defaultRent}
              onChange={e => setDefaultRent(e.target.value)}
              placeholder="e.g. 1500.00 — pre-fills tenant payment form"
              style={inputStyle}
            />
          </div>
        </fieldset>

        <fieldset style={{ border: 'none', padding: 0, margin: '0 0 1.75rem' }}>
          <legend style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.1em', marginBottom: '1rem' }}>
            RECEIVING BANK ACCOUNT
          </legend>
          <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>
            This is the bank account where tenant rent payments will be deposited.
            This information is stored securely and never shown to tenants.
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Account Holder / Bank Name</label>
            <input
              type="text"
              required
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="Name on the receiving bank account"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>ABA Routing Number</label>
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

          <div style={{ marginBottom: '0.5rem' }}>
            <label style={labelStyle}>Account Number</label>
            <input
              type="text"
              required
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Bank account number"
              style={inputStyle}
            />
          </div>
        </fieldset>

        <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '0.9rem', marginBottom: '1.5rem', fontSize: '0.8rem', color: '#555', lineHeight: 1.6 }}>
          After submitting, your management token will be displayed once. Store it securely —
          it is required to access your landlord dashboard and cannot be recovered.
        </div>

        <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.6 : 1 }}>
          {submitting ? 'CREATING...' : 'CREATE PROPERTY'}
        </button>
      </form>
    </DesignLawLayout>
  );
}
