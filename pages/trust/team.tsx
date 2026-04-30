/**
 * /trust/team — Real founder, real entity, no anonymous founders.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface PageProps {
  loadedAtIso: string;
  entityEinPresent: boolean;
}

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  return {
    props: {
      loadedAtIso: new Date().toISOString(),
      entityEinPresent: Boolean(process.env.ENTITY_EIN),
    },
  };
};

export default function TrustTeamPage({
  loadedAtIso,
  entityEinPresent,
}: PageProps) {
  return (
    <>
      <Head>
        <title>Team — Axiom Protocol</title>
        <meta
          name="description"
          content="Real names, real entity, real key management. Axiom Protocol does not have anonymous founders."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Trust / Team
          </p>
          <SectionHeading>Team &amp; Operating Entity</SectionHeading>
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
          <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">
            No anonymous founders
          </h2>
          <p className="text-base text-dl-ink leading-relaxed mb-3">
            Axiom Protocol is operated by a US-incorporated entity with a
            verifiable EIN, run by a public founder with a verifiable
            professional history. There is no pseudonymous core team. There is
            no shadow leadership.
          </p>
          <p className="text-base text-dl-ink leading-relaxed">
            Allocators and counterparties may verify the founder identity and
            the operating entity registration on request before any
            engagement.
          </p>
        </div>

        <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">Founder</h2>
        <div className="border border-dl-border p-6 mb-8">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-6">
            <dt className="font-dl-mono text-xs text-dl-gray uppercase">Name</dt>
            <dd className="md:col-span-2 font-dl-serif text-lg text-dl-navy">
              Clarence Fuqua
            </dd>

            <dt className="font-dl-mono text-xs text-dl-gray uppercase">Role</dt>
            <dd className="md:col-span-2 text-base text-dl-ink">Founder</dd>

            <dt className="font-dl-mono text-xs text-dl-gray uppercase">
              LinkedIn
            </dt>
            <dd className="md:col-span-2 text-base">
              <a
                href="https://www.linkedin.com/in/akiligroup"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-dl-navy break-all"
              >
                https://www.linkedin.com/in/akiligroup
              </a>
            </dd>
          </dl>
        </div>

        <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">
          Operating entity
        </h2>
        <div className="border border-dl-border p-6 mb-8">
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-y-3 gap-x-6">
            <dt className="font-dl-mono text-xs text-dl-gray uppercase">
              Jurisdiction
            </dt>
            <dd className="md:col-span-2 text-base text-dl-ink">
              United States
            </dd>

            <dt className="font-dl-mono text-xs text-dl-gray uppercase">EIN</dt>
            <dd className="md:col-span-2 text-base text-dl-ink">
              {entityEinPresent ? (
                <>
                  Configured (provided to verified counterparties on request).
                  EIN is held in environment configuration and not published in
                  full on the public site to prevent identity-fraud abuse,
                  consistent with US Treasury guidance.
                </>
              ) : (
                <span className="text-dl-gray italic">
                  EIN configuration not detected at request time.
                </span>
              )}
            </dd>
          </dl>
        </div>

        <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">
          Key management
        </h2>
        <div className="border border-dl-border p-6 mb-8">
          <ul className="text-base text-dl-ink space-y-3 list-disc pl-5 leading-relaxed">
            <li>
              <strong className="font-dl-serif text-dl-navy">
                No single-key signer for treasury operations.
              </strong>{' '}
              Crypto custody on Arbitrum One uses BitGo Custody-as-a-Service
              with multi-party authorization. No single individual can move
              treasury funds unilaterally.
            </li>
            <li>
              <strong className="font-dl-serif text-dl-navy">
                Fiat custody is bank-grade.
              </strong>{' '}
              ACH/wire banking rails are currently offline. On-chain capital operations via BitGo institutional custody remain active.
            </li>
            <li>
              <strong className="font-dl-serif text-dl-navy">
                Privileged contract roles are disclosed honestly.
              </strong>{' '}
              Some Arbitrum One privileged roles are still EOA-controlled
              while the timelock migration is in progress. The current state
              of every role is listed on{' '}
              <Link href="/trust/governance" className="underline text-dl-navy">
                /trust/governance
              </Link>{' '}
              — including the roles that are not yet timelocked.
            </li>
            <li>
              <strong className="font-dl-serif text-dl-navy">
                Append-only audit trail.
              </strong>{' '}
              Every privileged action is recorded in the capital
              infrastructure events table with timestamp, actor, and policy
              version. Records are not deletable.
            </li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/trust/governance"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Governance roles →
          </Link>
          <Link
            href="/disclosure"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Institutional disclosure →
          </Link>
          <Link
            href="/contact"
            className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm uppercase tracking-wide hover:bg-dl-navy hover:text-white"
          >
            Contact →
          </Link>
        </div>
      </DesignLawLayout>
    </>
  );
}
