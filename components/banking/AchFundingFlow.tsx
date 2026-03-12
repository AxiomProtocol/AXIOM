import { useEffect, useState } from 'react';
import { X, Loader2, CheckCircle, Trash2, Plus } from 'lucide-react';

interface Counterparty {
  id: string;
  attributes: {
    name: string;
    routingNumber: string;
    maskedAccountNumber?: string;
    accountType?: string;
    status?: string;
    createdAt?: string;
  };
}

interface AchFundingFlowProps {
  customerName?: string;
  onClose: () => void;
  onLinked?: () => void;
}

type View = 'list' | 'add';

export function AchFundingFlow({ customerName, onClose, onLinked }: AchFundingFlowProps) {
  const [view, setView] = useState<View>('list');
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: customerName ?? '',
    routingNumber: '',
    accountNumber: '',
    confirmAccountNumber: '',
    accountType: 'Checking',
    holderType: 'Person',
  });

  useEffect(() => {
    fetchCounterparties();
  }, []);

  async function fetchCounterparties() {
    try {
      setLoading(true);
      const res = await fetch('/api/unit/counterparty');
      const json = await res.json();
      if (res.ok) setCounterparties(json.counterparties ?? []);
    } catch {
      // silently ignore list errors
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (form.accountNumber !== form.confirmAccountNumber) {
      setError('Account numbers do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/unit/counterparty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          routingNumber: form.routingNumber,
          accountNumber: form.accountNumber,
          accountType: form.accountType,
          holderType: form.holderType,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to link account.');

      setSuccess(true);
      await fetchCounterparties();
      if (onLinked) onLinked();
      setTimeout(() => {
        setSuccess(false);
        setView('list');
        setForm({ name: customerName ?? '', routingNumber: '', accountNumber: '', confirmAccountNumber: '', accountType: 'Checking', holderType: 'Person' });
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to link account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    setRemoving(id);
    try {
      await fetch(`/api/unit/counterparty?id=${id}`, { method: 'DELETE' });
      setCounterparties((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    } finally {
      setRemoving(null);
    }
  }

  const inputClass = 'w-full border border-dl-border px-3 py-2 text-sm font-dl-mono bg-white focus:outline-none focus:border-dl-navy';
  const labelClass = 'block text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-1';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg border border-dl-border flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dl-border flex-shrink-0">
          <div>
            <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-0.5">
              {view === 'list' ? 'Linked Bank Accounts' : 'Link a Bank Account'}
            </p>
            <h2 className="text-lg font-dl-serif text-dl-navy">ACH Funding</h2>
          </div>
          <button onClick={onClose} className="text-dl-muted hover:text-dl-navy ml-4">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {view === 'list' && (
            <div className="p-6 space-y-4">
              {loading ? (
                <div className="flex items-center gap-2 text-dl-muted font-dl-mono text-sm py-6 justify-center">
                  <Loader2 size={14} className="animate-spin" /> Loading linked accounts...
                </div>
              ) : counterparties.length === 0 ? (
                <div className="border border-dl-border p-6 text-center">
                  <p className="text-sm font-dl-mono text-dl-muted mb-4">No external bank accounts linked yet.</p>
                  <p className="text-xs font-dl-mono text-dl-muted">
                    Link an account to fund your Axiom banking account via ACH transfer.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {counterparties.map((cp) => (
                    <div key={cp.id} className="border border-dl-border p-4 flex items-start justify-between">
                      <div>
                        <p className="text-sm font-dl-mono text-dl-navy font-medium">{cp.attributes.name}</p>
                        <p className="text-xs font-dl-mono text-dl-muted mt-0.5">
                          {cp.attributes.accountType ?? 'Checking'} · Routing {cp.attributes.routingNumber}
                          {cp.attributes.maskedAccountNumber ? ` · ${cp.attributes.maskedAccountNumber}` : ''}
                        </p>
                        {cp.attributes.status && (
                          <span className={`inline-block mt-1 text-xs font-dl-mono uppercase px-2 py-0.5 border ${
                            cp.attributes.status === 'Active'
                              ? 'border-dl-forest text-dl-forest'
                              : 'border-dl-muted text-dl-muted'
                          }`}>
                            {cp.attributes.status}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemove(cp.id)}
                        disabled={removing === cp.id}
                        className="text-dl-muted hover:text-red-500 ml-4 flex-shrink-0"
                        title="Remove"
                      >
                        {removing === cp.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setView('add')}
                className="w-full flex items-center justify-center gap-2 border border-dl-navy text-dl-navy text-sm font-dl-mono px-4 py-2.5 hover:bg-dl-navy hover:text-white transition-colors"
              >
                <Plus size={14} /> Link New Bank Account
              </button>
            </div>
          )}

          {view === 'add' && (
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {success && (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-3">
                  <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                  <p className="text-sm font-dl-mono text-green-700">Bank account linked successfully.</p>
                </div>
              )}
              {error && (
                <div className="bg-red-50 border border-red-200 px-4 py-3">
                  <p className="text-sm font-dl-mono text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className={labelClass}>Account Holder Name</label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Name on bank account"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Account Type</label>
                  <select
                    className={inputClass}
                    value={form.accountType}
                    onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                  >
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Loan">Loan</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Account Owner</label>
                  <select
                    className={inputClass}
                    value={form.holderType}
                    onChange={(e) => setForm({ ...form, holderType: e.target.value })}
                  >
                    <option value="Person">Individual</option>
                    <option value="Business">Business</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Routing Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{9}"
                  maxLength={9}
                  className={inputClass}
                  value={form.routingNumber}
                  onChange={(e) => setForm({ ...form, routingNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="9-digit ABA routing number"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Account Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="Bank account number"
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Confirm Account Number</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  value={form.confirmAccountNumber}
                  onChange={(e) => setForm({ ...form, confirmAccountNumber: e.target.value.replace(/\D/g, '') })}
                  placeholder="Re-enter account number"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setView('list'); setError(null); }}
                  className="flex-1 border border-dl-border text-dl-muted text-sm font-dl-mono px-4 py-2.5 hover:border-dl-navy hover:text-dl-navy"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 bg-dl-navy text-white text-sm font-dl-mono px-4 py-2.5 hover:opacity-90 disabled:opacity-50"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? 'Linking...' : 'Link Account'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="px-6 py-3 border-t border-dl-border bg-dl-bg flex-shrink-0">
          <p className="text-xs font-dl-mono text-dl-muted">
            Powered by Unit Finance · FDIC-insured · ACH via Federal Reserve
          </p>
        </div>
      </div>
    </div>
  );
}
