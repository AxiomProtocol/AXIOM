import type { GetServerSideProps } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import { requireOperatorCookie } from '../../../lib/capinfra/operatorAuth';
import { listStuckPending } from '../../../lib/property/stuckPaymentResolver';

interface Row {
  id: string;
  tier: string;
  addressRaw: string;
  buyerWallet: string | null;
  buyerEmail: string | null;
  createdAt: string;
  amountPaidCents: number | null;
  ageMinutes: number;
}

interface Props {
  rows: Row[];
  loadError: string | null;
  minPendingAgeMinutes: number;
  maxPendingAgeHours: number;
}

const MIN_AGE = parseInt(process.env.STUCK_PAYMENT_MIN_AGE_MINUTES ?? '15', 10) || 15;
const MAX_AGE = parseInt(process.env.STUCK_PAYMENT_MAX_AGE_HOURS ?? '72', 10) || 72;

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  try {
    const rows = await listStuckPending({ limit: 100 });
    const now = Date.now();
    return {
      props: {
        loadError: null,
        minPendingAgeMinutes: MIN_AGE,
        maxPendingAgeHours: MAX_AGE,
        rows: rows.map((r) => {
          const created = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt);
          return {
            id: r.id,
            tier: r.tier as string,
            addressRaw: r.addressRaw,
            buyerWallet: r.buyerWallet,
            buyerEmail: r.buyerEmail,
            createdAt: created.toISOString(),
            amountPaidCents: r.amountPaidCents,
            ageMinutes: Math.floor((now - created.getTime()) / 60_000),
          };
        }),
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.error('[operator/property-reports/stuck] failed to list:', msg);
    return {
      props: {
        rows: [],
        loadError: msg,
        minPendingAgeMinutes: MIN_AGE,
        maxPendingAgeHours: MAX_AGE,
      },
    };
  }
};

export default function StuckPropertyPaymentsPage({
  rows,
  loadError,
  minPendingAgeMinutes,
  maxPendingAgeHours,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [txInputs, setTxInputs] = useState<Record<string, string>>({});

  async function postAction(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const r = await fetch('/api/operator/property-reports/stuck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMessage(`Error: ${json?.error ?? r.statusText}`);
      } else if (body.mode === 'sweep') {
        const s = json.summary ?? {};
        setMessage(
          `Sweep complete — scanned ${s.scanned ?? 0}, resolved ${s.resolved?.length ?? 0}, ` +
            `expired ${s.expired?.length ?? 0}, errors ${s.errors?.length ?? 0}.`,
        );
      } else {
        setMessage('Done. Reload to see latest state.');
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'request failed'}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <DesignLawLayout>
      <div className="py-8">
        <div className="mb-4">
          <Link href="/operator" className="text-sm underline">← Back to console</Link>
        </div>
        <h1 className="text-2xl font-serif mb-2">Stuck Property-Report Payments</h1>
        <p className="text-sm text-dl-muted font-mono mb-4">
          Pending property-report rows older than {minPendingAgeMinutes} minute(s)
          with a recorded buyer wallet. The scheduler runs the same resolver
          automatically; this console exposes manual sweep + per-row actions.
          Rows older than {maxPendingAgeHours} hours with no matching on-chain
          transfer are auto-expired.
        </p>

        {loadError && (
          <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-4 font-mono text-xs">
            <div className="font-serif text-sm text-dl-navy mb-1">Operational notice</div>
            <div className="text-dl-ink">
              Could not load pending list. ref: {loadError}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => postAction({ mode: 'sweep' })}
            className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1 hover:bg-dl-muted/10 disabled:opacity-50"
          >
            {busy ? 'Working…' : 'Run resolver sweep'}
          </button>
          <Link
            href="/operator/property-reports/stuck"
            className="text-xs uppercase tracking-wide border border-dl-border px-3 py-1 hover:bg-dl-muted/10"
          >
            Reload
          </Link>
          {message && <span className="text-xs font-mono text-dl-ink">{message}</span>}
        </div>

        {rows.length === 0 ? (
          <div className="border border-dl-border p-6 text-sm font-mono text-dl-muted">
            No stuck pending property reports right now.
          </div>
        ) : (
          <div className="overflow-x-auto border border-dl-border">
            <table className="w-full text-xs font-mono">
              <thead className="bg-dl-muted/10">
                <tr className="text-left">
                  <th className="px-3 py-2">Report ID</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Buyer wallet</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Age</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Manual confirm (tx hash)</th>
                  <th className="px-3 py-2">Expire</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const ageHrs = (r.ageMinutes / 60).toFixed(1);
                  const amount =
                    typeof r.amountPaidCents === 'number'
                      ? `$${(r.amountPaidCents / 100).toFixed(2)}`
                      : '—';
                  return (
                    <tr key={r.id} className="border-t border-dl-border align-top">
                      <td className="px-3 py-2 break-all">{r.id}</td>
                      <td className="px-3 py-2">{r.tier}</td>
                      <td className="px-3 py-2">{r.addressRaw}</td>
                      <td className="px-3 py-2 break-all">{r.buyerWallet ?? '—'}</td>
                      <td className="px-3 py-2 break-all">{r.buyerEmail ?? '—'}</td>
                      <td className="px-3 py-2">
                        {r.ageMinutes < 60 ? `${r.ageMinutes} min` : `${ageHrs} h`}
                      </td>
                      <td className="px-3 py-2">{amount}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col gap-1">
                          <input
                            value={txInputs[r.id] ?? ''}
                            onChange={(e) =>
                              setTxInputs({ ...txInputs, [r.id]: e.target.value })
                            }
                            placeholder="0x…"
                            className="border border-dl-border px-2 py-1 w-72 font-mono"
                          />
                          <button
                            type="button"
                            disabled={busy || !(txInputs[r.id] ?? '').trim()}
                            onClick={() =>
                              postAction({
                                mode: 'resolve',
                                reportId: r.id,
                                txHash: (txInputs[r.id] ?? '').trim(),
                              })
                            }
                            className="text-[10px] uppercase tracking-wide border border-dl-border px-2 py-1 self-start disabled:opacity-50"
                          >
                            Confirm payment
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => postAction({ mode: 'expire', reportId: r.id })}
                          className="text-[10px] uppercase tracking-wide border border-red-700 text-red-700 px-2 py-1 disabled:opacity-50"
                        >
                          Expire
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
