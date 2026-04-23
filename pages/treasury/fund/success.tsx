import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

/**
 * Retained for in-flight Stripe redirect URLs from already-issued
 * Checkout sessions. New consumer card payments route through /onramp.
 */
export default function FundSuccessPage() {
  const router = useRouter();
  const depId = typeof router.query.dep_id === 'string' ? router.query.dep_id : null;
  return (
    <DesignLawLayout>
      <Head><title>Payment Received — Axiom</title></Head>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-serif mb-4">Payment Received</h1>
        <p className="text-sm text-dl-muted font-mono mb-4">
          Your card payment has been received. Settlement to the Axiom Nexus
          account (or AXUSD mint, if originally selected) typically takes T+2
          to T+4 business days.
        </p>
        <p className="text-sm text-dl-muted font-mono mb-4">
          Note: card-based treasury funding has been retired. Future treasury
          contributions should use the wire/ACH instructions at{' '}
          <Link href="/treasury/fund" className="underline">/treasury/fund</Link>.
          For consumer card purchases of AXUSD or AXAU, use the{' '}
          <Link href="/onramp" className="underline">card onramp</Link>.
        </p>
        {depId && (
          <div className="border border-dl-line p-4 font-mono text-xs mb-6">
            <div className="text-dl-muted uppercase tracking-wide mb-1">Deposit ID</div>
            <div>{depId}</div>
          </div>
        )}
        <Link href="/onramp" className="underline text-sm">→ Go to the card onramp</Link>
      </div>
    </DesignLawLayout>
  );
}
