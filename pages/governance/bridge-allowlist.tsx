/**
 * /governance/bridge-allowlist — Public bridge allow-list governance UX.
 *
 * Lists every proposal (DRAFT through EXECUTED). Public visitors can
 * read the full thread and post comments during the comment window.
 * Operators (with x-admin-key cookie) can create proposals and advance
 * status — those affordances are not rendered for public visitors.
 *
 * Renders no hardcoded data — all rows are pulled from the DB at
 * request time.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { useState } from 'react';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import {
  listProposals,
  listExecutedAllowlistEntries,
  type ProposalStatus,
} from '../../lib/capinfra/bridgeAllowlist/service';
import {
  isValidOperatorKey,
  readOperatorCookie,
} from '../../lib/capinfra/operatorAuth';

interface ProposalRow {
  id: string;
  assetSymbol: string;
  bridgeProvenance: string;
  status: ProposalStatus;
  validityAdapterAddress: string | null;
  perAssetCap: string | null;
  commentWindowEndsAt: string;
  yesVotes: number;
  noVotes: number;
  createdAt: string;
  executedAt: string | null;
  executedTxHash: string | null;
}

interface PageProps {
  loadedAtIso: string;
  proposals: ProposalRow[];
  executedCount: number;
  isOperator: boolean;
}

function toRow(r: Awaited<ReturnType<typeof listProposals>>[number]): ProposalRow {
  return {
    id: r.id,
    assetSymbol: r.assetSymbol,
    bridgeProvenance: r.bridgeProvenance,
    status: r.status as ProposalStatus,
    validityAdapterAddress: r.validityAdapterAddress ?? null,
    perAssetCap: r.perAssetCap ?? null,
    commentWindowEndsAt: (r.commentWindowEndsAt as Date).toISOString(),
    yesVotes: r.yesVotes ?? 0,
    noVotes: r.noVotes ?? 0,
    createdAt: (r.createdAt as Date).toISOString(),
    executedAt: r.executedAt ? (r.executedAt as Date).toISOString() : null,
    executedTxHash: r.executedTxHash ?? null,
  };
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  const cookie = readOperatorCookie(ctx.req);
  const isOperator = isValidOperatorKey(cookie);
  const [proposals, executed] = await Promise.all([
    listProposals({}),
    listExecutedAllowlistEntries(),
  ]);
  return {
    props: {
      loadedAtIso: new Date().toISOString(),
      proposals: proposals.map(toRow),
      executedCount: executed.length,
      isOperator,
    },
  };
};

function StatusBadge({ status }: { status: ProposalStatus }) {
  const map: Record<ProposalStatus, string> = {
    DRAFT: 'text-dl-gray border-dl-gray',
    COMMENT: 'text-dl-navy border-dl-navy',
    VOTE: 'text-dl-gold border-dl-gold',
    APPROVED: 'text-dl-forest border-dl-forest',
    REJECTED: 'text-dl-gray border-dl-gray',
    EXECUTED: 'text-dl-forest border-dl-forest',
    WITHDRAWN: 'text-dl-gray border-dl-gray',
  };
  return (
    <span className={`font-dl-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${map[status]}`}>
      {status}
    </span>
  );
}

export default function BridgeAllowlistPage(props: PageProps) {
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    assetSymbol: '',
    bridgeProvenance: '',
    validityAdapterAddress: '',
    perAssetCap: '',
  });

  async function submitProposal(e: React.FormEvent) {
    e.preventDefault();
    if (!props.isOperator) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const r = await fetch('/api/governance/bridge-allowlist/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assetSymbol: form.assetSymbol,
          bridgeProvenance: form.bridgeProvenance,
          validityAdapterAddress: form.validityAdapterAddress || null,
          perAssetCap: form.perAssetCap || null,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setSubmitMsg(`Proposal ${j.proposal.id} created — refreshing.`);
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      setSubmitMsg(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Head>
        <title>Bridge Allow-List Governance — Axiom Protocol</title>
        <meta
          name="description"
          content="Public proposal flow for adding bridged, wrapped, or synthetic assets to the Axiom collateral allow-list. 14-day comment window, governance vote, on-chain execution."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Governance / Bridge Allow-List
          </p>
          <SectionHeading>Bridge Allow-List Governance</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Loaded {props.loadedAtIso} · {props.proposals.length} proposal
            {props.proposals.length === 1 ? '' : 's'} · {props.executedCount} executed (currently allow-listed)
          </p>
          <p className="text-sm text-dl-gray mt-1">
            <Link href="/trust/no-bridges" className="underline">
              ← Back to No-Bridges page
            </Link>
          </p>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">How this works</h2>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            Bridged, wrapped, synthetic, and rehypothecated assets are
            default-denied as collateral inside Axiom. Adding one requires:
            an explicit proposal, a 14-day public comment window, a
            governance vote, and on-chain execution that sets a validity
            adapter and a per-asset cap in CollateralRiskConfig.
          </p>
          <p className="text-base text-dl-ink leading-relaxed">
            The on-chain CollateralRiskConfig is the canonical state.
            Anything not in EXECUTED status here is not admitted as
            collateral, regardless of what is written below.
          </p>
        </div>

        {props.proposals.length === 0 ? (
          <div className="border border-dl-border bg-dl-bg-alt p-8 text-center mb-8">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">
              Proposals
            </p>
            <p className="font-dl-serif text-2xl text-dl-navy mb-2">No proposals yet</p>
            <p className="text-sm text-dl-ink max-w-xl mx-auto">
              No bridge or wrapper has been proposed for allow-listing. The
              on-chain allow-list is empty. The default-deny posture is
              fully in effect.
            </p>
          </div>
        ) : (
          <div className="border border-dl-border overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead className="bg-dl-bg-alt border-b border-dl-border">
                <tr>
                  <th className="text-left font-dl-serif text-dl-navy p-3 w-[14%]">Asset</th>
                  <th className="text-left font-dl-serif text-dl-navy p-3">Bridge / Wrapper provenance</th>
                  <th className="text-left font-dl-serif text-dl-navy p-3 w-[12%]">Status</th>
                  <th className="text-left font-dl-serif text-dl-navy p-3 w-[18%]">Comment window ends</th>
                  <th className="text-left font-dl-serif text-dl-navy p-3 w-[10%]">Yes / No</th>
                </tr>
              </thead>
              <tbody>
                {props.proposals.map((r) => (
                  <tr key={r.id} className="border-b border-dl-border last:border-b-0 align-top">
                    <td className="p-3 font-dl-serif text-dl-navy">{r.assetSymbol}</td>
                    <td className="p-3 text-dl-ink leading-relaxed">
                      {r.bridgeProvenance}
                      <div className="mt-2 font-dl-mono text-xs text-dl-gray break-all">id: {r.id}</div>
                      {r.validityAdapterAddress && (
                        <div className="font-dl-mono text-xs text-dl-gray break-all">
                          adapter: {r.validityAdapterAddress}
                        </div>
                      )}
                      {r.executedTxHash && (
                        <div className="font-dl-mono text-xs text-dl-gray break-all">
                          executed tx: {r.executedTxHash}
                        </div>
                      )}
                    </td>
                    <td className="p-3"><StatusBadge status={r.status} /></td>
                    <td className="p-3 font-dl-mono text-xs text-dl-gray">
                      {r.commentWindowEndsAt.replace('T', ' ').slice(0, 16)}
                    </td>
                    <td className="p-3 font-dl-mono text-xs text-dl-ink">
                      {r.yesVotes} / {r.noVotes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {props.isOperator && (
          <div className="border border-dl-navy p-6 mb-8 bg-dl-bg-alt">
            <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
              New proposal (operator)
            </h2>
            <form onSubmit={submitProposal} className="space-y-3">
              <div>
                <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                  Asset symbol
                </label>
                <input
                  required
                  value={form.assetSymbol}
                  onChange={(e) => setForm({ ...form, assetSymbol: e.target.value })}
                  className="w-full font-dl-mono text-sm border border-dl-border px-3 py-2"
                  placeholder="WBTC"
                />
              </div>
              <div>
                <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                  Bridge / wrapper provenance
                </label>
                <textarea
                  required
                  rows={3}
                  value={form.bridgeProvenance}
                  onChange={(e) => setForm({ ...form, bridgeProvenance: e.target.value })}
                  className="w-full text-sm border border-dl-border px-3 py-2"
                  placeholder="WBTC issued by BitGo via the WBTC DAO mint/burn process; 1:1 backed by BTC held in BitGo cold custody."
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                    Validity adapter address (optional, set before EXECUTED)
                  </label>
                  <input
                    value={form.validityAdapterAddress}
                    onChange={(e) => setForm({ ...form, validityAdapterAddress: e.target.value })}
                    className="w-full font-dl-mono text-xs border border-dl-border px-3 py-2"
                    placeholder="0x…"
                  />
                </div>
                <div>
                  <label className="font-dl-mono text-xs text-dl-gray uppercase block mb-1">
                    Per-asset cap (optional, base units)
                  </label>
                  <input
                    value={form.perAssetCap}
                    onChange={(e) => setForm({ ...form, perAssetCap: e.target.value })}
                    className="w-full font-dl-mono text-xs border border-dl-border px-3 py-2"
                    placeholder="100000000"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="border border-dl-navy bg-dl-navy text-white px-4 py-2 font-dl-mono text-sm uppercase tracking-wide disabled:opacity-50"
                >
                  {submitting ? 'Submitting…' : 'Submit proposal (opens 14d comment)'}
                </button>
                {submitMsg && <span className="text-sm text-dl-ink">{submitMsg}</span>}
              </div>
            </form>
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/trust/no-bridges"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Back to No-Bridges page →
          </Link>
          <Link
            href="/disclosure/collateral-risk-policy"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Read the Collateral Risk Policy →
          </Link>
        </div>
      </DesignLawLayout>
    </>
  );
}
