/**
 * /trust/loss-coverage-reserve/claim — Public claim submission form.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { DesignLawLayout, SectionHeading } from '../../../components/design-law';

const CATEGORIES = [
  { v: 'SMART_CONTRACT_CONTROL_FAILURE', l: 'Smart-contract control failure' },
  { v: 'ORACLE_FAILURE', l: 'Oracle failure' },
  { v: 'CUSTODY_PARTNER_FAILURE', l: 'Custody-partner failure' },
  { v: 'OTHER', l: 'Other (will be reviewed for eligibility)' },
];

export default function LossCoverageClaimPage() {
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; claimId?: string; error?: string } | null>(null);
  const [form, setForm] = useState({
    claimantWallet: '',
    contactEmail: '',
    positionRef: '',
    txHashes: '',
    description: '',
    amountRequestedDollars: '',
    eligibilityCategory: CATEGORIES[0].v,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const amountCents = Math.round(parseFloat(form.amountRequestedDollars || '0') * 100);
      const txHashes = form.txHashes
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const r = await fetch('/api/trust/loss-coverage-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimantWallet: form.claimantWallet,
          contactEmail: form.contactEmail || undefined,
          positionRef: form.positionRef || undefined,
          txHashes: txHashes.length > 0 ? txHashes : undefined,
          description: form.description,
          amountRequestedCents: amountCents,
          eligibilityCategory: form.eligibilityCategory,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setResult({ ok: true, claimId: j.claimId });
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'unknown error' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Submit a Loss Coverage Claim — Axiom Protocol</title>
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Trust / Loss Coverage Reserve / Claim
          </p>
          <SectionHeading>Submit a Claim</SectionHeading>
          <p className="text-sm text-dl-gray mt-1">
            <Link href="/trust/loss-coverage-reserve" className="underline">
              ← Back to claim register
            </Link>
          </p>
        </div>

        <div className="border border-dl-border p-6 mb-6">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">Before you submit</h2>
          <ul className="text-sm text-dl-ink space-y-2 list-disc pl-5 leading-relaxed">
            <li>
              The reserve covers smart-contract control failure, oracle
              failure, and custody-partner failure (to the extent not
              covered by the partner&apos;s own insurance). It does not
              cover market losses, user error, force majeure, or smart
              contracts on third-party protocols.
            </li>
            <li>
              All fields are reviewed manually in Phase 1. We typically
              respond within 5 business days. Status updates are visible
              on the public register at{' '}
              <Link href="/trust/loss-coverage-reserve" className="underline text-dl-navy">
                /trust/loss-coverage-reserve
              </Link>
              .
            </li>
            <li>
              Your wallet address is shown on the public register
              truncated (0xABCD…1234). Your contact email and full
              wallet are visible only to operators.
            </li>
          </ul>
        </div>

        {result?.ok ? (
          <div className="border border-dl-forest p-6 mb-8 bg-dl-bg-alt">
            <p className="font-dl-serif text-xl text-dl-navy mb-2">Claim received</p>
            <p className="text-base text-dl-ink mb-3">
              Your claim ID is{' '}
              <span className="font-dl-mono">{result.claimId}</span>. Save
              this — it is the only handle you need to reference your
              claim. Status will be visible on the public register.
            </p>
            <Link
              href="/trust/loss-coverage-reserve"
              className="inline-block border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
            >
              See public register →
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="border border-dl-border p-6 space-y-4">
            <div>
              <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                Claimant wallet (0x… 20-byte hex)
              </label>
              <input
                required
                value={form.claimantWallet}
                onChange={(e) => setForm({ ...form, claimantWallet: e.target.value })}
                className="w-full font-dl-mono text-sm border border-dl-border px-3 py-2"
                placeholder="0x…"
              />
            </div>
            <div>
              <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                Contact email (optional, not public)
              </label>
              <input
                type="email"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full text-sm border border-dl-border px-3 py-2"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                Position reference (loan id, mint id, market id, etc.)
              </label>
              <input
                value={form.positionRef}
                onChange={(e) => setForm({ ...form, positionRef: e.target.value })}
                className="w-full text-sm border border-dl-border px-3 py-2"
              />
            </div>
            <div>
              <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                Eligibility category
              </label>
              <select
                value={form.eligibilityCategory}
                onChange={(e) => setForm({ ...form, eligibilityCategory: e.target.value })}
                className="w-full text-sm border border-dl-border px-3 py-2 bg-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.v} value={c.v}>{c.l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                Transaction hashes (comma- or space-separated)
              </label>
              <textarea
                rows={2}
                value={form.txHashes}
                onChange={(e) => setForm({ ...form, txHashes: e.target.value })}
                className="w-full font-dl-mono text-xs border border-dl-border px-3 py-2"
                placeholder="0xabc…  0xdef…"
              />
            </div>
            <div>
              <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                Description of the event
              </label>
              <textarea
                required
                rows={6}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full text-sm border border-dl-border px-3 py-2"
                placeholder="Describe what happened, what you expected, what actually occurred."
              />
            </div>
            <div>
              <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                Amount requested (USD)
              </label>
              <input
                required
                type="number"
                step="0.01"
                min="1"
                value={form.amountRequestedDollars}
                onChange={(e) => setForm({ ...form, amountRequestedDollars: e.target.value })}
                className="w-full font-dl-mono text-sm border border-dl-border px-3 py-2"
                placeholder="100.00"
              />
            </div>
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="border border-dl-navy bg-dl-navy text-white px-6 py-2 font-dl-mono text-sm uppercase tracking-wide disabled:opacity-50"
              >
                {submitting ? 'Submitting…' : 'Submit claim'}
              </button>
              {result?.error && <span className="text-sm text-red-700">{result.error}</span>}
            </div>
          </form>
        )}
      </DesignLawLayout>
    </>
  );
}
