import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { OperatorConsoleLayout } from '../../../components/operator/OperatorConsoleLayout';
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
  loadError: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  const status = typeof ctx.query.status === 'string' ? ctx.query.status as CardDepositStatus : null;
  const intent = typeof ctx.query.intent === 'string' ? ctx.query.intent as CardDepositIntent : null;

  try {
    const deposits = await listDeposits({ status, intent, limit: 200 });
    return {
      props: {
        status: status ?? null,
        intent: intent ?? null,
        loadError: null,
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[operator/treasury/card-deposits] failed to list deposits:', msg, err);
    return {
      props: {
        status: status ?? null,
        intent: intent ?? null,
        rows: [],
        loadError: msg,
      },
    };
  }
};

const STATUSES = ['', 'PENDING', 'PAID', 'PAYOUT_INITIATED', 'SETTLED', 'FAILED'];
const INTENTS = ['', 'TREASURY_FUND', 'AXUSD_MINT', 'AXAU_MINT'];

interface FormState {
  amountUsd: string;
  intent: CardDepositIntent;
  targetWalletAddress: string;
  buyerEmail: string;
}

interface SubmitOk {
  depositId: string;
  sessionId: string;
  checkoutUrl: string;
  status: string;
  stripeAccountId: string | null;
}

interface SubmitErr {
  error: string;
  message?: string;
}

function newIdempotencyKey(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CardDepositsOperatorPage({ rows, status, intent, loadError }: Props) {
  const [form, setForm] = useState<FormState>({
    amountUsd: '',
    intent: 'TREASURY_FUND',
    targetWalletAddress: '',
    buyerEmail: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitOk | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Sticky idempotency key per "attempt". Generated on first submit and
  // reused on every retry until the operator resets the form. This is
  // what gives lost-response retries the resume semantics the backend
  // promises (same key → same deposit row → same Stripe session URL).
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isMintIntent = form.intent === 'AXUSD_MINT' || form.intent === 'AXAU_MINT';

  function resetForm() {
    setForm({ amountUsd: '', intent: 'TREASURY_FUND', targetWalletAddress: '', buyerEmail: '' });
    setResult(null);
    setSubmitError(null);
    setPendingKey(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const amountNum = Number(form.amountUsd);
    if (!Number.isFinite(amountNum) || amountNum < 1 || amountNum > 10000) {
      setSubmitError('Amount must be between $1 and $10,000.');
      return;
    }
    const amountCents = Math.round(amountNum * 100);
    if (isMintIntent && !/^0x[a-fA-F0-9]{40}$/.test(form.targetWalletAddress.trim())) {
      setSubmitError('Wallet address (0x...) is required for mint intents.');
      return;
    }

    // Reuse the same key across retries within this attempt. The backend
    // (`createCheckoutSession`) refuses to mutate payload on key reuse,
    // so changing amount/intent/wallet between retries surfaces a 400
    // "Idempotency key reused with a different payload" — operator must
    // hit "Start over" to begin a fresh attempt.
    const idempotencyKey = pendingKey ?? newIdempotencyKey();
    if (!pendingKey) setPendingKey(idempotencyKey);

    setSubmitting(true);
    try {
      const res = await fetch('/api/capinfra/treasury/card-deposit/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          amountCents,
          intent: form.intent,
          idempotencyKey,
          targetWalletAddress: isMintIntent ? form.targetWalletAddress.trim() : null,
          buyerEmail: form.buyerEmail.trim() || null,
        }),
      });
      const data = (await res.json()) as SubmitOk | SubmitErr;
      if (!res.ok || 'error' in data) {
        const err = data as SubmitErr;
        setSubmitError(`${err.error}${err.message ? ` — ${err.message}` : ''}`);
      } else {
        setResult(data as SubmitOk);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'network error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OperatorConsoleLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">← Back to console</Link>
        </div>
        <h1 className="text-2xl font-serif mb-2">Card Deposits</h1>
        {loadError && (
          <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-4 font-mono text-xs">
            <div className="font-serif text-sm text-dl-navy mb-1">Operational notice</div>
            <div className="text-dl-ink">
              Card deposit data could not be loaded. Showing empty result. Operations has been notified.
              <div className="text-dl-muted mt-1 break-all">ref: {loadError}</div>
            </div>
          </div>
        )}
        <p className="text-sm text-dl-muted font-mono mb-4">
          Operator-only Stripe Checkout entry. TREASURY_FUND lands in the
          Stripe balance for payout to Increase. AXUSD_MINT triggers an
          on-chain mint to the target wallet on PAID. AXAU_MINT queues for
          the AXAU operational pipeline. Consumer card payments still route
          through <Link href="/onramp" className="underline">/onramp</Link>.
        </p>

        <form
          onSubmit={handleSubmit}
          className="border border-dl-line p-4 mb-6 font-mono text-xs"
          data-testid="card-deposit-form"
        >
          <div className="font-serif text-sm text-dl-navy mb-3">New Card Deposit</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col">
              <span className="uppercase tracking-wide text-dl-muted mb-1">Amount (USD)</span>
              <input
                type="number"
                min="1"
                max="10000"
                step="0.01"
                required
                value={form.amountUsd}
                onChange={(e) => setForm({ ...form, amountUsd: e.target.value })}
                className="border border-dl-line p-2 bg-white"
                data-testid="input-amount-usd"
                placeholder="e.g. 1.00"
              />
            </label>
            <label className="flex flex-col">
              <span className="uppercase tracking-wide text-dl-muted mb-1">Intent</span>
              <select
                value={form.intent}
                onChange={(e) => setForm({ ...form, intent: e.target.value as CardDepositIntent })}
                className="border border-dl-line p-2 bg-white"
                data-testid="select-intent"
              >
                <option value="TREASURY_FUND">TREASURY_FUND — fund treasury</option>
                <option value="AXUSD_MINT">AXUSD_MINT — mint AXUSD on PAID</option>
                <option value="AXAU_MINT">AXAU_MINT — queue AXAU mint</option>
              </select>
            </label>
            {isMintIntent && (
              <label className="flex flex-col md:col-span-2">
                <span className="uppercase tracking-wide text-dl-muted mb-1">
                  Target Wallet (0x…) — required for mint intents
                </span>
                <input
                  type="text"
                  required
                  value={form.targetWalletAddress}
                  onChange={(e) => setForm({ ...form, targetWalletAddress: e.target.value })}
                  className="border border-dl-line p-2 bg-white"
                  data-testid="input-wallet"
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                />
              </label>
            )}
            <label className="flex flex-col md:col-span-2">
              <span className="uppercase tracking-wide text-dl-muted mb-1">Buyer Email (optional)</span>
              <input
                type="email"
                value={form.buyerEmail}
                onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })}
                className="border border-dl-line p-2 bg-white"
                data-testid="input-buyer-email"
                placeholder="receipts@example.com"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="border border-dl-navy bg-dl-navy text-white px-4 py-2 uppercase tracking-wide disabled:opacity-50"
              data-testid="button-create-deposit"
            >
              {submitting ? 'Submitting…' : pendingKey ? 'Retry Submit' : 'Create Checkout Session'}
            </button>
            {(pendingKey || result || submitError) && (
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="border border-dl-line px-4 py-2 uppercase tracking-wide disabled:opacity-50"
                data-testid="button-reset-form"
              >
                Start Over
              </button>
            )}
            <span className="text-dl-muted">
              Min $1 · Max $10,000 · Idempotency key is reused on retry; "Start Over" begins a new attempt.
            </span>
          </div>
          {pendingKey && (
            <div className="mt-2 text-dl-muted break-all">
              Attempt key: <span className="text-dl-ink">{pendingKey}</span>
            </div>
          )}

          {submitError && (
            <div className="mt-4 border border-dl-line bg-dl-bg-alt p-3 text-dl-ink" data-testid="text-submit-error">
              <div className="uppercase tracking-wide text-dl-muted mb-1">Error</div>
              <div className="break-all">{submitError}</div>
            </div>
          )}

          {result && (
            <div className="mt-4 border border-dl-line p-3" data-testid="text-submit-result">
              <div className="uppercase tracking-wide text-dl-muted mb-2">Checkout session created</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div><span className="text-dl-muted">Deposit ID:</span> {result.depositId}</div>
                <div><span className="text-dl-muted">Status:</span> {result.status}</div>
                <div className="break-all"><span className="text-dl-muted">Session:</span> {result.sessionId}</div>
                <div className="break-all"><span className="text-dl-muted">Account:</span> {result.stripeAccountId ?? '—'}</div>
              </div>
              {result.checkoutUrl && (
                <div className="mt-3">
                  <a
                    href={result.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border border-dl-navy bg-dl-navy text-white px-4 py-2 uppercase tracking-wide inline-block"
                    data-testid="link-checkout"
                  >
                    Open Stripe Checkout →
                  </a>
                </div>
              )}
            </div>
          )}
        </form>

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
    </OperatorConsoleLayout>
  );
}
