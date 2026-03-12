import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

interface Counterparty {
  id: string;
  attributes: {
    name: string;
    routingNumber: string;
    maskedAccountNumber?: string;
    accountType?: string;
  };
}

interface AchSendFlowProps {
  unitAccountId: string;
  availableBalanceCents: number;
  onClose: () => void;
  onComplete?: () => void;
}

type Direction = 'Debit' | 'Credit';

export function AchSendFlow({ unitAccountId, availableBalanceCents, onClose, onComplete }: AchSendFlowProps) {
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [direction, setDirection] = useState<Direction>('Debit');
  const [counterpartyId, setCounterpartyId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('AXIOM');

  useEffect(() => {
    fetch('/api/unit/counterparty')
      .then((r) => r.json())
      .then((json) => setCounterparties(json.counterparties ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amountCents = Math.round(parseFloat(amountStr) * 100);
    if (!amountCents || amountCents < 100) {
      setError('Minimum transfer is $1.00.');
      return;
    }
    if (!counterpartyId) {
      setError('Select a linked bank account.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/unit/payments/ach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitAccountId,
          counterpartyId,
          amountCents,
          direction,
          description: description.trim() || 'AXIOM',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Transfer failed.');
      setSuccess(true);
      if (onComplete) onComplete();
      setTimeout(onClose, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed.');
    } finally {
      setSubmitting(false);
    }
  }

  const available = (availableBalanceCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const inputClass = 'w-full border border-dl-border px-3 py-2 text-sm font-dl-mono bg-white focus:outline-none focus:border-dl-navy';
  const labelClass = 'block text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md border border-dl-border flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dl-border flex-shrink-0">
          <div>
            <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-0.5">ACH Transfer</p>
            <h2 className="text-lg font-dl-serif text-dl-navy">
              {direction === 'Debit' ? 'Fund from Bank' : 'Send to Bank'}
            </h2>
          </div>
          <button onClick={onClose} className="text-dl-muted hover:text-dl-navy">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {success ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <CheckCircle size={36} className="text-dl-forest" />
              <p className="text-base font-dl-serif text-dl-navy">Transfer Submitted</p>
              <p className="text-sm font-dl-mono text-dl-muted">
                ACH transfers typically settle in 1–2 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm font-dl-mono text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className={labelClass}>Transfer Direction</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDirection('Debit')}
                    className={`flex items-center justify-center gap-2 border py-3 text-sm font-dl-mono transition-colors ${
                      direction === 'Debit'
                        ? 'border-dl-navy bg-dl-navy text-white'
                        : 'border-dl-border text-dl-muted hover:border-dl-navy hover:text-dl-navy'
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    Fund Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('Credit')}
                    className={`flex items-center justify-center gap-2 border py-3 text-sm font-dl-mono transition-colors ${
                      direction === 'Credit'
                        ? 'border-dl-navy bg-dl-navy text-white'
                        : 'border-dl-border text-dl-muted hover:border-dl-navy hover:text-dl-navy'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    Send Out
                  </button>
                </div>
                <p className="text-xs font-dl-mono text-dl-muted mt-2">
                  {direction === 'Debit'
                    ? 'Pull funds from your linked bank into your Axiom account.'
                    : `Push funds from your Axiom account to your bank. Available: ${available}`}
                </p>
              </div>

              <div>
                <label className={labelClass}>Linked Bank Account</label>
                {loading ? (
                  <div className="flex items-center gap-2 text-dl-muted font-dl-mono text-xs py-2">
                    <Loader2 size={12} className="animate-spin" /> Loading linked accounts...
                  </div>
                ) : counterparties.length === 0 ? (
                  <div className="border border-dl-border px-3 py-2">
                    <p className="text-xs font-dl-mono text-dl-muted">
                      No linked accounts. Use &quot;Fund Account via ACH&quot; to link a bank first.
                    </p>
                  </div>
                ) : (
                  <select
                    className={inputClass}
                    value={counterpartyId}
                    onChange={(e) => setCounterpartyId(e.target.value)}
                    required
                  >
                    <option value="">Select account...</option>
                    {counterparties.map((cp) => (
                      <option key={cp.id} value={cp.id}>
                        {cp.attributes.name} — {cp.attributes.accountType ?? 'Checking'} ···{cp.attributes.routingNumber.slice(-4)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className={labelClass}>Amount (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-dl-mono text-dl-muted">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    className={`${inputClass} pl-7`}
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Memo (max 10 chars)</label>
                <input
                  type="text"
                  maxLength={10}
                  className={inputClass}
                  value={description}
                  onChange={(e) => setDescription(e.target.value.toUpperCase())}
                  placeholder="AXIOM"
                />
                <p className="text-xs font-dl-mono text-dl-muted mt-1">
                  Appears on the counterparty bank statement.
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 border border-dl-border text-dl-muted text-sm font-dl-mono py-2.5 hover:border-dl-navy hover:text-dl-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading || counterparties.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-dl-navy text-white text-sm font-dl-mono py-2.5 hover:opacity-90 disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? 'Processing...' : direction === 'Debit' ? 'Fund Account' : 'Send Transfer'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-3 border-t border-dl-border bg-dl-bg flex-shrink-0">
          <p className="text-xs font-dl-mono text-dl-muted">
            ACH via Federal Reserve · Settles 1–2 business days · Powered by Unit Finance
          </p>
        </div>
      </div>
    </div>
  );
}
