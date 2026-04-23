import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

export default function FundCancelPage() {
  return (
    <DesignLawLayout>
      <Head><title>Payment Cancelled — Axiom</title></Head>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-serif mb-4">Payment Cancelled</h1>
        <p className="text-sm text-dl-muted font-mono mb-6">
          Your card was not charged. Card-based treasury funding has been
          retired; for treasury contributions, see the wire/ACH instructions
          at <Link href="/treasury/fund" className="underline">/treasury/fund</Link>.
          For consumer card purchases of AXUSD or AXAU, use the{' '}
          <Link href="/onramp" className="underline">card onramp</Link>.
        </p>
        <Link href="/onramp" className="underline text-sm">→ Go to the card onramp</Link>
      </div>
    </DesignLawLayout>
  );
}
