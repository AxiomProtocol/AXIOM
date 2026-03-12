import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';

interface Offering {
  id: string;
  name: string;
  slug: string;
  status: string;
  offering_type: string;
  entity_type: string;
  description: string;
  investment_highlights: string[];
  target_raise: string;
  minimum_raise: string;
  maximum_raise: string;
  minimum_investment: string;
  projected_cap_rate: string;
  projected_cash_on_cash: string;
  projected_irr: string;
  projected_dscr: string;
  preferred_return: string;
  promote_split: string;
  waterfall_terms: any;
  fee_structure: any;
  hold_period_years: number;
  governance_enabled: boolean;
  settlement_mode: string;
  open_date: string;
  close_date: string;
  meta: any;
  org_name: string;
  org_legal_name: string;
  pipeline_count: string;
  subscription_count: string;
  total_committed: string;
  total_funded: string;
  deal_id: string;
  created_at: string;
}

type Tab = 'overview' | 'financials' | 'documents' | 'investors' | 'subscriptions' | 'capTable' | 'distributions' | 'reports' | 'settings';

function fmt(n: number): string {
  if (isNaN(n) || n === 0) return '$0';
  if (Math.abs(n) >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function pct(n: string | number | null): string {
  if (!n) return '—';
  const v = typeof n === 'string' ? parseFloat(n) : n;
  return isNaN(v) ? '—' : `${(v * 100).toFixed(1)}%`;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  structuring: 'bg-blue-50 text-blue-700',
  raising: 'bg-green-50 text-green-700',
  funded: 'bg-green-100 text-green-800',
  closed: 'bg-gray-200 text-gray-700',
  active: 'bg-emerald-50 text-emerald-700',
  winding_down: 'bg-orange-50 text-orange-700',
  dissolved: 'bg-red-50 text-red-700',
};

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-600',
  contacted: 'bg-blue-50 text-blue-600',
  interested: 'bg-blue-100 text-blue-700',
  softCircled: 'bg-yellow-50 text-yellow-700',
  docsPending: 'bg-orange-50 text-orange-600',
  underReview: 'bg-orange-100 text-orange-700',
  approved: 'bg-green-50 text-green-700',
  fundingPending: 'bg-green-100 text-green-700',
  funded: 'bg-green-200 text-green-800',
  closedLost: 'bg-red-50 text-red-600',
  closedWon: 'bg-green-300 text-green-900',
};

export default function OfferingBuilder() {
  const router = useRouter();
  const { id } = router.query;

  const [offering, setOffering] = useState<Offering | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [pipelineSummary, setPipelineSummary] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subSummary, setSubSummary] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [capTable, setCapTable] = useState<any[]>([]);
  const [capSummary, setCapSummary] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [editFields, setEditFields] = useState<Record<string, any>>({});

  const loadOffering = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/syndication/offerings/${id}`);
      const json = await res.json();
      if (json.success) {
        setOffering(json.offering);
        setEditFields({
          name: json.offering.name,
          status: json.offering.status,
          offering_type: json.offering.offering_type,
          entity_type: json.offering.entity_type || 'spv',
          description: json.offering.description || '',
          target_raise: json.offering.target_raise || '',
          minimum_investment: json.offering.minimum_investment || '',
          preferred_return: json.offering.preferred_return || '',
          promote_split: json.offering.promote_split || '',
          hold_period_years: json.offering.hold_period_years || '',
          governance_enabled: json.offering.governance_enabled || false,
          settlement_mode: json.offering.settlement_mode || 'offchain',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadTabData = useCallback(async (tab: Tab) => {
    if (!id) return;
    try {
      if (tab === 'investors') {
        const res = await fetch(`/api/syndication/offerings/${id}/pipeline`);
        const json = await res.json();
        if (json.success) { setPipeline(json.pipeline); setPipelineSummary(json.summary); }
      } else if (tab === 'subscriptions') {
        const [subRes, pipeRes] = await Promise.all([
          fetch(`/api/syndication/offerings/${id}/subscriptions`),
          fetch(`/api/syndication/offerings/${id}/pipeline`),
        ]);
        const subJson = await subRes.json();
        if (subJson.success) { setSubscriptions(subJson.subscriptions); setSubSummary(subJson.summary); }
        const pipeJson = await pipeRes.json();
        if (pipeJson.success) { setPipeline(pipeJson.pipeline); setPipelineSummary(pipeJson.summary); }
      } else if (tab === 'documents') {
        const res = await fetch(`/api/syndication/offerings/${id}/documents`);
        const json = await res.json();
        if (json.success) setDocuments(json.documents);
      } else if (tab === 'capTable') {
        const res = await fetch(`/api/syndication/offerings/${id}/cap-table`);
        const json = await res.json();
        if (json.success) { setCapTable(json.capTable); setCapSummary(json.summary); }
      } else if (tab === 'distributions') {
        const res = await fetch(`/api/syndication/offerings/${id}/distributions`);
        const json = await res.json();
        if (json.success) { setDistributions(json.distributions); setDistSummary(json.summary); }
      } else if (tab === 'reports') {
        const res = await fetch(`/api/syndication/offerings/${id}/reports`);
        const json = await res.json();
        if (json.success) setReports(json.reports);
      } else if (tab === 'settings') {
        const subRes = await fetch(`/api/syndication/offerings/${id}/subscriptions`);
        const subJson = await subRes.json();
        if (subJson.success) { setSubscriptions(subJson.subscriptions); setSubSummary(subJson.summary); }
      }
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => { loadOffering(); }, [loadOffering]);
  useEffect(() => { if (id) loadTabData(activeTab); }, [activeTab, id, loadTabData]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await fetch(`/api/syndication/offerings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFields),
      });
      await loadOffering();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const [showAddInvestor, setShowAddInvestor] = useState(false);
  const [investorForm, setInvestorForm] = useState({ legalName: '', email: '', accreditationStatus: 'unverified', stage: 'lead', softCircleAmount: '' });
  const [addingInvestor, setAddingInvestor] = useState(false);
  const [showAddSub, setShowAddSub] = useState(false);
  const [subForm, setSubForm] = useState({ investorProfileId: '', amount: '', shareClass: 'common', fundingMethod: 'wire', newInvestorName: '', newInvestorEmail: '' });
  const [subMode, setSubMode] = useState<'existing' | 'new'>('existing');
  const [addingSub, setAddingSub] = useState(false);
  const [syncingCap, setSyncingCap] = useState(false);
  const [sourceDeal, setSourceDeal] = useState<any>(null);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [distSummary, setDistSummary] = useState<any>(null);
  const [showCreateDist, setShowCreateDist] = useState(false);
  const [distForm, setDistForm] = useState({ distributionType: 'preferred_return', grossAmount: '', periodStart: '', periodEnd: '' });
  const [creatingDist, setCreatingDist] = useState(false);
  const [fundingRecords, setFundingRecords] = useState<any[]>([]);
  const [showReceiptForm, setShowReceiptForm] = useState<string | null>(null);
  const [receiptForm, setReceiptForm] = useState({ externalRef: '', amount: '', settlementDate: '', fundingMethod: 'wire' });
  const [recordingReceipt, setRecordingReceipt] = useState(false);
  const [closingOffering, setClosingOffering] = useState(false);

  const loadSourceDeal = useCallback(async () => {
    if (!offering?.deal_id) return;
    try {
      const res = await fetch(`/api/real-estate/deals/${offering.deal_id}/summary`);
      const json = await res.json();
      if (json.data) setSourceDeal(json.data);
    } catch {}
  }, [offering?.deal_id]);

  useEffect(() => { if (offering?.deal_id) loadSourceDeal(); }, [offering?.deal_id, loadSourceDeal]);

  const handleAddInvestor = async () => {
    if (!investorForm.legalName) return;
    setAddingInvestor(true);
    try {
      const res = await fetch('/api/syndication/investor-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...investorForm, offeringId: id }),
      });
      const json = await res.json();
      if (json.success) {
        setInvestorForm({ legalName: '', email: '', accreditationStatus: 'unverified', stage: 'lead', softCircleAmount: '' });
        setShowAddInvestor(false);
        loadTabData('investors');
      }
    } catch (err) { console.error(err); }
    finally { setAddingInvestor(false); }
  };

  const handleAddSubscription = async () => {
    if (!subForm.amount) return;
    setAddingSub(true);
    try {
      let profileId = subForm.investorProfileId;
      if (subMode === 'new' && subForm.newInvestorName) {
        const profileRes = await fetch('/api/syndication/investor-profiles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ legalName: subForm.newInvestorName, email: subForm.newInvestorEmail, offeringId: id }),
        });
        const profileJson = await profileRes.json();
        if (!profileJson.success) { setAddingSub(false); return; }
        profileId = profileJson.profileId;
        loadTabData('investors');
      }
      if (!profileId) { setAddingSub(false); return; }

      const res = await fetch(`/api/syndication/offerings/${id}/subscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investorProfileId: profileId, amount: subForm.amount, shareClass: subForm.shareClass, fundingMethod: subForm.fundingMethod }),
      });
      const json = await res.json();
      if (json.success) {
        setSubForm({ investorProfileId: '', amount: '', shareClass: 'common', fundingMethod: 'wire', newInvestorName: '', newInvestorEmail: '' });
        setShowAddSub(false);
        setSubMode('existing');
        loadTabData('subscriptions');
      }
    } catch (err) { console.error(err); }
    finally { setAddingSub(false); }
  };

  const handleSubAction = async (subscriptionId: string, status: string) => {
    try {
      await fetch(`/api/syndication/offerings/${id}/subscriptions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, status }),
      });
      loadTabData('subscriptions');
      if (status === 'funded') loadTabData('capTable');
    } catch (err) { console.error(err); }
  };

  const handleSyncCapTable = async () => {
    setSyncingCap(true);
    try {
      await fetch(`/api/syndication/offerings/${id}/sync-cap-table`, { method: 'POST' });
      loadTabData('capTable');
    } catch (err) { console.error(err); }
    finally { setSyncingCap(false); }
  };

  const handleCreateDistribution = async () => {
    if (!distForm.grossAmount) return;
    setCreatingDist(true);
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/distributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(distForm),
      });
      const json = await res.json();
      if (json.success) {
        setDistForm({ distributionType: 'preferred_return', grossAmount: '', periodStart: '', periodEnd: '' });
        setShowCreateDist(false);
        loadTabData('distributions');
      }
    } catch (err) { console.error(err); }
    finally { setCreatingDist(false); }
  };

  const handleDistAction = async (distributionId: string, status: string) => {
    try {
      await fetch(`/api/syndication/offerings/${id}/distributions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId, status }),
      });
      loadTabData('distributions');
    } catch (err) { console.error(err); }
  };

  const handleDeleteDist = async (distributionId: string) => {
    try {
      await fetch(`/api/syndication/offerings/${id}/distributions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId }),
      });
      loadTabData('distributions');
    } catch (err) { console.error(err); }
  };

  const handleRecordReceipt = async (subscriptionId: string) => {
    if (!receiptForm.amount) return;
    setRecordingReceipt(true);
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/funding-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, ...receiptForm }),
      });
      const json = await res.json();
      if (json.success) {
        setReceiptForm({ externalRef: '', amount: '', settlementDate: '', fundingMethod: 'wire' });
        setShowReceiptForm(null);
        loadTabData('subscriptions');
        loadOffering();
      }
    } catch (err) { console.error(err); }
    finally { setRecordingReceipt(false); }
  };

  const handleCloseOffering = async () => {
    if (!confirm('Close this offering? This will finalize the capital table and lock fundraising.')) return;
    setClosingOffering(true);
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/close`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        loadOffering();
        loadTabData('capTable');
      } else {
        alert(json.error || 'Failed to close offering');
      }
    } catch (err) { console.error(err); }
    finally { setClosingOffering(false); }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'financials', label: 'Financials' },
    { key: 'documents', label: 'Documents' },
    { key: 'investors', label: 'Investor Pipeline' },
    { key: 'subscriptions', label: 'Subscriptions' },
    { key: 'capTable', label: 'Capital Table' },
    { key: 'distributions', label: 'Distributions' },
    { key: 'reports', label: 'Offering Reports' },
    { key: 'settings', label: 'Settings' },
  ];

  if (loading) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="font-dl-mono text-sm text-dl-muted">Loading offering...</p>
        </div>
      </DesignLawLayout>
    );
  }

  if (!offering) {
    return (
      <DesignLawLayout>
        <div className="max-w-7xl mx-auto px-6 py-8">
          <p className="font-dl-mono text-sm text-red-700">Offering not found.</p>
        </div>
      </DesignLawLayout>
    );
  }

  const targetRaise = parseFloat(offering.target_raise || '0');
  const totalCommitted = parseFloat(offering.total_committed || '0');
  const totalFunded = parseFloat(offering.total_funded || '0');
  const raisePct = targetRaise > 0 ? Math.min(100, (totalCommitted / targetRaise) * 100) : 0;

  return (
    <DesignLawLayout>
      <Head>
        <title>{offering.name} | Syndication | AXIOM</title>
      </Head>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-2">
          <Link href="/syndication" className="font-dl-mono text-xs text-dl-muted hover:text-dl-navy">
            ← Capital Formation
          </Link>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-dl-serif text-2xl text-dl-navy">{offering.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-dl-mono text-xs text-dl-muted">
                {offering.offering_type.toUpperCase()} | {offering.entity_type?.toUpperCase() || 'SPV'}
              </p>
              {offering.deal_id && (
                <Link href={`/deal-intelligence/deal/${offering.deal_id}`} className="font-dl-mono text-xs text-dl-navy hover:underline">
                  View Source Deal
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {['Research', 'Underwriting', 'Offering Structuring', 'Capital Formation', 'Funded'].map((stage, i) => {
                const stageMap: Record<string, number> = { draft: 2, structuring: 2, raising: 3, funded: 4, active: 4, closed: 4, winding_down: 4, dissolved: 4 };
                const current = stageMap[offering.status] ?? 0;
                const isActive = i <= current;
                const isCurrent = i === current;
                return (
                  <span key={stage} className={`px-1.5 py-0.5 text-[10px] font-dl-mono ${isCurrent ? 'bg-dl-navy text-white' : isActive ? 'bg-gray-200 text-gray-600' : 'bg-gray-50 text-gray-400'}`}>
                    {stage}
                  </span>
                );
              })}
            </div>
          </div>
          <span className={`px-3 py-1 font-dl-mono text-xs ${STATUS_COLORS[offering.status] || 'bg-gray-100 text-gray-600'}`}>
            {offering.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-dl-border p-3">
            <p className="font-dl-mono text-xs text-dl-muted uppercase">Target Raise</p>
            <p className="font-dl-serif text-xl text-dl-navy">{fmt(targetRaise)}</p>
          </div>
          <div className="border border-dl-border p-3">
            <p className="font-dl-mono text-xs text-dl-muted uppercase">Committed</p>
            <p className="font-dl-serif text-xl text-green-700">{fmt(totalCommitted)}</p>
            {targetRaise > 0 && (
              <div className="mt-1 w-full h-1.5 bg-gray-200">
                <div className="h-full bg-green-600" style={{ width: `${raisePct}%` }} />
              </div>
            )}
          </div>
          <div className="border border-dl-border p-3">
            <p className="font-dl-mono text-xs text-dl-muted uppercase">Total Settled</p>
            <p className="font-dl-serif text-xl text-dl-navy">{fmt(totalFunded)}</p>
          </div>
          <div className="border border-dl-border p-3">
            <p className="font-dl-mono text-xs text-dl-muted uppercase">Pipeline / Subs</p>
            <p className="font-dl-serif text-xl text-dl-navy">{offering.pipeline_count} / {offering.subscription_count}</p>
          </div>
        </div>

        <div className="flex border-b border-dl-border mb-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 font-dl-mono text-sm border-b-2 -mb-px whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-dl-navy text-dl-navy'
                  : 'border-transparent text-dl-muted hover:text-dl-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="border border-dl-border p-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Offering Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Offering Name</label>
                  <input
                    value={editFields.name || ''}
                    onChange={e => setEditFields(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Status</label>
                  <select
                    value={editFields.status || 'draft'}
                    onChange={e => setEditFields(p => ({ ...p, status: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white"
                  >
                    <option value="draft">Draft</option>
                    <option value="structuring">Structuring</option>
                    <option value="raising">Raising</option>
                    <option value="funded">Funded</option>
                    <option value="closed">Closed</option>
                    <option value="active">Active</option>
                    <option value="winding_down">Winding Down</option>
                    <option value="dissolved">Dissolved</option>
                  </select>
                </div>
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Offering Type</label>
                  <select
                    value={editFields.offering_type || 'clubDeal'}
                    onChange={e => setEditFields(p => ({ ...p, offering_type: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white"
                  >
                    <option value="regD506b">Reg D 506(b)</option>
                    <option value="regD506c">Reg D 506(c)</option>
                    <option value="regCF">Reg CF</option>
                    <option value="communityPool">Community Pool</option>
                    <option value="clubDeal">Club Deal</option>
                    <option value="pilotOffering">Pilot Offering</option>
                  </select>
                </div>
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Entity Type</label>
                  <select
                    value={editFields.entity_type || 'spv'}
                    onChange={e => setEditFields(p => ({ ...p, entity_type: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white"
                  >
                    <option value="spv">SPV (Special Purpose Vehicle)</option>
                    <option value="llc">LLC</option>
                    <option value="lp">Limited Partnership</option>
                    <option value="trust">Trust</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Description</label>
                  <textarea
                    value={editFields.description || ''}
                    onChange={e => setEditFields(p => ({ ...p, description: e.target.value }))}
                    rows={3}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 px-6 py-2 bg-dl-navy text-white font-dl-mono text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {offering.investment_highlights && Array.isArray(offering.investment_highlights) && (
              <div className="border border-dl-border p-6">
                <h3 className="font-dl-serif text-base text-dl-navy mb-3">Investment Highlights</h3>
                <ul className="space-y-2">
                  {offering.investment_highlights.map((h: string, i: number) => (
                    <li key={i} className="font-dl-mono text-sm text-dl-text flex items-start gap-2">
                      <span className="text-dl-accent mt-0.5">—</span> {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(offering.meta?.sourceDeal || sourceDeal) && (
              <div className="border border-dl-border p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-dl-serif text-base text-dl-navy">Source Deal Intelligence</h3>
                  {offering.deal_id && (
                    <Link href={`/deal-intelligence/deal/${offering.deal_id}`} className="font-dl-mono text-xs text-dl-navy hover:underline">
                      Open Full Deal →
                    </Link>
                  )}
                </div>
                {sourceDeal && (
                  <div className="mb-3 border-b border-dl-border pb-3">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      <div>
                        <p className="font-dl-mono text-xs text-dl-muted uppercase">Deal Name</p>
                        <p className="font-dl-mono text-sm text-dl-text">{sourceDeal.deal?.name || sourceDeal.deal?.dealName || sourceDeal.deal?.strategy || '—'}</p>
                      </div>
                      {sourceDeal.property && (
                        <div>
                          <p className="font-dl-mono text-xs text-dl-muted uppercase">Property Address</p>
                          <p className="font-dl-mono text-sm text-dl-text">{sourceDeal.property.address_raw || sourceDeal.property.addressRaw || '—'}</p>
                        </div>
                      )}
                      <div>
                        <p className="font-dl-mono text-xs text-dl-muted uppercase">Deal Status</p>
                        <p className="font-dl-mono text-sm text-dl-text">{(sourceDeal.deal?.status || '—').toUpperCase()}</p>
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Purchase Price', value: fmt(offering.meta?.sourceDeal?.purchasePrice || 0) },
                    { label: 'Rehab Budget', value: fmt(offering.meta?.sourceDeal?.rehabBudget || 0) },
                    { label: 'Equity Required', value: fmt(offering.meta?.sourceDeal?.equityRequired || 0) },
                    { label: 'Debt Amount', value: fmt(offering.meta?.sourceDeal?.debtAmount || 0) },
                    { label: 'Strategy', value: offering.meta?.sourceDeal?.strategy?.toUpperCase() || '—' },
                    { label: 'Sponsor Contribution', value: fmt(offering.meta?.sourceDeal?.sponsorContribution || 0) },
                    { label: 'Equity Gap', value: fmt(offering.meta?.sourceDeal?.equityGap || 0) },
                    { label: 'Total Capital', value: fmt(offering.meta?.sourceDeal?.totalCapital || 0) },
                  ].map((item, i) => (
                    <div key={i} className="border-b border-dl-border pb-2">
                      <p className="font-dl-mono text-xs text-dl-muted uppercase">{item.label}</p>
                      <p className="font-dl-mono text-sm text-dl-text">{item.value}</p>
                    </div>
                  ))}
                </div>
                {offering.meta?.riskSummary && Object.keys(offering.meta.riskSummary).length > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="font-dl-mono text-xs text-dl-muted uppercase">Risk Flags:</span>
                    {Object.entries(offering.meta.riskSummary).map(([severity, count]) => (
                      <span key={severity} className={`px-1.5 py-0.5 text-xs font-dl-mono ${
                        severity === 'critical' ? 'bg-red-100 text-red-700' :
                        severity === 'high' ? 'bg-orange-100 text-orange-700' :
                        severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {severity}: {count as number}
                      </span>
                    ))}
                  </div>
                )}
                {offering.meta?.ivcee && (
                  <div className="mt-2 flex items-center gap-3">
                    {offering.meta.ivcee.efficiencyScore != null && (
                      <span className="font-dl-mono text-xs text-dl-muted">
                        IVCEE Score: <span className="text-dl-navy">{(offering.meta.ivcee.efficiencyScore * 100).toFixed(1)}%</span>
                      </span>
                    )}
                    {offering.meta.ivcee.viabilityProbability != null && (
                      <span className="font-dl-mono text-xs text-dl-muted">
                        Viability: <span className="text-dl-navy">{(offering.meta.ivcee.viabilityProbability * 100).toFixed(1)}%</span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="space-y-6">
            <div className="border border-dl-border p-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Raise Economics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Target Raise</label>
                  <input
                    type="number"
                    value={editFields.target_raise || ''}
                    onChange={e => setEditFields(p => ({ ...p, target_raise: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Minimum Investment</label>
                  <input
                    type="number"
                    value={editFields.minimum_investment || ''}
                    onChange={e => setEditFields(p => ({ ...p, minimum_investment: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Hold Period (years)</label>
                  <input
                    type="number"
                    value={editFields.hold_period_years || ''}
                    onChange={e => setEditFields(p => ({ ...p, hold_period_years: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="border border-dl-border p-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Projected Returns</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Cap Rate', value: pct(offering.projected_cap_rate) },
                  { label: 'Cash-on-Cash', value: pct(offering.projected_cash_on_cash) },
                  { label: 'IRR', value: pct(offering.projected_irr) },
                  { label: 'DSCR', value: offering.projected_dscr ? parseFloat(offering.projected_dscr).toFixed(2) : '—' },
                ].map((m, i) => (
                  <div key={i} className="border border-dl-border p-3">
                    <p className="font-dl-mono text-xs text-dl-muted uppercase">{m.label}</p>
                    <p className="font-dl-serif text-xl text-dl-navy">{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-dl-border p-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Waterfall Structure</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Preferred Return (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editFields.preferred_return || ''}
                    onChange={e => setEditFields(p => ({ ...p, preferred_return: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Promote Split (% to GP)</label>
                  <input
                    type="number"
                    step="1"
                    value={editFields.promote_split || ''}
                    onChange={e => setEditFields(p => ({ ...p, promote_split: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm"
                  />
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 px-6 py-2 bg-dl-navy text-white font-dl-mono text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Financials'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-dl-serif text-lg text-dl-navy">Document Room</h2>
              <p className="font-dl-mono text-xs text-dl-muted">{documents.length} documents</p>
            </div>
            {documents.length === 0 ? (
              <div className="border border-dl-border p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted">No documents uploaded yet.</p>
              </div>
            ) : (
              <div className="border border-dl-border">
                <table className="w-full font-dl-mono text-sm">
                  <thead>
                    <tr className="bg-dl-bg border-b border-dl-border text-left">
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Name</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Type</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Visibility</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc: any) => (
                      <tr key={doc.id} className="border-b border-dl-border">
                        <td className="px-4 py-2 text-dl-text">{doc.name}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs uppercase">{doc.doc_type}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs">{doc.visibility}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs">{new Date(doc.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'investors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-dl-serif text-lg text-dl-navy">Investor Pipeline</h2>
              <div className="flex items-center gap-3">
                {pipelineSummary && (
                  <p className="font-dl-mono text-xs text-dl-muted">
                    {pipelineSummary.total} investors | Soft Circle: {fmt(pipelineSummary.totalSoftCircle)} | Committed: {fmt(pipelineSummary.totalCommitted)}
                  </p>
                )}
                <button
                  onClick={() => setShowAddInvestor(!showAddInvestor)}
                  className="bg-dl-navy text-white px-3 py-1 font-dl-mono text-xs"
                >
                  {showAddInvestor ? 'Cancel' : 'Add Investor'}
                </button>
              </div>
            </div>

            {showAddInvestor && (
              <div className="border border-dl-navy p-4 bg-gray-50">
                <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3">New Investor Profile</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Legal Name</label>
                    <input
                      value={investorForm.legalName}
                      onChange={e => setInvestorForm(p => ({ ...p, legalName: e.target.value }))}
                      placeholder="Full legal name"
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Email</label>
                    <input
                      value={investorForm.email}
                      onChange={e => setInvestorForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="investor@email.com"
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Accreditation</label>
                    <select
                      value={investorForm.accreditationStatus}
                      onChange={e => setInvestorForm(p => ({ ...p, accreditationStatus: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                    >
                      <option value="unverified">Unverified</option>
                      <option value="accredited">Accredited</option>
                      <option value="not_accredited">Not Accredited</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Pipeline Stage</label>
                    <select
                      value={investorForm.stage}
                      onChange={e => setInvestorForm(p => ({ ...p, stage: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                    >
                      <option value="lead">Lead</option>
                      <option value="contacted">Contacted</option>
                      <option value="interested">Interested</option>
                      <option value="softCircled">Soft Circled</option>
                      <option value="docsPending">Docs Pending</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Soft Circle Amount</label>
                    <input
                      type="number"
                      value={investorForm.softCircleAmount}
                      onChange={e => setInvestorForm(p => ({ ...p, softCircleAmount: e.target.value }))}
                      placeholder="25000"
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddInvestor}
                  disabled={addingInvestor || !investorForm.legalName}
                  className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                >
                  {addingInvestor ? 'Adding...' : 'Add to Pipeline'}
                </button>
              </div>
            )}

            {pipelineSummary?.stageCounts && Object.keys(pipelineSummary.stageCounts).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(pipelineSummary.stageCounts).map(([stage, count]) => (
                  <span key={stage} className={`px-2 py-1 text-xs font-dl-mono ${STAGE_COLORS[stage] || 'bg-gray-100 text-gray-600'}`}>
                    {stage}: {count as number}
                  </span>
                ))}
              </div>
            )}

            {pipeline.length === 0 && !showAddInvestor ? (
              <div className="border border-dl-border p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted mb-2">No investors in pipeline yet.</p>
                <button
                  onClick={() => setShowAddInvestor(true)}
                  className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm"
                >
                  Add First Investor
                </button>
              </div>
            ) : pipeline.length > 0 && (
              <div className="border border-dl-border">
                <table className="w-full font-dl-mono text-sm">
                  <thead>
                    <tr className="bg-dl-bg border-b border-dl-border text-left">
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Investor</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Stage</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Soft Circle</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Committed</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Rep</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipeline.map((p: any) => (
                      <tr key={p.id} className="border-b border-dl-border">
                        <td className="px-4 py-2">
                          <div className="text-dl-text">{p.legal_name || p.entity_name || 'Unknown'}</div>
                          {p.email && <div className="text-xs text-dl-muted">{p.email}</div>}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs ${STAGE_COLORS[p.stage] || 'bg-gray-100 text-gray-600'}`}>
                            {p.stage}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">{p.soft_circle_amount ? fmt(parseFloat(p.soft_circle_amount)) : '—'}</td>
                        <td className="px-4 py-2 text-right">{p.committed_amount ? fmt(parseFloat(p.committed_amount)) : '—'}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs">{p.assigned_rep || '—'}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs">{new Date(p.updated_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-dl-serif text-lg text-dl-navy">Subscriptions</h2>
              <div className="flex items-center gap-3">
                {subSummary && (
                  <p className="font-dl-mono text-xs text-dl-muted">
                    {subSummary.total} total | Committed: {fmt(subSummary.totalCommitted)} | Approved: {fmt(subSummary.totalApproved)}
                  </p>
                )}
                <button
                  onClick={() => setShowAddSub(!showAddSub)}
                  className="bg-dl-navy text-white px-3 py-1 font-dl-mono text-xs"
                >
                  {showAddSub ? 'Cancel' : 'Record Subscription'}
                </button>
              </div>
            </div>

            {showAddSub && (
              <div className="border border-dl-navy p-4 bg-gray-50">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-dl-mono text-xs text-dl-muted uppercase">New Subscription</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSubMode('existing')}
                      className={`px-2 py-0.5 text-xs font-dl-mono ${subMode === 'existing' ? 'bg-dl-navy text-white' : 'bg-gray-200 text-gray-600'}`}
                    >
                      Existing Investor
                    </button>
                    <button
                      onClick={() => setSubMode('new')}
                      className={`px-2 py-0.5 text-xs font-dl-mono ${subMode === 'new' ? 'bg-dl-navy text-white' : 'bg-gray-200 text-gray-600'}`}
                    >
                      New Investor
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  {subMode === 'existing' ? (
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Investor</label>
                      <select
                        value={subForm.investorProfileId}
                        onChange={e => setSubForm(p => ({ ...p, investorProfileId: e.target.value }))}
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                      >
                        <option value="">Select investor...</option>
                        {pipeline.map((p: any) => (
                          <option key={p.investor_profile_id} value={p.investor_profile_id}>
                            {p.legal_name || p.entity_name || 'Unknown'}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-dl-mono text-dl-muted mb-1">Legal Name</label>
                        <input
                          value={subForm.newInvestorName}
                          onChange={e => setSubForm(p => ({ ...p, newInvestorName: e.target.value }))}
                          placeholder="Full legal name"
                          className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-dl-mono text-dl-muted mb-1">Email</label>
                        <input
                          value={subForm.newInvestorEmail}
                          onChange={e => setSubForm(p => ({ ...p, newInvestorEmail: e.target.value }))}
                          placeholder="investor@email.com"
                          className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Amount ($)</label>
                    <input
                      type="number"
                      value={subForm.amount}
                      onChange={e => setSubForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="50000"
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Share Class</label>
                    <select
                      value={subForm.shareClass}
                      onChange={e => setSubForm(p => ({ ...p, shareClass: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                    >
                      <option value="common">Common</option>
                      <option value="A">Class A</option>
                      <option value="B">Class B</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Funding Method</label>
                    <select
                      value={subForm.fundingMethod}
                      onChange={e => setSubForm(p => ({ ...p, fundingMethod: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                    >
                      <option value="wire">Wire Transfer</option>
                      <option value="ach">ACH</option>
                      <option value="crypto">Crypto (On-chain)</option>
                      <option value="check">Check</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleAddSubscription}
                  disabled={addingSub || !subForm.amount || (subMode === 'existing' ? !subForm.investorProfileId : !subForm.newInvestorName)}
                  className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                >
                  {addingSub ? 'Recording...' : 'Record Subscription'}
                </button>
              </div>
            )}

            {subscriptions.length === 0 && !showAddSub ? (
              <div className="border border-dl-border p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted mb-2">No subscriptions yet.</p>
                <button
                  onClick={() => setShowAddSub(true)}
                  className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm"
                >
                  Record First Subscription
                </button>
              </div>
            ) : subscriptions.length > 0 && (
              <div className="border border-dl-border">
                <table className="w-full font-dl-mono text-sm">
                  <thead>
                    <tr className="bg-dl-bg border-b border-dl-border text-left">
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Investor</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Amount</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Class</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Status</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Method</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s: any) => (
                      <React.Fragment key={s.id}>
                      <tr className="border-b border-dl-border">
                        <td className="px-4 py-2 text-dl-text">{s.legal_name || s.entity_name || 'Unknown'}</td>
                        <td className="px-4 py-2 text-right">{fmt(parseFloat(s.amount || '0'))}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs">{s.meta?.share_class || s.share_class || 'common'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs ${
                            s.status === 'approved' || s.status === 'funded' ? 'bg-green-50 text-green-700' :
                            s.status === 'rejected' || s.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>{s.status}</span>
                        </td>
                        <td className="px-4 py-2 text-dl-muted text-xs">{s.funding_method || '—'}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            {s.status === 'draft' && (
                              <button onClick={() => handleSubAction(s.id, 'submitted')} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 font-dl-mono">Submit</button>
                            )}
                            {(s.status === 'submitted' || s.status === 'under_review') && (
                              <>
                                <button onClick={() => handleSubAction(s.id, 'approved')} className="px-2 py-0.5 text-xs bg-green-50 text-green-700 font-dl-mono">Approve</button>
                                <button onClick={() => handleSubAction(s.id, 'rejected')} className="px-2 py-0.5 text-xs bg-red-50 text-red-600 font-dl-mono">Reject</button>
                              </>
                            )}
                            {s.status === 'approved' && (
                              <button onClick={() => handleSubAction(s.id, 'funded')} className="px-2 py-0.5 text-xs bg-green-100 text-green-800 font-dl-mono">Mark Funded</button>
                            )}
                            {s.status === 'funded' && (
                              <button
                                onClick={() => {
                                  setShowReceiptForm(showReceiptForm === s.id ? null : s.id);
                                  setReceiptForm({ externalRef: '', amount: s.amount || '', settlementDate: '', fundingMethod: s.funding_method || 'wire' });
                                }}
                                className="px-2 py-0.5 text-xs bg-green-100 text-green-800 font-dl-mono"
                              >
                                Record Receipt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {showReceiptForm === s.id && (
                        <tr className="bg-gray-50 border-b border-dl-border">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-dl-mono text-dl-muted mb-1">External Reference</label>
                                <input
                                  value={receiptForm.externalRef}
                                  onChange={e => setReceiptForm(p => ({ ...p, externalRef: e.target.value }))}
                                  placeholder="Wire/ACH confirmation #"
                                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Settled Amount ($)</label>
                                <input
                                  type="number"
                                  value={receiptForm.amount}
                                  onChange={e => setReceiptForm(p => ({ ...p, amount: e.target.value }))}
                                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Settlement Date</label>
                                <input
                                  type="date"
                                  value={receiptForm.settlementDate}
                                  onChange={e => setReceiptForm(p => ({ ...p, settlementDate: e.target.value }))}
                                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Method</label>
                                <select
                                  value={receiptForm.fundingMethod}
                                  onChange={e => setReceiptForm(p => ({ ...p, fundingMethod: e.target.value }))}
                                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                                >
                                  <option value="wire">Wire Transfer</option>
                                  <option value="ach">ACH</option>
                                  <option value="crypto">Crypto (On-chain)</option>
                                  <option value="check">Check</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRecordReceipt(s.id)}
                                disabled={recordingReceipt || !receiptForm.amount}
                                className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                              >
                                {recordingReceipt ? 'Recording...' : 'Confirm Receipt'}
                              </button>
                              <button
                                onClick={() => setShowReceiptForm(null)}
                                className="px-4 py-1.5 font-dl-mono text-sm text-dl-muted border border-dl-border"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'capTable' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-dl-serif text-lg text-dl-navy">Capital Table</h2>
              <div className="flex items-center gap-3">
                {capSummary && (
                  <p className="font-dl-mono text-xs text-dl-muted">
                    {capSummary.holderCount} holders | Total Capital: {fmt(capSummary.totalCapital)}
                  </p>
                )}
                <button
                  onClick={handleSyncCapTable}
                  disabled={syncingCap}
                  className="bg-dl-navy text-white px-3 py-1 font-dl-mono text-xs disabled:opacity-50"
                >
                  {syncingCap ? 'Syncing...' : 'Sync Capital Table'}
                </button>
              </div>
            </div>

            {capTable.length === 0 ? (
              <div className="border border-dl-border p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted mb-2">Capital table will populate when subscriptions are funded.</p>
                <button
                  onClick={handleSyncCapTable}
                  disabled={syncingCap}
                  className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                >
                  {syncingCap ? 'Syncing...' : 'Rebuild from Funded Subscriptions'}
                </button>
              </div>
            ) : (
              <div className="border border-dl-border">
                <table className="w-full font-dl-mono text-sm">
                  <thead>
                    <tr className="bg-dl-bg border-b border-dl-border text-left">
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Holder</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Class</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Units</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Ownership</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Capital</th>
                    </tr>
                  </thead>
                  <tbody>
                    {capTable.map((c: any) => (
                      <tr key={c.id} className="border-b border-dl-border">
                        <td className="px-4 py-2 text-dl-text">{c.legal_name || c.entity_name || 'Unknown'}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs">{c.share_class || 'A'}</td>
                        <td className="px-4 py-2 text-right">{parseFloat(c.units || '0').toLocaleString()}</td>
                        <td className="px-4 py-2 text-right">{parseFloat(c.ownership_pct || '0').toFixed(2)}%</td>
                        <td className="px-4 py-2 text-right">{fmt(parseFloat(c.capital_contributed || '0'))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'distributions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-dl-serif text-lg text-dl-navy">Distributions</h2>
              <div className="flex items-center gap-3">
                {distSummary && (
                  <p className="font-dl-mono text-xs text-dl-muted">
                    {distSummary.total} entries | Gross: {fmt(distSummary.totalGross)} | Paid: {distSummary.completedCount}
                  </p>
                )}
                <button
                  onClick={() => setShowCreateDist(!showCreateDist)}
                  className="bg-dl-navy text-white px-3 py-1 font-dl-mono text-xs"
                >
                  {showCreateDist ? 'Cancel' : 'Create Distribution'}
                </button>
              </div>
            </div>

            {showCreateDist && (
              <div className="border border-dl-navy p-4 bg-gray-50">
                <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3">New Distribution Event</h3>
                <p className="font-dl-mono text-xs text-dl-muted mb-3">
                  Per-investor amounts will be computed automatically from capital table ownership percentages.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Distribution Type</label>
                    <select
                      value={distForm.distributionType}
                      onChange={e => setDistForm(p => ({ ...p, distributionType: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                    >
                      <option value="preferred_return">Preferred Return</option>
                      <option value="profit_share">Profit Share</option>
                      <option value="return_of_capital">Return of Capital</option>
                      <option value="refinance_proceeds">Refinance Proceeds</option>
                      <option value="sale_proceeds">Sale Proceeds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Gross Amount ($)</label>
                    <input
                      type="number"
                      value={distForm.grossAmount}
                      onChange={e => setDistForm(p => ({ ...p, grossAmount: e.target.value }))}
                      placeholder="50000"
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Period Start</label>
                    <input
                      type="date"
                      value={distForm.periodStart}
                      onChange={e => setDistForm(p => ({ ...p, periodStart: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Period End</label>
                    <input
                      type="date"
                      value={distForm.periodEnd}
                      onChange={e => setDistForm(p => ({ ...p, periodEnd: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateDistribution}
                  disabled={creatingDist || !distForm.grossAmount}
                  className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                >
                  {creatingDist ? 'Creating...' : 'Create Distribution'}
                </button>
              </div>
            )}

            {distributions.length === 0 && !showCreateDist ? (
              <div className="border border-dl-border p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted mb-2">No distributions yet.</p>
                <p className="font-dl-mono text-xs text-dl-muted mb-3">Create a distribution event to allocate returns to investors based on their capital table ownership.</p>
                <button
                  onClick={() => setShowCreateDist(true)}
                  className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm"
                >
                  Create First Distribution
                </button>
              </div>
            ) : distributions.length > 0 && (
              <div className="border border-dl-border">
                <table className="w-full font-dl-mono text-sm">
                  <thead>
                    <tr className="bg-dl-bg border-b border-dl-border text-left">
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Investor</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Type</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Gross</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Net</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Ownership</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Period</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Status</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributions.map((d: any) => (
                      <tr key={d.id} className="border-b border-dl-border">
                        <td className="px-4 py-2 text-dl-text">{d.legal_name || d.entity_name || 'Unknown'}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs">{d.distribution_type.replace(/_/g, ' ')}</td>
                        <td className="px-4 py-2 text-right">{fmt(parseFloat(d.gross_amount || '0'))}</td>
                        <td className="px-4 py-2 text-right">{fmt(parseFloat(d.net_amount || '0'))}</td>
                        <td className="px-4 py-2 text-right">{d.ownership_pct ? `${parseFloat(d.ownership_pct).toFixed(2)}%` : '—'}</td>
                        <td className="px-4 py-2 text-dl-muted text-xs">
                          {d.period_start ? new Date(d.period_start).toLocaleDateString() : '—'}
                          {d.period_end ? ` — ${new Date(d.period_end).toLocaleDateString()}` : ''}
                        </td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 text-xs ${
                            d.status === 'completed' ? 'bg-green-50 text-green-700' :
                            d.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                            d.status === 'approved' ? 'bg-yellow-50 text-yellow-700' :
                            d.status === 'failed' ? 'bg-red-50 text-red-600' :
                            'bg-gray-100 text-gray-600'
                          }`}>{d.status}</span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1">
                            {d.status === 'draft' && (
                              <>
                                <button onClick={() => handleDistAction(d.id, 'approved')} className="px-2 py-0.5 text-xs bg-green-50 text-green-700 font-dl-mono">Approve</button>
                                <button onClick={() => handleDeleteDist(d.id)} className="px-2 py-0.5 text-xs bg-red-50 text-red-600 font-dl-mono">Delete</button>
                              </>
                            )}
                            {d.status === 'approved' && (
                              <button onClick={() => handleDistAction(d.id, 'processing')} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 font-dl-mono">Mark Processing</button>
                            )}
                            {d.status === 'processing' && (
                              <button onClick={() => handleDistAction(d.id, 'completed')} className="px-2 py-0.5 text-xs bg-green-100 text-green-800 font-dl-mono">Mark Paid</button>
                            )}
                            {d.status === 'completed' && d.paid_at && (
                              <span className="px-2 py-0.5 text-xs text-dl-muted font-dl-mono">
                                Paid {new Date(d.paid_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-dl-serif text-lg text-dl-navy">Offering Reports</h2>
              <p className="font-dl-mono text-xs text-dl-muted">{reports.length} published</p>
            </div>
            {reports.length === 0 ? (
              <div className="border border-dl-border p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted">No reports published yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r: any) => (
                  <div key={r.id} className="border border-dl-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-dl-serif text-base text-dl-navy">{r.title}</h3>
                      <span className="font-dl-mono text-xs text-dl-muted">
                        {r.report_type} | {new Date(r.published_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.content && <p className="font-dl-mono text-sm text-dl-text">{r.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="border border-dl-border p-6">
              <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Governance & Settlement</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Governance</label>
                  <select
                    value={editFields.governance_enabled ? 'true' : 'false'}
                    onChange={e => setEditFields(p => ({ ...p, governance_enabled: e.target.value === 'true' }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white"
                  >
                    <option value="false">Disabled</option>
                    <option value="true">Enabled (Investors can vote on proposals)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-dl-mono text-xs text-dl-muted uppercase mb-1">Settlement Mode</label>
                  <select
                    value={editFields.settlement_mode || 'offchain'}
                    onChange={e => setEditFields(p => ({ ...p, settlement_mode: e.target.value }))}
                    className="w-full border border-dl-border px-3 py-2 font-dl-mono text-sm bg-white"
                  >
                    <option value="offchain">Off-chain (Traditional)</option>
                    <option value="onchain">On-chain (ERC-3643)</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="mt-4 px-6 py-2 bg-dl-navy text-white font-dl-mono text-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {['raising', 'funded'].includes(offering.status) && (
              <div className="border border-dl-border p-6">
                <h2 className="font-dl-serif text-lg text-dl-navy mb-4">Close Offering</h2>
                <p className="font-dl-mono text-xs text-dl-muted mb-3">
                  Closing the offering will finalize the capital table, lock fundraising, and set the close date. This action cannot be undone.
                </p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="border border-dl-border p-3">
                    <p className="font-dl-mono text-xs text-dl-muted uppercase">Funded Subscriptions</p>
                    <p className="font-dl-serif text-lg text-dl-navy">
                      {subscriptions.filter((s: any) => s.status === 'funded').length}
                    </p>
                  </div>
                  <div className="border border-dl-border p-3">
                    <p className="font-dl-mono text-xs text-dl-muted uppercase">Total Committed</p>
                    <p className="font-dl-serif text-lg text-green-700">{fmt(totalCommitted)}</p>
                  </div>
                  <div className="border border-dl-border p-3">
                    <p className="font-dl-mono text-xs text-dl-muted uppercase">Gap to Target</p>
                    <p className="font-dl-serif text-lg text-dl-navy">
                      {targetRaise > 0 ? fmt(Math.max(0, targetRaise - totalCommitted)) : '—'}
                    </p>
                  </div>
                </div>
                {(() => {
                  const fundedCount = subscriptions.filter((s: any) => s.status === 'funded').length;
                  const noFunded = fundedCount === 0;
                  return (
                    <>
                      <button
                        onClick={handleCloseOffering}
                        disabled={closingOffering || noFunded}
                        className="px-6 py-2 bg-dl-navy text-white font-dl-mono text-sm disabled:opacity-50"
                      >
                        {closingOffering ? 'Closing...' : 'Close Offering'}
                      </button>
                      {noFunded && (
                        <p className="font-dl-mono text-xs text-dl-muted mt-2">
                          At least one funded subscription is required to close the offering.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {offering.status === 'closed' && offering.close_date && (
              <div className="border border-green-200 bg-green-50 p-6">
                <h2 className="font-dl-serif text-lg text-green-800 mb-2">Offering Closed</h2>
                <p className="font-dl-mono text-sm text-green-700">
                  This offering was closed on {new Date(offering.close_date).toLocaleDateString()}.
                  Capital table has been finalized. Distributions can be created from the Distributions tab.
                </p>
              </div>
            )}

            {offering.status === 'draft' && (
              <div className="border border-red-200 bg-red-50 p-6">
                <h3 className="font-dl-serif text-base text-red-700 mb-2">Delete Offering</h3>
                <p className="font-dl-mono text-xs text-red-600 mb-3">
                  Only draft offerings can be deleted. This action is irreversible.
                </p>
                <button
                  onClick={async () => {
                    if (!confirm('Delete this draft offering?')) return;
                    try {
                      await fetch(`/api/syndication/offerings/${id}`, { method: 'DELETE' });
                      router.push('/syndication');
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white font-dl-mono text-xs"
                >
                  Delete Draft
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DesignLawLayout>
  );
}
