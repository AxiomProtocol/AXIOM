import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  DesignLawLayout,
  SectionHeading,
  SolidButton,
} from '../../components/design-law';

interface LoanApplication {
  id: number;
  borrower_name: string;
  borrower_email: string;
  borrower_phone: string;
  company_name: string;
  years_experience: number;
  projects_completed: number;
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_type: string;
  purchase_price: string;
  rehab_budget: string;
  arv_estimate: string;
  loan_amount_requested: string;
  loan_term_months: number;
  acquisition_status: string;
  rehab_scope: string;
  exit_strategy: string;
  has_contractor: boolean;
  contractor_name: string;
  additional_notes: string;
  status: string;
  admin_notes: string;
  rejection_reason: string;
  wallet_address: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string;
  approved_at: string;
  funded_at: string;
}

interface Stats {
  total: number;
  submitted: number;
  underReview: number;
  approved: number;
  funded: number;
  rejected: number;
}

interface KycRecord {
  id: number;
  walletAddress: string;
  fullName: string;
  email: string;
  method: string;
  incomeThreshold: string | null;
  netWorthThreshold: string | null;
  entityAssetsThreshold: string | null;
  professionalCertification: string | null;
  filingStatus: string | null;
  selfCertified: boolean;
  selfCertificationStatement: string | null;
  verificationStatus: string;
  adminReviewedBy: string | null;
  adminNotes: string | null;
  expiresAt: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  funded: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

const KYC_STATUS_STYLES: Record<string, string> = {
  pending: 'border-yellow-300 bg-yellow-50 text-yellow-800',
  verified: 'border-green-300 bg-green-50 text-green-800',
  rejected: 'border-red-300 bg-red-50 text-red-800',
};

function formatUSD(value: string | number | null | undefined) {
  if (!value) return '$0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(num);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LendingReviewPage() {
  const [activeTab, setActiveTab] = useState<'loans' | 'kyc'>('loans');
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminToken, setAdminToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [selectedApp, setSelectedApp] = useState<LoanApplication | null>(null);
  const [actionNotes, setActionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionMessage, setActionMessage] = useState('');

  const [kycRecords, setKycRecords] = useState<KycRecord[]>([]);
  const [kycLoading, setKycLoading] = useState(false);
  const [selectedKyc, setSelectedKyc] = useState<KycRecord | null>(null);
  const [kycNotes, setKycNotes] = useState('');
  const [kycActionLoading, setKycActionLoading] = useState(false);
  const [kycMessage, setKycMessage] = useState('');
  const [kycFilter, setKycFilter] = useState('all');

  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{ status: string; message: string; txHash?: string } | null>(null);

  const handleIssueAccredClaim = async () => {
    setClaimLoading(true);
    setClaimResult(null);
    try {
      const res = await fetch('/api/admin/issue-accred-claim', {
        method: 'POST',
        headers: { 'x-admin-key': adminToken },
      });
      const data = await res.json();
      if (res.ok) {
        setClaimResult({ status: data.status, message: data.message, txHash: data.txHash });
      } else {
        setClaimResult({ status: 'error', message: data.message ?? data.error ?? 'Unknown error' });
      }
    } catch (e) {
      setClaimResult({ status: 'error', message: String(e) });
    } finally {
      setClaimLoading(false);
    }
  };

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/realestate/loan-application', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKycRecords = async () => {
    setKycLoading(true);
    try {
      const res = await fetch('/api/realestate/accreditation', {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setKycRecords(data.records || []);
      }
    } catch (error) {
      console.error('Failed to fetch KYC records:', error);
    } finally {
      setKycLoading(false);
    }
  };

  const handleAuth = async () => {
    setLoading(true);
    const res = await fetch('/api/realestate/accreditation', {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (res.ok) {
      setAuthenticated(true);
      fetchKycRecords();
      fetchApplications();
    } else {
      alert('Invalid admin token');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated && activeTab === 'kyc') {
      fetchKycRecords();
    }
  }, [activeTab, authenticated]);

  const handleAction = async (id: number, action: string) => {
    setActionLoading(true);
    setActionMessage('');
    try {
      const res = await fetch('/api/realestate/loan-application', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          id,
          action,
          notes: actionNotes,
          reason: rejectionReason,
        })
      });

      if (res.ok) {
        setActionMessage(`Action '${action}' completed successfully`);
        setActionNotes('');
        setRejectionReason('');
        setSelectedApp(null);
        await fetchApplications();

        if (action === 'approve') {
          try {
            const app = applications.find(a => a.id === id);
            if (app?.borrower_email) {
              await fetch('/api/realestate/loan-approval-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: app.borrower_email,
                  name: app.borrower_name,
                  applicationId: app.id,
                  loanAmount: app.loan_amount_requested,
                  propertyAddress: app.property_address,
                })
              });
            }
          } catch {}
        }
      } else {
        const data = await res.json();
        setActionMessage(`Error: ${data.error}`);
      }
    } catch {
      setActionMessage('Network error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleKycAction = async (id: number, action: 'approve' | 'reject' | 'reset') => {
    setKycActionLoading(true);
    setKycMessage('');
    try {
      const res = await fetch('/api/realestate/accreditation', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          id,
          action,
          adminNotes: kycNotes || undefined,
          reviewedBy: 'founder-ops',
        }),
      });

      if (res.ok) {
        const actionLabel = action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Reset to pending';
        setKycMessage(`${actionLabel} — record #${id} updated.`);
        setKycNotes('');
        setSelectedKyc(null);
        await fetchKycRecords();
      } else {
        const data = await res.json();
        setKycMessage(`Error: ${data.error}`);
      }
    } catch {
      setKycMessage('Network error');
    } finally {
      setKycActionLoading(false);
    }
  };

  const filteredApps = filter === 'all'
    ? applications
    : applications.filter(a => a.status === filter);

  const filteredKyc = kycFilter === 'all'
    ? kycRecords
    : kycRecords.filter(r => r.verificationStatus === kycFilter);

  const computeLTV = (app: LoanApplication) => {
    const arv = parseFloat(app.arv_estimate);
    const loan = parseFloat(app.loan_amount_requested);
    if (!arv || !loan || arv === 0) return '—';
    return ((loan / arv) * 100).toFixed(1) + '%';
  };

  const kycCounts = {
    all: kycRecords.length,
    pending: kycRecords.filter(r => r.verificationStatus === 'pending').length,
    verified: kycRecords.filter(r => r.verificationStatus === 'verified').length,
    rejected: kycRecords.filter(r => r.verificationStatus === 'rejected').length,
  };

  if (!authenticated) {
    return (
      <DesignLawLayout>
        <Head>
          <title>Lending Review | Founder Ops</title>
        </Head>
        <div className="max-w-md mx-auto mt-20">
          <h1 className="font-dl-serif text-2xl text-dl-navy mb-4">Admin Authentication</h1>
          <p className="text-sm text-dl-gray mb-6">Enter admin token to access lending review dashboard.</p>
          <input
            type="password"
            value={adminToken}
            onChange={e => setAdminToken(e.target.value)}
            placeholder="Admin token"
            className="w-full px-4 py-3 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono mb-4"
            onKeyDown={e => e.key === 'Enter' && handleAuth()}
          />
          <button
            onClick={handleAuth}
            disabled={loading || !adminToken}
            className="w-full py-3 bg-dl-navy text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </div>
      </DesignLawLayout>
    );
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>Lending Review | Founder Ops</title>
      </Head>

      <div className="mb-6">
        <Link href="/founder-ops" className="text-sm text-dl-navy mb-4 inline-block">
          ← Back to Founder Ops
        </Link>
        <h1 className="font-dl-serif text-3xl text-dl-navy">Lending & Verification Review</h1>
        <p className="text-sm text-dl-gray mt-1">Admin dashboard for loan applications and investor KYC/accreditation</p>
      </div>

      <div className="flex border-b border-dl-border mb-6">
        <button
          onClick={() => setActiveTab('loans')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'loans'
              ? 'border-dl-navy text-dl-navy'
              : 'border-transparent text-dl-gray hover:text-dl-navy'
          }`}
        >
          Loan Applications
          {stats && <span className="ml-2 font-dl-mono text-xs bg-dl-bg-alt px-1.5 py-0.5 border border-dl-border">{stats.total}</span>}
        </button>
        <button
          onClick={() => setActiveTab('kyc')}
          className={`px-6 py-3 text-sm font-medium border-b-2 -mb-px ${
            activeTab === 'kyc'
              ? 'border-dl-navy text-dl-navy'
              : 'border-transparent text-dl-gray hover:text-dl-navy'
          }`}
        >
          Investor Verification (KYC)
          {kycCounts.pending > 0 && (
            <span className="ml-2 font-dl-mono text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 border border-yellow-300">
              {kycCounts.pending} pending
            </span>
          )}
        </button>
      </div>

      {activeTab === 'loans' && (
        <>
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-6 gap-0 border border-dl-border mb-8">
              {[
                { label: 'Total', value: stats.total, bg: 'bg-dl-bg' },
                { label: 'Submitted', value: stats.submitted, bg: 'bg-blue-50' },
                { label: 'Under Review', value: stats.underReview, bg: 'bg-yellow-50' },
                { label: 'Approved', value: stats.approved, bg: 'bg-green-50' },
                { label: 'Funded', value: stats.funded, bg: 'bg-emerald-50' },
                { label: 'Rejected', value: stats.rejected, bg: 'bg-red-50' },
              ].map((s, i) => (
                <div key={s.label} className={`px-4 py-3 ${s.bg} ${i < 5 ? 'border-r border-dl-border' : ''}`}>
                  <p className="text-xs text-dl-gray mb-1">{s.label}</p>
                  <p className="font-dl-mono text-xl font-bold text-dl-navy">{s.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 mb-6 flex-wrap">
            {['all', 'submitted', 'under_review', 'approved', 'funded', 'rejected'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  filter === f ? 'bg-dl-navy text-white' : 'bg-dl-bg-alt text-dl-navy border border-dl-border'
                }`}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>

          {actionMessage && (
            <div className={`p-3 mb-4 text-sm border ${actionMessage.includes('Error') ? 'border-red-300 bg-red-50 text-red-800' : 'border-green-300 bg-green-50 text-green-800'}`}>
              {actionMessage}
            </div>
          )}

          {loading ? (
            <div className="text-center py-12 text-dl-gray">Loading applications...</div>
          ) : filteredApps.length === 0 ? (
            <div className="text-center py-12 border border-dl-border bg-dl-bg-alt">
              <p className="text-dl-gray">No applications found{filter !== 'all' ? ` with status "${filter}"` : ''}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredApps.map(app => (
                <div key={app.id} className="border border-dl-border bg-dl-bg">
                  <div className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-dl-mono text-sm text-dl-gray">#{app.id}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-800'}`}>
                          {(app.status || 'unknown').replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-xs text-dl-gray">{formatDate(app.created_at)}</span>
                      </div>
                      <h3 className="font-dl-serif text-base text-dl-navy font-medium">{app.borrower_name}</h3>
                      <p className="text-sm text-dl-gray">{app.property_address}, {app.property_city}, {app.property_state} {app.property_zip}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-dl-mono text-lg font-bold text-dl-navy">{formatUSD(app.loan_amount_requested)}</p>
                        <p className="text-xs text-dl-gray">LTV: {computeLTV(app)}</p>
                      </div>
                      <button
                        onClick={() => setSelectedApp(selectedApp?.id === app.id ? null : app)}
                        className="px-3 py-2 text-sm bg-dl-bg-alt border border-dl-border text-dl-navy font-medium"
                      >
                        {selectedApp?.id === app.id ? 'Close' : 'Review'}
                      </button>
                    </div>
                  </div>

                  {selectedApp?.id === app.id && (
                    <div className="border-t border-dl-border px-6 py-5 bg-dl-bg-alt">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div>
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-2">Borrower</h4>
                          <div className="space-y-1 text-sm text-dl-navy">
                            <p>{app.borrower_name}</p>
                            <p>{app.borrower_email}</p>
                            <p>{app.borrower_phone || '—'}</p>
                            <p>{app.company_name || '—'}</p>
                            <p>Experience: {app.years_experience ?? '—'} yrs</p>
                            <p>Projects: {app.projects_completed ?? '—'}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-2">Property</h4>
                          <div className="space-y-1 text-sm text-dl-navy">
                            <p>{app.property_address}</p>
                            <p>{app.property_city}, {app.property_state} {app.property_zip}</p>
                            <p>Type: {(app.property_type || '').replace('_', ' ')}</p>
                            <p>Status: {(app.acquisition_status || '').replace('_', ' ')}</p>
                            <p>Contractor: {app.has_contractor ? (app.contractor_name || 'Yes') : 'No'}</p>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-2">Financials</h4>
                          <div className="space-y-1 text-sm text-dl-navy">
                            <p>Purchase: {formatUSD(app.purchase_price)}</p>
                            <p>Rehab: {formatUSD(app.rehab_budget)}</p>
                            <p>ARV: {formatUSD(app.arv_estimate)}</p>
                            <p>Requested: {formatUSD(app.loan_amount_requested)}</p>
                            <p>LTV: {computeLTV(app)}</p>
                            <p>Term: {app.loan_term_months} months</p>
                            <p>Exit: {(app.exit_strategy || '').replace('_', ' ')}</p>
                          </div>
                        </div>
                      </div>

                      {app.rehab_scope && (
                        <div className="mb-4">
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-1">Rehab Scope</h4>
                          <p className="text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border">{app.rehab_scope}</p>
                        </div>
                      )}

                      {app.additional_notes && (
                        <div className="mb-4">
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-1">Borrower Notes</h4>
                          <p className="text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border">{app.additional_notes}</p>
                        </div>
                      )}

                      {app.admin_notes && (
                        <div className="mb-4">
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-1">Admin Notes</h4>
                          <p className="text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border">{app.admin_notes}</p>
                        </div>
                      )}

                      <div className="border-t border-dl-border pt-4 mt-4">
                        <div className="mb-3">
                          <label className="block text-xs text-dl-gray uppercase tracking-wider mb-1">Admin Notes</label>
                          <textarea
                            value={actionNotes}
                            onChange={e => setActionNotes(e.target.value)}
                            placeholder="Add review notes..."
                            className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono min-h-[60px] resize-y"
                          />
                        </div>

                        {app.status !== 'rejected' && (
                          <div className="mb-3">
                            <label className="block text-xs text-dl-gray uppercase tracking-wider mb-1">Rejection Reason (if rejecting)</label>
                            <input
                              type="text"
                              value={rejectionReason}
                              onChange={e => setRejectionReason(e.target.value)}
                              placeholder="Reason for rejection..."
                              className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono"
                            />
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {app.status === 'submitted' && (
                            <button
                              onClick={() => handleAction(app.id, 'review')}
                              disabled={actionLoading}
                              className="px-4 py-2 text-sm bg-yellow-500 text-white font-medium disabled:opacity-50"
                            >
                              Mark Under Review
                            </button>
                          )}
                          {(app.status === 'submitted' || app.status === 'under_review') && (
                            <>
                              <button
                                onClick={() => handleAction(app.id, 'approve')}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm bg-green-600 text-white font-medium disabled:opacity-50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleAction(app.id, 'reject')}
                                disabled={actionLoading}
                                className="px-4 py-2 text-sm bg-red-600 text-white font-medium disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {app.status === 'approved' && (
                            <button
                              onClick={() => handleAction(app.id, 'fund')}
                              disabled={actionLoading}
                              className="px-4 py-2 text-sm bg-emerald-600 text-white font-medium disabled:opacity-50"
                            >
                              Mark as Funded
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(app.id, 'add_notes')}
                            disabled={actionLoading || !actionNotes}
                            className="px-4 py-2 text-sm bg-dl-navy text-white font-medium disabled:opacity-50"
                          >
                            Save Notes
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'kyc' && (
        <>
          {/* On-Chain Identity Fix Panel */}
          <div className="border border-dl-border mb-6 p-4 bg-yellow-50">
            <h3 className="font-dl-serif text-base text-dl-navy mb-1">On-Chain LP Claim Issuance</h3>
            <p className="text-xs text-dl-gray mb-3">
              Issues the missing ACCREDITED_INVESTOR claim (topic 2) to the deployer&apos;s ERC-3643 identity.
              Required for <code className="font-dl-mono bg-yellow-100 px-1">isVerified()</code> to return true and allow credit market deposits.
              Topics 1 (KYC) and 3 (Sanctions) already issued; topic 2 was skipped in initial deployment.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleIssueAccredClaim}
                disabled={claimLoading}
                className="px-4 py-2 text-sm bg-dl-navy text-white font-medium disabled:opacity-50"
              >
                {claimLoading ? 'Issuing Claim...' : 'Issue Accreditation Claim (Topic 2)'}
              </button>
              {claimResult && (
                <div className={`text-xs font-dl-mono flex-1 ${claimResult.status === 'error' ? 'text-red-700' : 'text-green-800'}`}>
                  <span className="font-bold">{claimResult.status.toUpperCase()}</span>: {claimResult.message}
                  {claimResult.txHash && (
                    <a
                      href={`https://arbiscan.io/tx/${claimResult.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 underline"
                    >
                      {claimResult.txHash.slice(0, 12)}...
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border border-dl-border mb-6">
            {[
              { label: 'Total', value: kycCounts.all, bg: 'bg-dl-bg' },
              { label: 'Pending', value: kycCounts.pending, bg: 'bg-yellow-50' },
              { label: 'Verified', value: kycCounts.verified, bg: 'bg-green-50' },
              { label: 'Rejected', value: kycCounts.rejected, bg: 'bg-red-50' },
            ].map((s, i) => (
              <div key={s.label} className={`px-4 py-3 ${s.bg} ${i < 3 ? 'border-r border-dl-border' : ''}`}>
                <p className="text-xs text-dl-gray mb-1">{s.label}</p>
                <p className="font-dl-mono text-xl font-bold text-dl-navy">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-6">
            {(['all', 'pending', 'verified', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setKycFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium ${
                  kycFilter === f ? 'bg-dl-navy text-white' : 'bg-dl-bg-alt text-dl-navy border border-dl-border'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <button
              onClick={fetchKycRecords}
              disabled={kycLoading}
              className="ml-auto px-3 py-1.5 text-sm text-dl-gray border border-dl-border bg-dl-bg-alt disabled:opacity-50"
            >
              {kycLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>

          {kycMessage && (
            <div className={`p-3 mb-4 text-sm border ${kycMessage.startsWith('Error') ? 'border-red-300 bg-red-50 text-red-800' : 'border-green-300 bg-green-50 text-green-800'}`}>
              {kycMessage}
            </div>
          )}

          {kycLoading ? (
            <div className="text-center py-12 text-dl-gray">Loading records...</div>
          ) : filteredKyc.length === 0 ? (
            <div className="text-center py-12 border border-dl-border bg-dl-bg-alt">
              <p className="text-dl-gray">No {kycFilter !== 'all' ? kycFilter : ''} verification records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredKyc.map(record => (
                <div key={record.id} className="border border-dl-border bg-dl-bg">
                  <div className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-dl-mono text-sm text-dl-gray">#{record.id}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium border ${KYC_STATUS_STYLES[record.verificationStatus] || 'border-gray-200 bg-gray-50 text-gray-700'}`}>
                          {record.verificationStatus.toUpperCase()}
                        </span>
                        <span className="text-xs text-dl-gray font-dl-mono">{record.method}</span>
                        <span className="text-xs text-dl-gray">{formatDate(record.createdAt)}</span>
                      </div>
                      <h3 className="font-dl-serif text-base text-dl-navy font-medium">{record.fullName || '—'}</h3>
                      <p className="text-sm text-dl-gray">{record.email || '—'}</p>
                      <p className="text-xs text-dl-gray font-dl-mono mt-0.5">{record.walletAddress}</p>
                    </div>
                    <button
                      onClick={() => setSelectedKyc(selectedKyc?.id === record.id ? null : record)}
                      className="px-3 py-2 text-sm bg-dl-bg-alt border border-dl-border text-dl-navy font-medium whitespace-nowrap"
                    >
                      {selectedKyc?.id === record.id ? 'Close' : 'Review'}
                    </button>
                  </div>

                  {selectedKyc?.id === record.id && (
                    <div className="border-t border-dl-border px-6 py-5 bg-dl-bg-alt">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5">
                        <div>
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-2">Submission Details</h4>
                          <div className="space-y-1 text-sm text-dl-navy">
                            <p><span className="text-dl-gray">Name:</span> {record.fullName || '—'}</p>
                            <p><span className="text-dl-gray">Email:</span> {record.email || '—'}</p>
                            <p><span className="text-dl-gray">Wallet:</span> <span className="font-dl-mono text-xs">{record.walletAddress}</span></p>
                            <p><span className="text-dl-gray">Method:</span> {record.method}</p>
                            <p><span className="text-dl-gray">Filing Status:</span> {record.filingStatus || '—'}</p>
                            <p><span className="text-dl-gray">Submitted:</span> {formatDateTime(record.createdAt)}</p>
                            {record.reviewedAt && (
                              <p><span className="text-dl-gray">Reviewed:</span> {formatDateTime(record.reviewedAt)}</p>
                            )}
                            {record.adminReviewedBy && (
                              <p><span className="text-dl-gray">Reviewed by:</span> {record.adminReviewedBy}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-2">Accreditation Basis</h4>
                          <div className="space-y-1 text-sm text-dl-navy">
                            {record.incomeThreshold && <p><span className="text-dl-gray">Income threshold:</span> {record.incomeThreshold}</p>}
                            {record.netWorthThreshold && <p><span className="text-dl-gray">Net worth:</span> {record.netWorthThreshold}</p>}
                            {record.entityAssetsThreshold && <p><span className="text-dl-gray">Entity assets:</span> {record.entityAssetsThreshold}</p>}
                            {record.professionalCertification && <p><span className="text-dl-gray">Certification:</span> {record.professionalCertification}</p>}
                            <p><span className="text-dl-gray">Self-certified:</span> {record.selfCertified ? 'Yes' : 'No'}</p>
                            {record.expiresAt && <p><span className="text-dl-gray">Expires:</span> {formatDate(record.expiresAt)}</p>}
                          </div>
                        </div>
                      </div>

                      {record.selfCertificationStatement && (
                        <div className="mb-4">
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-1">Self-Certification Statement</h4>
                          <p className="text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border leading-relaxed">{record.selfCertificationStatement}</p>
                        </div>
                      )}

                      {record.adminNotes && (
                        <div className="mb-4">
                          <h4 className="text-xs text-dl-gray uppercase tracking-wider mb-1">Prior Admin Notes</h4>
                          <p className="text-sm text-dl-navy bg-dl-bg p-3 border border-dl-border">{record.adminNotes}</p>
                        </div>
                      )}

                      <div className="border-t border-dl-border pt-4 mt-2">
                        <div className="mb-3">
                          <label className="block text-xs text-dl-gray uppercase tracking-wider mb-1">Review Notes (optional)</label>
                          <textarea
                            value={kycNotes}
                            onChange={e => setKycNotes(e.target.value)}
                            placeholder="Add notes about this verification decision..."
                            className="w-full px-3 py-2 border border-dl-border bg-dl-bg text-dl-navy text-sm font-dl-mono min-h-[60px] resize-y"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {record.verificationStatus !== 'verified' && (
                            <button
                              onClick={() => handleKycAction(record.id, 'approve')}
                              disabled={kycActionLoading}
                              className="px-4 py-2 text-sm bg-green-600 text-white font-medium disabled:opacity-50"
                            >
                              {kycActionLoading ? 'Processing...' : 'Approve Verification'}
                            </button>
                          )}
                          {record.verificationStatus !== 'rejected' && (
                            <button
                              onClick={() => handleKycAction(record.id, 'reject')}
                              disabled={kycActionLoading}
                              className="px-4 py-2 text-sm bg-red-600 text-white font-medium disabled:opacity-50"
                            >
                              {kycActionLoading ? 'Processing...' : 'Reject'}
                            </button>
                          )}
                          {record.verificationStatus !== 'pending' && (
                            <button
                              onClick={() => handleKycAction(record.id, 'reset')}
                              disabled={kycActionLoading}
                              className="px-4 py-2 text-sm bg-dl-bg-alt border border-dl-border text-dl-navy font-medium disabled:opacity-50"
                            >
                              Reset to Pending
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-8 border border-dl-border p-6 bg-dl-bg-alt">
        <p className="text-xs text-dl-gray leading-relaxed">
          This dashboard is restricted to authorized fund administrators. All actions are logged with timestamp and reviewer identity.
          KYC approval grants investor access to deposit into the lending fund. Loan approvals trigger confirmation emails to borrowers.
          Review all submissions thoroughly before taking action.
        </p>
      </div>
    </DesignLawLayout>
  );
}
