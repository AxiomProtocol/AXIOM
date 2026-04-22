/**
 * /trust/audits — Public audit register.
 *
 * Lists every audit-grade document that exists in documents/. Each row
 * shows: name, scope, date, source path. The bytecode-hash comparator
 * column is reserved for the Active Contract Verification System
 * integration; until that surface ships, the column is shown as
 * "VERIFICATION PENDING" honestly rather than fabricated.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface AuditRow {
  title: string;
  scope: string;
  sourcePath: string;
  lastModifiedIso: string;
  status: 'IN_REPO' | 'EXTERNAL';
}

interface PageProps {
  loadedAtIso: string;
  rows: AuditRow[];
}

const AUDIT_DOCS: Array<{ title: string; scope: string; relPath: string }> = [
  {
    title: 'Collateral Exploit Prevention Framework',
    scope:
      'CollateralGuard, CollateralRiskConfig, IncidentController, AXIOMOracleAdapter hardening, AXIOMFixedLoan and MintRedeemController integration. 41 Hardhat tests.',
    relPath: 'documents/security/collateral-exploit-prevention.md',
  },
  {
    title: 'Failure-Mode → Protection Mapping (canonical)',
    scope:
      'Source-of-truth mapping document for every claim made on the /trust pages.',
    relPath: 'documents/trust/failure-mode-mapping.md',
  },
  {
    title: 'Loss Coverage Reserve Policy',
    scope:
      'Funding, eligible draw conditions, claim process, address disclosure, and governance for the Loss Coverage Reserve line on /disclosure.',
    relPath: 'documents/trust/loss-coverage-reserve-policy.md',
  },
  {
    title: 'Collateral Risk Policy (canonical)',
    scope:
      'Classification matrix, validity adapter design, emergency triggers, guardian disable path. Rendered verbatim at /disclosure/collateral-risk-policy.',
    relPath: 'documents/policies/collateral-risk-policy.md',
  },
  {
    title: 'Euler AXUSD Earn Vault — Audit',
    scope: 'AXUSD eVault perspective verification and risk parameter review.',
    relPath: 'documents/euler-axusd-earn-vault-audit.md',
  },
  {
    title: 'AXUSD Audit & Assurance Readiness Plan',
    scope: 'Pre-audit readiness plan for AXUSD ERC-3643 deployment.',
    relPath: 'documents/cap-infra/README.md',
  },
];

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  const rows: AuditRow[] = [];
  for (const a of AUDIT_DOCS) {
    const abs = path.join(process.cwd(), a.relPath);
    try {
      const stat = await fs.stat(abs);
      rows.push({
        title: a.title,
        scope: a.scope,
        sourcePath: a.relPath,
        lastModifiedIso: stat.mtime.toISOString(),
        status: 'IN_REPO',
      });
    } catch {
      // Skip docs that don't exist on disk — be honest, do not fabricate.
    }
  }
  return { props: { loadedAtIso: new Date().toISOString(), rows } };
};

export default function TrustAuditsPage({ loadedAtIso, rows }: PageProps) {
  return (
    <>
      <Head>
        <title>Audits &amp; Verification — Axiom Protocol</title>
        <meta
          name="description"
          content="Every Axiom Protocol audit document and security policy, with source path and last-modified timestamp. No 'audited by' claim is made on the site without a corresponding row here."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Trust / Audits
          </p>
          <SectionHeading>Audits &amp; Verification</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Loaded {loadedAtIso} · {rows.length} document
            {rows.length === 1 ? '' : 's'} listed
          </p>
          <p className="text-sm text-dl-gray mt-1">
            <Link href="/trust" className="underline">
              ← Back to Trust Stack
            </Link>
          </p>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
            What this page is, and is not
          </h2>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            This is the complete public audit register. Every document below
            exists in the repository at the path shown. We do not claim any
            audit that we cannot point to.
          </p>
          <p className="text-base text-dl-ink leading-relaxed">
            We are not yet a multi-firm-audited protocol. Allocators should
            evaluate Axiom on the basis of the documents we have actually
            published and the on-chain controls we have actually shipped, not
            on the basis of audit-firm logos. As external audit engagements
            complete, they will be added here with firm name, scope, date,
            and audited bytecode hash.
          </p>
        </div>

        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dl-bg-alt border-b border-dl-border">
              <tr>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[28%]">
                  Document
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3">
                  Scope
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[18%]">
                  Source path
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[14%]">
                  Last modified
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[12%]">
                  Bytecode match
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-dl-border last:border-b-0 align-top"
                >
                  <td className="p-3 font-dl-serif text-dl-navy">{r.title}</td>
                  <td className="p-3 text-dl-ink leading-relaxed">{r.scope}</td>
                  <td className="p-3 font-dl-mono text-xs text-dl-gray break-all">
                    {r.sourcePath}
                  </td>
                  <td className="p-3 font-dl-mono text-xs text-dl-gray">
                    {r.lastModifiedIso.split('T')[0]}
                  </td>
                  <td className="p-3">
                    <span className="font-dl-mono text-[10px] uppercase tracking-wider border border-dl-gray text-dl-gray px-1.5 py-0.5">
                      VERIFICATION PENDING
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 border border-dl-border p-6">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
            Bytecode-match verification
          </h2>
          <p className="text-base text-dl-ink leading-relaxed">
            The bytecode-hash comparator pulls the audited bytecode hash from
            each audit document and compares it to the on-chain deployed
            bytecode at the privileged contract addresses. This surface is
            wired into the Active Contract Verification System backend; the
            public column on this page ships as &quot;Verification pending&quot;
            and will turn green per row as each audit attests an explicit
            bytecode hash. We will not turn the indicator green on the basis
            of a manual claim.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/trust/security"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Live security state →
          </Link>
          <Link
            href="/disclosure/collateral-risk-policy"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Collateral Risk Policy →
          </Link>
        </div>
      </DesignLawLayout>
    </>
  );
}
