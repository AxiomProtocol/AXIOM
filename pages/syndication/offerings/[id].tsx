import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { DesignLawLayout } from '../../../components/design-law/DesignLawLayout';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { useWallet } from '../../../lib/web3/useWallet';

const OPERATOR_WALLETS = [
  '0xb0cefc7e3f1c7de3b98e8c39384e9e084c9eb75c',
];

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
  const { isConnected, address } = useWallet();
  const isOperator = useMemo(() => {
    if (!isConnected || !address) return false;
    return OPERATOR_WALLETS.includes(address.toLowerCase());
  }, [isConnected, address]);

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
  const [subForm, setSubForm] = useState({ investorProfileId: '', amount: '', shareClass: 'common', fundingMethod: 'wire', paymentCurrency: 'USD', investorWallet: '', newInvestorName: '', newInvestorEmail: '' });
  const [subMode, setSubMode] = useState<'existing' | 'new'>('existing');
  const [addingSub, setAddingSub] = useState(false);
  const [syncingCap, setSyncingCap] = useState(false);
  const [sourceDeal, setSourceDeal] = useState<any>(null);
  const [distributions, setDistributions] = useState<any[]>([]);
  const [distSummary, setDistSummary] = useState<any>(null);
  const [showCreateDist, setShowCreateDist] = useState(false);
  const [distForm, setDistForm] = useState<any>({ distributionType: 'preferred_return', grossAmount: '', periodStart: '', periodEnd: '', currency: 'USD' });
  const [showWaterfall, setShowWaterfall] = useState(false);
  const [waterfallForm, setWaterfallForm] = useState({ grossAmount: '', periodStart: '', periodEnd: '', capitalDeployed: '', preferredRate: '' });
  const [waterfallResult, setWaterfallResult] = useState<any>(null);
  const [calculatingWaterfall, setCalculatingWaterfall] = useState(false);
  const [creatingDist, setCreatingDist] = useState(false);
  const [fundingRecords, setFundingRecords] = useState<any[]>([]);
  const [showReceiptForm, setShowReceiptForm] = useState<string | null>(null);
  const [receiptForm, setReceiptForm] = useState({ externalRef: '', amount: '', settlementDate: '', fundingMethod: 'wire' });
  const [recordingReceipt, setRecordingReceipt] = useState(false);
  const [closingOffering, setClosingOffering] = useState(false);
  const [showFundingInstructions, setShowFundingInstructions] = useState<string | null>(null);
  const [fundingInstructions, setFundingInstructions] = useState<any>(null);
  const [loadingInstructions, setLoadingInstructions] = useState(false);
  const [showReportForm, setShowReportForm] = useState(true);
  const [reportForm, setReportForm] = useState({ title: '', reportType: 'quarterly', content: '', notifyInvestors: true });
  const [reportToast, setReportToast] = useState<string | null>(null);
  const [publishingReport, setPublishingReport] = useState(false);
  const [showK1Generator, setShowK1Generator] = useState(false);
  const [k1Form, setK1Form] = useState({ taxYear: String(new Date().getFullYear()), notifyInvestors: false });
  const [generatingK1, setGeneratingK1] = useState(false);
  const [k1Result, setK1Result] = useState<any>(null);
  const [distPayConfirm, setDistPayConfirm] = useState<any | null>(null);
  const [distPaying, setDistPaying] = useState<string | null>(null);
  const [distPayError, setDistPayError] = useState<Record<string, string>>({});
  const [showCapCallForm, setShowCapCallForm] = useState<string | null>(null);
  const [capCallForm, setCapCallForm] = useState({ amountCalled: '', dueDate: '', currency: 'USD', triggerACH: false });
  const [sendingCapCall, setSendingCapCall] = useState(false);
  const [capitalCalls, setCapitalCalls] = useState<any[]>([]);
  const [showCapCallHistory, setShowCapCallHistory] = useState<string | null>(null);
  const [capCallToast, setCapCallToast] = useState<string | null>(null);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docForm, setDocForm] = useState({ name: '', docType: 'ppm', visibility: 'private' });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docUploadError, setDocUploadError] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

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
        body: JSON.stringify({
          investorProfileId: profileId,
          amount: subForm.amount,
          shareClass: subForm.shareClass,
          fundingMethod: subForm.fundingMethod,
          paymentCurrency: subForm.paymentCurrency,
          investorWallet: subForm.paymentCurrency === 'AXUSD' ? subForm.investorWallet : null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSubForm({ investorProfileId: '', amount: '', shareClass: 'common', fundingMethod: 'wire', paymentCurrency: 'USD', investorWallet: '', newInvestorName: '', newInvestorEmail: '' });
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

  const handleCalculateWaterfall = async () => {
    if (!waterfallForm.grossAmount) return;
    setCalculatingWaterfall(true);
    setWaterfallResult(null);
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/waterfall`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(waterfallForm),
      });
      const json = await res.json();
      if (json.success) {
        setWaterfallResult(json.waterfall);
      }
    } catch (err) { console.error(err); }
    finally { setCalculatingWaterfall(false); }
  };

  const handleUseWaterfallNumbers = () => {
    if (!waterfallResult) return;
    const lpTotal = waterfallResult.totals.lpAmount;
    const hasPrefReturn = waterfallResult.tranches.some((t: any) => t.name === 'Preferred Return');
    setDistForm({
      distributionType: hasPrefReturn ? 'preferred_return' : 'profit_share',
      grossAmount: String(lpTotal),
      periodStart: waterfallResult.periodStart || '',
      periodEnd: waterfallResult.periodEnd || '',
      currency: 'USD',
      waterfallMeta: {
        gpPromoteAmount: waterfallResult.totals.gpAmount,
        lpAmount: waterfallResult.totals.lpAmount,
        grossDistributable: waterfallResult.grossAmount,
        preferredRate: waterfallResult.preferredRate,
        gpPromotePct: waterfallResult.gpPromotePct,
        capitalDeployed: waterfallResult.capitalDeployed,
        fractionOfYear: waterfallResult.fractionOfYear,
        tranches: waterfallResult.tranches,
      },
    });
    setShowCreateDist(true);
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
        setDistForm({ distributionType: 'preferred_return', grossAmount: '', periodStart: '', periodEnd: '', currency: 'USD' });
        setShowCreateDist(false);
        setWaterfallResult(null);
        loadTabData('distributions');
      }
    } catch (err) { console.error(err); }
    finally { setCreatingDist(false); }
  };

  const handleDistAction = async (distributionId: string, status: string) => {
    if (status === 'completed') {
      const dist = distributions.find((d: any) => d.id === distributionId);
      if (dist) {
        setDistPayConfirm(dist);
        return;
      }
    }
    try {
      await fetch(`/api/syndication/offerings/${id}/distributions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId, status }),
      });
      loadTabData('distributions');
    } catch (err) { console.error(err); }
  };

  const handleDistPayConfirmed = async () => {
    if (!distPayConfirm) return;
    const distributionId = distPayConfirm.id;
    setDistPayConfirm(null);
    setDistPaying(distributionId);
    setDistPayError(prev => { const n = { ...prev }; delete n[distributionId]; return n; });
    try {
      const resp = await fetch(`/api/syndication/offerings/${id}/distributions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distributionId, status: 'completed' }),
      });
      const json = await resp.json();
      if (!json.success) {
        setDistPayError(prev => ({ ...prev, [distributionId]: json.error || 'Payment failed.' }));
      }
      loadTabData('distributions');
    } catch (err: any) {
      setDistPayError(prev => ({ ...prev, [distributionId]: err.message || 'Payment failed.' }));
    } finally {
      setDistPaying(null);
    }
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

  const handleLoadFundingInstructions = async (subscriptionId: string) => {
    if (showFundingInstructions === subscriptionId) {
      setShowFundingInstructions(null);
      return;
    }
    setShowFundingInstructions(subscriptionId);
    setLoadingInstructions(true);
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/funding-instructions?subscriptionId=${subscriptionId}`);
      const json = await res.json();
      if (json.success) setFundingInstructions(json);
    } catch (err) { console.error(err); }
    finally { setLoadingInstructions(false); }
  };

  const handlePublishReport = async () => {
    if (!reportForm.title) return;
    setPublishingReport(true);
    setReportToast(null);
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportForm),
      });
      const json = await res.json();
      if (json.success) {
        setReportForm({ title: '', reportType: 'quarterly', content: '', notifyInvestors: true });
        setShowReportForm(false);
        loadTabData('reports');
        if (reportForm.notifyInvestors) {
          if (json.emailSkipped) {
            setReportToast('Report published — email service unavailable, notifications skipped.');
          } else if (json.notifiedCount > 0) {
            setReportToast(`Report published — ${json.notifiedCount} investor${json.notifiedCount === 1 ? '' : 's'} notified by email.`);
          } else {
            setReportToast('Report published — no investor emails found.');
          }
        } else {
          setReportToast('Report published.');
        }
        setTimeout(() => setReportToast(null), 6000);
      }
    } catch (err) { console.error(err); }
    finally { setPublishingReport(false); }
  };

  const handleGenerateK1 = async () => {
    if (!k1Form.taxYear) return;
    setGeneratingK1(true);
    setK1Result(null);
    setReportToast(null);
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/k1-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(k1Form),
      });
      const json = await res.json();
      if (json.success) {
        setK1Result(json);
        loadTabData('reports');
        const emailNote = json.totalEmailed > 0
          ? ` — ${json.totalEmailed} investor${json.totalEmailed === 1 ? '' : 's'} emailed.`
          : '';
        setReportToast(`Generated ${json.totalGenerated} K-1 ${json.totalGenerated === 1 ? 'summary' : 'summaries'}${emailNote}`);
        setTimeout(() => setReportToast(null), 8000);
      } else {
        setReportToast(json.error || 'K-1 generation failed.');
        setTimeout(() => setReportToast(null), 6000);
      }
    } catch (err) { console.error(err); }
    finally { setGeneratingK1(false); }
  };

  const handleSendCapitalCall = async (subscriptionId: string) => {
    if (!capCallForm.amountCalled) return;
    setSendingCapCall(true);
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/capital-calls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId,
          amountCalled: capCallForm.amountCalled,
          dueDate: capCallForm.dueDate || null,
          currency: capCallForm.currency,
          triggerACH: capCallForm.triggerACH,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const toastMsg = json.emailSent ? `Capital call sent. Email delivered to ${json.investorEmail}.` : 'Capital call recorded (no email on file).';
        setCapCallToast(toastMsg);
        setTimeout(() => setCapCallToast(null), 5000);
        setShowCapCallForm(null);
        setCapCallForm({ amountCalled: '', dueDate: '', currency: 'USD', triggerACH: false });
        loadCapitalCalls();
      } else {
        alert(json.error || 'Failed to send capital call');
      }
    } catch (err) { console.error(err); }
    finally { setSendingCapCall(false); }
  };

  const loadCapitalCalls = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/syndication/offerings/${id}/capital-calls`);
      const json = await res.json();
      if (json.success) setCapitalCalls(json.capitalCalls);
    } catch {}
  }, [id]);

  const handleCapCallStatusUpdate = async (callId: string, status: string) => {
    try {
      await fetch(`/api/syndication/offerings/${id}/capital-calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      loadCapitalCalls();
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (id && activeTab === 'subscriptions') loadCapitalCalls();
  }, [id, activeTab, loadCapitalCalls]);

  const handleDocUpload = async () => {
    if (!docForm.name || !docFile || !id) return;
    setUploadingDoc(true);
    setDocUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('name', docForm.name);
      formData.append('docType', docForm.docType);
      formData.append('visibility', docForm.visibility);
      const res = await fetch(`/api/syndication/offerings/${id}/documents/upload`, {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        setDocForm({ name: '', docType: 'ppm', visibility: 'private' });
        setDocFile(null);
        setShowDocUpload(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadTabData('documents');
      } else {
        setDocUploadError(json.error || 'Upload failed.');
      }
    } catch (err: any) {
      setDocUploadError(err.message || 'Upload failed.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (documentId: string) => {
    if (!confirm('Delete this document?')) return;
    setDeletingDocId(documentId);
    try {
      await fetch(`/api/syndication/offerings/${id}/documents`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId }),
      });
      loadTabData('documents');
    } catch (err) { console.error(err); }
    finally { setDeletingDocId(null); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
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
        <p className="font-dl-mono text-sm text-dl-muted">Loading offering...</p>
      </DesignLawLayout>
    );
  }

  if (!offering) {
    return (
      <DesignLawLayout>
        <p className="font-dl-mono text-sm text-red-700">Offering not found.</p>
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
      <div className="relative">
        {capCallToast && (
          <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 px-4 py-3 font-dl-mono text-sm text-green-800 max-w-[90vw] sm:max-w-md">
            {capCallToast}
          </div>
        )}

        <div className="relative w-full h-32 sm:h-40 lg:h-48 -mt-6 sm:-mt-8 -mx-4 sm:-mx-6 mb-4 overflow-hidden" style={{ width: 'calc(100% + 2rem)' }}>
          <Image
            src="/images/syndication/offering_hero.png"
            alt={offering.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1628]/80 to-transparent" />
          <div className="absolute top-3 left-4 sm:left-6">
            <Link href="/syndication" className="font-dl-mono text-xs text-gray-300 hover:text-white">
              ← Capital Formation
            </Link>
          </div>
          <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 pb-3 sm:pb-5">
            <div className="flex items-end justify-between gap-2">
              <div>
                <h1 className="font-dl-serif text-lg sm:text-2xl lg:text-3xl text-white leading-tight">{offering.name}</h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <p className="font-dl-mono text-[10px] sm:text-xs text-gray-300">
                    {offering.offering_type.toUpperCase()} | {offering.entity_type?.toUpperCase() || 'SPV'}
                  </p>
                  {offering.deal_id && (
                    <Link href={`/deal-intelligence/deal/${offering.deal_id}`} className="font-dl-mono text-[10px] sm:text-xs text-gray-300 hover:text-white underline">
                      View Source Deal
                    </Link>
                  )}
                </div>
              </div>
              <span className={`px-2 sm:px-3 py-1 font-dl-mono text-[10px] sm:text-xs flex-shrink-0 ${STATUS_COLORS[offering.status] || 'bg-gray-100 text-gray-600'}`}>
                {offering.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 mb-4 overflow-x-auto">
          {['Research', 'Underwriting', 'Structuring', 'Formation', 'Funded'].map((stage, i) => {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="border border-dl-border p-3">
            <p className="font-dl-mono text-[10px] sm:text-xs text-dl-muted uppercase">Target Raise</p>
            <p className="font-dl-serif text-lg sm:text-xl text-dl-navy">{fmt(targetRaise)}</p>
          </div>
          <div className="border border-dl-border p-3">
            <p className="font-dl-mono text-[10px] sm:text-xs text-dl-muted uppercase">Committed</p>
            <p className="font-dl-serif text-lg sm:text-xl text-green-700">{fmt(totalCommitted)}</p>
            {targetRaise > 0 && (
              <div className="mt-1 w-full h-1.5 bg-gray-200">
                <div className="h-full bg-green-600" style={{ width: `${raisePct}%` }} />
              </div>
            )}
          </div>
          <div className="border border-dl-border p-3">
            <p className="font-dl-mono text-[10px] sm:text-xs text-dl-muted uppercase">Total Settled</p>
            <p className="font-dl-serif text-lg sm:text-xl text-dl-navy">{fmt(totalFunded)}</p>
          </div>
          <div className="border border-dl-border p-3">
            <p className="font-dl-mono text-[10px] sm:text-xs text-dl-muted uppercase">Pipeline / Subs</p>
            <p className="font-dl-serif text-lg sm:text-xl text-dl-navy">{offering.pipeline_count} / {offering.subscription_count}</p>
          </div>
        </div>

        <div className="flex border-b border-dl-border mb-6 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 sm:px-4 py-2.5 font-dl-mono text-xs sm:text-sm border-b-2 -mb-px whitespace-nowrap min-h-[44px] ${
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
              <div className="flex items-center gap-3">
                <p className="font-dl-mono text-xs text-dl-muted">{documents.length} documents</p>
                {isOperator && (
                  <button
                    onClick={() => setShowDocUpload(!showDocUpload)}
                    className="px-3 py-1 bg-dl-navy text-white font-dl-mono text-xs"
                  >
                    {showDocUpload ? 'Cancel' : 'Add Document'}
                  </button>
                )}
              </div>
            </div>

            {showDocUpload && (
              <div className="border border-dl-border p-4 space-y-3">
                <h3 className="font-dl-serif text-sm text-dl-navy">Upload Document</h3>
                {docUploadError && (
                  <div className="border border-red-200 bg-red-50 p-2 text-xs text-red-700">{docUploadError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-dl-muted mb-1 font-dl-mono">Document Name</label>
                    <input
                      type="text"
                      value={docForm.name}
                      onChange={e => setDocForm({ ...docForm, name: e.target.value })}
                      className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono"
                      placeholder="Q4 2025 Financial Statement"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-dl-muted mb-1 font-dl-mono">Document Type</label>
                    <select
                      value={docForm.docType}
                      onChange={e => setDocForm({ ...docForm, docType: e.target.value })}
                      className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono bg-white"
                    >
                      <option value="ppm">PPM</option>
                      <option value="subscription_agreement">Subscription Agreement</option>
                      <option value="operating_agreement">Operating Agreement</option>
                      <option value="k1">K-1</option>
                      <option value="capital_call_notice">Capital Call Notice</option>
                      <option value="distribution_notice">Distribution Notice</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-dl-muted mb-1 font-dl-mono">Visibility</label>
                    <select
                      value={docForm.visibility}
                      onChange={e => setDocForm({ ...docForm, visibility: e.target.value })}
                      className="w-full border border-dl-border px-3 py-2 text-sm font-dl-mono bg-white"
                    >
                      <option value="private">Private (Operators Only)</option>
                      <option value="investor">Investor (Subscribed LPs)</option>
                      <option value="public">Public</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-dl-muted mb-1 font-dl-mono">File (PDF, DOCX, XLSX, PNG, JPG — max 20MB)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
                    onChange={e => setDocFile(e.target.files?.[0] || null)}
                    className="w-full text-sm font-dl-mono"
                  />
                  {docFile && (
                    <p className="text-xs text-dl-muted mt-1 font-dl-mono">
                      {docFile.name} ({(docFile.size / 1024 / 1024).toFixed(1)}MB)
                    </p>
                  )}
                </div>
                <button
                  onClick={handleDocUpload}
                  disabled={uploadingDoc || !docForm.name || !docFile}
                  className="px-4 py-2 bg-dl-navy text-white font-dl-mono text-sm disabled:opacity-50"
                >
                  {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            )}

            {documents.length === 0 ? (
              <div className="border border-dl-border p-6 sm:p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted">No documents uploaded yet.</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block border border-dl-border">
                  <table className="w-full font-dl-mono text-sm">
                    <thead>
                      <tr className="bg-dl-bg border-b border-dl-border text-left">
                        <th className="px-4 py-2 text-xs text-dl-muted uppercase">Name</th>
                        <th className="px-4 py-2 text-xs text-dl-muted uppercase">Type</th>
                        <th className="px-4 py-2 text-xs text-dl-muted uppercase">Visibility</th>
                        <th className="px-4 py-2 text-xs text-dl-muted uppercase">Size</th>
                        <th className="px-4 py-2 text-xs text-dl-muted uppercase">Date</th>
                        <th className="px-4 py-2 text-xs text-dl-muted uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc: any) => (
                        <tr key={doc.id} className="border-b border-dl-border">
                          <td className="px-4 py-2 text-dl-text">
                            {doc.url ? (
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" className="underline text-dl-navy">
                                {doc.name}
                              </a>
                            ) : doc.name}
                          </td>
                          <td className="px-4 py-2 text-dl-muted text-xs uppercase">{doc.doc_type?.replace(/_/g, ' ')}</td>
                          <td className="px-4 py-2 text-xs">
                            <span className={
                              doc.visibility === 'public' ? 'text-green-600' :
                              doc.visibility === 'investor' ? 'text-blue-600' :
                              'text-dl-muted'
                            }>
                              {doc.visibility}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-dl-muted text-xs">
                            {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)}KB` : '\u2014'}
                          </td>
                          <td className="px-4 py-2 text-dl-muted text-xs">{new Date(doc.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-2 text-xs">
                            <div className="flex items-center gap-2">
                              {doc.url && (
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline">
                                  View
                                </a>
                              )}
                              {isOperator && (
                                <button
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  disabled={deletingDocId === doc.id}
                                  className="text-red-600 hover:underline disabled:opacity-50"
                                >
                                  {deletingDocId === doc.id ? '...' : 'Delete'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="border border-dl-border p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          {doc.url ? (
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="font-dl-mono text-sm text-dl-navy underline truncate block">
                              {doc.name}
                            </a>
                          ) : <p className="font-dl-mono text-sm text-dl-text truncate">{doc.name}</p>}
                          <p className="font-dl-mono text-[10px] text-dl-muted mt-0.5">
                            {doc.doc_type?.replace(/_/g, ' ')} | {new Date(doc.created_at).toLocaleDateString()}
                            {doc.file_size ? ` | ${(doc.file_size / 1024).toFixed(0)}KB` : ''}
                          </p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 flex-shrink-0 ${
                          doc.visibility === 'public' ? 'text-green-600 bg-green-50' :
                          doc.visibility === 'investor' ? 'text-blue-600 bg-blue-50' :
                          'text-dl-muted bg-gray-50'
                        }`}>{doc.visibility}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 min-h-[44px] flex items-center border border-dl-navy text-dl-navy text-xs font-dl-mono">
                            View
                          </a>
                        )}
                        {isOperator && (
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            disabled={deletingDocId === doc.id}
                            className="px-3 py-1.5 min-h-[44px] text-xs text-red-600 font-dl-mono disabled:opacity-50"
                          >
                            {deletingDocId === doc.id ? '...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'investors' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="font-dl-serif text-lg text-dl-navy">Investor Pipeline</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {pipelineSummary && (
                  <p className="font-dl-mono text-xs text-dl-muted">
                    {pipelineSummary.total} investors | {fmt(pipelineSummary.totalSoftCircle)} soft | {fmt(pipelineSummary.totalCommitted)} committed
                  </p>
                )}
                <button
                  onClick={() => setShowAddInvestor(!showAddInvestor)}
                  className="bg-dl-navy text-white px-3 py-2 min-h-[44px] font-dl-mono text-xs w-full sm:w-auto"
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
              <div className="border border-dl-border p-6 sm:p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted mb-2">No investors in pipeline yet.</p>
                <button
                  onClick={() => setShowAddInvestor(true)}
                  className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm"
                >
                  Add First Investor
                </button>
              </div>
            ) : pipeline.length > 0 && (
              <>
                <div className="hidden md:block border border-dl-border">
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
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {pipeline.map((p: any) => (
                    <div key={p.id} className="border border-dl-border p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-dl-mono text-sm text-dl-text">{p.legal_name || p.entity_name || 'Unknown'}</p>
                          {p.email && <p className="font-dl-mono text-[10px] text-dl-muted">{p.email}</p>}
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] font-dl-mono ${STAGE_COLORS[p.stage] || 'bg-gray-100 text-gray-600'}`}>
                          {p.stage}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono">
                        <div>
                          <p className="text-[10px] text-dl-muted uppercase">Soft Circle</p>
                          <p className="text-dl-navy">{p.soft_circle_amount ? fmt(parseFloat(p.soft_circle_amount)) : '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-dl-muted uppercase">Committed</p>
                          <p className="text-dl-navy">{p.committed_amount ? fmt(parseFloat(p.committed_amount)) : '—'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="font-dl-serif text-lg text-dl-navy">Subscriptions</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {subSummary && (
                  <p className="font-dl-mono text-xs text-dl-muted">
                    {subSummary.total} total | {fmt(subSummary.totalCommitted)} committed
                  </p>
                )}
                <button
                  onClick={() => setShowAddSub(!showAddSub)}
                  className="bg-dl-navy text-white px-3 py-2 min-h-[44px] font-dl-mono text-xs w-full sm:w-auto"
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Payment Currency</label>
                    <select
                      value={subForm.paymentCurrency}
                      onChange={e => setSubForm(p => ({ ...p, paymentCurrency: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                    >
                      <option value="USD">USD (Fiat)</option>
                      <option value="AXUSD">AXUSD (On-chain)</option>
                    </select>
                  </div>
                  {subForm.paymentCurrency === 'AXUSD' && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Investor Wallet Address</label>
                      <input
                        value={subForm.investorWallet}
                        onChange={e => setSubForm(p => ({ ...p, investorWallet: e.target.value }))}
                        placeholder="0x..."
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                      />
                      <p className="font-dl-mono text-[10px] text-dl-muted mt-0.5">Wallet must be KYC-verified for AXUSD transfers (ERC-3643).</p>
                    </div>
                  )}
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
              <div className="border border-dl-border p-6 sm:p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted mb-2">No subscriptions yet.</p>
                <button
                  onClick={() => setShowAddSub(true)}
                  className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm"
                >
                  Record First Subscription
                </button>
              </div>
            ) : subscriptions.length > 0 && (
              <>
              <div className="md:hidden grid grid-cols-1 gap-3">
                {subscriptions.map((s: any) => (
                  <div key={`mobile-sub-${s.id}`} className="border border-dl-border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-dl-mono text-sm text-dl-text pr-2">{s.legal_name || s.entity_name || 'Unknown'}</p>
                      <span className={`px-2 py-0.5 text-[10px] flex-shrink-0 ${
                        s.status === 'approved' || s.status === 'funded' ? 'bg-green-50 text-green-700' :
                        s.status === 'rejected' || s.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>{s.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono mb-3">
                      <div>
                        <p className="text-[10px] text-dl-muted uppercase">Amount</p>
                        <p className="text-dl-navy">{fmt(parseFloat(s.amount || '0'))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-dl-muted uppercase">Class</p>
                        <p className="text-dl-navy">{s.meta?.share_class || s.share_class || 'common'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-dl-muted uppercase">Method</p>
                        <p className="text-dl-navy">{s.funding_method || '—'}{s.payment_currency === 'AXUSD' ? ' (AXUSD)' : ''}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {s.status === 'draft' && (
                        <button onClick={() => handleSubAction(s.id, 'submitted')} className="px-2 py-1 min-h-[44px] text-xs bg-blue-50 text-blue-700 font-dl-mono">Submit</button>
                      )}
                      {(s.status === 'submitted' || s.status === 'under_review') && (
                        <>
                          <button onClick={() => handleSubAction(s.id, 'approved')} className="px-2 py-1 min-h-[44px] text-xs bg-green-50 text-green-700 font-dl-mono">Approve</button>
                          <button onClick={() => handleSubAction(s.id, 'rejected')} className="px-2 py-1 min-h-[44px] text-xs bg-red-50 text-red-600 font-dl-mono">Reject</button>
                        </>
                      )}
                      {s.status === 'approved' && (
                        <button onClick={() => handleSubAction(s.id, 'funded')} className="px-2 py-1 min-h-[44px] text-xs bg-green-100 text-green-800 font-dl-mono">Mark Funded</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block border border-dl-border">
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
                        <td className="px-4 py-2 text-dl-muted text-xs">
                          {s.funding_method || '—'}
                          {s.payment_currency === 'AXUSD' && (
                            <span className="ml-1 px-1 py-0.5 text-[10px] bg-blue-50 text-blue-700">AXUSD</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-1 flex-wrap">
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
                              <>
                                <button onClick={() => handleSubAction(s.id, 'funded')} className="px-2 py-0.5 text-xs bg-green-100 text-green-800 font-dl-mono">Mark Funded</button>
                                <button
                                  onClick={() => {
                                    if (showCapCallForm === s.id) { setShowCapCallForm(null); return; }
                                    setShowCapCallForm(s.id);
                                    setCapCallForm({ amountCalled: s.amount || '', dueDate: '', currency: s.payment_currency || 'USD', triggerACH: false });
                                  }}
                                  className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 font-dl-mono"
                                >
                                  {showCapCallForm === s.id ? 'Cancel Call' : 'Capital Call'}
                                </button>
                                <button onClick={() => handleLoadFundingInstructions(s.id)} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 font-dl-mono">
                                  {showFundingInstructions === s.id ? 'Hide Instructions' : 'Funding Instructions'}
                                </button>
                              </>
                            )}
                            {s.status === 'funded' && (
                              <>
                                <button
                                  onClick={() => {
                                    setShowReceiptForm(showReceiptForm === s.id ? null : s.id);
                                    setReceiptForm({ externalRef: '', amount: s.amount || '', settlementDate: '', fundingMethod: s.funding_method || 'wire' });
                                  }}
                                  className="px-2 py-0.5 text-xs bg-green-100 text-green-800 font-dl-mono"
                                >
                                  Record Receipt
                                </button>
                                <button onClick={() => handleLoadFundingInstructions(s.id)} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 font-dl-mono">
                                  {showFundingInstructions === s.id ? 'Hide Instructions' : 'Funding Instructions'}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {showFundingInstructions === s.id && (
                        <tr className="bg-gray-50 border-b border-dl-border">
                          <td colSpan={6} className="px-4 py-3">
                            {loadingInstructions ? (
                              <p className="font-dl-mono text-xs text-dl-muted">Loading funding instructions...</p>
                            ) : fundingInstructions ? (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-dl-mono text-xs text-dl-muted uppercase">Funding Instructions</h4>
                                  <span className="font-dl-mono text-xs bg-dl-navy text-white px-2 py-0.5">{fundingInstructions.memoCode}</span>
                                </div>
                                {(!s.payment_currency || s.payment_currency === 'USD') ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Bank Name</p>
                                      <p className="font-dl-mono text-sm text-dl-text">{fundingInstructions.bankDetails.bankName}</p>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Beneficiary</p>
                                      <p className="font-dl-mono text-sm text-dl-text">{fundingInstructions.bankDetails.beneficiary}</p>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Routing Number</p>
                                      <p className="font-dl-mono text-sm text-dl-text">{fundingInstructions.bankDetails.routingNumber || 'Contact operations'}</p>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Account Number</p>
                                      <p className="font-dl-mono text-sm text-dl-text">{fundingInstructions.bankDetails.accountNumber || 'Contact operations'}</p>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Wire Memo</p>
                                      <p className="font-dl-mono text-sm text-dl-text font-bold">{fundingInstructions.memoCode}</p>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Amount Due</p>
                                      <p className="font-dl-mono text-sm text-dl-text">{fmt(parseFloat(s.amount || '0'))}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                      <p className="font-dl-mono text-[10px] text-dl-muted">{fundingInstructions.bankDetails.note}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="md:col-span-2">
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Treasury Wallet (Arbitrum One)</p>
                                      <div className="flex items-center gap-2">
                                        <p className="font-dl-mono text-sm text-dl-text">{fundingInstructions.treasuryWallet ? `${fundingInstructions.treasuryWallet.slice(0, 6)}...${fundingInstructions.treasuryWallet.slice(-4)}` : 'Not configured'}</p>
                                        {fundingInstructions.treasuryWallet && (
                                          <button
                                            onClick={() => copyToClipboard(fundingInstructions.treasuryWallet)}
                                            className="px-2 py-0.5 text-[10px] bg-gray-200 text-gray-700 font-dl-mono flex-shrink-0"
                                          >
                                            Copy
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">AXUSD Contract</p>
                                      <p className="font-dl-mono text-sm text-dl-text break-all">{fundingInstructions.axusdContract}</p>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Amount Due</p>
                                      <p className="font-dl-mono text-sm text-dl-text">{parseFloat(s.amount || '0').toLocaleString()} AXUSD</p>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Network</p>
                                      <p className="font-dl-mono text-sm text-dl-text">{fundingInstructions.network}</p>
                                    </div>
                                    <div>
                                      <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-0.5">Memo</p>
                                      <p className="font-dl-mono text-sm text-dl-text font-bold">{fundingInstructions.memoCode}</p>
                                    </div>
                                  </div>
                                )}
                                <button
                                  onClick={() => {
                                    const isAxusd = s.payment_currency === 'AXUSD';
                                    const text = isAxusd
                                      ? `AXUSD Payment Instructions\nWallet: ${fundingInstructions.treasuryWallet}\nNetwork: ${fundingInstructions.network}\nAmount: ${parseFloat(s.amount || '0').toLocaleString()} AXUSD\nMemo: ${fundingInstructions.memoCode}\nContract: ${fundingInstructions.axusdContract}`
                                      : `Wire Instructions\nBank: ${fundingInstructions.bankDetails.bankName}\nBeneficiary: ${fundingInstructions.bankDetails.beneficiary}\nRouting: ${fundingInstructions.bankDetails.routingNumber}\nAccount: ${fundingInstructions.bankDetails.accountNumber}\nAmount: ${fmt(parseFloat(s.amount || '0'))}\nMemo: ${fundingInstructions.memoCode}`;
                                    copyToClipboard(text);
                                  }}
                                  className="px-3 py-1 text-xs bg-dl-navy text-white font-dl-mono"
                                >
                                  Copy Instructions
                                </button>
                              </div>
                            ) : (
                              <p className="font-dl-mono text-xs text-red-600">Failed to load funding instructions.</p>
                            )}
                          </td>
                        </tr>
                      )}
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
                      {showCapCallForm === s.id && (
                        <tr className="bg-orange-50 border-b border-dl-border">
                          <td colSpan={6} className="px-4 py-3">
                            <h4 className="font-dl-mono text-xs text-dl-muted uppercase mb-3">Issue Capital Call</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                              <div>
                                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Amount Called ($)</label>
                                <input
                                  type="number"
                                  value={capCallForm.amountCalled}
                                  onChange={e => setCapCallForm(p => ({ ...p, amountCalled: e.target.value }))}
                                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Due Date</label>
                                <input
                                  type="date"
                                  value={capCallForm.dueDate}
                                  onChange={e => setCapCallForm(p => ({ ...p, dueDate: e.target.value }))}
                                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-dl-mono text-dl-muted mb-1">Currency</label>
                                <select
                                  value={capCallForm.currency}
                                  onChange={e => setCapCallForm(p => ({ ...p, currency: e.target.value }))}
                                  className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                                >
                                  <option value="USD">USD</option>
                                  <option value="AXUSD">AXUSD</option>
                                </select>
                              </div>
                              {capCallForm.currency === 'USD' && s.investor_meta?.unitCustomerId && (
                                <div className="flex items-center gap-2 pt-5">
                                  <input
                                    type="checkbox"
                                    checked={capCallForm.triggerACH}
                                    onChange={e => setCapCallForm(p => ({ ...p, triggerACH: e.target.checked }))}
                                    id={`ach-${s.id}`}
                                    className="accent-dl-navy"
                                  />
                                  <label htmlFor={`ach-${s.id}`} className="font-dl-mono text-xs text-dl-muted">Trigger ACH debit</label>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSendCapitalCall(s.id)}
                                disabled={sendingCapCall || !capCallForm.amountCalled}
                                className="bg-orange-600 text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                              >
                                {sendingCapCall ? 'Sending...' : 'Send Capital Call'}
                              </button>
                              <button
                                onClick={() => setShowCapCallForm(null)}
                                className="px-4 py-1.5 font-dl-mono text-sm text-dl-muted border border-dl-border"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {(() => {
                        const subCalls = capitalCalls.filter((cc: any) => cc.subscription_id === s.id);
                        if (subCalls.length === 0) return null;
                        return (
                          <tr className="border-b border-dl-border">
                            <td colSpan={6} className="px-4 py-1">
                              <button
                                onClick={() => setShowCapCallHistory(showCapCallHistory === s.id ? null : s.id)}
                                className="font-dl-mono text-[10px] text-dl-muted hover:text-dl-navy"
                              >
                                {showCapCallHistory === s.id ? 'Hide' : 'Show'} Capital Calls ({subCalls.length})
                              </button>
                              {showCapCallHistory === s.id && (
                                <div className="mt-2 mb-1 space-y-1">
                                  {subCalls.map((cc: any) => (
                                    <div key={cc.id} className="flex items-center justify-between bg-gray-50 px-3 py-1.5 text-xs font-dl-mono">
                                      <div className="flex items-center gap-3">
                                        <span className="text-dl-muted">{new Date(cc.sent_at || cc.created_at).toLocaleDateString()}</span>
                                        <span className="text-dl-text">{fmt(parseFloat(cc.amount_called || '0'))} {cc.currency}</span>
                                        <span className={`px-1.5 py-0.5 text-[10px] ${
                                          cc.status === 'funded' ? 'bg-green-50 text-green-700' :
                                          cc.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                                          cc.status === 'acknowledged' ? 'bg-blue-50 text-blue-700' :
                                          'bg-yellow-50 text-yellow-700'
                                        }`}>{cc.status}</span>
                                        {cc.due_date && <span className="text-dl-muted">due {new Date(cc.due_date).toLocaleDateString()}</span>}
                                      </div>
                                      <div className="flex gap-1">
                                        {cc.status === 'sent' && (
                                          <button onClick={() => handleCapCallStatusUpdate(cc.id, 'acknowledged')} className="px-1.5 py-0.5 text-[10px] bg-blue-50 text-blue-700">Ack</button>
                                        )}
                                        {(cc.status === 'sent' || cc.status === 'acknowledged') && (
                                          <button onClick={() => handleCapCallStatusUpdate(cc.id, 'funded')} className="px-1.5 py-0.5 text-[10px] bg-green-50 text-green-700">Funded</button>
                                        )}
                                        {cc.status !== 'funded' && cc.status !== 'cancelled' && (
                                          <button onClick={() => handleCapCallStatusUpdate(cc.id, 'cancelled')} className="px-1.5 py-0.5 text-[10px] bg-red-50 text-red-600">Cancel</button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'capTable' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="font-dl-serif text-lg text-dl-navy">Capital Table</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {capSummary && (
                  <p className="font-dl-mono text-xs text-dl-muted">
                    {capSummary.holderCount} holders | {fmt(capSummary.totalCapital)} capital
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
              <div className="border border-dl-border p-6 sm:p-8 text-center">
                <p className="font-dl-mono text-sm text-dl-muted mb-2">Capital table will populate when subscriptions are funded.</p>
                <button
                  onClick={handleSyncCapTable}
                  disabled={syncingCap}
                  className="bg-dl-navy text-white px-4 py-2 min-h-[44px] font-dl-mono text-sm disabled:opacity-50"
                >
                  {syncingCap ? 'Syncing...' : 'Rebuild from Funded Subscriptions'}
                </button>
              </div>
            ) : (
              <>
                <div className="hidden md:block border border-dl-border">
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
                <div className="md:hidden grid grid-cols-1 gap-3">
                  {capTable.map((c: any) => (
                    <div key={c.id} className="border border-dl-border p-4">
                      <p className="font-dl-mono text-sm text-dl-text mb-2">{c.legal_name || c.entity_name || 'Unknown'}</p>
                      <div className="grid grid-cols-3 gap-2 text-xs font-dl-mono">
                        <div>
                          <p className="text-[10px] text-dl-muted uppercase">Class</p>
                          <p className="text-dl-navy">{c.share_class || 'A'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-dl-muted uppercase">Ownership</p>
                          <p className="text-dl-navy">{parseFloat(c.ownership_pct || '0').toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-dl-muted uppercase">Capital</p>
                          <p className="text-dl-navy">{fmt(parseFloat(c.capital_contributed || '0'))}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'distributions' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="font-dl-serif text-lg text-dl-navy">Distributions</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
                {distSummary && (
                  <p className="font-dl-mono text-xs text-dl-muted">
                    {distSummary.total} entries | {fmt(distSummary.totalGross)} gross | {distSummary.completedCount} paid
                  </p>
                )}
                <button
                  onClick={() => setShowCreateDist(!showCreateDist)}
                  className="bg-dl-navy text-white px-3 py-2 min-h-[44px] font-dl-mono text-xs w-full sm:w-auto"
                >
                  {showCreateDist ? 'Cancel' : 'Create Distribution'}
                </button>
              </div>
            </div>

            <div className="border border-dl-border">
              <button
                onClick={() => {
                  const opening = !showWaterfall;
                  setShowWaterfall(opening);
                  if (opening) {
                    setWaterfallResult(null);
                    setWaterfallForm(p => ({ ...p, preferredRate: offering?.preferred_return || '' }));
                  }
                }}
                className="w-full flex items-center justify-between px-4 py-2 bg-dl-bg font-dl-mono text-sm text-dl-navy"
              >
                <span>Waterfall Calculator</span>
                <span className="text-xs text-dl-muted">{showWaterfall ? 'Collapse' : 'Expand'}</span>
              </button>
              {showWaterfall && (
                <div className="p-4 space-y-3">
                  <p className="font-dl-mono text-xs text-dl-muted">
                    Compute LP/GP split using preferred return + promote structure from offering terms.
                    {offering?.preferred_return && ` Preferred Return: ${offering.preferred_return}%.`}
                    {offering?.promote_split && ` GP Promote: ${offering.promote_split}%.`}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Gross Distributable ($)</label>
                      <input
                        type="number"
                        value={waterfallForm.grossAmount}
                        onChange={e => setWaterfallForm(p => ({ ...p, grossAmount: e.target.value }))}
                        placeholder="100000"
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Capital Deployed ($)</label>
                      <input
                        type="number"
                        value={waterfallForm.capitalDeployed}
                        onChange={e => setWaterfallForm(p => ({ ...p, capitalDeployed: e.target.value }))}
                        placeholder="Auto from cap table"
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Preferred Return Rate (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={waterfallForm.preferredRate}
                        onChange={e => setWaterfallForm(p => ({ ...p, preferredRate: e.target.value }))}
                        placeholder={offering?.preferred_return || '8'}
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Period Start</label>
                      <input
                        type="date"
                        value={waterfallForm.periodStart}
                        onChange={e => setWaterfallForm(p => ({ ...p, periodStart: e.target.value }))}
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Period End</label>
                      <input
                        type="date"
                        value={waterfallForm.periodEnd}
                        onChange={e => setWaterfallForm(p => ({ ...p, periodEnd: e.target.value }))}
                        className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCalculateWaterfall}
                    disabled={calculatingWaterfall || !waterfallForm.grossAmount}
                    className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                  >
                    {calculatingWaterfall ? 'Calculating...' : 'Calculate'}
                  </button>

                  {waterfallResult && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-dl-mono">
                        <div className="border border-dl-border p-2">
                          <p className="text-dl-muted">Gross Amount</p>
                          <p className="text-dl-navy text-sm">{fmt(waterfallResult.grossAmount)}</p>
                        </div>
                        <div className="border border-dl-border p-2">
                          <p className="text-dl-muted">Capital Deployed</p>
                          <p className="text-dl-navy text-sm">{fmt(waterfallResult.capitalDeployed)}</p>
                        </div>
                        <div className="border border-dl-border p-2">
                          <p className="text-dl-muted">Pref Return Rate</p>
                          <p className="text-dl-navy text-sm">{waterfallResult.preferredRate}%</p>
                        </div>
                        <div className="border border-dl-border p-2">
                          <p className="text-dl-muted">Period Fraction</p>
                          <p className="text-dl-navy text-sm">{waterfallResult.fractionOfYear} yr</p>
                        </div>
                      </div>

                      <div className="border border-dl-border">
                        <table className="w-full font-dl-mono text-sm">
                          <thead>
                            <tr className="bg-dl-bg border-b border-dl-border text-left">
                              <th className="px-4 py-2 text-xs text-dl-muted uppercase">Tranche</th>
                              <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">LP Amount</th>
                              <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">GP Amount</th>
                              <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {waterfallResult.tranches.map((t: any, i: number) => (
                              <tr key={i} className="border-b border-dl-border">
                                <td className="px-4 py-2 text-dl-text">{t.name}</td>
                                <td className="px-4 py-2 text-right text-green-700">{fmt(t.lpAmount)}</td>
                                <td className="px-4 py-2 text-right text-blue-700">{fmt(t.gpAmount)}</td>
                                <td className="px-4 py-2 text-right">{fmt(t.total)}</td>
                              </tr>
                            ))}
                            <tr className="bg-dl-bg font-bold">
                              <td className="px-4 py-2 text-dl-navy">Totals</td>
                              <td className="px-4 py-2 text-right text-green-700">{fmt(waterfallResult.totals.lpAmount)}</td>
                              <td className="px-4 py-2 text-right text-blue-700">{fmt(waterfallResult.totals.gpAmount)}</td>
                              <td className="px-4 py-2 text-right">{fmt(waterfallResult.totals.total)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <button
                        onClick={handleUseWaterfallNumbers}
                        className="bg-green-700 text-white px-4 py-1.5 font-dl-mono text-sm"
                      >
                        Use These Numbers — Create Distribution ({fmt(waterfallResult.totals.lpAmount)} LP)
                      </button>
                      <p className="font-dl-mono text-[10px] text-dl-muted">
                        GP amount ({fmt(waterfallResult.totals.gpAmount)}) is informational. GP payment is handled separately.
                      </p>
                    </div>
                  )}
                </div>
              )}
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
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Currency</label>
                    <select
                      value={distForm.currency}
                      onChange={e => setDistForm(p => ({ ...p, currency: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                    >
                      <option value="USD">USD (Fiat)</option>
                      <option value="AXUSD">AXUSD (On-chain)</option>
                    </select>
                  </div>
                </div>
                {distForm.currency === 'AXUSD' && (
                  <div className="mb-3">
                    <p className="font-dl-mono text-xs text-dl-muted">
                      AXUSD distributions use each investor's wallet address from their profile.
                      All investor wallets must be KYC-verified on the Identity Registry (ERC-3643).
                      Distributions will fail to create if any investor lacks a valid wallet address.
                    </p>
                  </div>
                )}
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
              <>
              <div className="md:hidden grid grid-cols-1 gap-3">
                {distributions.map((d: any) => (
                  <div key={`mobile-dist-${d.id}`} className="border border-dl-border p-4">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-dl-mono text-sm text-dl-text pr-2">{d.legal_name || d.entity_name || 'Unknown'}</p>
                      <span className={`px-2 py-0.5 text-[10px] flex-shrink-0 ${
                        d.status === 'completed' ? 'bg-green-50 text-green-700' :
                        d.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                        d.status === 'failed' ? 'bg-red-50 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>{d.status}</span>
                    </div>
                    <p className="font-dl-mono text-[10px] text-dl-muted uppercase mb-2">{d.distribution_type.replace(/_/g, ' ')}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-dl-mono mb-2">
                      <div>
                        <p className="text-[10px] text-dl-muted uppercase">Gross</p>
                        <p className="text-dl-navy">{fmt(parseFloat(d.gross_amount || '0'))}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-dl-muted uppercase">Net</p>
                        <p className="text-green-700">{fmt(parseFloat(d.net_amount || '0'))}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {d.status === 'draft' && (
                        <>
                          <button onClick={() => handleDistAction(d.id, 'approved')} className="px-2 py-1 min-h-[44px] text-xs bg-green-50 text-green-700 font-dl-mono">Approve</button>
                          <button onClick={() => handleDeleteDist(d.id)} className="px-2 py-1 min-h-[44px] text-xs bg-red-50 text-red-600 font-dl-mono">Delete</button>
                        </>
                      )}
                      {d.status === 'approved' && (
                        <button onClick={() => handleDistAction(d.id, 'processing')} className="px-2 py-1 min-h-[44px] text-xs bg-blue-50 text-blue-700 font-dl-mono">Process</button>
                      )}
                      {d.status === 'processing' && (
                        <button onClick={() => handleDistAction(d.id, 'completed')} className="px-2 py-1 min-h-[44px] text-xs bg-green-100 text-green-800 font-dl-mono">Mark Paid</button>
                      )}
                      {d.status === 'completed' && d.paid_at && (
                        <span className="px-2 py-1 text-[10px] text-dl-muted font-dl-mono">Paid {new Date(d.paid_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block border border-dl-border">
                <table className="w-full font-dl-mono text-sm">
                  <thead>
                    <tr className="bg-dl-bg border-b border-dl-border text-left">
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Investor</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Type</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Gross</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Net</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase text-right">Ownership</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Period</th>
                      <th className="px-4 py-2 text-xs text-dl-muted uppercase">Currency</th>
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
                          <span className={`px-1.5 py-0.5 text-xs font-dl-mono ${d.currency === 'AXUSD' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {d.currency || 'USD'}
                          </span>
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
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1 items-center">
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
                                distPaying === d.id ? (
                                  <span className="px-2 py-0.5 text-xs bg-yellow-50 text-yellow-700 font-dl-mono">Processing payment...</span>
                                ) : (
                                  <button onClick={() => handleDistAction(d.id, 'completed')} className="px-2 py-0.5 text-xs bg-green-100 text-green-800 font-dl-mono">Mark Paid</button>
                                )
                              )}
                              {d.status === 'completed' && d.paid_at && (
                                <span className="px-2 py-0.5 text-xs text-dl-muted font-dl-mono">
                                  Paid {new Date(d.paid_at).toLocaleDateString()}
                                </span>
                              )}
                              {d.status === 'completed' && d.meta?.tx_hash && (
                                <a
                                  href={`https://arbiscan.io/tx/${d.meta.tx_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 font-dl-mono underline"
                                >
                                  {d.meta.tx_hash.slice(0, 10)}...
                                </a>
                              )}
                              {d.status === 'completed' && d.meta?.unit_payment_id && (
                                <span className="px-2 py-0.5 text-xs bg-gray-50 text-gray-600 font-dl-mono">
                                  Unit: {d.meta.unit_payment_id}
                                </span>
                              )}
                              {d.status === 'failed' && (
                                <button onClick={() => handleDistAction(d.id, 'processing')} className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 font-dl-mono">Retry</button>
                              )}
                            </div>
                            {distPayError[d.id] && (
                              <p className="font-dl-mono text-[10px] text-red-600">{distPayError[d.id]}</p>
                            )}
                            {d.status === 'failed' && d.meta?.error && !distPayError[d.id] && (
                              <p className="font-dl-mono text-[10px] text-red-600">{d.meta.error}</p>
                            )}
                            {d.currency === 'AXUSD' && d.status !== 'completed' && (
                              <p className="font-dl-mono text-[10px] text-dl-muted">
                                {d.recipient_wallet ? `Wallet: ${d.recipient_wallet.slice(0, 8)}...${d.recipient_wallet.slice(-6)}` : 'No recipient wallet'}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}

            {distPayConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center">
                <div className="bg-white border border-dl-border p-6 max-w-md w-full mx-4">
                  <h3 className="font-dl-serif text-lg text-dl-navy mb-3">Confirm Payment</h3>
                  {(distPayConfirm.currency === 'AXUSD') ? (
                    <p className="font-dl-mono text-sm text-dl-text mb-4">
                      This will transfer {parseFloat(distPayConfirm.net_amount || '0').toLocaleString()} AXUSD on-chain to{' '}
                      <span className="font-bold">{distPayConfirm.recipient_wallet || distPayConfirm.wallet_address || 'investor wallet'}</span>.
                      Ensure the wallet is KYC-verified.
                    </p>
                  ) : (
                    <p className="font-dl-mono text-sm text-dl-text mb-4">
                      This will initiate a payment of ${parseFloat(distPayConfirm.net_amount || '0').toLocaleString()} to{' '}
                      <span className="font-bold">{distPayConfirm.legal_name || distPayConfirm.entity_name || 'investor'}</span>&apos;s linked bank account.
                    </p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setDistPayConfirm(null)}
                      className="px-4 py-1.5 font-dl-mono text-sm border border-dl-border"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDistPayConfirmed}
                      className="px-4 py-1.5 font-dl-mono text-sm bg-dl-navy text-white"
                    >
                      Confirm Payment
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-dl-serif text-lg text-dl-navy">Offering Reports</h2>
              <div className="flex items-center gap-3">
                <p className="font-dl-mono text-xs text-dl-muted">{reports.length} published</p>
                <button
                  onClick={() => setShowReportForm(!showReportForm)}
                  className="bg-dl-navy text-white px-3 py-1 font-dl-mono text-xs"
                >
                  {showReportForm ? 'Collapse Form' : 'Expand Form'}
                </button>
              </div>
            </div>

            {showReportForm && (
              <div className="border border-dl-navy p-4 bg-gray-50">
                <h3 className="font-dl-mono text-xs text-dl-muted uppercase mb-3">New Report</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Title</label>
                    <input
                      value={reportForm.title}
                      onChange={e => setReportForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Q1 2026 Investor Update"
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-dl-mono text-dl-muted mb-1">Report Type</label>
                    <select
                      value={reportForm.reportType}
                      onChange={e => setReportForm(p => ({ ...p, reportType: e.target.value }))}
                      className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                    >
                      <option value="quarterly">Quarterly Update</option>
                      <option value="annual">Annual Report</option>
                      <option value="tax">Tax Document (K-1)</option>
                      <option value="operational">Operational Update</option>
                      <option value="distribution">Distribution Notice</option>
                      <option value="capital_call">Capital Call Notice</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-xs font-dl-mono text-dl-muted mb-1">Content</label>
                  <textarea
                    value={reportForm.content}
                    onChange={e => setReportForm(p => ({ ...p, content: e.target.value }))}
                    rows={4}
                    placeholder="Report content..."
                    className="w-full border border-dl-border px-2 py-1.5 font-dl-mono text-sm"
                  />
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <label className="flex items-center gap-2 font-dl-mono text-sm text-dl-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportForm.notifyInvestors}
                      onChange={e => setReportForm(p => ({ ...p, notifyInvestors: e.target.checked }))}
                      className="w-4 h-4"
                    />
                    Notify Investors by Email
                  </label>
                </div>
                <button
                  onClick={handlePublishReport}
                  disabled={publishingReport || !reportForm.title}
                  className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                >
                  {publishingReport ? 'Publishing...' : 'Publish Report'}
                </button>
              </div>
            )}

            <div className="border border-dl-border">
              <button
                onClick={() => {
                  setShowK1Generator(!showK1Generator);
                  if (!showK1Generator) setK1Result(null);
                }}
                className="w-full flex items-center justify-between px-4 py-2 bg-dl-bg font-dl-mono text-sm text-dl-navy"
              >
                <span>Generate K-1 Package</span>
                <span className="text-xs text-dl-muted">{showK1Generator ? 'Collapse' : 'Expand'}</span>
              </button>
              {showK1Generator && (
                <div className="p-4 space-y-3">
                  <p className="font-dl-mono text-xs text-dl-muted">
                    Generate AI-powered K-1 tax summary documents for each investor in this offering. Pulls distributions and capital contributions for the selected tax year.
                  </p>
                  <div className="flex items-end gap-3">
                    <div>
                      <label className="block text-xs font-dl-mono text-dl-muted mb-1">Tax Year</label>
                      <select
                        value={k1Form.taxYear}
                        onChange={e => setK1Form(p => ({ ...p, taxYear: e.target.value }))}
                        className="border border-dl-border px-2 py-1.5 font-dl-mono text-sm bg-white"
                      >
                        {[0, 1, 2, 3, 4].map(offset => {
                          const y = new Date().getFullYear() - offset;
                          return <option key={y} value={String(y)}>{y}</option>;
                        })}
                      </select>
                    </div>
                    <label className="flex items-center gap-2 font-dl-mono text-sm text-dl-text cursor-pointer pb-1">
                      <input
                        type="checkbox"
                        checked={k1Form.notifyInvestors}
                        onChange={e => setK1Form(p => ({ ...p, notifyInvestors: e.target.checked }))}
                        className="w-4 h-4"
                      />
                      Email K-1 to Investors
                    </label>
                    <button
                      onClick={handleGenerateK1}
                      disabled={generatingK1}
                      className="bg-dl-navy text-white px-4 py-1.5 font-dl-mono text-sm disabled:opacity-50"
                    >
                      {generatingK1 ? 'Generating...' : 'Generate'}
                    </button>
                  </div>

                  {generatingK1 && (
                    <div className="border border-dl-border p-3 bg-dl-bg">
                      <p className="font-dl-mono text-xs text-dl-muted">Generating K-1 summaries via AI. This may take several seconds per investor...</p>
                    </div>
                  )}

                  {k1Result && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-dl-mono">
                        <div className="border border-dl-border p-2">
                          <p className="text-dl-muted">Tax Year</p>
                          <p className="text-dl-navy text-base">{k1Result.taxYear}</p>
                        </div>
                        <div className="border border-dl-border p-2">
                          <p className="text-dl-muted">K-1s Generated</p>
                          <p className="text-dl-navy text-base">{k1Result.totalGenerated}</p>
                        </div>
                        <div className="border border-dl-border p-2">
                          <p className="text-dl-muted">Emails Sent</p>
                          <p className="text-dl-navy text-base">{k1Result.totalEmailed}</p>
                        </div>
                      </div>
                      <table className="w-full font-dl-mono text-xs border border-dl-border">
                        <thead>
                          <tr className="bg-dl-bg border-b border-dl-border">
                            <th className="text-left px-3 py-2 text-dl-muted">Investor</th>
                            <th className="text-right px-3 py-2 text-dl-muted">Contributed</th>
                            <th className="text-right px-3 py-2 text-dl-muted">Distributed</th>
                            <th className="text-center px-3 py-2 text-dl-muted">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {k1Result.generated.map((g: any) => (
                            <tr key={g.reportId} className="border-b border-dl-border">
                              <td className="px-3 py-2 text-dl-navy">{g.investorName}</td>
                              <td className="px-3 py-2 text-right">${g.totalContributed.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-right">${g.totalDistributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-center">
                                <span className="text-green-700">Generated</span>
                                {g.emailed && <span className="ml-1 text-dl-muted">(Emailed)</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>

            {reportToast && (
              <div className="border border-green-300 bg-green-50 px-4 py-2 font-dl-mono text-sm text-green-800">
                {reportToast}
              </div>
            )}

            {reports.length === 0 ? (
              <div className="border border-dl-border p-6 text-center">
                <p className="font-dl-mono text-sm text-dl-muted">No reports published yet. Use the form above to publish your first report.</p>
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
        {['raising', 'active'].includes(offering.status) && !isOperator && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-dl-border px-4 py-3">
            <button
              onClick={() => setActiveTab('subscriptions')}
              className="w-full bg-dl-navy text-white font-dl-mono text-sm py-3 min-h-[48px]"
            >
              Subscribe to This Offering
            </button>
          </div>
        )}

        {['raising', 'active'].includes(offering.status) && !isOperator && (
          <div className="md:hidden h-16" />
        )}
      </div>
    </DesignLawLayout>
  );
}
