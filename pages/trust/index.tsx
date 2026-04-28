/**
 * /trust — Public Trust Stack landing.
 *
 * Renders the failure-mode → protection mapping table sourced from
 * documents/trust/failure-mode-mapping.md. Visitors see, in plain
 * English, every common DeFi failure mode and the specific Axiom
 * protection that prevents it, with a deep link to verify each claim
 * independently.
 *
 * Page also reads the live solvency snapshot timestamp so the visitor
 * can see when the protections were last verified.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface PageProps {
  loadedAtIso: string;
  mappingDocLastModifiedIso: string;
}

const MAPPING_PATH = path.join(
  process.cwd(),
  'documents',
  'trust',
  'failure-mode-mapping.md',
);

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  let mappingDocLastModifiedIso: string;
  try {
    const stat = await fs.stat(MAPPING_PATH);
    mappingDocLastModifiedIso = stat.mtime.toISOString();
  } catch (err) {
    console.error('[trust] failed to stat mapping file:', err);
    mappingDocLastModifiedIso = 'unavailable';
  }
  return {
    props: {
      loadedAtIso: new Date().toISOString(),
      mappingDocLastModifiedIso,
    },
  };
};

interface Row {
  failure: string;
  protection: string;
  maturity: 'LIVE' | 'STAGED' | 'PLANNED';
  verifyLabel: string;
  verifyHref: string;
}

const ROWS: Row[] = [
  {
    failure: 'Audited contract drained',
    protection:
      'Fail-closed CollateralGuard on every borrow and AXAU mint. Per-asset enable, validity adapter, cap, and per-market halt — all on chain.',
    maturity: 'LIVE',
    verifyLabel: 'Audits page',
    verifyHref: '/trust/audits',
  },
  {
    failure: 'Bridge hack',
    protection:
      'Default-deny on every bridged, wrapped, synthetic, and rehypothecated asset. Explicit allow-list only, governed by community vote.',
    maturity: 'LIVE',
    verifyLabel: 'No-bridges allow-list',
    verifyHref: '/trust/no-bridges',
  },
  {
    failure: 'Anonymous founder rug',
    protection:
      'Real legal name, real LinkedIn, real US-incorporated operating entity. BitGo multi-party authorization on Arbitrum One for institutional crypto custody.',
    maturity: 'LIVE',
    verifyLabel: 'Team page',
    verifyHref: '/trust/team',
  },
  {
    failure: 'Opaque tokenomics',
    protection:
      'AXM is governance and fee-routing only. No yield claim, no APY claim, no presale-pump structure. Supply and emissions are public on Arbitrum One.',
    maturity: 'LIVE',
    verifyLabel: 'Disclosure',
    verifyHref: '/disclosure',
  },
  {
    failure: 'Liquidity vanishes when you redeem',
    protection:
      'Public dated solvency snapshot showing Coverage Ratio, Reserve Ratio, Liquidity Buffer Ratio, and Liquidation Distance per asset. Dedicated Loss Coverage Reserve, separate from operating reserves.',
    maturity: 'LIVE',
    verifyLabel: 'Solvency snapshot',
    verifyHref: '/disclosure',
  },
  {
    failure: 'Whale governance capture',
    protection:
      'Every privileged role and current holder is published, including roles that are still EOA-controlled with no timelock — disclosed honestly. Timelock migration is a published roadmap item, not a marketing claim.',
    maturity: 'STAGED',
    verifyLabel: 'Governance page',
    verifyHref: '/trust/governance',
  },
  {
    failure: 'Insider manipulation',
    protection:
      'No presale-pump structure on AXM. Append-only audit events on every privileged action. Glossary-enforced language rules forbid hype, absolutist claims, and unqualified outcome promises across the entire site.',
    maturity: 'LIVE',
    verifyLabel: 'Disclosure',
    verifyHref: '/disclosure',
  },
  {
    failure: 'Oracle manipulation',
    protection:
      'Oracle adapter fail-closes on read failure when configured. Per-asset staleness windows enforced at admission. Multi-source pricing on AXAU via ERC-7726 adapters.',
    maturity: 'LIVE',
    verifyLabel: 'Security page',
    verifyHref: '/trust/security',
  },
  {
    failure: 'Synthetic / receipt-token recursion',
    protection:
      'Default-deny on receipt tokens, LP positions, and synthetic assets unless explicitly allow-listed. Same on-chain mechanism as the bridge default-deny.',
    maturity: 'LIVE',
    verifyLabel: 'No-bridges allow-list',
    verifyHref: '/trust/no-bridges',
  },
  {
    failure: 'Custody comingling',
    protection:
      'AXUSD reserves, AXAU reserves, operating cash, and Loss Coverage Reserve each held at distinct addresses with distinct lines on the solvency snapshot. BitGo multi-party crypto custody on Arbitrum One.',
    maturity: 'LIVE',
    verifyLabel: 'Security page',
    verifyHref: '/trust/security',
  },
  {
    failure: 'Audit theater',
    protection:
      'Every audit listed with firm, date, scope, audited bytecode hash, current deployed bytecode hash, and match indicator. No "audited by" claim is made on the site without a corresponding row.',
    maturity: 'LIVE',
    verifyLabel: 'Audits page',
    verifyHref: '/trust/audits',
  },
  {
    failure: 'Compliance theater',
    protection:
      'Glossary forbids unqualified compliance claims (e.g. "compliant with GENIUS Act"). AXUSD ERC-3643 (T-REX) standard for on-chain identity and modular compliance enforcement. Lending Fund operates under SEC Reg D 506(c).',
    maturity: 'LIVE',
    verifyLabel: 'Disclosure',
    verifyHref: '/disclosure',
  },
  {
    failure: 'Pump-dump-exit token cycle',
    protection:
      'AXM has no presale, no founder unlock-and-dump structure. Treasury vesting is public. Protocol revenue is from real-world cash flows (real estate operations, lending fees, payment-rail fees, card-onramp fees), disclosed in operating reports.',
    maturity: 'LIVE',
    verifyLabel: 'Disclosure',
    verifyHref: '/disclosure',
  },
  {
    failure: 'Failure response opacity',
    protection:
      'IncidentController is on-chain and publicly readable. 72-hour post-mortem commitment for any incident affecting user funds.',
    maturity: 'LIVE',
    verifyLabel: 'Security page',
    verifyHref: '/trust/security',
  },
  {
    failure: 'Untested code shipped to mainnet',
    protection:
      '41 Hardhat tests covering the Collateral Exploit Prevention framework, all passing as of merge. CI runs render tests on every PR. Migration runner hardened against CI test crashes.',
    maturity: 'LIVE',
    verifyLabel: 'Audits page',
    verifyHref: '/trust/audits',
  },
];

function MaturityPill({ maturity }: { maturity: Row['maturity'] }) {
  const color =
    maturity === 'LIVE'
      ? 'text-dl-forest border-dl-forest'
      : maturity === 'STAGED'
        ? 'text-dl-gold border-dl-gold'
        : 'text-dl-gray border-dl-gray';
  return (
    <span
      className={`font-dl-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${color}`}
    >
      {maturity}
    </span>
  );
}

export default function TrustLandingPage({
  loadedAtIso,
  mappingDocLastModifiedIso,
}: PageProps) {
  return (
    <>
      <Head>
        <title>Trust Stack — Axiom Protocol</title>
        <meta
          name="description"
          content="Every common DeFi failure mode, mapped to the specific Axiom Protocol protection that prevents it. Verifiable on chain, in audited documents, and on the public solvency snapshot."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-8">
          <div className="w-full border border-dl-border border-l-4 border-l-dl-navy" style={{ height: '320px', overflow: 'hidden' }}>
            <img
              src="/images/hero-trust.png"
              alt="Vault door — Axiom Protocol fail-closed by design"
              className="w-full h-full object-cover"
              style={{ display: 'block' }}
            />
          </div>
        </div>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Trust / Stack
          </p>
          <SectionHeading>Trust Stack</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Source: documents/trust/failure-mode-mapping.md · Document mtime{' '}
            {mappingDocLastModifiedIso} · Loaded {loadedAtIso}
          </p>
          <p className="text-base text-dl-ink mt-4 max-w-3xl leading-relaxed">
            Most of what fails in this industry isn&apos;t cryptography. It is
            governance, accounting, and disclosure. Below is every common
            failure mode we have observed, mapped to the specific Axiom
            protection that prevents it, with a link to verify each claim
            independently.
          </p>
          <p className="text-base text-dl-ink mt-2 max-w-3xl leading-relaxed">
            If a claim on this page cannot be verified by clicking through to
            chain, audit document, or policy file, it should not be on this
            page. Tell us if you find one that can&apos;t.
          </p>
        </div>

        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dl-bg-alt border-b border-dl-border">
              <tr>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[24%]">
                  Common DeFi failure
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3">
                  How Axiom prevents it
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[10%]">
                  Maturity
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[16%]">
                  Verify yourself
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-dl-border last:border-b-0 align-top"
                >
                  <td className="p-3 font-dl-serif text-dl-navy">{r.failure}</td>
                  <td className="p-3 text-dl-ink leading-relaxed">
                    {r.protection}
                  </td>
                  <td className="p-3">
                    <MaturityPill maturity={r.maturity} />
                  </td>
                  <td className="p-3">
                    <Link href={r.verifyHref} className="underline text-dl-navy">
                      {r.verifyLabel} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10 border border-dl-border p-6">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
            What this page is not
          </h2>
          <ul className="text-sm text-dl-ink space-y-2 list-disc pl-5">
            <li>Not a guarantee. Not insurance. Not a yield claim.</li>
            <li>
              Not a statement that Axiom cannot fail. Every protocol can fail.
              The page tells you exactly how we have engineered against the
              specific failure modes the industry keeps repeating.
            </li>
            <li>
              Not a complete list of every protection. The canonical mapping
              document at{' '}
              <span className="font-dl-mono">
                documents/trust/failure-mode-mapping.md
              </span>{' '}
              is more detailed.
            </li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/trust/security"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Security &amp; circuit breakers →
          </Link>
          <Link
            href="/trust/audits"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Audits &amp; bytecode match →
          </Link>
          <Link
            href="/trust/no-bridges"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            No-bridges allow-list →
          </Link>
          <Link
            href="/trust/governance"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Governance roles →
          </Link>
          <Link
            href="/trust/team"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Team &amp; entity →
          </Link>
        </div>
      </DesignLawLayout>
    </>
  );
}
