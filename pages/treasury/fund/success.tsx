import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';

/**
 * Stripe Checkout success landing for card deposits.
 * Reachable from `success_url` set in `lib/capinfra/cardDeposits/service.ts`.
 * Used by both treasury card deposits (operator) and LP capital intake.
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
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">Stripe Checkout</p>
        <h1 className="text-3xl font-serif mb-4">Payment Received</h1>
        <p className="text-sm text-dl-gray leading-relaxed mb-4">
          Your card payment was accepted. The deposit record moves to PAID once the
          webhook processes — typically within a few seconds. If your intent was
          AXUSD minting, AXUSD will be issued 1:1 to your wallet automatically on that transition.
        </p>

        {depId && (
          <div className="border border-dl-border p-4 font-dl-mono text-xs mb-4 bg-dl-bg-alt">
            <div className="text-dl-gray uppercase tracking-wide mb-1">Deposit ID</div>
            <div className="break-all text-dl-navy">{depId}</div>
            {sessionId && (
              <>
                <div className="text-dl-gray uppercase tracking-wide mt-3 mb-1">Stripe Session</div>
                <div className="break-all text-dl-navy">{sessionId}</div>
              </>
            )}
          </div>
        )}

        <div className="border border-dl-border bg-dl-bg p-5 mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-3">Next Steps</p>
          <ol className="space-y-2 text-sm text-dl-gray">
            <li className="flex gap-3">
              <span className="font-dl-mono text-dl-navy font-bold shrink-0">1.</span>
              <span>Wait a moment for the webhook to process. AXUSD will appear in your wallet once minted.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-dl-mono text-dl-navy font-bold shrink-0">2.</span>
              <span>Return to the Lending Fund invest page to complete the on-chain vault deposit.</span>
            </li>
            <li className="flex gap-3">
              <span className="font-dl-mono text-dl-navy font-bold shrink-0">3.</span>
              <span>If AXUSD does not appear within 10 minutes, contact Operations with your Deposit ID.</span>
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-4">
          <Link
            href="/lending-fund/invest"
            className="px-5 py-3 bg-dl-ink text-dl-surface font-dl-mono text-xs uppercase tracking-wide hover:opacity-90"
          >
            Return to Invest →
          </Link>
          <Link href="/onramp" className="px-5 py-3 border border-dl-border text-dl-gray font-dl-mono text-xs uppercase tracking-wide hover:text-dl-navy">
            Card Onramp
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
