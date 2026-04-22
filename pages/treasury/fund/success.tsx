import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

export default function FundSuccessPage() {
  const router = useRouter();
  const depId = typeof router.query.dep_id === 'string' ? router.query.dep_id : null;
  return (
    <DesignLawLayout>
      <Head><title>Payment Received — Axiom</title></Head>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-serif mb-4">Payment Received</h1>
        <p className="text-sm text-dl-muted font-mono mb-4">
          Stripe has authorized your card. Settlement to the Axiom Nexus account
          (or AXUSD mint, if selected) typically takes T+2 to T+4 business days.
        </p>
        {depId && (
          <div className="border border-dl-line p-4 font-mono text-xs mb-6">
            <div className="text-dl-muted uppercase tracking-wide mb-1">Deposit ID</div>
            <div>{depId}</div>
          </div>
        )}
        <Link href="/treasury/fund" className="underline text-sm">← Make another payment</Link>
      </div>
    </DesignLawLayout>
  );
}
