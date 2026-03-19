import { useState, useEffect, useCallback } from 'react';

interface VerifiedOutcomesPanelProps {
  dealId: string;
  scenarioId?: string | null;
}

interface Outcome {
  id: string;
  deal_id: string;
  scenario_id: string | null;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected';
  actual_rehab_cost: string;
  actual_timeline_days: number;
  actual_sale_price: string | null;
  actual_rent: string | null;
  actual_dscr: string | null;
  actual_monthly_cash_flow: string | null;
  funding_path: string | null;
  lender_path_chosen: string | null;
  submitted_by: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  meta: { dispositionType?: string; contractorName?: string } | null;
}

interface VarianceRow {
  metric_key: string;
  predicted_value: string;
  actual_value: string;
  variance_value: string;
  variance_pct: string;
}

const METRIC_LABELS: Record<string, string> = {
  rehab_cost: 'Rehab Cost',
  timeline_days: 'Timeline (days)',
  sale_price: 'Sale Price / ARV',
  rent: 'Monthly Rent',
  dscr: 'DSCR',
  monthly_cash_flow: 'Monthly Cash Flow',
};

const DISPOSITION_OPTIONS = [
  { value: 'sale', label: 'Sale' },
  { value: 'refinance', label: 'Refinance (BRRRR)' },
  { value: 'hold', label: 'Hold (Long-term)' },
];

const FUNDING_OPTIONS = [
  { value: 'hard_money', label: 'Hard Money' },
  { value: 'private_money', label: 'Private Money' },
  { value: 'conventional', label: 'Conventional' },
  { value: 'dscr_loan', label: 'DSCR Loan' },
  { value: 'cash', label: 'All Cash' },
  { value: 'other', label: 'Other' },
];

const STATUS_LABELS: Record<string, string> = {
  submitted: 'SUBMITTED',
  under_review: 'UNDER REVIEW',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

const STATUS_COLORS: Record<string, string> = {
  submitted: 'text-dl-gold',
  under_review: 'text-dl-navy',
  approved: 'text-dl-forest',
  rejected: 'text-dl-error',
};

function fmt(val: string | number | null | undefined, prefix = '$'): string {
  if (val == null) return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  if (prefix === '$') return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (prefix === 'pct') return `${n.toFixed(2)}%`;
  return n.toFixed(4);
}

function varianceColor(pct: number): string {
  if (pct > 5) return 'text-dl-error';
  if (pct < -5) return 'text-dl-forest';
  return 'text-dl-navy';
}

export default function VerifiedOutcomesPanel({ dealId, scenarioId }: VerifiedOutcomesPanelProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [variances, setVariances] = useState<VarianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestingReview, setRequestingReview] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    actualRehabCost: '',
    actualTimelineDays: '',
    dispositionType: 'sale',
    actualSalePrice: '',
    actualRent: '',
    actualDscr: '',
    actualMonthlyCashFlow: '',
    contractorName: '',
    fundingPath: 'hard_money',
    lenderPathChosen: '',
    submittedBy: '',
  });

  const loadOutcome = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/verified-outcomes?dealId=${dealId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load outcome');
      setOutcome(json.outcome || null);
      setVariances(json.variances || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => { loadOutcome(); }, [loadOutcome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.actualRehabCost || !form.actualTimelineDays) {
      setError('Actual rehab cost and timeline are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const body: any = {
        dealId,
        scenarioId: scenarioId || null,
        actualRehabCost: parseFloat(form.actualRehabCost),
        actualTimelineDays: parseInt(form.actualTimelineDays, 10),
        dispositionType: form.dispositionType,
        fundingPath: form.fundingPath || null,
        lenderPathChosen: form.lenderPathChosen || null,
        contractorName: form.contractorName || null,
        submittedBy: form.submittedBy || 'operator',
      };
      if (form.actualSalePrice) body.actualSalePrice = parseFloat(form.actualSalePrice);
      if (form.actualRent) body.actualRent = parseFloat(form.actualRent);
      if (form.actualDscr) body.actualDscr = parseFloat(form.actualDscr);
      if (form.actualMonthlyCashFlow) body.actualMonthlyCashFlow = parseFloat(form.actualMonthlyCashFlow);

      const res = await fetch('/api/verified-outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      setSuccess('Outcome recorded. Variance analysis computed.');
      setShowForm(false);
      await loadOutcome();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestReview = async () => {
    if (!outcome) return;
    setRequestingReview(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/verified-outcomes/${outcome.id}/set-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'under_review' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to request review');
      setSuccess('Outcome submitted to the verification review queue.');
      await loadOutcome();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRequestingReview(false);
    }
  };

  const setFormField = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  if (loading) {
    return (
      <div className="border border-dl-border p-8 text-center">
        <p className="font-dl-mono text-sm text-dl-muted">Loading verified outcome data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border border-dl-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-dl-serif text-lg text-dl-navy">Verified Execution Record</h2>
            <p className="font-dl-mono text-xs text-dl-muted mt-0.5">
              Layer 2 — Post-deal variance accountability and operator learning loop
            </p>
          </div>
          {!outcome && !showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-dl-navy text-white px-4 py-2 font-dl-mono text-sm"
            >
              Record Outcome
            </button>
          )}
          {outcome && outcome.status === 'submitted' && (
            <button
              onClick={handleRequestReview}
              disabled={requestingReview}
              className="border border-dl-navy text-dl-navy px-4 py-2 font-dl-mono text-sm disabled:opacity-50"
            >
              {requestingReview ? 'Submitting...' : 'Request Verification'}
            </button>
          )}
        </div>

        {error && (
          <div className="border border-red-300 bg-red-50 p-3 mb-4">
            <p className="font-dl-mono text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="border border-green-300 bg-green-50 p-3 mb-4">
            <p className="font-dl-mono text-sm text-green-700">{success}</p>
          </div>
        )}

        {!outcome && !showForm && (
          <div className="border border-dl-border p-8 text-center">
            <p className="font-dl-mono text-sm text-dl-muted mb-2">No outcome recorded for this deal yet.</p>
            <p className="font-dl-mono text-xs text-dl-muted">
              When the deal closes, record the actual results to generate a variance analysis against the original predictions.
            </p>
          </div>
        )}

        {outcome && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 border border-dl-border p-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-1">Status</p>
                <p className={`font-dl-mono font-bold text-sm ${STATUS_COLORS[outcome.status] || 'text-dl-navy'}`}>
                  {STATUS_LABELS[outcome.status] || outcome.status.toUpperCase()}
                </p>
              </div>
              <div className="w-px h-10 bg-dl-border" />
              <div>
                <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-1">Submitted</p>
                <p className="font-dl-mono text-sm text-dl-navy">
                  {new Date(outcome.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              {outcome.reviewed_at && (
                <>
                  <div className="w-px h-10 bg-dl-border" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-1">Reviewed</p>
                    <p className="font-dl-mono text-sm text-dl-navy">
                      {new Date(outcome.reviewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </>
              )}
              <div className="w-px h-10 bg-dl-border" />
              <div>
                <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-1">Disposition</p>
                <p className="font-dl-mono text-sm text-dl-navy capitalize">
                  {outcome.meta?.dispositionType || '—'}
                </p>
              </div>
              {outcome.meta?.contractorName && (
                <>
                  <div className="w-px h-10 bg-dl-border" />
                  <div>
                    <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-1">Contractor</p>
                    <p className="font-dl-mono text-sm text-dl-navy">{outcome.meta.contractorName}</p>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <ActualMetricBox label="Actual Rehab Cost" value={fmt(outcome.actual_rehab_cost)} />
              <ActualMetricBox label="Actual Timeline" value={`${outcome.actual_timeline_days} days`} />
              {outcome.actual_sale_price && <ActualMetricBox label="Sale Price" value={fmt(outcome.actual_sale_price)} />}
              {outcome.actual_rent && <ActualMetricBox label="Monthly Rent" value={`${fmt(outcome.actual_rent)}/mo`} />}
              {outcome.actual_dscr && <ActualMetricBox label="DSCR" value={Number(outcome.actual_dscr).toFixed(2)} />}
              {outcome.actual_monthly_cash_flow && <ActualMetricBox label="Monthly Cash Flow" value={fmt(outcome.actual_monthly_cash_flow)} />}
            </div>

            {outcome.funding_path && (
              <div className="border border-dl-border p-3">
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-1">Funding Path</p>
                    <p className="font-dl-mono text-sm text-dl-navy capitalize">{outcome.funding_path.replace(/_/g, ' ')}</p>
                  </div>
                  {outcome.lender_path_chosen && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-1">Lender</p>
                      <p className="font-dl-mono text-sm text-dl-navy">{outcome.lender_path_chosen}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {variances.length > 0 && (
        <div className="border border-dl-border p-6">
          <h3 className="font-dl-serif text-base text-dl-navy mb-4">Predicted vs. Actual Variance Analysis</h3>
          <div className="overflow-x-auto">
            <table className="w-full font-dl-mono text-sm">
              <thead>
                <tr className="border-b border-dl-border">
                  <th className="text-left py-2 pr-4 text-xs uppercase tracking-wider text-dl-muted">Metric</th>
                  <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-dl-muted">Predicted</th>
                  <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-dl-muted">Actual</th>
                  <th className="text-right py-2 px-4 text-xs uppercase tracking-wider text-dl-muted">Variance</th>
                  <th className="text-right py-2 text-xs uppercase tracking-wider text-dl-muted">Variance %</th>
                </tr>
              </thead>
              <tbody>
                {variances.map((row) => {
                  const pct = Number(row.variance_pct);
                  const isMoney = ['rehab_cost', 'sale_price', 'rent', 'monthly_cash_flow'].includes(row.metric_key);
                  const isDay = row.metric_key === 'timeline_days';
                  const formatVal = (v: string) => {
                    const n = Number(v);
                    if (isMoney) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                    if (isDay) return `${n} days`;
                    return n.toFixed(4);
                  };
                  return (
                    <tr key={row.metric_key} className="border-b border-dl-border last:border-0">
                      <td className="py-2.5 pr-4 text-dl-navy font-medium">
                        {METRIC_LABELS[row.metric_key] || row.metric_key.replace(/_/g, ' ')}
                      </td>
                      <td className="py-2.5 px-4 text-right text-dl-muted">{formatVal(row.predicted_value)}</td>
                      <td className="py-2.5 px-4 text-right text-dl-navy">{formatVal(row.actual_value)}</td>
                      <td className="py-2.5 px-4 text-right text-dl-muted">{formatVal(row.variance_value)}</td>
                      <td className={`py-2.5 text-right font-bold ${varianceColor(pct)}`}>
                        {pct > 0 ? '+' : ''}{pct.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="font-dl-mono text-xs text-dl-muted mt-3">
            Positive variance = actual exceeded prediction. Negative variance = actual came in under prediction.
          </p>
        </div>
      )}

      {showForm && (
        <div className="border border-dl-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-dl-serif text-base text-dl-navy">Submit Verified Outcome</h3>
            <button
              onClick={() => setShowForm(false)}
              className="font-dl-mono text-xs text-dl-muted hover:text-dl-navy"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-3">Disposition</p>
              <div className="flex gap-3">
                {DISPOSITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormField('dispositionType', opt.value)}
                    className={`px-3 py-2 font-dl-mono text-xs border ${
                      form.dispositionType === opt.value
                        ? 'border-dl-navy bg-dl-navy text-white'
                        : 'border-dl-border text-dl-navy'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Actual Rehab Cost *"
                prefix="$"
                value={form.actualRehabCost}
                onChange={v => setFormField('actualRehabCost', v)}
                placeholder="45000"
              />
              <FormField
                label="Actual Timeline (days) *"
                value={form.actualTimelineDays}
                onChange={v => setFormField('actualTimelineDays', v)}
                placeholder="90"
              />
              {(form.dispositionType === 'sale' || form.dispositionType === 'refinance') && (
                <FormField
                  label={form.dispositionType === 'refinance' ? 'Refi / Appraised Value' : 'Sale Price'}
                  prefix="$"
                  value={form.actualSalePrice}
                  onChange={v => setFormField('actualSalePrice', v)}
                  placeholder="280000"
                />
              )}
              {(form.dispositionType === 'hold' || form.dispositionType === 'refinance') && (
                <FormField
                  label="Monthly Rent"
                  prefix="$"
                  value={form.actualRent}
                  onChange={v => setFormField('actualRent', v)}
                  placeholder="2200"
                />
              )}
              <FormField
                label="DSCR"
                value={form.actualDscr}
                onChange={v => setFormField('actualDscr', v)}
                placeholder="1.25"
              />
              <FormField
                label="Monthly Cash Flow"
                prefix="$"
                value={form.actualMonthlyCashFlow}
                onChange={v => setFormField('actualMonthlyCashFlow', v)}
                placeholder="450"
              />
              <FormField
                label="Contractor Name"
                value={form.contractorName}
                onChange={v => setFormField('contractorName', v)}
                placeholder="ABC Contractors LLC"
              />
              <FormField
                label="Operator Wallet / ID"
                value={form.submittedBy}
                onChange={v => setFormField('submittedBy', v)}
                placeholder="0x... or operator handle"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">Funding Path</label>
                <select
                  value={form.fundingPath}
                  onChange={e => setFormField('fundingPath', e.target.value)}
                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm text-dl-text bg-white focus:outline-none"
                >
                  {FUNDING_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <FormField
                label="Lender / Capital Partner"
                value={form.lenderPathChosen}
                onChange={v => setFormField('lenderPathChosen', v)}
                placeholder="Kiavi, CoreVest, private..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Outcome'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-dl-border text-dl-navy px-6 py-2 font-dl-mono text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function ActualMetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-dl-border p-3">
      <p className="text-xs uppercase tracking-wider text-dl-muted font-dl-mono mb-1">{label}</p>
      <p className="font-dl-mono text-base font-bold text-dl-navy">{value}</p>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  placeholder,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-dl-mono text-dl-muted uppercase mb-1">{label}</label>
      <div className="flex items-center border border-dl-border">
        {prefix && (
          <span className="px-2 font-dl-mono text-sm text-dl-muted bg-dl-bg border-r border-dl-border">{prefix}</span>
        )}
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-2 py-1.5 font-dl-mono text-sm text-dl-text bg-white focus:outline-none"
        />
      </div>
    </div>
  );
}
