/**
 * /rent-collection
 *
 * Axiom Rail Rent Collection — public landing page.
 * Explains the problem (Zelle/Venmo/rent apps: high fees, no audit trail)
 * and the solution (Axiom Rail: 0.1% + $0.50 flat, identity-verified,
 * FDIC-settled). Two CTAs: setup and pay.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../components/design-law';

const NAVY = '#1e3a5f';
const GOLD = '#b8860b';
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
  textDecoration: 'none',
  display: 'inline-block',
};

const outlineBtn: React.CSSProperties = {
  ...primaryBtn,
  background: '#fff',
  color: NAVY,
  border: `1px solid ${NAVY}`,
};

export default function RentCollectionLandingPage() {
  const router = useRouter();
  const [slug, setSlug] = useState('');

  function extractSlug(raw: string): string {
    const s = raw.trim();
    // If user pasted a full URL or path, extract the final path segment
    const match = s.match(/\/pay\/([^/?#]+)/);
    if (match) return match[1];
    // Strip any leading slash or whitespace just in case
    return s.replace(/^\/+/, '');
  }

  function handlePayRedirect(e: React.FormEvent) {
    e.preventDefault();
    const parsed = extractSlug(slug);
    if (parsed) router.push(`/rent-collection/pay/${encodeURIComponent(parsed)}`);
  }

  return (
    <DesignLawLayout>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: `2px solid ${NAVY}`, paddingBottom: '2rem', marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
          AXIOM RAIL / LAYER 00 EXTENSION
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: '2.2rem', fontWeight: 700, color: NAVY, marginBottom: '1rem', lineHeight: 1.2 }}>
          Rent Collection
        </h1>
        <p style={{ color: '#444', maxWidth: 660, lineHeight: 1.8, fontSize: '1rem', marginBottom: '1.5rem' }}>
          Identity-verified rent collection settled through Axiom Rail — the same
          FDIC-insured ACH and wire infrastructure that powers institutional
          payments on Axiom Protocol. No middlemen. Permanent, reconcilable
          transaction records on every payment.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/rent-collection/setup" style={primaryBtn}>
            SET UP RENT COLLECTION
          </Link>
          <a href="#pay" style={outlineBtn}>
            PAY RENT
          </a>
        </div>
      </div>

      {/* ── Problem / Solution ────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: SERIF, fontSize: '1.3rem', color: NAVY, marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          The Problem with Existing Rent Apps
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: '#ddd', marginBottom: '1.5rem' }}>
          {[
            {
              label: 'Zelle / Venmo',
              items: [
                'No identity collection — BSA non-compliant',
                'No audit trail for tax or legal purposes',
                'No late payment tracking',
                'P2P limits — not built for recurring rent',
              ],
            },
            {
              label: 'Rent Collection Apps',
              items: [
                '1–3% per transaction',
                'Proprietary record systems — no portability',
                'Tenant data sold to third parties',
                '3–5 business day holds on funds',
              ],
            },
            {
              label: 'Checks / Cash',
              items: [
                'No automatic record of receipt',
                'Risk of loss, theft, or dispute',
                'Requires in-person coordination',
                'No structured identity verification',
              ],
            },
          ].map(col => (
            <div key={col.label} style={{ background: '#fff', padding: '1.25rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.72rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                {col.label.toUpperCase()}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {col.items.map(item => (
                  <li key={item} style={{ fontSize: '0.82rem', color: '#444', lineHeight: 1.7, paddingLeft: '1rem', position: 'relative', marginBottom: '0.25rem' }}>
                    <span style={{ position: 'absolute', left: 0, color: '#cc3333' }}>—</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── Axiom Rail Solution ───────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: SERIF, fontSize: '1.3rem', color: NAVY, marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Axiom Rail Rent Collection
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: '#ddd' }}>
          {[
            {
              label: 'Transparent Pricing',
              body: '$0.50 flat + 0.1% of transaction amount. No hidden fees, no subscription, no percentage tiers. A $1,500 rent payment costs $2.00.',
            },
            {
              label: 'Identity Verification',
              body: 'Every tenant payment collects Bank Secrecy Act (BSA) identity fields — legal name, DOB, country, and government ID. Records are retained for compliance, never sold.',
            },
            {
              label: 'FDIC-Insured Settlement',
              body: 'Payments settle via FDIC-insured ACH and wire settlement rails. ACH transfers complete in 1–3 business days. Same-day domestic wire available.',
            },
            {
              label: 'Permanent Audit Trail',
              body: 'Every payment generates a unique transaction ID and memo. Landlords view full payment history with tenant name, amount, date, and settlement status.',
            },
          ].map(card => (
            <div key={card.label} style={{ background: '#fff', padding: '1.25rem' }}>
              <p style={{ fontFamily: MONO, fontSize: '0.72rem', color: '#888', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                {card.label.toUpperCase()}
              </p>
              <p style={{ fontSize: '0.85rem', color: '#333', lineHeight: 1.7, margin: 0 }}>{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: SERIF, fontSize: '1.3rem', color: NAVY, marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          How It Works
        </h2>
        <div style={{ background: '#f8f9fb', border: `1px solid #dde3ed`, padding: '1.5rem' }}>
          <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
            {[
              { step: '1', text: 'Landlord registers their property and receiving bank account at /rent-collection/setup. A shareable payment link and one-time management token are generated.' },
              { step: '2', text: 'Landlord shares the payment URL with their tenant. The URL is stable — the same link works for every monthly payment.' },
              { step: '3', text: 'Tenant visits the payment link, enters their source bank details and BSA identity fields (same two-step form as Axiom Rail deposits), and submits.' },
              { step: '4', text: 'Payment is queued. Axiom Rail operations staff trigger settlement via ACH or wire to the landlord\'s registered bank account.' },
              { step: '5', text: 'Landlord views all payment history, settlement status, and per-transaction details from /rent-collection/dashboard using their management token.' },
            ].map(item => (
              <li key={item.step} style={{ fontSize: '0.85rem', color: '#333', lineHeight: 1.8, marginBottom: '0.75rem' }}>
                <strong style={{ fontFamily: MONO, color: NAVY }}>{item.text}</strong>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Pay Rent slug shortcut ────────────────────────────────────────── */}
      <section id="pay" style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: SERIF, fontSize: '1.3rem', color: NAVY, marginBottom: '0.75rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Pay Rent
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.7, marginBottom: '1.25rem' }}>
          Have a payment link from your landlord? Enter the property identifier below,
          or visit the full URL they sent you directly.
        </p>
        <form onSubmit={handlePayRedirect} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', maxWidth: 520 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ fontFamily: MONO, fontSize: '0.7rem', color: NAVY, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.35rem' }}>
              Property ID / Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="Paste the full payment link or just the property ID"
              style={inputStyle}
              required
            />
          </div>
          <button type="submit" style={{ ...primaryBtn, whiteSpace: 'nowrap' }}>
            GO TO PAYMENT PAGE
          </button>
        </form>
      </section>

      {/* ── CTAs ──────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '1.5rem' }}>
        <div style={{ background: '#f8f9fb', border: `1px solid #dde3ed`, padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontFamily: SERIF, fontSize: '1rem', color: NAVY, fontWeight: 700, marginBottom: '0.25rem' }}>
              Ready to collect rent through Axiom Rail?
            </p>
            <p style={{ fontSize: '0.82rem', color: '#555', margin: 0 }}>
              Setup takes under 2 minutes. Your payment link is ready immediately.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link href="/rent-collection/setup" style={primaryBtn}>
              SET UP COLLECTION
            </Link>
            <Link href="/rent-collection/dashboard" style={outlineBtn}>
              LANDLORD DASHBOARD
            </Link>
          </div>
        </div>
      </section>

      {/* ── Fee note ──────────────────────────────────────────────────────── */}
      <p style={{ fontFamily: MONO, fontSize: '0.7rem', color: '#888', lineHeight: 1.6 }}>
        Fee: $0.50 flat + 0.1% per transaction. Minimum payment $10, maximum $25,000.
        Wire transfer settlement incurs an additional $15 outgoing wire fee from Increase.
        Settlement is initiated by Axiom Rail operations; funds are not automatically swept.
      </p>
    </DesignLawLayout>
  );
}
