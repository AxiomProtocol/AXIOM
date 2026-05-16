/**
 * /dao-payroll
 *
 * DAO Contributor Payroll — public landing page.
 * Describes the product and links to the run and history pages.
 */

import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law';

const FEATURES = [
  {
    label: 'BATCH DISBURSEMENT',
    title: 'One submission, many recipients',
    desc: 'Upload a contributor list with names, amounts, and bank account details. Axiom Rail fans out a separate ACH or domestic wire per recipient — all tied to a single payroll run ID.',
  },
  {
    label: 'STELLAR SETTLEMENT',
    title: 'USDC in, USD out',
    desc: 'Funds move over the Stellar network as USDC. Axiom Rail converts and settles to each contributor\'s US bank account via FDIC-insured ACH or domestic wire settlement rails.',
  },
  {
    label: 'BSA COMPLIANCE',
    title: 'Operator identity captured at every run',
    desc: 'Each payroll run records the authorizing operator\'s legal identity under BSA guidelines. Data is retained in an encrypted audit log, never passed to external parties.',
  },
  {
    label: 'IDEMPOTENT EXECUTION',
    title: 'Safe to retry',
    desc: 'Every run is keyed by a SHA-256 hash of org name, label, date, and Stellar account. Re-submitting an identical request returns the original run rather than double-paying.',
  },
  {
    label: 'PER-RECIPIENT MEMO',
    title: '28-character Stellar memo per contributor',
    desc: 'Each recipient receives a unique memo derived from their transfer UUID. The memo ties the on-chain Stellar payment to the off-chain banking settlement record.',
  },
  {
    label: 'COMPLETE AUDIT TRAIL',
    title: 'Run history with per-recipient status',
    desc: 'Every payroll run and recipient is persisted in the Axiom database. The history view lets you inspect status, memos, and settlement amounts across all past runs.',
  },
];

const FEE_STRUCTURE = [
  { label: 'Flat fee per recipient', value: '$0.50' },
  { label: 'Variable fee per recipient', value: '0.1% of amount' },
  { label: 'Minimum per recipient', value: '$10.00' },
  { label: 'Maximum per recipient', value: '$25,000.00' },
  { label: 'Maximum recipients per run', value: '200' },
  { label: 'Settlement rail', value: 'ACH / Wire' },
];

export default function DaoPayrollLandingPage() {
  return (
    <DesignLawLayout>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: '2rem', marginBottom: '2.5rem' }}>
        <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#666', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
          AXIOM RAIL / LAYER 00 / PAYROLL MODULE
        </p>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '2.2rem', fontWeight: 700, color: '#1e3a5f', marginBottom: '1rem', lineHeight: 1.2 }}>
          DAO Contributor Payroll
        </h1>
        <p style={{ color: '#444', maxWidth: 640, lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Batch USDC disbursements to DAO contributors, protocol teams, and service providers —
          settled in USD to US bank accounts via FDIC-insured ACH and domestic wire,
          powered by Axiom Rail.
        </p>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/dao-payroll/run" style={{
            display: 'inline-block',
            background: '#1e3a5f',
            color: '#fff',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            fontWeight: 700,
            padding: '0.7rem 1.75rem',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}>
            RUN PAYROLL
          </Link>
          <Link href="/dao-payroll/history" style={{
            display: 'inline-block',
            background: 'transparent',
            color: '#1e3a5f',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            fontWeight: 700,
            padding: '0.7rem 1.75rem',
            textDecoration: 'none',
            letterSpacing: '0.04em',
            border: '1px solid #1e3a5f',
          }}>
            VIEW HISTORY
          </Link>
        </div>
      </div>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: '#ddd' }}>
          {[
            {
              step: '01',
              title: 'Authenticate',
              desc: 'Complete SEP-10 Stellar Web Authentication to obtain a session token. Your Stellar public key is the identifier for your payroll runs.',
            },
            {
              step: '02',
              title: 'Submit Run',
              desc: 'Provide your organization name, a run label, the pay date, your BSA identity, and the recipient list with bank account details and amounts.',
            },
            {
              step: '03',
              title: 'Send USDC',
              desc: 'Send USDC to the Axiom Rail deposit account on Stellar Mainnet using the unique 28-character memo for each recipient returned in the response.',
            },
            {
              step: '04',
              title: 'USD Settles',
              desc: 'Axiom Rail processes each transfer and dispatches ACH or domestic wire to each contributor\'s US bank account within the stated settlement window.',
            },
          ].map(s => (
            <div key={s.step} style={{ background: '#fff', padding: '1.5rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '1.75rem', fontWeight: 700, color: '#b8860b', marginBottom: '0.5rem' }}>
                {s.step}
              </div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', color: '#1e3a5f', fontWeight: 700, marginBottom: '0.4rem' }}>
                {s.title}
              </p>
              <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Capabilities
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1px', background: '#ddd' }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{ background: '#fff', padding: '1.25rem' }}>
              <p style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#888', letterSpacing: '0.12em', marginBottom: '0.4rem' }}>
                {f.label}
              </p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '0.95rem', color: '#1e3a5f', fontWeight: 700, marginBottom: '0.4rem' }}>
                {f.title}
              </p>
              <p style={{ fontSize: '0.78rem', color: '#555', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Fee Structure ────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Fee Structure
        </h2>
        <div style={{ border: '1px solid #dde3ed', background: '#f8f9fb' }}>
          {FEE_STRUCTURE.map((row, i) => (
            <div key={row.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1.25rem',
              borderBottom: i < FEE_STRUCTURE.length - 1 ? '1px solid #e8edf5' : 'none',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#555' }}>{row.label}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700, color: '#1e3a5f' }}>{row.value}</span>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#888', marginTop: '0.75rem', lineHeight: 1.5 }}>
          Fees are deducted from each recipient amount. Net amount delivered to recipient bank account equals gross minus ($0.50 + 0.1% of gross).
          Variable rate on USDC payments may change subject to banking network conditions.
        </p>
      </section>

      {/* ── Compliance Notice ────────────────────────────────────────────── */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', color: '#1e3a5f', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem' }}>
          Compliance
        </h2>
        <div style={{ background: '#f8f9fb', border: '1px solid #dde3ed', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.7, marginBottom: '0.75rem' }}>
            Each payroll run captures the authorizing operator's legal name, date of birth, country of
            residence, and government-issued identity number under Bank Secrecy Act (BSA) recordkeeping
            requirements. This information is retained securely and is never transmitted to external
            parties except as required by applicable law.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.7 }}>
            Payroll settlement is processed via FDIC-insured ACH and wire rails. Axiom Rail acts as the
            settlement intermediary. All transfers are subject to Axiom Rail's standard terms and applicable
            federal AML obligations.
          </p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '0.5rem' }}>
        <Link href="/dao-payroll/run" style={{
          display: 'inline-block',
          background: '#1e3a5f',
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          fontWeight: 700,
          padding: '0.7rem 1.75rem',
          textDecoration: 'none',
          letterSpacing: '0.04em',
        }}>
          RUN PAYROLL
        </Link>
        <Link href="/axiom-payment-rails" style={{
          display: 'inline-block',
          color: '#1e3a5f',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          fontWeight: 700,
          padding: '0.7rem 0',
          textDecoration: 'none',
          letterSpacing: '0.04em',
        }}>
          VIEW AXIOM RAIL STATUS
        </Link>
      </div>
    </DesignLawLayout>
  );
}
