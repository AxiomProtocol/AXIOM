import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { DesignLawLayout, SectionHeading, DetailGrid } from '../components/design-law';
import { StatusBadge } from '../components/design-law/StatusBadge';
import { SolidButton } from '../components/design-law/SolidButton';

interface TokenData {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  address: string;
  chainId: number;
  network: string;
}

interface ModuleDetail {
  address: string;
  name: string;
  type: string;
}

interface ComplianceData {
  address: string;
  tokenBound: string;
  modules: ModuleDetail[];
  moduleCount: number;
}

interface IdentityData {
  registryAddress: string;
  registeredIdentities: number;
}

interface PlatformEntry {
  address: string;
  name: string;
  addedAt: string;
}

interface ComplianceEvent {
  id: string;
  from: string;
  to: string;
  amount: string;
  module: string;
  result: string;
  reason: string | null;
  timestamp: string;
}

interface WalletStatus {
  wallet: string;
  isVerified: boolean;
  hasIdentity: boolean;
  identityAddress: string | null;
  country: number;
  balance: string;
  isFrozen: boolean;
  frozenTokens: string;
}

interface ContractAddresses {
  token: string;
  identityRegistry: string;
  identityRegistryStorage: string;
  trustedIssuersRegistry: string;
  claimTopicsRegistry: string;
  modularCompliance: string;
  claimIssuer: string;
  identityFactory: string;
  modules: {
    countryAllow: string;
    maxBalance: string;
    transferLimit: string;
    lendingPlatform: string;
  };
}

interface DashboardData {
  token: TokenData;
  compliance: ComplianceData;
  identity: IdentityData;
  platforms: PlatformEntry[];
  activity: {
    totalComplianceEvents: number;
    recentEvents: ComplianceEvent[];
  };
  contracts: ContractAddresses;
  walletStatus: WalletStatus | null;
}

interface KycSubmissionData {
  id: string;
  walletAddress: string;
  fullName: string;
  dateOfBirth: string;
  country: string;
  documentType: string;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}

type Tab = 'overview' | 'identity' | 'compliance' | 'contracts';

function shortAddr(addr: string | null): string {
  if (!addr) return '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function blockscoutLink(addr: string): string {
  return `https://arbitrum.blockscout.com/address/${addr}`;
}

function fmtAmount(val: string | number): string {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hour12: false,
    }) + ' ET';
  } catch {
    return iso;
  }
}

function getClaimExpiryStatus(validUntil: string | null): { status: 'valid' | 'expiring_soon' | 'expired'; daysRemaining: number | null } {
  if (!validUntil) return { status: 'valid', daysRemaining: null };
  const expiry = new Date(validUntil);
  const now = new Date();
  const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 3600 * 1000));
  if (daysRemaining <= 0) return { status: 'expired', daysRemaining: 0 };
  if (daysRemaining <= 30) return { status: 'expiring_soon', daysRemaining };
  return { status: 'valid', daysRemaining };
}

function ClaimExpiryBadge({ status }: { status: 'valid' | 'expiring_soon' | 'expired' }) {
  const map = {
    valid: { label: 'Valid', color: 'bg-green-100 text-green-800' },
    expiring_soon: { label: 'Expiring Soon', color: 'bg-yellow-100 text-yellow-800' },
    expired: { label: 'Expired', color: 'bg-red-100 text-red-800' },
  };
  const s = map[status];
  return <span className={`px-2 py-0.5 text-xs font-dl-mono rounded ${s.color}`}>{s.label}</span>;
}

export default function AXUSD3643Page() {
  const { address, isConnected } = useWallet();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [complianceCheck, setComplianceCheck] = useState<{
    to: string;
    amount: string;
    result: null | { compliant: boolean; complianceCheck: boolean; receiverVerified: boolean };
    loading: boolean;
    error: string | null;
  }>({ to: '', amount: '', result: null, loading: false, error: null });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const walletParam = address ? `?wallet=${address}` : '';
      const res = await fetch(`/api/erc3643/dashboard${walletParam}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const runComplianceCheck = async () => {
    if (!address || !complianceCheck.to || !complianceCheck.amount) return;
    setComplianceCheck(prev => ({ ...prev, loading: true, error: null, result: null }));
    try {
      const res = await fetch(`/api/erc3643/compliance/check?from=${address}&to=${complianceCheck.to}&amount=${complianceCheck.amount}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Check failed');
      setComplianceCheck(prev => ({ ...prev, result: json.data, loading: false }));
    } catch (err: any) {
      setComplianceCheck(prev => ({ ...prev, error: err.message, loading: false }));
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'identity', label: 'Identity' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'contracts', label: 'Contracts' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Unified AXUSD | ERC-3643 T-REX | Axiom Protocol</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-1">Unified AXUSD — ERC-3643 (T-REX)</h1>
        <p className="text-sm text-dl-gray font-dl-mono">
          Institutional-grade compliant stablecoin with on-chain identity and modular compliance
        </p>
      </div>

      <div className="flex gap-0 border-b border-dl-border mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px ${
              tab === t.key
                ? 'border-dl-navy text-dl-navy font-medium'
                : 'border-transparent text-dl-gray'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">Loading on-chain data...</p>}
      {error && <p className="text-sm text-dl-error font-dl-mono py-8 text-center">Error: {error}</p>}

      {data && !loading && (
        <>
          {tab === 'overview' && <OverviewTab data={data} />}
          {tab === 'identity' && (
            <IdentityTab
              data={data}
              address={address}
              isConnected={isConnected}
              onRefresh={fetchDashboard}
            />
          )}
          {tab === 'compliance' && (
            <ComplianceTab
              data={data}
              address={address}
              isConnected={isConnected}
              complianceCheck={complianceCheck}
              setComplianceCheck={setComplianceCheck}
              onRunCheck={runComplianceCheck}
            />
          )}
          {tab === 'contracts' && <ContractsTab data={data} />}
        </>
      )}
    </DesignLawLayout>
  );
}

function OverviewTab({ data }: { data: DashboardData }) {
  return (
    <>
      <SectionHeading>Token Summary</SectionHeading>
      <DetailGrid
        left={[
          { label: 'Token Name', value: data.token.name },
          { label: 'Symbol', value: data.token.symbol },
          { label: 'Standard', value: 'ERC-3643 (T-REX)' },
          { label: 'Total Supply', value: `${fmtAmount(data.token.totalSupply)} AXUSD` },
        ]}
        right={[
          { label: 'Network', value: 'Arbitrum One (42161)' },
          { label: 'Decimals', value: String(data.token.decimals) },
          { label: 'Registered Identities', value: String(data.identity.registeredIdentities) },
          {
            label: 'Contract',
            value: (
              <a
                href={blockscoutLink(data.token.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dl-navy underline"
              >
                {shortAddr(data.token.address)}
              </a>
            ),
            mono: false,
          },
        ]}
      />

      {data.walletStatus && (
        <>
          <SectionHeading>Connected Wallet</SectionHeading>
          <DetailGrid
            left={[
              { label: 'Address', value: shortAddr(data.walletStatus.wallet) },
              { label: 'AXUSD Balance', value: `${fmtAmount(data.walletStatus.balance)} AXUSD` },
              { label: 'Identity Registered', value: data.walletStatus.hasIdentity ? 'Yes' : 'No' },
            ]}
            right={[
              {
                label: 'Verification Status',
                value: <StatusBadge status={data.walletStatus.isVerified ? 'ACTIVE' : 'PENDING'} />,
                mono: false,
              },
              { label: 'Frozen', value: <StatusBadge status={data.walletStatus.isFrozen ? 'SUSPENDED' : 'ACTIVE'} />, mono: false },
              { label: 'Country Code', value: data.walletStatus.country > 0 ? String(data.walletStatus.country) : '—' },
            ]}
          />
        </>
      )}

      <SectionHeading>Compliance Modules</SectionHeading>
      <div className="border border-dl-border mb-8">
        <div className="grid grid-cols-12 border-b border-dl-border bg-dl-bg px-4 py-2 text-xs text-dl-gray font-dl-mono">
          <div className="col-span-3">Module</div>
          <div className="col-span-3">Type</div>
          <div className="col-span-6">Contract</div>
        </div>
        {data.compliance.modules.map((m) => (
          <div key={m.address} className="grid grid-cols-12 border-b border-dl-border px-4 py-2 text-sm">
            <div className="col-span-3 font-dl-mono">{m.name}</div>
            <div className="col-span-3 text-dl-gray text-xs font-dl-mono">{m.type}</div>
            <div className="col-span-6">
              <a
                href={blockscoutLink(m.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dl-navy underline font-dl-mono text-xs"
              >
                {shortAddr(m.address)}
              </a>
            </div>
          </div>
        ))}
      </div>

      <SectionHeading>Whitelisted Platforms</SectionHeading>
      <div className="border border-dl-border mb-8">
        <div className="grid grid-cols-12 border-b border-dl-border bg-dl-bg px-4 py-2 text-xs text-dl-gray font-dl-mono">
          <div className="col-span-4">Platform</div>
          <div className="col-span-5">Contract</div>
          <div className="col-span-3">Added</div>
        </div>
        {data.platforms.length === 0 ? (
          <div className="px-4 py-3 text-sm text-dl-gray">No platforms whitelisted yet</div>
        ) : (
          data.platforms.map((p) => (
            <div key={p.address} className="grid grid-cols-12 border-b border-dl-border px-4 py-2 text-sm">
              <div className="col-span-4 font-dl-mono">{p.name}</div>
              <div className="col-span-5">
                <a
                  href={blockscoutLink(p.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dl-navy underline font-dl-mono text-xs"
                >
                  {shortAddr(p.address)}
                </a>
              </div>
              <div className="col-span-3 text-xs text-dl-gray font-dl-mono">{fmtTimestamp(p.addedAt)}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function KycStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    submitted: { label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
    under_review: { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'Approved', color: 'bg-green-100 text-green-800' },
    bridged: { label: 'Bridged', color: 'bg-emerald-100 text-emerald-800' },
    rejected: { label: 'Rejected', color: 'bg-red-100 text-red-800' },
  };
  const s = map[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  return <span className={`px-2 py-0.5 text-xs font-dl-mono rounded ${s.color}`}>{s.label}</span>;
}

function KycSubmissionForm({ address, onSubmitted }: { address: string; onSubmitted: () => void }) {
  const [form, setForm] = useState({ fullName: '', dateOfBirth: '', country: 'US', documentType: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    try {
      const res = await fetch('/api/erc3643/identity/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Submission failed');
      setSubmitSuccess(true);
      setForm({ fullName: '', dateOfBirth: '', country: 'US', documentType: '' });
      onSubmitted();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isValid = form.fullName.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(form.dateOfBirth) && form.documentType;

  return (
    <div className="border border-dl-border p-4 mb-8">
      <p className="text-xs text-dl-gray mb-3">
        Submit your identity information for KYC verification. Once approved, your on-chain identity
        will be created automatically with KYC_VERIFIED and SANCTIONS_CLEAR claims.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-dl-gray mb-1 block">Full Name</label>
          <input
            type="text"
            value={form.fullName}
            onChange={e => setForm(prev => ({ ...prev, fullName: e.target.value }))}
            placeholder="John Doe"
            className="w-full border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white"
          />
        </div>
        <div>
          <label className="text-xs text-dl-gray mb-1 block">Date of Birth</label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={e => setForm(prev => ({ ...prev, dateOfBirth: e.target.value }))}
            className="w-full border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white"
          />
        </div>
        <div>
          <label className="text-xs text-dl-gray mb-1 block">Country</label>
          <select
            value={form.country}
            onChange={e => setForm(prev => ({ ...prev, country: e.target.value }))}
            className="w-full border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white"
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="CA">Canada</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-dl-gray mb-1 block">Document Type</label>
          <select
            value={form.documentType}
            onChange={e => setForm(prev => ({ ...prev, documentType: e.target.value }))}
            className="w-full border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white"
          >
            <option value="">Select document...</option>
            <option value="passport">Passport</option>
            <option value="drivers_license">Driver's License</option>
            <option value="national_id">National ID</option>
            <option value="residence_permit">Residence Permit</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SolidButton onClick={handleSubmit} disabled={submitting || !isValid} size="sm">
          {submitting ? 'Submitting...' : 'Submit KYC'}
        </SolidButton>
        <span className="text-xs text-dl-gray font-dl-mono">Wallet: {shortAddr(address)}</span>
      </div>
      {submitError && <p className="text-xs text-dl-error mt-2">{submitError}</p>}
      {submitSuccess && <p className="text-xs text-green-700 mt-2">KYC submission received. You will be notified once reviewed.</p>}
    </div>
  );
}

function IdentityTab({
  data,
  address,
  isConnected,
  onRefresh,
}: {
  data: DashboardData;
  address: string | null;
  isConnected: boolean;
  onRefresh: () => void;
}) {
  const [identityStatus, setIdentityStatus] = useState<any>(null);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [identityError, setIdentityError] = useState<string | null>(null);
  const [kycSubmissions, setKycSubmissions] = useState<KycSubmissionData[]>([]);
  const [kycLoading, setKycLoading] = useState(false);

  const loadIdentityStatus = async () => {
    if (!address) return;
    setIdentityLoading(true);
    setIdentityError(null);
    try {
      const res = await fetch(`/api/erc3643/identity/status?wallet=${address}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setIdentityStatus(json.data);
    } catch (err: any) {
      setIdentityError(err.message);
    } finally {
      setIdentityLoading(false);
    }
  };

  const loadKycSubmissions = async () => {
    if (!address) return;
    setKycLoading(true);
    try {
      const res = await fetch(`/api/erc3643/identity/submit?wallet=${address}`);
      if (res.ok) {
        const json = await res.json();
        setKycSubmissions(json.data || []);
      }
    } catch {
    } finally {
      setKycLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      loadIdentityStatus();
      loadKycSubmissions();
    }
  }, [address]);

  const hasActiveSubmission = kycSubmissions.some(s => ['submitted', 'under_review', 'approved', 'bridged'].includes(s.status));
  const showForm = isConnected && address && !identityStatus?.hasIdentity && !hasActiveSubmission;

  return (
    <>
      <SectionHeading>Identity Registry</SectionHeading>
      <DetailGrid
        left={[
          { label: 'Registry Contract', value: (
            <a href={blockscoutLink(data.contracts.identityRegistry)} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline">
              {shortAddr(data.contracts.identityRegistry)}
            </a>
          ), mono: false },
          { label: 'Identity Factory', value: (
            <a href={blockscoutLink(data.contracts.identityFactory)} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline">
              {shortAddr(data.contracts.identityFactory)}
            </a>
          ), mono: false },
        ]}
        right={[
          { label: 'Registered Identities', value: String(data.identity.registeredIdentities) },
          { label: 'Claim Issuer', value: (
            <a href={blockscoutLink(data.contracts.claimIssuer)} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline">
              {shortAddr(data.contracts.claimIssuer)}
            </a>
          ), mono: false },
        ]}
      />

      {!isConnected && (
        <div className="border border-dl-border p-6 text-center mb-8">
          <p className="text-sm text-dl-gray mb-2">Connect your wallet to view your identity status</p>
        </div>
      )}

      {isConnected && identityLoading && (
        <p className="text-sm text-dl-gray font-dl-mono py-4">Loading identity status...</p>
      )}

      {isConnected && identityError && (
        <p className="text-sm text-dl-error font-dl-mono py-4">Error: {identityError}</p>
      )}

      {isConnected && identityStatus && (
        <>
          <SectionHeading>Your Identity Status</SectionHeading>
          <DetailGrid
            left={[
              { label: 'Wallet', value: shortAddr(identityStatus.wallet) },
              { label: 'Identity Registered', value: identityStatus.hasIdentity ? 'Yes' : 'No' },
              { label: 'Verified', value: <StatusBadge status={identityStatus.isVerified ? 'ACTIVE' : 'PENDING'} />, mono: false },
            ]}
            right={[
              { label: 'ONCHAINID Address', value: identityStatus.identityAddress ? shortAddr(identityStatus.identityAddress) : '—' },
              { label: 'Country', value: identityStatus.country > 0 ? String(identityStatus.country) : '—' },
              { label: 'Verification Level', value: `Tier ${identityStatus.verificationLevel}` },
            ]}
          />

          {identityStatus.claims && identityStatus.claims.length > 0 && (
            <>
              <SectionHeading>Claims</SectionHeading>
              <div className="border border-dl-border mb-8">
                <div className="grid grid-cols-12 border-b border-dl-border bg-dl-bg px-4 py-2 text-xs text-dl-gray font-dl-mono">
                  <div className="col-span-2">Topic</div>
                  <div className="col-span-2">Issuer</div>
                  <div className="col-span-3">Expires</div>
                  <div className="col-span-2">Days Left</div>
                  <div className="col-span-3">Expiry Status</div>
                </div>
                {identityStatus.claims.map((c: any, i: number) => {
                  const expiryStatus = getClaimExpiryStatus(c.validUntil);
                  return (
                    <div key={i} className="grid grid-cols-12 border-b border-dl-border px-4 py-2 text-sm font-dl-mono">
                      <div className="col-span-2">
                        {c.topic === 1 ? 'KYC Verified' : c.topic === 2 ? 'Accredited Investor' : c.topic === 3 ? 'Sanctions Clear' : `Topic ${c.topic}`}
                      </div>
                      <div className="col-span-2 text-xs">{shortAddr(c.issuer)}</div>
                      <div className="col-span-3 text-xs">{c.validUntil ? fmtTimestamp(c.validUntil) : '—'}</div>
                      <div className="col-span-2 text-xs">
                        {expiryStatus.daysRemaining !== null ? `${expiryStatus.daysRemaining}d` : '—'}
                      </div>
                      <div className="col-span-3">
                        {c.revoked ? (
                          <StatusBadge status="REJECTED" />
                        ) : (
                          <ClaimExpiryBadge status={expiryStatus.status} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!identityStatus.hasIdentity && !hasActiveSubmission && (
            <div className="border border-dl-border p-6 mb-8">
              <p className="text-sm text-dl-gray mb-2">
                No on-chain identity registered for this wallet.
                Submit your KYC information below to begin the verification process.
              </p>
            </div>
          )}
        </>
      )}

      {showForm && address && (
        <>
          <SectionHeading>Submit KYC Verification</SectionHeading>
          <KycSubmissionForm address={address} onSubmitted={() => { loadKycSubmissions(); }} />
        </>
      )}

      {isConnected && kycSubmissions.length > 0 && (
        <>
          <SectionHeading>Your KYC Submissions</SectionHeading>
          <div className="border border-dl-border mb-8">
            <div className="grid grid-cols-12 border-b border-dl-border bg-dl-bg px-4 py-2 text-xs text-dl-gray font-dl-mono">
              <div className="col-span-3">Name</div>
              <div className="col-span-2">Document</div>
              <div className="col-span-2">Country</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3">Submitted</div>
            </div>
            {kycSubmissions.map((s) => (
              <div key={s.id} className="grid grid-cols-12 border-b border-dl-border px-4 py-2 text-sm font-dl-mono">
                <div className="col-span-3 text-xs">{s.fullName}</div>
                <div className="col-span-2 text-xs text-dl-gray">{s.documentType.replace('_', ' ')}</div>
                <div className="col-span-2 text-xs">{s.country}</div>
                <div className="col-span-2"><KycStatusBadge status={s.status} /></div>
                <div className="col-span-3 text-xs text-dl-gray">{fmtTimestamp(s.createdAt)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeading>Claim Topics</SectionHeading>
      <div className="border border-dl-border mb-8">
        <div className="grid grid-cols-12 border-b border-dl-border bg-dl-bg px-4 py-2 text-xs text-dl-gray font-dl-mono">
          <div className="col-span-2">Topic ID</div>
          <div className="col-span-4">Name</div>
          <div className="col-span-6">Description</div>
        </div>
        {[
          { id: 1, name: 'KYC_VERIFIED', desc: 'Basic Know-Your-Customer verification complete' },
          { id: 2, name: 'ACCREDITED_INVESTOR', desc: 'SEC accredited investor qualification verified' },
          { id: 3, name: 'SANCTIONS_CLEAR', desc: 'OFAC sanctions screening passed' },
        ].map(t => (
          <div key={t.id} className="grid grid-cols-12 border-b border-dl-border px-4 py-2 text-sm font-dl-mono">
            <div className="col-span-2">{t.id}</div>
            <div className="col-span-4">{t.name}</div>
            <div className="col-span-6 text-dl-gray text-xs">{t.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function ComplianceTab({
  data,
  address,
  isConnected,
  complianceCheck,
  setComplianceCheck,
  onRunCheck,
}: {
  data: DashboardData;
  address: string | null;
  isConnected: boolean;
  complianceCheck: {
    to: string;
    amount: string;
    result: null | { compliant: boolean; complianceCheck: boolean; receiverVerified: boolean };
    loading: boolean;
    error: string | null;
  };
  setComplianceCheck: (fn: (prev: any) => any) => void;
  onRunCheck: () => void;
}) {
  return (
    <>
      <SectionHeading>Compliance Modules ({data.compliance.moduleCount} Active)</SectionHeading>
      <div className="border border-dl-border mb-8">
        {data.compliance.modules.map(m => (
          <div key={m.address} className="border-b border-dl-border px-4 py-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium font-dl-mono text-dl-navy">{m.name}</p>
                <p className="text-xs text-dl-gray font-dl-mono mt-1">{m.type}</p>
              </div>
              <a
                href={blockscoutLink(m.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dl-navy underline font-dl-mono text-xs"
              >
                {shortAddr(m.address)}
              </a>
            </div>
            <p className="text-xs text-dl-gray mt-2">
              {m.type === 'CountryAllowModule' && 'Restricts transfers to approved jurisdictions. Currently: US (840).'}
              {m.type === 'MaxBalanceModule' && 'Enforces per-holder maximum balance cap. Limit: 10,000,000 AXUSD.'}
              {m.type === 'TransferLimitModule' && 'Rate-limits transfer volume per time period.'}
              {m.type === 'LendingPlatformModule' && 'Whitelists lending/DeFi platforms for compliance-exempt transfers.'}
            </p>
          </div>
        ))}
      </div>

      {isConnected && (
        <>
          <SectionHeading>Pre-Flight Transfer Check</SectionHeading>
          <div className="border border-dl-border p-4 mb-8">
            <p className="text-xs text-dl-gray mb-3">
              Verify that a transfer would pass all compliance modules before submitting the transaction.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-dl-gray mb-1 block">Recipient Address</label>
                <input
                  type="text"
                  value={complianceCheck.to}
                  onChange={e => setComplianceCheck((prev: any) => ({ ...prev, to: e.target.value }))}
                  placeholder="0x..."
                  className="w-full border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white"
                />
              </div>
              <div>
                <label className="text-xs text-dl-gray mb-1 block">Amount (AXUSD)</label>
                <input
                  type="text"
                  value={complianceCheck.amount}
                  onChange={e => setComplianceCheck((prev: any) => ({ ...prev, amount: e.target.value }))}
                  placeholder="100.00"
                  className="w-full border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white"
                />
              </div>
            </div>
            <SolidButton
              onClick={onRunCheck}
              disabled={complianceCheck.loading || !complianceCheck.to || !complianceCheck.amount}
              size="sm"
            >
              {complianceCheck.loading ? 'Checking...' : 'Run Compliance Check'}
            </SolidButton>

            {complianceCheck.error && (
              <p className="text-xs text-dl-error mt-2">{complianceCheck.error}</p>
            )}

            {complianceCheck.result && (
              <div className="mt-3 border-t border-dl-border pt-3">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-dl-gray">Overall</p>
                    <StatusBadge status={complianceCheck.result.compliant ? 'ACTIVE' : 'REJECTED'} />
                  </div>
                  <div>
                    <p className="text-xs text-dl-gray">Module Check</p>
                    <StatusBadge status={complianceCheck.result.complianceCheck ? 'ACTIVE' : 'REJECTED'} />
                  </div>
                  <div>
                    <p className="text-xs text-dl-gray">Receiver Verified</p>
                    <StatusBadge status={complianceCheck.result.receiverVerified ? 'ACTIVE' : 'PENDING'} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!isConnected && (
        <div className="border border-dl-border p-6 text-center mb-8">
          <p className="text-sm text-dl-gray">Connect your wallet to run pre-flight compliance checks</p>
        </div>
      )}

      <SectionHeading>Compliance Activity</SectionHeading>
      <p className="text-xs text-dl-gray mb-3 font-dl-mono">
        Total events: {data.activity.totalComplianceEvents}
      </p>
      <div className="border border-dl-border mb-8">
        <div className="grid grid-cols-12 border-b border-dl-border bg-dl-bg px-4 py-2 text-xs text-dl-gray font-dl-mono">
          <div className="col-span-2">From</div>
          <div className="col-span-2">To</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Module</div>
          <div className="col-span-2">Result</div>
          <div className="col-span-2">Time</div>
        </div>
        {data.activity.recentEvents.length === 0 ? (
          <div className="px-4 py-3 text-sm text-dl-gray">No compliance events recorded</div>
        ) : (
          data.activity.recentEvents.map(e => (
            <div key={e.id} className="grid grid-cols-12 border-b border-dl-border px-4 py-2 text-xs font-dl-mono">
              <div className="col-span-2">{shortAddr(e.from)}</div>
              <div className="col-span-2">{shortAddr(e.to)}</div>
              <div className="col-span-2">{fmtAmount(e.amount)}</div>
              <div className="col-span-2 text-dl-gray">{e.module}</div>
              <div className="col-span-2">
                <StatusBadge status={e.result === 'pass' ? 'ACTIVE' : 'REJECTED'} />
              </div>
              <div className="col-span-2 text-dl-gray">{fmtTimestamp(e.timestamp)}</div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function ContractsTab({ data }: { data: DashboardData }) {
  const contractList = [
    { label: 'AXUSD Token (ERC-3643)', address: data.contracts.token, role: 'T-REX compliant stablecoin' },
    { label: 'Identity Registry', address: data.contracts.identityRegistry, role: 'Manages investor identities and verification' },
    { label: 'Identity Registry Storage', address: data.contracts.identityRegistryStorage, role: 'Persistent storage for identity data' },
    { label: 'Trusted Issuers Registry', address: data.contracts.trustedIssuersRegistry, role: 'Registry of authorized claim issuers' },
    { label: 'Claim Topics Registry', address: data.contracts.claimTopicsRegistry, role: 'Defines required claim topics' },
    { label: 'Modular Compliance', address: data.contracts.modularCompliance, role: 'Orchestrates all compliance modules' },
    { label: 'Claim Issuer', address: data.contracts.claimIssuer, role: 'Issues and validates identity claims' },
    { label: 'Identity Factory', address: data.contracts.identityFactory, role: 'Deploys ONCHAINID contracts via EIP-1167' },
    { label: 'Country Allow Module', address: data.contracts.modules.countryAllow, role: 'Jurisdiction whitelist (US: 840)' },
    { label: 'Max Balance Module', address: data.contracts.modules.maxBalance, role: 'Per-holder cap: 10,000,000 AXUSD' },
    { label: 'Transfer Limit Module', address: data.contracts.modules.transferLimit, role: 'Rate limiting on transfers' },
    { label: 'Lending Platform Module', address: data.contracts.modules.lendingPlatform, role: 'DeFi platform whitelist for compliant lending' },
  ];

  return (
    <>
      <SectionHeading>Deployed Contracts — Arbitrum One</SectionHeading>
      <p className="text-xs text-dl-gray mb-3 font-dl-mono">
        All contracts verified on Blockscout. Architecture: UUPS proxy + implementation.
      </p>

      <div className="border border-dl-border mb-8">
        <div className="grid grid-cols-12 border-b border-dl-border bg-dl-bg px-4 py-2 text-xs text-dl-gray font-dl-mono">
          <div className="col-span-3">Contract</div>
          <div className="col-span-4">Address</div>
          <div className="col-span-5">Role</div>
        </div>
        {contractList.map(c => (
          <div key={c.address} className="grid grid-cols-12 border-b border-dl-border px-4 py-2 text-sm">
            <div className="col-span-3 font-dl-mono text-xs">{c.label}</div>
            <div className="col-span-4">
              <a
                href={blockscoutLink(c.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-dl-navy underline font-dl-mono text-xs"
              >
                {c.address}
              </a>
            </div>
            <div className="col-span-5 text-xs text-dl-gray">{c.role}</div>
          </div>
        ))}
      </div>

      <SectionHeading>Architecture</SectionHeading>
      <div className="border border-dl-border p-4 mb-8 text-sm text-dl-gray">
        <p className="mb-2">
          The Unified AXUSD system replaces the dual-ecosystem (GENIUS + Legacy) with a single
          ERC-3643 (T-REX) compliant token. All transfers are validated through the Modular
          Compliance contract, which enforces four on-chain rules:
        </p>
        <ul className="list-disc list-inside space-y-1 text-xs font-dl-mono">
          <li>Country Allow — only approved jurisdictions</li>
          <li>Max Balance — per-holder concentration cap</li>
          <li>Transfer Limit — rate limiting per time window</li>
          <li>Lending Platform — whitelisted DeFi integrations</li>
        </ul>
        <p className="mt-3">
          Identity is managed through ONCHAINID (EIP-734/EIP-735). Each holder requires a deployed
          identity contract with verified claims (KYC, accreditation, sanctions clearance) before
          participating in the ecosystem.
        </p>
      </div>
    </>
  );
}
