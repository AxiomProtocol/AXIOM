import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';

export default function FundTreasuryPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Fund the Treasury — Axiom</title>
        <meta name="description" content="Fund the Axiom Protocol treasury." />
      </Head>

      <div className="max-w-3xl">
        <h1 className="text-3xl font-serif mb-2">Fund the Treasury</h1>

        <div className="border border-dl-border bg-dl-bg-alt px-6 py-5 mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">Wire / ACH Rail — Offline</p>
          <p className="text-sm text-dl-gray leading-relaxed">
            ACH/wire banking infrastructure is currently offline. Wire and ACH deposit instructions are unavailable at this time.
            Contact Operations to coordinate treasury funding via bank transfer.
          </p>
        </div>

        <div className="border border-dl-line p-6 mb-6">
          <h2 className="text-lg font-serif mb-2">Card Funding (On-Chain Treasury)</h2>
          <p className="text-sm font-mono mb-4">
            Fund the on-chain Treasury wallet directly with a credit or debit
            card. Coinbase Onramp converts the card payment into USDC and
            delivers it to the Treasury address on Arbitrum One.
          </p>
          <Link
            href="/treasury/fund/card"
            className="inline-block px-5 py-3 bg-dl-ink text-dl-surface font-mono text-sm uppercase tracking-wide hover:opacity-90"
          >
            Fund via Card →
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
