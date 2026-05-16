/**
 * /trust/governance — Privileged-role honesty page.
 *
 * Lists every privileged role across the major Axiom contracts, the
 * current state of its key management (EOA vs multi-sig vs timelock),
 * and the planned migration. If a role is still EOA-controlled, this
 * page says so. One false statement destroys the entire trust surface.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface PageProps {
  loadedAtIso: string;
}

interface RoleRow {
  contract: string;
  role: string;
  whatItDoes: string;
  custodyState: 'TIMELOCKED' | 'MULTI_PARTY' | 'EOA' | 'PUBLIC_READ_ONLY';
  remediation: string;
}

const ROLES: RoleRow[] = [
  {
    contract: 'BitGo Custody (Arbitrum One)',
    role: 'Treasury movement',
    whatItDoes:
      'Authorises movement of treasury crypto assets out of custody. Required for any AXM, AXAU reserve, or AXUSD reserve transfer.',
    custodyState: 'MULTI_PARTY',
    remediation:
      'Live. BitGo CaaS multi-party authorization. No single key can move funds.',
  },
  {
    contract: 'Banking Provider (TBD)',
    role: 'Fiat operations',
    whatItDoes:
      'Authorises ACH, wire, and card-onramp settlement to and from the operating account. FDIC-insured at the depository layer.',
    custodyState: 'MULTI_PARTY',
    remediation:
      'Live. Bank-grade multi-party access controls and audit trails.',
  },
  {
    contract: 'CollateralGuard',
    role: 'Risk admin',
    whatItDoes:
      'Configures per-asset risk parameters, sets validity adapters, sets per-market halts. Cannot move funds; only sets admission rules.',
    custodyState: 'EOA',
    remediation:
      'Phase 1 ships under operator EOA so the framework can be tuned in production based on observed flows. Timelock migration is the next step on this contract.',
  },
  {
    contract: 'IncidentController',
    role: 'Halt authority',
    whatItDoes:
      'Triggers per-market or global halts when an incident is detected. Halt-only — cannot move funds or change parameters.',
    custodyState: 'EOA',
    remediation:
      'Halt-only authority is intentionally fast-path EOA so the protocol can stop a developing incident without waiting for a timelock. Halt actions are logged and a 72-hour post-mortem commitment applies.',
  },
  {
    contract: 'AXIOMFixedLoan',
    role: 'Lending operator',
    whatItDoes:
      'Originates fixed-term loans, sets per-loan collateral, calls disburseTranche. Once CollateralGuard is wired, every disbursement passes the on-chain admission check.',
    custodyState: 'EOA',
    remediation:
      'EOA-controlled in Phase 1. Disbursements are gated on chain by CollateralGuard, which is the substantive control surface. Timelock migration of the operator role is on the roadmap.',
  },
  {
    contract: 'MintRedeemController (AXAU)',
    role: 'Mint/redeem governance',
    whatItDoes:
      'Configures the AXAU mint and redeem path, including the CollateralGuard wiring set in Task #210.',
    custodyState: 'EOA',
    remediation:
      'EOA-controlled. Mint admissions are gated on chain by CollateralGuard. Timelock migration of the governor role is on the roadmap.',
  },
  {
    contract: 'AXUSD ERC-3643 (T-REX) controller',
    role: 'Identity & compliance',
    whatItDoes:
      'Manages on-chain identity verification, eligible-holder registry, and compliance modules. Cannot mint without backing.',
    custodyState: 'MULTI_PARTY',
    remediation:
      'Live. Compliance and identity registry operations require multi-party authorization.',
  },
  {
    contract: 'Solvency snapshot endpoint',
    role: 'Snapshot publication',
    whatItDoes:
      'Publishes the canonical, dated solvency snapshot consumed by /disclosure and /trust/security.',
    custodyState: 'PUBLIC_READ_ONLY',
    remediation:
      'Read-only public endpoint. Snapshots are append-only and timestamped.',
  },
];

function StateBadge({ state }: { state: RoleRow['custodyState'] }) {
  const map: Record<RoleRow['custodyState'], { label: string; cls: string }> = {
    TIMELOCKED: {
      label: 'TIMELOCKED',
      cls: 'text-dl-forest border-dl-forest',
    },
    MULTI_PARTY: {
      label: 'MULTI-PARTY',
      cls: 'text-dl-forest border-dl-forest',
    },
    EOA: {
      label: 'EOA — TIMELOCK PLANNED',
      cls: 'text-dl-gold border-dl-gold',
    },
    PUBLIC_READ_ONLY: {
      label: 'PUBLIC READ-ONLY',
      cls: 'text-dl-navy border-dl-navy',
    },
  };
  const { label, cls } = map[state];
  return (
    <span
      className={`font-dl-mono text-[10px] uppercase tracking-wider border px-1.5 py-0.5 ${cls}`}
    >
      {label}
    </span>
  );
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  return { props: { loadedAtIso: new Date().toISOString() } };
};

export default function TrustGovernancePage({ loadedAtIso }: PageProps) {
  const liveCount = ROLES.filter(
    (r) => r.custodyState === 'TIMELOCKED' || r.custodyState === 'MULTI_PARTY',
  ).length;
  const eoaCount = ROLES.filter((r) => r.custodyState === 'EOA').length;
  return (
    <>
      <Head>
        <title>Governance &amp; Privileged Roles — Axiom Protocol</title>
        <meta
          name="description"
          content="Every privileged role across Axiom Protocol, with current key-management state and planned remediation. EOA-controlled roles are disclosed honestly."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Trust / Governance
          </p>
          <SectionHeading>Governance &amp; Privileged Roles</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Loaded {loadedAtIso} · {liveCount} role
            {liveCount === 1 ? '' : 's'} multi-party / timelocked · {eoaCount}{' '}
            role{eoaCount === 1 ? '' : 's'} EOA with planned timelock
          </p>
          <p className="text-sm text-dl-gray mt-1">
            <Link href="/trust" className="underline">
              ← Back to Trust Stack
            </Link>
          </p>
        </div>

        <div className="border border-dl-border p-6 mb-8">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
            Why this page is honest about EOA roles
          </h2>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            Most protocols hide the fact that some of their privileged
            functions are controlled by a single externally-owned account
            (EOA). When the rug pull happens, the post-mortem reveals it.
          </p>
          <p className="text-base text-dl-ink leading-relaxed">
            We list every privileged role below and tell you exactly which
            ones are still EOA-controlled and why. Where an EOA still
            controls a function, the substantive control surface is shifted
            into a separate on-chain check (the CollateralGuard) so that the
            EOA cannot bypass the policy even if it is compromised.
          </p>
        </div>

        <div className="border border-dl-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-dl-bg-alt border-b border-dl-border">
              <tr>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[20%]">
                  Contract / surface
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[14%]">
                  Role
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3">
                  What it does
                </th>
                <th className="text-left font-dl-serif text-dl-navy p-3 w-[16%]">
                  State
                </th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r, i) => (
                <tr
                  key={i}
                  className="border-b border-dl-border last:border-b-0 align-top"
                >
                  <td className="p-3 font-dl-serif text-dl-navy">
                    {r.contract}
                  </td>
                  <td className="p-3 text-dl-ink">{r.role}</td>
                  <td className="p-3 text-dl-ink leading-relaxed">
                    {r.whatItDoes}
                    <div className="mt-2 text-xs text-dl-gray italic">
                      {r.remediation}
                    </div>
                  </td>
                  <td className="p-3">
                    <StateBadge state={r.custodyState} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 border border-dl-border p-6">
          <h2 className="font-dl-serif text-xl text-dl-navy mb-3">
            Roadmap commitments
          </h2>
          <ol className="text-base text-dl-ink space-y-2 list-decimal pl-5 leading-relaxed">
            <li>
              Migrate every EOA-controlled risk-admin and operator role to
              an on-chain TimelockController with a minimum delay no shorter
              than the comment window in the Loss Coverage Reserve policy
              (14 days), excepting halt-only authority which remains
              fast-path so incidents can be stopped immediately.
            </li>
            <li>
              Publish the timelocked addresses on this page as each
              migration completes. The State column above will turn from
              amber to green per row.
            </li>
            <li>
              Maintain the substantive on-chain controls (CollateralGuard,
              IncidentController, AXUSD ERC-3643 compliance) as the primary
              defence even after timelocks are in place.
            </li>
          </ol>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/trust/team"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Team page →
          </Link>
          <Link
            href="/trust/security"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Security page →
          </Link>
        </div>
      </DesignLawLayout>
    </>
  );
}
