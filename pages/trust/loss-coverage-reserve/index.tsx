/**
 * /trust/loss-coverage-reserve — Public claim adjudication transparency.
 *
 * Lists every claim (PII stripped) so allocators can see the actual
 * volume and outcome distribution. Provides a link to submit a new
 * claim.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DesignLawLayout, SectionHeading } from '../../../components/design-law';
import {
  listClaims,
  toPublicRow,
  type PublicClaimRow,
} from '../../../lib/capinfra/lossCoverage/service';

interface PageProps {
  loadedAtIso: string;
  policyMtimeIso: string;
  policyVersion: string;
  rows: PublicClaimRow[];
  totals: {
    submitted: number;
    underReview: number;
    approved: number;
    denied: number;
    paid: number;
    paidCents: number;
  };
  loadError: string | null;
}

const POLICY_PATH = path.join(
  process.cwd(),
  'documents',
  'trust',
  'loss-coverage-reserve-policy.md',
);

const EMPTY_TOTALS = {
  submitted: 0,
  underReview: 0,
  approved: 0,
  denied: 0,
  paid: 0,
  paidCents: 0,
};

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const [stat, policyText, claims] = await Promise.all([
      fs.stat(POLICY_PATH),
      fs.readFile(POLICY_PATH, 'utf8'),
      listClaims({}),
    ]);
    const versionMatch = policyText.match(/\*\*Version:\*\*\s+`([^`]+)`/);
    const policyVersion = versionMatch ? versionMatch[1] : 'unknown';
    const rows = claims.map(toPublicRow);
    const totals = {
      submitted: rows.filter((r) => r.status === 'SUBMITTED').length,
      underReview: rows.filter((r) => r.status === 'UNDER_REVIEW').length,
      approved: rows.filter((r) => r.status === 'APPROVED').length,
      denied: rows.filter((r) => r.status === 'DENIED').length,
      paid: rows.filter((r) => r.status === 'PAID').length,
      paidCents: rows
        .filter((r) => r.status === 'PAID')
        .reduce((acc, r) => acc + (r.paidAmountCents ?? 0), 0),
    };
    return {
      props: {
        loadedAtIso: new Date().toISOString(),
        policyMtimeIso: stat.mtime.toISOString(),
        policyVersion,
        rows,
        totals,
        loadError: null,
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[trust/loss-coverage-reserve] failed to load page data:', msg, err);
    return {
      props: {
        loadedAtIso: new Date().toISOString(),
        policyMtimeIso: 'unavailable',
        policyVersion: 'unavailable',
        rows: [],
        totals: EMPTY_TOTALS,
        loadError: msg,
      },
    };
  }
};

function fmtUsd(cents: number) {
  return (cents / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function StatusBadge({ status }: { status: PublicClaimRow['status'] }) {
  const map: Record<PublicClaimRow['status'], string> = {
    SUBMITTED: 'text-dl-navy border-dl-navy',
    UNDER_REVIEW: 'text-dl-gold border-dl-gold',
    APPROVED: 'text-dl-forest border-dl-forest',
    DENIED: 'text-dl-gray border-dl-gray',
    PAID: 'text-dl-forest border-dl-forest',
    WITHDRAWN: 'text-dl-gray border-dl-gray',
  };
  return (
    <span className={`font-dl-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${map[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export default function LossCoverageReservePage(props: PageProps) {
  return (
    <>
      <Head>
        <title>Loss Coverage Reserve — Axiom Protocol</title>
        <meta
          name="description"
          content="Public claim register for the Axiom Loss Coverage Reserve. Every claim, every status, every paid amount — PII stripped."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Trust / Loss Coverage Reserve
          </p>
          <SectionHeading>Loss Coverage Reserve</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Policy version {props.policyVersion} · Policy mtime {props.policyMtimeIso} · Loaded{' '}
            {props.loadedAtIso}
          </p>
          <p className="text-sm text-dl-gray mt-1">
            <Link href="/trust" className="underline">
              ← Back to Trust Stack
            </Link>
          </p>
        </div>

        {props.loadError && (
          <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-6 font-dl-mono text-xs">
            <div className="font-dl-serif text-sm text-dl-navy mb-1">Operational notice</div>
            <div className="text-dl-ink">
              Live claim data could not be loaded. Showing safe defaults. Operations has been notified.
              <div className="text-dl-gray mt-1 break-all">ref: {props.loadError}</div>
            </div>
          </div>
        )}

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">What this is</h2>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            A dedicated pool of capital, segregated from operating reserves
            and product-specific reserves, drawn against under three
            qualifying conditions: smart-contract control failure, oracle
            failure, custody-partner failure (to the extent not covered by
            the partner&apos;s own insurance). The full policy is published.
          </p>
          <p className="text-base text-dl-ink leading-relaxed">
            <strong className="font-dl-serif text-dl-navy">It is not</strong>{' '}
            insurance, a guarantee, or a substitute for the per-product
            reserve ratios on the solvency snapshot. Phase 1 adjudicates
            claims manually; Phase 2 will contractualise verifiers and a
            governance-controlled claims committee.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
          <div className="border border-dl-border p-4 text-center">
            <p className="font-dl-mono text-[10px] text-dl-gray uppercase">Submitted</p>
            <p className="font-dl-serif text-2xl text-dl-navy">{props.totals.submitted}</p>
          </div>
          <div className="border border-dl-border p-4 text-center">
            <p className="font-dl-mono text-[10px] text-dl-gray uppercase">Under review</p>
            <p className="font-dl-serif text-2xl text-dl-navy">{props.totals.underReview}</p>
          </div>
          <div className="border border-dl-border p-4 text-center">
            <p className="font-dl-mono text-[10px] text-dl-gray uppercase">Approved</p>
            <p className="font-dl-serif text-2xl text-dl-navy">{props.totals.approved}</p>
          </div>
          <div className="border border-dl-border p-4 text-center">
            <p className="font-dl-mono text-[10px] text-dl-gray uppercase">Denied</p>
            <p className="font-dl-serif text-2xl text-dl-navy">{props.totals.denied}</p>
          </div>
          <div className="border border-dl-border p-4 text-center">
            <p className="font-dl-mono text-[10px] text-dl-gray uppercase">Paid</p>
            <p className="font-dl-serif text-2xl text-dl-navy">{props.totals.paid}</p>
          </div>
          <div className="border border-dl-border p-4 text-center">
            <p className="font-dl-mono text-[10px] text-dl-gray uppercase">Paid total</p>
            <p className="font-dl-serif text-xl text-dl-navy">{fmtUsd(props.totals.paidCents)}</p>
          </div>
        </div>

        <div className="border border-dl-border overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-dl-bg-alt border-b border-dl-border">
              <tr>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[18%]">Claim ID</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[14%]">Wallet</th>
                <th className="text-left font-dl-serif text-dl-navy p-3">Category</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[12%]">Requested</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[12%]">Paid</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[12%]">Status</th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[14%]">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-dl-gray italic">
                    No claims have been submitted yet.
                  </td>
                </tr>
              ) : (
                props.rows.map((r) => (
                  <tr key={r.id} className="border-b border-dl-border last:border-b-0 align-top">
                    <td className="p-3 font-dl-mono text-xs text-dl-ink break-all">{r.id}</td>
                    <td className="p-3 font-dl-mono text-xs text-dl-ink">{r.claimantWalletShort}</td>
                    <td className="p-3 text-dl-ink">{r.eligibilityCategory.replace(/_/g, ' ')}</td>
                    <td className="p-3 font-dl-mono text-xs text-dl-ink">
                      {fmtUsd(r.amountRequestedCents)}
                    </td>
                    <td className="p-3 font-dl-mono text-xs text-dl-ink">
                      {r.paidAmountCents !== null ? fmtUsd(r.paidAmountCents) : '—'}
                    </td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 font-dl-mono text-xs text-dl-gray">
                      {r.createdAt.replace('T', ' ').slice(0, 16)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/trust/loss-coverage-reserve/claim"
            className="border border-dl-navy bg-dl-navy text-white px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-white hover:text-dl-navy"
          >
            Submit a claim →
          </Link>
          <Link
            href="/trust/security"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Security page →
          </Link>
          <a
            href="/api/trust/loss-coverage-claims"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Public JSON →
          </a>
        </div>
      </DesignLawLayout>
    </>
  );
}
