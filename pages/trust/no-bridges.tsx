/**
 * /trust/no-bridges — Default-deny on bridged, wrapped, and synthetic assets.
 *
 * Phase 1 ships with the explicit on-chain mechanism described and an empty
 * allow-list (no bridge or wrapper has been allow-listed yet). When the
 * allow-list governance UX ships, this page will read the on-chain
 * CollateralRiskConfig validity adapters live; until then, the empty state
 * is the truth and is presented as such.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface PageProps {
  loadedAtIso: string;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  return { props: { loadedAtIso: new Date().toISOString() } };
};

export default function TrustNoBridgesPage({ loadedAtIso }: PageProps) {
  return (
    <>
      <Head>
        <title>No-Bridges Allow-List — Axiom Protocol</title>
        <meta
          name="description"
          content="Bridged, wrapped, synthetic, and rehypothecated assets are default-denied as collateral inside Axiom Protocol. The on-chain allow-list is empty until governance approves an entry."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Trust / No Bridges
          </p>
          <SectionHeading>No-Bridges Allow-List</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Loaded {loadedAtIso}
          </p>
          <p className="text-sm text-dl-gray mt-1">
            <Link href="/trust" className="underline">
              ← Back to Trust Stack
            </Link>
          </p>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-2xl text-dl-navy mb-3">
            Why this page exists
          </h2>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            The largest single category of catastrophic loss in DeFi history
            is bridge failure. Ronin, Wormhole, Nomad, Multichain, Harmony —
            each of those incidents lost users hundreds of millions of dollars
            because a bridged or wrapped asset was treated as if it were the
            real underlying.
          </p>
          <p className="text-base text-dl-ink leading-relaxed">
            Axiom prevents this by making the bridge problem an{' '}
            <strong className="font-dl-serif text-dl-navy">
              on-chain admission problem
            </strong>
            . Bridged, wrapped, synthetic, and rehypothecated assets are
            default-denied by the CollateralGuard. Allowing one through
            requires an explicit governance vote, an on-chain validity
            adapter, and a per-asset cap.
          </p>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-2xl text-dl-navy mb-3">
            Current allow-list
          </h2>
          <div className="border border-dl-border bg-dl-bg-alt p-6 text-center">
            <p className="font-dl-mono text-sm text-dl-gray uppercase tracking-wider mb-2">
              Allow-list state
            </p>
            <p className="font-dl-serif text-3xl text-dl-navy mb-2">EMPTY</p>
            <p className="text-sm text-dl-ink max-w-xl mx-auto">
              No bridged, wrapped, synthetic, or rehypothecated asset has been
              admitted as collateral inside Axiom. None.
            </p>
          </div>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-2xl text-dl-navy mb-3">
            How an asset would get added
          </h2>
          <ol className="text-base text-dl-ink space-y-3 list-decimal pl-5 leading-relaxed">
            <li>
              A community governance proposal is published with a 14-day
              public comment window, identifying the specific asset, the
              bridge or wrapper provenance, the per-asset cap, the validity
              adapter design, and the reason the protection it provides
              outweighs the additional bridge-risk surface.
            </li>
            <li>
              Governance votes. If approved, an on-chain validity adapter is
              deployed and a per-asset risk configuration is set in
              CollateralRiskConfig.
            </li>
            <li>
              The new entry appears on this page. The previous empty-state
              snapshot is preserved in the capital infrastructure events
              table so the change is auditable.
            </li>
          </ol>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-2xl text-dl-navy mb-3">
            Canonical policy
          </h2>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            The full classification matrix, the validity adapter design, the
            emergency triggers, and the guardian disable path are documented
            in the canonical Collateral Risk Policy.
          </p>
          <Link
            href="/disclosure/collateral-risk-policy"
            className="inline-block border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Read the Collateral Risk Policy →
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/trust/security"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Security page →
          </Link>
          <Link
            href="/trust/audits"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Audits →
          </Link>
        </div>
      </DesignLawLayout>
    </>
  );
}
