import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { listDeposits, type CardDepositStatus, type CardDepositIntent } from '../../../lib/capinfra/cardDeposits/service';

interface Row {
  id: string;
  intent: string;
  status: string;
  amountCents: number;
  currency: string;
  stripeSessionId: string | null;
  stripePayoutId: string | null;
  targetWalletAddress: string | null;
  buyerEmail: string | null;
  createdAt: string;
}

interface Props {
  rows: Row[];
  status: string | null;
  intent: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const status = typeof ctx.query.status === 'string' ? ctx.query.status as CardDepositStatus : null;
  const intent = typeof ctx.query.intent === 'string' ? ctx.query.intent as CardDepositIntent : null;
  const deposits = await listDeposits({ status, intent, limit: 200 });

  return {
    props: {
      status: status ?? null,
      intent: intent ?? null,
      rows: deposits.map((d) => ({
        id: d.id,
        intent: d.intent,
        status: d.status,
        amountCents: d.amountCents,
        currency: d.currency,
        stripeSessionId: d.stripeSessionId ?? null,
        stripePayoutId: d.stripePayoutId ?? null,
        targetWalletAddress: d.targetWalletAddress ?? null,
        buyerEmail: d.buyerEmail ?? null,
        createdAt: d.createdAt.toISOString(),
      })),
    },
  };
};

const STATUSES = ['', 'PENDING', 'PAID', 'PAYOUT_INITIATED', 'SETTLED', 'FAILED'];
const INTENTS = ['', 'TREASURY_FUND', 'AXUSD_MINT', 'AXAU_MINT'];

export default function CardDepositsOperatorPage({ rows, status, intent }: Props) {
  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">← Back to console</Link>
        </div>
        <h1 className="text-2xl font-serif mb-2">Card Deposits (Deprecated)</h1>
        <p className="text-sm text-dl-muted font-mono mb-4">
          Historical Stripe Checkout card payments. Retained for audit only.
          TREASURY_FUND deposits previously paid out to the Axiom Nexus account
          at Increase; AXUSD_MINT deposits triggered an on-chain mint to the
          buyer wallet.
        </p>

        <div className="border border-yellow-700 bg-yellow-50 text-yellow-900 p-4 mb-6 text-xs font-mono">
          <div className="font-bold uppercase tracking-wide mb-1">Rail Deprecated</div>
          <div>
            New card-deposit creation via Stripe is disabled
            (POST /api/capinfra/treasury/card-deposit/checkout returns 410).
            Consumer card payments now route through{' '}
            <Link href="/onramp" className="underline">/onramp</Link>{' '}
            (Coinbase &rarr; USDC &rarr; PSM &rarr; AXUSD/AXAU). Treasury
            funding moved to direct ACH/wire instructions at{' '}
            <Link href="/treasury/fund" className="underline">/treasury/fund</Link>.
            The webhook receiver remains online to drain in-flight events.
            The {`cap_card_deposits`} schema is preserved unchanged.
          </div>
        </div>

        <div className="mb-4">
          <a
            href={(() => {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (intent) params.set('intent', intent);
              const qs = params.toString();
              return `/api/capinfra/operator/treasury/card-deposits/export.csv${qs ? `?${qs}` : ''}`;
            })()}
            className="inline-block text-xs uppercase tracking-wide border border-dl-border px-3 py-1 hover:bg-dl-muted/10"
            data-testid="download-card-deposits-csv"
          >
            Download CSV (archive)
          </a>
        </div>

        <div className="mb-4 flex flex-wrap gap-4 text-xs uppercase tracking-wide">
          <div>
            <span className="text-dl-muted mr-2">Status:</span>
            {STATUSES.map((s) => {
              const params = new URLSearchParams();
              if (s) params.set('status', s);
              if (intent) params.set('intent', intent);
              const qs = params.toString();
              return (
                <Link
                  key={s || 'ALL-S'}
                  href={`/operator/treasury/card-deposits${qs ? `?${qs}` : ''}`}
                  className={`mr-2 ${status === (s || null) ? 'underline font-bold' : ''}`}
                >
                  {s || 'ALL'}
                </Link>
              );
            })}
          </div>
          <div>
            <span className="text-dl-muted mr-2">Intent:</span>
            {INTENTS.map((i) => {
              const params = new URLSearchParams();
              if (status) params.set('status', status);
              if (i) params.set('intent', i);
              const qs = params.toString();
              return (
                <Link
                  key={i || 'ALL-I'}
                  href={`/operator/treasury/card-deposits${qs ? `?${qs}` : ''}`}
                  className={`mr-2 ${intent === (i || null) ? 'underline font-bold' : ''}`}
                >
                  {i || 'ALL'}
                </Link>
              );
            })}
          </div>
        </div>


        <table className="w-full text-xs font-mono border border-dl-line">
          <thead className="bg-dl-surface">
            <tr>
              <th className="text-left p-2 border-b border-dl-line">ID</th>
              <th className="text-left p-2 border-b border-dl-line">Intent</th>
              <th className="text-left p-2 border-b border-dl-line">Status</th>
              <th className="text-right p-2 border-b border-dl-line">Amount</th>
              <th className="text-left p-2 border-b border-dl-line">Wallet / Email</th>
              <th className="text-left p-2 border-b border-dl-line">Stripe Session</th>
              <th className="text-left p-2 border-b border-dl-line">Payout</th>
              <th className="text-left p-2 border-b border-dl-line">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-dl-muted">No card deposits.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-dl-line">
                <td className="p-2">{r.id}</td>
                <td className="p-2">{r.intent}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2 text-right">${(r.amountCents / 100).toFixed(2)}</td>
                <td className="p-2">{r.targetWalletAddress ?? r.buyerEmail ?? '—'}</td>
                <td className="p-2">{r.stripeSessionId?.slice(0, 18) ?? '—'}…</td>
                <td className="p-2">{r.stripePayoutId?.slice(0, 18) ?? '—'}</td>
                <td className="p-2">{new Date(r.createdAt).toISOString().slice(0, 19).replace('T', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DesignLawLayout>
  );
}
