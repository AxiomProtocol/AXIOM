import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

/**
 * Stripe Checkout cancel landing for treasury card deposits.
 * Reachable from `cancel_url` set in `lib/capinfra/cardDeposits/service.ts`.
 */
export default function FundCancelPage() {
  const router = useRouter();
  const depId = typeof router.query.dep_id === 'string' ? router.query.dep_id : null;
  return (
    <DesignLawLayout>
      <Head><title>Payment Cancelled — Axiom</title></Head>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-serif mb-4">Payment Cancelled</h1>
        <p className="text-sm text-dl-muted font-mono mb-4">
          Your card was not charged. The deposit row remains in PENDING and
          can be safely abandoned. To retry, return to the operator console
          and create a new checkout session — each submission generates a
          fresh idempotency key, so no duplicate row will be created.
        </p>
        {depId && (
          <div className="border border-dl-line p-4 font-mono text-xs mb-4">
            <div className="text-dl-muted uppercase tracking-wide mb-1">Deposit ID (cancelled)</div>
            <div className="break-all">{depId}</div>
          </div>
        )}
        <div className="flex gap-4">
          <Link href="/operator/treasury/card-deposits" className="underline text-sm">
            → Back to operator console
          </Link>
          <Link href="/onramp" className="underline text-sm">→ Card onramp</Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
