import Head from 'next/head';
import { DesignLawLayout } from '../components/design-law';

export default function MyCardPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>My Card | Axiom Protocol</title>
      </Head>
      <div className="border border-dl-border bg-dl-bg-alt px-8 py-12 text-center max-w-2xl mx-auto mt-12">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-4">Banking Infrastructure</p>
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-4">Card Issuance — Offline</h1>
        <p className="text-sm text-dl-gray leading-relaxed mb-6">
          ACH/wire banking infrastructure is currently offline. Debit card issuance, card management, and account
          registration are unavailable at this time.
        </p>
        <p className="font-dl-mono text-xs text-dl-gray">
          On-chain capital operations via AXUSD on Arbitrum One remain fully available.
        </p>
      </div>
    </DesignLawLayout>
  );
}
