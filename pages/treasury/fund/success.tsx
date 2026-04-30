import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

/**
 * Stripe Checkout success landing for treasury card deposits.
 * Reachable from `success_url` set in `lib/capinfra/cardDeposits/service.ts`.
 */
export default function FundSuccessPage() {
  const router = useRouter();
  const depId = typeof router.query.dep_id === 'string' ? router.query.dep_id : null;
  const sessionId =
    typeof router.query.session_id === 'string' ? router.query.session_id : null;
  return (
    <DesignLawLayout>
      <Head><title>Payment Received — Axiom</title></Head>
      <div className="max-w-2xl">
        <h1 className="text-3xl font-serif mb-4">Payment Received</h1>
        <p className="text-sm text-dl-muted font-mono mb-4">
          Your card payment was accepted by Stripe. The deposit will move to
          PAID once the webhook is processed; AXUSD mints (if applicable)
          fire automatically on that transition. Treasury payouts to the
          Increase account typically settle T+2 to T+4 business days after
          the Stripe balance lands.
        </p>
        {depId && (
          <div className="border border-dl-line p-4 font-mono text-xs mb-4">
            <div className="text-dl-muted uppercase tracking-wide mb-1">Deposit ID</div>
            <div className="break-all">{depId}</div>
            {sessionId && (
              <>
                <div className="text-dl-muted uppercase tracking-wide mt-3 mb-1">Stripe Session</div>
                <div className="break-all">{sessionId}</div>
              </>
            )}
          </div>
        )}
        <p className="text-sm text-dl-muted font-mono mb-4">
          Consumer card purchases of AXUSD or AXAU still route through the{' '}
          <Link href="/onramp" className="underline">card onramp</Link>.
        </p>
        <div className="flex gap-4">
          <Link href="/operator/treasury/card-deposits" className="underline text-sm">
            → View deposits in operator console
          </Link>
          <Link href="/onramp" className="underline text-sm">→ Card onramp</Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
