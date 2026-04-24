/**
 * /operator/trust/loss-coverage-claims — Operator review queue.
 *
 * Lists all claims (including PII), exposes status transitions and a
 * payment record action. Operator-cookie gated.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useEffect, useState } from 'react';
import { DesignLawLayout, SectionHeading } from '../../../components/design-law';
import { requireOperatorCookie, getOperatorAdminKey } from '../../../lib/capinfra/operatorAuth';
import {
  listClaims,
  type ClaimStatus,
} from '../../../lib/capinfra/lossCoverage/service';

interface ClaimRow {
  id: string;
  claimantWallet: string;
  contactEmail: string | null;
  positionRef: string | null;
  description: string;
  amountRequestedCents: number;
  eligibilityCategory: string;
  status: ClaimStatus;
  reviewerNotes: string | null;
  paidAmountCents: number | null;
  paidTxHash: string | null;
  paidAt: string | null;
  createdAt: string;
}

interface PageProps {
  loadedAtIso: string;
  rows: ClaimRow[];
  adminKeyForClient: string;
  loadError: string | null;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;
  // The operator already authenticated via cookie; we hand the cookie
  // value back to the client so XHR can send x-admin-key.
  const adminKey = getOperatorAdminKey();
  try {
    const claims = await listClaims({});
    return {
      props: {
        loadedAtIso: new Date().toISOString(),
        adminKeyForClient: adminKey,
        loadError: null,
        rows: claims.map((c) => ({
          id: c.id,
          claimantWallet: c.claimantWallet,
          contactEmail: c.contactEmail ?? null,
          positionRef: c.positionRef ?? null,
          description: c.description,
          amountRequestedCents: c.amountRequestedCents,
          eligibilityCategory: c.eligibilityCategory,
          status: c.status as ClaimStatus,
          reviewerNotes: c.reviewerNotes ?? null,
          paidAmountCents: c.paidAmountCents ?? null,
          paidTxHash: c.paidTxHash ?? null,
          paidAt: c.paidAt ? (c.paidAt as Date).toISOString() : null,
          createdAt: (c.createdAt as Date).toISOString(),
        })),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[operator/trust/loss-coverage-claims] failed to list claims:', msg, err);
    return {
      props: {
        loadedAtIso: new Date().toISOString(),
        adminKeyForClient: adminKey,
        rows: [],
        loadError: msg,
      },
    };
  }
};

function fmtUsd(cents: number) {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

const NEXT_STATUSES: ClaimStatus[] = ['UNDER_REVIEW', 'APPROVED', 'DENIED', 'PAID', 'WITHDRAWN'];

export default function OperatorLossCoverageClaimsPage(props: PageProps) {
  const [rows, setRows] = useState<ClaimRow[]>(props.rows);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function refresh() {
    const r = await fetch('/api/trust/loss-coverage-claims/admin', {
      headers: { 'x-admin-key': props.adminKeyForClient },
    });
    const j = await r.json();
    if (j.ok) {
      setRows(j.items.map((c: ClaimRow) => ({ ...c })));
    }
  }

  async function transition(claim: ClaimRow, toStatus: ClaimStatus) {
    setBusyId(claim.id);
    setMsg(null);
    let extra: Record<string, unknown> = {};
    if (toStatus === 'PAID') {
      const paidStr = window.prompt(`Paid amount (USD) for ${claim.id}:`, (claim.amountRequestedCents / 100).toFixed(2));
      if (!paidStr) { setBusyId(null); return; }
      const paidTxHash = window.prompt('Payment tx hash:', '');
      if (!paidTxHash) { setBusyId(null); return; }
      extra = { paidAmountCents: Math.round(parseFloat(paidStr) * 100), paidTxHash };
    }
    const reviewerNotes = window.prompt('Reviewer note (optional):', '') ?? '';
    try {
      const r = await fetch('/api/trust/loss-coverage-claims/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': props.adminKeyForClient },
        body: JSON.stringify({ claimId: claim.id, toStatus, reviewerNotes: reviewerNotes || undefined, ...extra }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setMsg(`Claim ${claim.id} → ${toStatus}`);
      await refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    setRows(props.rows);
  }, [props.rows]);

  return (
    <>
      <Head>
        <title>Operator — Loss Coverage Claims</title>
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Operator / Trust / Loss Coverage Claims
          </p>
          <SectionHeading>Loss Coverage Claim Review Queue</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Loaded {props.loadedAtIso} · {rows.length} claim{rows.length === 1 ? '' : 's'}
          </p>
          {msg && <p className="font-dl-mono text-xs text-dl-forest mt-1">{msg}</p>}
        </div>

        {props.loadError && (
          <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-6 font-dl-mono text-xs">
            <div className="font-dl-serif text-sm text-dl-navy mb-1">Operational notice</div>
            <div className="text-dl-ink">
              Live claim data could not be loaded. Showing empty result. Operations has been notified.
              <div className="text-dl-gray mt-1 break-all">ref: {props.loadError}</div>
            </div>
          </div>
        )}

        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dl-bg-alt border-b border-dl-border">
              <tr>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[14%]">Claim ID</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[14%]">Wallet / Email</th>
                <th className="text-left font-dl-serif text-dl-navy p-3">Description / Category</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[10%]">Requested</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[10%]">Status</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[28%]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-dl-gray italic">
                    No claims submitted yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-dl-border last:border-b-0 align-top">
                    <td className="p-3 font-dl-mono text-xs text-dl-ink break-all">{r.id}</td>
                    <td className="p-3 text-xs">
                      <div className="font-dl-mono text-dl-ink break-all">{r.claimantWallet}</div>
                      {r.contactEmail && <div className="text-dl-gray mt-1">{r.contactEmail}</div>}
                    </td>
                    <td className="p-3 text-dl-ink leading-relaxed">
                      <div className="font-dl-mono text-xs text-dl-gray uppercase mb-1">
                        {r.eligibilityCategory.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm">{r.description}</div>
                      {r.positionRef && (
                        <div className="font-dl-mono text-xs text-dl-gray mt-1">ref: {r.positionRef}</div>
                      )}
                      {r.paidTxHash && (
                        <div className="font-dl-mono text-xs text-dl-forest mt-1 break-all">
                          paid tx: {r.paidTxHash}
                        </div>
                      )}
                      {r.reviewerNotes && (
                        <div className="text-xs text-dl-gray mt-1 italic">notes: {r.reviewerNotes}</div>
                      )}
                    </td>
                    <td className="p-3 font-dl-mono text-xs text-dl-ink">
                      {fmtUsd(r.amountRequestedCents)}
                      {r.paidAmountCents !== null && (
                        <div className="text-dl-forest">paid {fmtUsd(r.paidAmountCents)}</div>
                      )}
                    </td>
                    <td className="p-3 font-dl-mono text-xs">{r.status}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {NEXT_STATUSES.filter((s) => s !== r.status).map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => transition(r, s)}
                            className="border border-dl-navy text-dl-navy px-2 py-1 font-dl-mono text-[10px] uppercase tracking-wide hover:bg-dl-navy hover:text-white disabled:opacity-50"
                          >
                            → {s}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <Link href="/trust/loss-coverage-reserve" className="font-dl-mono text-sm text-dl-navy underline">
            Public claim register →
          </Link>
        </div>
      </DesignLawLayout>
    </>
  );
}
