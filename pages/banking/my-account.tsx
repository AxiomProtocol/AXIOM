import Head from 'next/head';
import { DesignLawLayout } from '../../components/design-law';

export default function MyAccountPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>My Account | Axiom Protocol</title>
      </Head>
      <div className="border border-dl-border bg-dl-bg-alt px-8 py-12 text-center max-w-2xl mx-auto mt-12">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-4">Axiom Nexus Account</p>
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-4">ACH / Wire Rails Offline</h1>
        <p className="text-sm text-dl-gray leading-relaxed">
          ACH/wire banking infrastructure is currently offline. No account registration or deposit actions are available at this time.
          On-chain capital operations via AXUSD on Arbitrum One remain fully available.
        </p>
      </div>
    </DesignLawLayout>
  );
}
