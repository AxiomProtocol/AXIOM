import { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  DesignLawLayout,
  PageShell,
  DataTable,
  SectionHeading,
  DetailGrid,
  DisclosureBlock,
  FormField,
  DLInput,
  SolidButton,
  StatusBadge,
  NexusBankingPanel,
} from '../../../components/design-law';
import type { Column } from '../../../components/design-law';
import { useWallet } from '../../../components/WalletConnect/WalletContext';

const RE_DISCLOSURE = 'All deal metrics are computed from user-supplied assumptions and are probabilistic estimates only. DSCR, cap rate, cash-on-cash, and other outputs depend on assumptions that may not reflect actual market conditions. Risk flags indicate areas requiring further review and do not constitute investment advice or a recommendation to acquire any property.';

interface Deal {
  id: string;
  deal_name: string;
  strategy: string;
  status: string;
  target_purchase_price: string | null;
  notes: string | null;
  address_normalized: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  property_type: string | null;
  sqft: number | null;
  bedrooms: number | null;
}

interface Scenario {
  id: string;
  scenario_name: string;
  is_primary: boolean;
  purchase_price: string | null;
  rehab_budget: string | null;
  arv_estimate: string | null;
  monthly_rent: string | null;
  down_payment_pct: string | null;
  interest_rate: string | null;
  vacancy_pct: string | null;
  noi: string | null;
  cap_rate: string | null;
  cash_on_cash: string | null;
  dscr: string | null;
  monthly_cash_flow: string | null;
  annual_cash_flow: string | null;
  computed_at: string | null;
}

interface RiskFlag {
  scenario_id: string;
  flag_type: string;
  severity: string;
  message: string;
  is_resolved: boolean;
}

interface Decision {
  id: string;
  decided_by: string | null;
  decision: string;
  rationale: string | null;
  decided_at: string;
}

interface ContractEntityMeta {
  id: string;
  currentStatus: string;
  version: number;
  updatedAt: string;
}

type AssumptionKey =
  | 'purchase_price' | 'rehab_budget' | 'arv_estimate' | 'monthly_rent'
  | 'down_payment_pct' | 'interest_rate' | 'loan_term_years' | 'closing_cost_pct'
  | 'vacancy_pct' | 'property_mgmt_pct' | 'annual_insurance' | 'annual_taxes'
  | 'annual_capex' | 'annual_maintenance' | 'hold_period_months' | 'appreciation_pct';

type AssumptionState = Record<AssumptionKey, string>;

function fmtCurrency(v: string | null | undefined): string {
  if (!v) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtPct(v: string | null | undefined, decimals = 2): string {
  if (!v) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return (n * 100).toFixed(decimals) + '%';
}

function fmtNum(v: string | null | undefined, decimals = 2): string {
  if (!v) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return '—';
  return n.toFixed(decimals);
}

const ASSUMPTION_FIELDS: Array<[string, AssumptionKey]> = [
  ['Purchase Price', 'purchase_price'],
  ['Rehab Budget', 'rehab_budget'],
  ['ARV Estimate', 'arv_estimate'],
  ['Monthly Rent', 'monthly_rent'],
  ['Down Payment %', 'down_payment_pct'],
  ['Interest Rate %', 'interest_rate'],
  ['Loan Term (yrs)', 'loan_term_years'],
  ['Closing Cost %', 'closing_cost_pct'],
  ['Vacancy %', 'vacancy_pct'],
  ['Mgmt Fee %', 'property_mgmt_pct'],
  ['Annual Insurance', 'annual_insurance'],
  ['Annual Taxes', 'annual_taxes'],
  ['Annual CapEx', 'annual_capex'],
  ['Annual Maint.', 'annual_maintenance'],
  ['Hold Period (mo)', 'hold_period_months'],
  ['Appreciation %', 'appreciation_pct'],
];

const DEFAULT_ASSUMPTIONS: AssumptionState = {
  purchase_price: '',
  rehab_budget: '',
  arv_estimate: '',
  monthly_rent: '',
  down_payment_pct: '20',
  interest_rate: '7',
  loan_term_years: '30',
  closing_cost_pct: '3',
  vacancy_pct: '5',
  property_mgmt_pct: '10',
  annual_insurance: '',
  annual_taxes: '',
  annual_capex: '',
  annual_maintenance: '',
  hold_period_months: '60',
  appreciation_pct: '3',
};

export default function DealWorkspace() {
  const router = useRouter();
  const { id } = router.query;
  const { walletState } = useWallet();

  const [deal, setDeal] = useState<Deal | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);

  const [scenarioName, setScenarioName] = useState('');
  const [scenarioCreating, setScenarioCreating] = useState(false);
  const [scenarioError, setScenarioError] = useState<string | null>(null);

  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [assumptions, setAssumptions] = useState<AssumptionState>(DEFAULT_ASSUMPTIONS);
  const [assumptionsSaving, setAssumptionsSaving] = useState(false);
  const [assumptionsError, setAssumptionsError] = useState<string | null>(null);
  const [assumptionsSaved, setAssumptionsSaved] = useState(false);

  const [decisionText, setDecisionText] = useState('');
  const [decisionRationale, setDecisionRationale] = useState('');
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);
  const [contractMeta, setContractMeta] = useState<ContractEntityMeta | null>(null);
  const [contractTargetStatus, setContractTargetStatus] = useState('under_review');
  const [contractStatusError, setContractStatusError] = useState<string | null>(null);
  const [contractStatusSaving, setContractStatusSaving] = useState(false);

  const loadDeal = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/re/deals/${id}/underwriting`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setErrorMsg(json.error?.message || 'Deal not found.');
      } else {
        setDeal(json.data.deal);
        setScenarios(json.data.scenarios || []);
        setRiskFlags(json.data.risk_flags || []);
        setDecisions(json.data.recent_decisions || []);
        setAsOf(json.meta?.as_of || null);
        setConfidence(json.meta?.confidence ?? null);
        if (json.data.scenarios?.length > 0) {
          setSelectedScenarioId((prev) => prev || json.data.scenarios[0].id);
        }

        const contractRes = await fetch(`/api/real-estate/deals/${id}/contract-entity`);
        const contractJson = await contractRes.json();
        if (contractRes.ok && !contractJson.error) {
          setContractMeta({
            id: contractJson.id,
            currentStatus: contractJson.currentStatus,
            version: Number(contractJson.version || 1),
            updatedAt: contractJson.updatedAt,
          });
        } else {
          setContractMeta(null);
        }
      }
    } catch {
      setErrorMsg('Network error loading deal.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleContractStatusUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contractMeta || !id) return;

    setContractStatusSaving(true);
    setContractStatusError(null);
    try {
      const requestId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

      const response = await fetch(`/api/contracts/v1/entities/${contractMeta.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          idempotencyKey: `${contractMeta.id}:${contractTargetStatus}:${Date.now()}`,
          concurrency: { version: contractMeta.version },
          reasonCode: 'status_transition_requested',
          payload: {
            entity: {
              id: contractMeta.id,
              domain: 'real_estate',
              entityType: 'deal',
            },
            toStatus: contractTargetStatus,
            substatus: deal?.status || null,
          },
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        setContractStatusError(json?.message || json?.error || 'Failed to update contract status');
        return;
      }

      setContractMeta((prev) => prev
        ? {
            ...prev,
            currentStatus: json.current_status || contractTargetStatus,
            version: Number(json.version || prev.version + 1),
            updatedAt: json.updated_at || prev.updatedAt,
          }
        : prev);
      await loadDeal();
    } catch {
      setContractStatusError('Network error updating status.');
    } finally {
      setContractStatusSaving(false);
    }
  };

  useEffect(() => {
    loadDeal();
  }, [id]);

  const handleRecompute = async () => {
    if (!id) return;
    setRecomputing(true);
    setRecomputeMsg(null);
    try {
      const res = await fetch(`/api/re/deals/${id}/recompute`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok || json.error) {
        setRecomputeMsg(json.error?.message || 'Recompute failed.');
      } else {
        setRecomputeMsg(`Computed ${json.data.scenarios_computed} scenario(s).`);
        await loadDeal();
      }
    } catch {
      setRecomputeMsg('Network error during recompute.');
    } finally {
      setRecomputing(false);
    }
  };

  const handleCreateScenario = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !scenarioName.trim()) return;
    setScenarioCreating(true);
    setScenarioError(null);
    try {
      const res = await fetch(`/api/re/deals/${id}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_name: scenarioName.trim(),
          is_primary: scenarios.length === 0,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setScenarioError(json.error?.message || 'Failed to create scenario.');
      } else {
        setScenarioName('');
        await loadDeal();
        setSelectedScenarioId(json.data.id);
      }
    } catch {
      setScenarioError('Network error creating scenario.');
    } finally {
      setScenarioCreating(false);
    }
  };

  const handleSaveAssumptions = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !selectedScenarioId) return;
    setAssumptionsSaving(true);
    setAssumptionsError(null);
    setAssumptionsSaved(false);
    try {
      const toNum = (v: string) => v ? parseFloat(v) : null;
      const toInt = (v: string) => v ? parseInt(v, 10) : null;
      const res = await fetch(`/api/re/deals/${id}/assumptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: selectedScenarioId,
          purchase_price: toNum(assumptions.purchase_price),
          rehab_budget: toNum(assumptions.rehab_budget),
          arv_estimate: toNum(assumptions.arv_estimate),
          down_payment_pct: toNum(assumptions.down_payment_pct),
          interest_rate: toNum(assumptions.interest_rate),
          loan_term_years: toInt(assumptions.loan_term_years),
          closing_cost_pct: toNum(assumptions.closing_cost_pct),
          monthly_rent: toNum(assumptions.monthly_rent),
          vacancy_pct: toNum(assumptions.vacancy_pct),
          property_mgmt_pct: toNum(assumptions.property_mgmt_pct),
          annual_insurance: toNum(assumptions.annual_insurance),
          annual_taxes: toNum(assumptions.annual_taxes),
          annual_capex: toNum(assumptions.annual_capex),
          annual_maintenance: toNum(assumptions.annual_maintenance),
          hold_period_months: toInt(assumptions.hold_period_months),
          appreciation_pct: toNum(assumptions.appreciation_pct),
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setAssumptionsError(json.error?.message || 'Failed to save assumptions.');
      } else {
        setAssumptionsSaved(true);
      }
    } catch {
      setAssumptionsError('Network error saving assumptions.');
    } finally {
      setAssumptionsSaving(false);
    }
  };

  const handleDecision = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!id || !decisionText.trim()) return;
    setDecisionSubmitting(true);
    setDecisionError(null);
    try {
      const res = await fetch(`/api/re/deals/${id}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionText.trim(),
          rationale: decisionRationale.trim() || null,
          decided_by: walletState.address || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        setDecisionError(json.error?.message || 'Failed to record decision.');
      } else {
        setDecisionText('');
        setDecisionRationale('');
        await loadDeal();
      }
    } catch {
      setDecisionError('Network error recording decision.');
    } finally {
      setDecisionSubmitting(false);
    }
  };

  const scenarioColumns: Column<Scenario>[] = [
    {
      key: 'name',
      header: 'Scenario',
      render: (r) => (
        <button
          onClick={() => setSelectedScenarioId(r.id)}
          className={`text-left underline ${selectedScenarioId === r.id ? 'text-dl-navy font-semibold' : 'text-dl-gray'}`}
        >
          {r.scenario_name}{r.is_primary ? ' (primary)' : ''}
        </button>
      ),
    },
    { key: 'purchase_price', header: 'Purchase', align: 'right', render: (r) => fmtCurrency(r.purchase_price) },
    { key: 'arv_estimate', header: 'ARV', align: 'right', render: (r) => fmtCurrency(r.arv_estimate) },
    { key: 'monthly_rent', header: 'Mo. Rent', align: 'right', render: (r) => fmtCurrency(r.monthly_rent) },
    { key: 'noi', header: 'NOI', align: 'right', render: (r) => fmtCurrency(r.noi) },
    { key: 'cap_rate', header: 'Cap Rate', align: 'right', render: (r) => fmtPct(r.cap_rate) },
    { key: 'cash_on_cash', header: 'CoC', align: 'right', render: (r) => fmtPct(r.cash_on_cash) },
    { key: 'dscr', header: 'DSCR', align: 'right', render: (r) => fmtNum(r.dscr) },
    {
      key: 'computed_at',
      header: 'Computed',
      render: (r) => r.computed_at ? new Date(r.computed_at).toLocaleDateString() : '—',
    },
  ];

  const flagColumns: Column<RiskFlag>[] = [
    {
      key: 'severity',
      header: 'Severity',
      render: (r) => <StatusBadge status={r.severity} />,
    },
    {
      key: 'message',
      header: 'Description',
      render: (r) => <span className="text-sm text-dl-gray">{r.message}</span>,
    },
  ];

  const decisionColumns: Column<Decision>[] = [
    { key: 'decision', header: 'Decision', render: (r) => r.decision },
    {
      key: 'rationale',
      header: 'Rationale',
      render: (r) => <span className="text-dl-gray">{r.rationale || '—'}</span>,
    },
    {
      key: 'decided_by',
      header: 'By',
      render: (r) =>
        r.decided_by ? `${r.decided_by.slice(0, 6)}...${r.decided_by.slice(-4)}` : '—',
    },
    {
      key: 'decided_at',
      header: 'Date',
      render: (r) => new Date(r.decided_at).toLocaleDateString(),
    },
  ];

  if (loading) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-12 text-sm text-dl-gray">Loading deal workspace...</div>
      </DesignLawLayout>
    );
  }

  if (errorMsg || !deal) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <p className="text-sm text-dl-error mb-4">{errorMsg || 'Deal not found.'}</p>
          <Link href="/re" className="text-sm text-dl-navy underline">Back to Property Search</Link>
        </div>
      </DesignLawLayout>
    );
  }

  const selectedScenario = scenarios.find((s: Scenario) => s.id === selectedScenarioId);

  return (
    <DesignLawLayout>
      <Head>
        <title>{deal.deal_name} | Deal Workspace | Axiom Protocol</title>
        <meta name="description" content="Deal analysis workspace for real estate underwriting." />
      </Head>
      <PageShell
        title={deal.deal_name}
        subtitle={[deal.address_normalized, deal.city, deal.state].filter(Boolean).join(', ')}
        timestamp={asOf || undefined}
        timestampLabel="Data as of"
      >
        <div className="mb-4 flex items-center gap-4 flex-wrap">
          <Link href="/re" className="text-xs text-dl-navy underline">Back to Search</Link>
          {confidence !== null && (
            <span className="text-xs text-dl-gray font-dl-mono">
              Confidence: {(confidence * 100).toFixed(0)}%
            </span>
          )}
          <StatusBadge status={deal.status} />
        </div>

        <SectionHeading>Deal Overview</SectionHeading>
        <DetailGrid
          left={[
            { label: 'Strategy', value: deal.strategy.toUpperCase(), mono: false },
            { label: 'Status', value: deal.status },
            { label: 'Target Price', value: deal.target_purchase_price ? fmtCurrency(deal.target_purchase_price) : '—' },
            { label: 'Property Type', value: deal.property_type, mono: false },
          ]}
          right={[
            { label: 'Address', value: deal.address_normalized, mono: false },
            { label: 'City / State', value: [deal.city, deal.state].filter(Boolean).join(', '), mono: false },
            { label: 'Sq Ft', value: deal.sqft ? deal.sqft.toLocaleString() : null },
            { label: 'Bedrooms', value: deal.bedrooms },
          ]}
        />

        {contractMeta && (
          <form onSubmit={handleContractStatusUpdate} className="mt-4 mb-8 border border-dl-border bg-dl-bg-alt p-4 max-w-xl">
            <SectionHeading>Contract Status</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <p className="text-xs text-dl-gray mb-1">Current</p>
                <StatusBadge status={contractMeta.currentStatus} />
              </div>
              <FormField label="Target Status">
                <select
                  value={contractTargetStatus}
                  onChange={(e) => setContractTargetStatus(e.target.value)}
                  className="w-full border border-dl-border bg-white px-3 py-2 text-sm"
                >
                  <option value="intake">intake</option>
                  <option value="under_review">under_review</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                  <option value="in_execution">in_execution</option>
                  <option value="completed">completed</option>
                  <option value="blocked">blocked</option>
                  <option value="archived">archived</option>
                </select>
              </FormField>
              <SolidButton type="submit" disabled={contractStatusSaving} size="sm">
                {contractStatusSaving ? 'Updating...' : 'Update Status'}
              </SolidButton>
            </div>
            {contractStatusError && <p className="text-xs text-dl-error mt-2">{contractStatusError}</p>}
          </form>
        )}

        <SectionHeading>Scenarios</SectionHeading>
        <DataTable
          columns={scenarioColumns}
          data={scenarios}
          keyExtractor={(r) => r.id}
          emptyMessage="No scenarios yet. Create one below."
        />

        <div className="mt-4 mb-6">
          <form onSubmit={handleCreateScenario} className="flex gap-3 items-end">
            <FormField label="New Scenario Name">
              <DLInput
                value={scenarioName}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setScenarioName(e.target.value)}
                placeholder="e.g. Base Case"
              />
            </FormField>
            <SolidButton type="submit" disabled={scenarioCreating || !scenarioName.trim()} size="sm">
              {scenarioCreating ? 'Creating...' : 'Add Scenario'}
            </SolidButton>
          </form>
          {scenarioError && <p className="text-xs text-dl-error mt-2">{scenarioError}</p>}
        </div>

        {selectedScenario && (
          <div className="mb-8">
            <SectionHeading>
              Assumptions — {selectedScenario.scenario_name}
            </SectionHeading>
            <form onSubmit={handleSaveAssumptions}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {ASSUMPTION_FIELDS.map(([label, key]) => (
                  <FormField key={key} label={label}>
                    <DLInput
                      type="number"
                      step="any"
                      min="0"
                      value={assumptions[key]}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setAssumptions((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                    />
                  </FormField>
                ))}
              </div>
              {assumptionsError && <p className="text-xs text-dl-error mb-2">{assumptionsError}</p>}
              {assumptionsSaved && <p className="text-xs text-dl-forest mb-2">Assumptions saved.</p>}
              <div className="flex gap-3">
                <SolidButton type="submit" disabled={assumptionsSaving}>
                  {assumptionsSaving ? 'Saving...' : 'Save Assumptions'}
                </SolidButton>
              </div>
            </form>
          </div>
        )}

        <div className="mb-8">
          <SectionHeading>Metrics</SectionHeading>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <SolidButton onClick={handleRecompute} disabled={recomputing || scenarios.length === 0}>
              {recomputing ? 'Computing...' : 'Recompute All Scenarios'}
            </SolidButton>
            {recomputeMsg && (
              <span className="text-xs text-dl-gray font-dl-mono">{recomputeMsg}</span>
            )}
          </div>

          {selectedScenario && selectedScenario.noi !== null && (
            <DetailGrid
              left={[
                { label: 'NOI (Annual)', value: fmtCurrency(selectedScenario.noi) },
                { label: 'Cap Rate', value: fmtPct(selectedScenario.cap_rate) },
                { label: 'Cash-on-Cash', value: fmtPct(selectedScenario.cash_on_cash) },
                { label: 'DSCR', value: fmtNum(selectedScenario.dscr) },
              ]}
              right={[
                { label: 'Monthly Cash Flow', value: fmtCurrency(selectedScenario.monthly_cash_flow) },
                { label: 'Annual Cash Flow', value: fmtCurrency(selectedScenario.annual_cash_flow) },
                { label: 'ARV Estimate', value: fmtCurrency(selectedScenario.arv_estimate) },
                {
                  label: 'Computed',
                  value: selectedScenario.computed_at ? new Date(selectedScenario.computed_at).toLocaleDateString() : '—',
                  mono: false,
                },
              ]}
            />
          )}
          {selectedScenario && selectedScenario.noi === null && (
            <p className="text-sm text-dl-gray">No metrics yet. Save assumptions and click Recompute.</p>
          )}
        </div>

        {riskFlags.length > 0 && (
          <div className="mb-8">
            <SectionHeading>Risk Flags ({riskFlags.length} unresolved)</SectionHeading>
            <DataTable
              columns={flagColumns}
              data={riskFlags}
              keyExtractor={(r) => `${r.scenario_id}-${r.severity}-${r.message.slice(0, 16)}`}
              emptyMessage="No active risk flags."
            />
          </div>
        )}

        <div className="mb-8">
          <SectionHeading>Decision Log</SectionHeading>
          <DataTable
            columns={decisionColumns}
            data={decisions}
            keyExtractor={(r) => r.id}
            emptyMessage="No decisions recorded."
          />

          {walletState.isConnected && (
            <form onSubmit={handleDecision} className="mt-4 border border-dl-border bg-dl-bg-alt p-4 max-w-lg">
              <div className="grid grid-cols-1 gap-3 mb-3">
                <FormField label="Decision">
                  <DLInput
                    value={decisionText}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDecisionText(e.target.value)}
                    placeholder="e.g. approve, reject, hold, needs-review"
                    required
                  />
                </FormField>
                <FormField label="Rationale (optional)">
                  <DLInput
                    value={decisionRationale}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setDecisionRationale(e.target.value)}
                    placeholder="Brief explanation"
                  />
                </FormField>
              </div>
              {decisionError && <p className="text-xs text-dl-error mb-2">{decisionError}</p>}
              <SolidButton type="submit" disabled={decisionSubmitting || !decisionText.trim()} size="sm">
                {decisionSubmitting ? 'Recording...' : 'Record Decision'}
              </SolidButton>
            </form>
          )}
        </div>

        <div className="mb-8">
          <SectionHeading>Earnest Money & Acquisition Funding</SectionHeading>
          <NexusBankingPanel
            product="real-estate"
            context="earnest-money"
            amountLabel={deal?.target_purchase_price ? `$${Number(deal.target_purchase_price).toLocaleString()} target acquisition` : undefined}
            description="Earnest money and acquisition deposits for this deal are held in the Axiom Nexus Account at First Internet Bank — FDIC-insured institutional custody. Register your account to receive your dedicated deposit instructions. Funds are tracked against the deal and applied at closing."
            collapsible={false}
          />
        </div>

        <DisclosureBlock text={RE_DISCLOSURE} />
      </PageShell>
    </DesignLawLayout>
  );
}
