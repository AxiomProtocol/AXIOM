import Head from 'next/head';
import { DesignLawLayout } from '../components/design-law';

export default function DirectDepositPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Direct Deposit | Axiom Protocol</title>
      </Head>
      <div className="border border-dl-border bg-dl-bg-alt px-8 py-12 text-center max-w-2xl mx-auto mt-12">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-4">Banking Infrastructure</p>
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-4">Direct Deposit — Offline</h1>
        <p className="text-sm text-dl-gray leading-relaxed mb-6">
          ACH/wire banking infrastructure is currently offline. Direct deposit setup, routing numbers, and account
          number provisioning are unavailable at this time.
        </p>
        <p className="font-dl-mono text-xs text-dl-gray">
          On-chain capital operations via AXUSD on Arbitrum One remain fully available.
        </p>
      </div>
    </DesignLawLayout>
  );
}
