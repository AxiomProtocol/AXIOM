import { useState } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law';

export default function PayRentIndex() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');

  function extractSlug(raw: string): string {
    const s = raw.trim();
    const match = s.match(/\/pay\/([^/?#]+)/);
    if (match) return match[1];
    return s.replace(/^\/+/, '');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = extractSlug(slug);
    if (!parsed) {
      setError('Please enter your property payment code.');
      return;
    }
    router.push(`/rent-collection/pay/${encodeURIComponent(parsed)}`);
  }

  return (
    <DesignLawLayout>
      <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
        AXIOM RAIL / RENT COLLECTION
      </p>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 }}>
        Pay Rent
      </h1>
      <p style={{ color: '#374151', marginBottom: 24, maxWidth: 520 }}>
        Enter the property payment code provided by your landlord to access the secure payment form.
      </p>

      <hr style={{ borderColor: '#1e3a5f', marginBottom: 32 }} />

      <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', color: '#1e3a5f', marginBottom: 6 }}>
            PROPERTY PAYMENT CODE
          </label>
          <input
            type="text"
            value={slug}
            onChange={e => { setSlug(e.target.value); setError(''); }}
            placeholder="Paste the full payment link or just the property ID"
            style={{
              width: '100%',
              border: '1px solid #d1d5db',
              padding: '10px 12px',
              fontFamily: 'monospace',
              fontSize: 14,
              color: '#1e3a5f',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {error && (
            <p style={{ color: '#dc2626', fontFamily: 'monospace', fontSize: 12, marginTop: 4 }}>{error}</p>
          )}
        </div>

        <button
          type="submit"
          style={{
            background: '#1e3a5f',
            color: '#fff',
            border: 'none',
            padding: '11px 28px',
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Continue to Payment
        </button>
      </form>

      <div style={{ marginTop: 32, borderTop: '1px solid #e5e7eb', paddingTop: 20 }}>
        <p style={{ fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
          Are you a landlord?{' '}
          <a href="/rent-collection/setup" style={{ color: '#1e3a5f', textDecoration: 'underline' }}>
            Set up rent collection
          </a>{' '}
          or{' '}
          <a href="/rent-collection/dashboard" style={{ color: '#1e3a5f', textDecoration: 'underline' }}>
            access your dashboard
          </a>
          .
        </p>
      </div>
    </DesignLawLayout>
  );
}
