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
          Your card was not charged. You can try again anytime.
        </p>
        <Link href="/treasury/fund" className="underline text-sm">← Back to fund</Link>
      </div>
    </DesignLawLayout>
  );
}
