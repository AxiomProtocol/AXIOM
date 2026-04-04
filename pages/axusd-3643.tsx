import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useWallet } from '../components/WalletConnect/WalletContext';
import { DesignLawLayout, SectionHeading, DetailGrid } from '../components/design-law';
import { StatusBadge } from '../components/design-law/StatusBadge';
import { SolidButton } from '../components/design-law/SolidButton';
import type { OraclePriceResponse } from './api/oracle/axusd-price';
import {
  isEvkVaultDeployed,
  isCanonicalPsmDeployed,
  CANONICAL_PSM,
  ACTIVE_AXUSD,
} from '../src/config/activeContracts.generated';

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

type Tab = 'overview' | 'identity' | 'compliance' | 'psm' | 'contracts' | 'oracle';

interface PsmApiData {
  canonical: {
    address: string;
    axusdToken: string;
    label: string;
    deployedAt: string;
    mintFee: number;
    redeemFee: number;
    mintFeePct: string;
    redeemFeePct: string;
    debtCeiling: string;
    debtOutstanding: string;
    utilizationPct: string;
    availableCapacity: string;
    usdcReserves: string;
    availableLiquidity: string;
    feesAccrued: string;
    canonicalAxusdSupply: string;
    paused: boolean;
    owner: string;
    agentRegistered: boolean;
    note: string;
  };
  legacy: {
    address: string;
    axusdToken: string;
    label: string;
    mintFeePct: string;
    redeemFeePct: string;
    debtCeiling: string;
    debtOutstanding: string;
    usdcReserves: string;
    paused: boolean;
    deprecated: boolean;
    note: string;
  };
  eulerPsm: {
    address: string;
    label: string;
    deprecated: boolean;
    note: string;
  };
  timestamp: string;
}

function shortAddr(addr: string | null): string {
  if (!addr) return '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function blockscoutLink(addr: string): string {
  return `https://arbitrum.blockscout.com/address/${addr}`;
}

function blockscoutTxLink(txHash: string): string {
  return `https://arbitrum.blockscout.com/tx/${txHash}`;
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
  return <span className={`px-2 py-0.5 text-xs font-dl-mono ${s.color}`}>{s.label}</span>;
}

export default function AXUSD3643Page() {
  const { walletState, siweState } = useWallet();
  // Prefer wagmi address; fall back to SIWE-authenticated address so the
  // dashboard fetches the correct on-chain balance after a page refresh
  // where wagmi hasn't reconnected yet but the SIWE session is still active.
  const address = walletState.address || siweState.authenticatedAddress || null;
  const isConnected = walletState.isConnected || siweState.isAuthenticated;
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [oracleData, setOracleData] = useState<OraclePriceResponse | null>(null);
  const [oracleLoading, setOracleLoading] = useState(false);
  const [psmData, setPsmData] = useState<PsmApiData | null>(null);
  const [psmLoading, setPsmLoading] = useState(false);
  const [psmError, setPsmError] = useState<string | null>(null);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [address]);

  const fetchOraclePrice = useCallback(async () => {
    setOracleLoading(true);
    try {
      const res = await fetch('/api/oracle/axusd-price');
      if (res.ok) {
        const json = await res.json() as OraclePriceResponse;
        setOracleData(json);
      }
    } catch {
    } finally {
      setOracleLoading(false);
    }
  }, []);

  const fetchPsmData = useCallback(async () => {
    if (!isCanonicalPsmDeployed()) return;
    setPsmLoading(true);
    setPsmError(null);
    try {
      const res = await fetch('/api/axusd/psm');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch PSM data');
      setPsmData(json.data);
    } catch (err: unknown) {
      setPsmError(err instanceof Error ? err.message : String(err));
    } finally {
      setPsmLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    fetchOraclePrice();
    fetchPsmData();
  }, [fetchDashboard, fetchOraclePrice, fetchPsmData]);

  const runComplianceCheck = async () => {
    if (!address || !complianceCheck.to || !complianceCheck.amount) return;
    setComplianceCheck(prev => ({ ...prev, loading: true, error: null, result: null }));
    try {
      const res = await fetch(`/api/erc3643/compliance/check?from=${address}&to=${complianceCheck.to}&amount=${complianceCheck.amount}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Check failed');
      setComplianceCheck(prev => ({ ...prev, result: json.data, loading: false }));
    } catch (err: unknown) {
      setComplianceCheck(prev => ({ ...prev, error: err instanceof Error ? err.message : String(err), loading: false }));
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'identity', label: 'Identity' },
    { key: 'compliance', label: 'Compliance' },
    { key: 'psm', label: 'PSM' },
    { key: 'contracts', label: 'Contracts' },
    { key: 'oracle', label: 'Oracle' },
  ];

  return (
    <DesignLawLayout>
      <Head>
        <title>Unified AXUSD | ERC-3643 T-REX | Axiom Protocol</title>
      </Head>

      <div className="mb-6">
        <h1 className="font-dl-serif text-2xl text-dl-navy mb-1">Unified AXUSD — ERC-3643 (T-REX)</h1>
        <p className="text-sm text-dl-gray font-dl-mono">
          Institutional-grade stablecoin with on-chain identity standard and modular compliance
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
          {tab === 'oracle' && (
            <OracleTab
              oracleData={oracleData}
              oracleLoading={oracleLoading}
              onRefresh={fetchOraclePrice}
            />
          )}
        </>
      )}

      {tab === 'psm' && (
        <PsmTab
          psmData={psmData}
          psmLoading={psmLoading}
          psmError={psmError}
          address={address}
          isConnected={isConnected}
          onRefresh={fetchPsmData}
        />
      )}

      {!data && !loading && tab === 'oracle' && (
        <OracleTab
          oracleData={oracleData}
          oracleLoading={oracleLoading}
          onRefresh={fetchOraclePrice}
        />
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

      <SectionHeading>Active Utility</SectionHeading>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-dl-border mb-8">
        <div className="p-5 border-r border-dl-border">
          <div className="flex items-center gap-2 mb-2">
            {isEvkVaultDeployed() ? (
              <span className="font-dl-mono text-xs font-semibold text-dl-forest border border-dl-forest px-2 py-0.5">LIVE</span>
            ) : (
              <span className="font-dl-mono text-xs font-semibold text-dl-gold border border-dl-gold px-2 py-0.5">PENDING DEPLOYMENT</span>
            )}
            <span className="font-dl-mono text-xs text-dl-gray">Task #38</span>
          </div>
          <h3 className="font-dl-serif text-sm font-semibold text-dl-navy mb-1">EVK Open Money Market</h3>
          <p className="text-xs text-dl-gray leading-relaxed mb-3">
            Euler V2 vault accepting ERC-3643 AXUSD as its base asset. Deposit USDC as collateral
            to borrow AXUSD at a variable rate. Requires on-chain identity registration via this dashboard.
          </p>
          <div className="font-dl-mono text-xs space-y-1 mb-3">
            <div className="flex justify-between">
              <span className="text-dl-gray uppercase">Collateral</span>
              <span className="text-dl-navy">USDC at 90% LTV</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray uppercase">IRM</span>
              <span className="text-dl-navy">LinearKink (1%→100%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray uppercase">Borrow Cap</span>
              <span className="text-dl-navy">500K AXUSD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray uppercase">Network</span>
              <span className="text-dl-navy">Arbitrum One</span>
            </div>
          </div>
          <a href="/lending-fund?tab=open-market" className="text-xs text-dl-navy underline font-dl-mono">View market details &rarr;</a>
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-dl-mono text-xs font-semibold text-dl-forest border border-dl-forest px-2 py-0.5">LIVE</span>
            <span className="font-dl-mono text-xs text-dl-gray">Phase 6</span>
          </div>
          <h3 className="font-dl-serif text-sm font-semibold text-dl-navy mb-1">AXIOMCreditMarket</h3>
          <p className="text-xs text-dl-gray leading-relaxed mb-3">
            ERC-3643 gated LP pool for the private credit market. LP capital is committed to verified borrowers
            via AXIOMFixedLoan. Interest distributes pro-rata on repayment events.
          </p>
          <div className="font-dl-mono text-xs space-y-1 mb-3">
            <div className="flex justify-between">
              <span className="text-dl-gray uppercase">LP Eligibility</span>
              <span className="text-dl-navy">Accredited (Reg D 506(c))</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray uppercase">Borrower Eligibility</span>
              <span className="text-dl-navy">GEF Operator+ tier</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray uppercase">Rate</span>
              <span className="text-dl-navy">14% p.a. (fixed, up to 50% cap)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dl-gray uppercase">Network</span>
              <span className="text-dl-navy">Arbitrum One</span>
            </div>
          </div>
          <a href="/lending-fund" className="text-xs text-dl-navy underline font-dl-mono">View lending fund &rarr;</a>
        </div>
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
  return <span className={`px-2 py-0.5 text-xs font-dl-mono ${s.color}`}>{s.label}</span>;
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

function OracleTab({
  oracleData,
  oracleLoading,
  onRefresh,
}: {
  oracleData: OraclePriceResponse | null;
  oracleLoading: boolean;
  onRefresh: () => void;
}) {
  const SOURCE_LABELS: Record<string, string> = {
    on_chain_erc7726: 'On-Chain ERC-7726 (AXIOMOracleAdapter)',
    psm_ratio:        'PSM Backing Ratio (off-chain)',
    coingecko_fallback: 'CoinGecko USDC/USD Proxy',
    static_parity:    'Static 1:1 USD Parity',
  };

  const isDeployed = oracleData?.onChainOracle?.deployed ?? false;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dl-serif text-lg text-dl-navy">ERC-7726 Oracle Infrastructure</h2>
        <SolidButton size="sm" onClick={onRefresh} disabled={oracleLoading}>
          {oracleLoading ? 'Refreshing...' : 'Refresh'}
        </SolidButton>
      </div>

      {oracleLoading && !oracleData && (
        <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">Fetching oracle data...</p>
      )}

      {oracleData && (
        <>
          <SectionHeading>Current AXUSD Price</SectionHeading>
          <DetailGrid
            left={[
              { label: 'AXUSD / USD', value: `$${oracleData.axusdUsdPrice}` },
              { label: 'Price (WAD)', value: oracleData.axusdUsdPriceWad },
              { label: 'Price Source', value: SOURCE_LABELS[oracleData.source] ?? oracleData.source },
            ]}
            right={[
              {
                label: 'Oracle Standard',
                value: <span className="font-dl-mono text-xs text-dl-navy">ERC-7726</span>,
                mono: false,
              },
              {
                label: 'Oracle Status',
                value: <StatusBadge status={isDeployed ? 'ACTIVE' : 'PENDING'} />,
                mono: false,
              },
              { label: 'Timestamp', value: new Date(oracleData.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false }) + ' ET' },
            ]}
          />

          {oracleData.sourceLabel && (
            <p className="text-xs text-dl-gray font-dl-mono mb-6 border border-dl-border px-4 py-2">
              Source detail: {oracleData.sourceLabel}
            </p>
          )}

          <SectionHeading>On-Chain Oracle Contract</SectionHeading>
          <DetailGrid
            left={[
              {
                label: 'Contract Address',
                value: isDeployed ? (
                  <a
                    href={`https://arbitrum.blockscout.com/address/${oracleData.onChainOracle.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-dl-navy underline font-dl-mono text-xs"
                  >
                    {oracleData.onChainOracle.address}
                  </a>
                ) : (
                  <span className="text-dl-gray text-xs font-dl-mono">PENDING_DEPLOYMENT</span>
                ),
                mono: false,
              },
              { label: 'Interface', value: 'ERC-7726 (getQuote)' },
            ]}
            right={[
              {
                label: 'Deployment Status',
                value: <StatusBadge status={isDeployed ? 'ACTIVE' : 'PENDING'} />,
                mono: false,
              },
              {
                label: 'Price WAD (on-chain)',
                value: oracleData.onChainOracle.priceWad ?? '—',
              },
            ]}
          />

          {!isDeployed && (
            <div className="border border-dl-border p-4 mb-8">
              <p className="text-xs text-dl-gray font-dl-mono mb-2">
                The AXIOMOracleAdapter contract is pending deployment to Arbitrum One.
                Source code: <code className="text-dl-navy">contracts/oracle/AXIOMOracleAdapter.sol</code>
              </p>
              <p className="text-xs text-dl-gray font-dl-mono">
                Deployment command: <code className="text-dl-navy">npx hardhat run scripts/deploy-axusd-oracle.js --network arbitrumOne</code>
              </p>
            </div>
          )}

          {oracleData.psmBacking && (
            <>
              <SectionHeading>PSM Backing Analysis</SectionHeading>
              <DetailGrid
                left={[
                  { label: 'Primary PSM USDC', value: `$${parseFloat(oracleData.psmBacking.primaryPsmUsdcBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: 'Euler PSM USDC', value: `$${parseFloat(oracleData.psmBacking.eulerPsmUsdcBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                  { label: 'Total PSM USDC', value: `$${parseFloat(oracleData.psmBacking.totalPsmUsdc).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
                ]}
                right={[
                  { label: 'AXUSD Circulating', value: `${parseFloat(oracleData.psmBacking.primaryAxusdSupply).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AXUSD` },
                  { label: 'Backing Ratio', value: `${oracleData.psmBacking.backingRatio}x` },
                  {
                    label: 'Fully Backed',
                    value: <StatusBadge status={oracleData.psmBacking.isFullyBacked ? 'ACTIVE' : 'WARNING'} />,
                    mono: false,
                  },
                ]}
              />
            </>
          )}

          {oracleData.erc7726Quote && (
            <>
              <SectionHeading>ERC-7726 Canonical Quote</SectionHeading>
              <DetailGrid
                left={[
                  { label: 'Interface Call', value: 'getQuote(inAmount, base, quote)' },
                  { label: 'In Amount', value: `${oracleData.erc7726Quote.inAmount} (1 USDC, 6 dec)` },
                  { label: 'Base Token', value: shortAddr(oracleData.erc7726Quote.base) + ' (USDC)' },
                ]}
                right={[
                  { label: 'Quote Token', value: shortAddr(oracleData.erc7726Quote.quote) + ' (AXUSD)' },
                  { label: 'Out Amount', value: `${oracleData.erc7726Quote.outAmount} AXUSD wei` },
                  { label: 'Description', value: oracleData.erc7726Quote.description },
                ]}
              />
            </>
          )}

          <SectionHeading>Supported Quote Pairs</SectionHeading>
          <div className="border border-dl-border mb-8">
            <div className="grid grid-cols-12 border-b border-dl-border bg-dl-bg px-4 py-2 text-xs text-dl-gray font-dl-mono">
              <div className="col-span-3">Base</div>
              <div className="col-span-3">Quote</div>
              <div className="col-span-3">Price Source</div>
              <div className="col-span-3">Decimal Model</div>
            </div>
            {[
              { base: 'USDC', quote: 'AXUSD', src: 'PSM ratio', dec: '6 dec → 18 dec' },
              { base: 'AXUSD', quote: 'USDC', src: 'PSM ratio', dec: '18 dec → 6 dec' },
              { base: 'USDT', quote: 'AXUSD', src: 'Static parity', dec: '6 dec → 18 dec' },
              { base: 'WETH', quote: 'AXUSD', src: 'Chainlink ETH/USD', dec: '18 dec → 18 dec' },
              { base: 'ARB', quote: 'AXUSD', src: 'Chainlink ARB/USD', dec: '18 dec → 18 dec' },
              { base: 'WBTC', quote: 'AXUSD', src: 'Chainlink BTC/USD', dec: '8 dec → 18 dec' },
            ].map((row, i) => (
              <div key={i} className="grid grid-cols-12 border-b border-dl-border px-4 py-2 text-xs font-dl-mono">
                <div className="col-span-3">{row.base}</div>
                <div className="col-span-3">{row.quote}</div>
                <div className="col-span-3 text-dl-gray">{row.src}</div>
                <div className="col-span-3 text-dl-gray">{row.dec}</div>
              </div>
            ))}
          </div>

          <SectionHeading>Legacy Oracle References</SectionHeading>
          <div className="border border-dl-border p-4 mb-8 text-xs text-dl-gray font-dl-mono space-y-1">
            <p>Phase 3 OracleAdapter (Contract 31): <span className="text-dl-navy">0xE3b1f38AaBAd138d0EF2e2C7429ee57c512fDF3D</span></p>
            <p>OracleAdapterRegistry (EulerVaultService): <span className="text-dl-navy">0x91c8B55D234de4b48C1F1F1c5e9c4b6C8CB96f84</span></p>
            <p>Euler Vault PRICE_ORACLE: <span className="text-dl-navy">0x1045B6c70AC7b491bf724B5Aa4D89F542D955E15</span></p>
            <p className="mt-2 text-dl-gray">These are superseded by AXIOMOracleAdapter once deployed. All contract references updated automatically via oracleConfig.ts when deployment is complete.</p>
          </div>
        </>
      )}
    </>
  );
}

// ─── PSM Mint/Redeem Panel ──────────────────────────────────────────────────
//
// Contract interface (verified against deployed CanonicalPSM.sol):
//   mint(uint256 usdcAmount)    — caller deposits USDC (6 dec); receives AXUSD (18 dec)
//   redeem(uint256 axusdAmount) — caller burns AXUSD (18 dec); receives USDC (6 dec)
//     T-REX agent-burn does not require ERC20 allowance — PSM burns directly as agent.
//
// UX:
//   Mint:   input USDC amount → approve USDC → psm.mint(usdcAmount_6dec)
//   Redeem: input AXUSD amount → psm.redeem(axusdAmount_18dec)  [no approve needed]
//
const USDC_APPROVE_ABI = ['function approve(address spender, uint256 amount) returns (bool)'];
const PSM_MINT_ABI     = ['function mint(uint256 usdcAmount) external returns (uint256 axusdMinted)'];
const PSM_REDEEM_ABI   = ['function redeem(uint256 axusdAmount) external returns (uint256 usdcReturned)'];
// Addresses sourced from activeContracts.generated.ts — single source of truth
const CANONICAL_PSM_ADDR   = CANONICAL_PSM;     // from activeContracts
const CANONICAL_AXUSD_ADDR = ACTIVE_AXUSD;      // from activeContracts
const USDC_ADDR            = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'; // Arbitrum One USDC (immutable)

type PsmOp = 'mint' | 'redeem';
type TxPhase = 'idle' | 'approve_pending' | 'approve_done' | 'tx_pending' | 'success' | 'error';

interface IdentityStatus {
  hasIdentity: boolean;
  isVerified: boolean;
  identityAddress: string | null;
}

const USDC_AXUSD_SCALE = 1_000_000_000_000n; // 1e12: scale USDC (6 dec) → AXUSD (18 dec)

// Mint: user provides USDC (6 dec). Preview = AXUSD out (18 dec)
// AXUSD received = (usdcAmount - fee) * 1e12  where fee = usdcAmount * mintFee / 10000
function computeAxusdFromMint(usdcAmount6: bigint, mintFeeBps: number): bigint {
  const fee = (usdcAmount6 * BigInt(mintFeeBps)) / 10000n;
  const netUsdc = usdcAmount6 - fee;
  return netUsdc * USDC_AXUSD_SCALE;
}

// Redeem: user provides AXUSD (18 dec). Preview = USDC out (6 dec)
// USDC received = axusdAmount / 1e12 - fee  where fee = (axusdAmount * redeemFee / 10000) / 1e12
function computeUsdcFromRedeem(axusdWei: bigint, redeemFeeBps: number): bigint {
  const axusdFee = (axusdWei * BigInt(redeemFeeBps)) / 10000n;
  const usdcFee  = axusdFee / USDC_AXUSD_SCALE;
  const usdcGross = axusdWei / USDC_AXUSD_SCALE;
  return usdcGross - usdcFee;
}

/**
 * Safely parse a user-entered decimal string to BigInt with a given number of decimals.
 * Avoids float arithmetic entirely to prevent precision loss on large values.
 * e.g. parseDecimalToBigInt("100.005001", 6) → 100005001n
 */
function parseDecimalToBigInt(val: string, decimals: number): bigint | null {
  const trimmed = val.trim();
  if (!trimmed || trimmed === '' || trimmed === '.') return null;
  const [intStr, fracStr = ''] = trimmed.split('.');
  if (!/^\d*$/.test(intStr) || !/^\d*$/.test(fracStr)) return null;
  const frac = fracStr.padEnd(decimals, '0').slice(0, decimals);
  const intPart = BigInt(intStr || '0') * (10n ** BigInt(decimals));
  const fracPart = BigInt(frac);
  const result = intPart + fracPart;
  return result > 0n ? result : null;
}

function PsmMintRedeemPanel({
  address,
  isConnected,
  mintFeeBps,
  redeemFeeBps,
  paused,
  agentRegistered,
}: {
  address: string | null;
  isConnected: boolean;
  mintFeeBps: number;
  redeemFeeBps: number;
  paused: boolean;
  agentRegistered: boolean;
}) {
  const [op, setOp] = useState<PsmOp>('mint');
  const [amountStr, setAmountStr] = useState('');
  const [phase, setPhase] = useState<TxPhase>('idle');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus | null>(null);
  const [identityLoading, setIdentityLoading] = useState(false);

  // Fetch identity status when wallet connects
  useEffect(() => {
    if (!address) { setIdentityStatus(null); return; }
    setIdentityLoading(true);
    fetch(`/api/erc3643/identity/status?wallet=${address}`)
      .then(r => r.json())
      .then(json => {
        setIdentityStatus({
          hasIdentity: json.data?.hasIdentity ?? false,
          isVerified: json.data?.isVerified ?? false,
          identityAddress: json.data?.identityAddress ?? null,
        });
      })
      .catch(() => setIdentityStatus({ hasIdentity: false, isVerified: false, identityAddress: null }))
      .finally(() => setIdentityLoading(false));
  }, [address]);

  // For MINT: amount is in USDC (6 dec); for REDEEM: amount is in AXUSD (18 dec)
  // Use string-based BigInt parsing to eliminate float precision risk.
  const inputWei = (() => {
    if (op === 'mint') {
      return parseDecimalToBigInt(amountStr, 6); // USDC 6 dec
    } else {
      // AXUSD 18 dec — snap to nearest whole USDC unit (1e12 multiple) per PSM precision guard
      const raw = parseDecimalToBigInt(amountStr, 18);
      if (!raw) return null;
      return (raw / USDC_AXUSD_SCALE) * USDC_AXUSD_SCALE;
    }
  })();

  const outputPreview = inputWei
    ? (op === 'mint'
        ? computeAxusdFromMint(inputWei, mintFeeBps)
        : computeUsdcFromRedeem(inputWei, redeemFeeBps))
    : null;

  // Bigint-safe display formatters — no float precision loss for large values
  const fmtUsdc6 = (wei: bigint): string => {
    const intPart  = wei / 1_000_000n;
    const fracPart = wei % 1_000_000n;
    const frac     = fracPart.toString().padStart(6, '0'); // always 6 digits
    // Trim trailing zeros but keep at least 2
    const trimmed  = frac.replace(/0+$/, '').padEnd(2, '0');
    return `${intPart.toLocaleString('en-US')}.${trimmed}`;
  };
  const fmtAxusd18 = (wei: bigint): string => {
    const scale18  = 1_000_000_000_000_000_000n;
    const intPart  = wei / scale18;
    const fracPart = wei % scale18;
    const frac     = fracPart.toString().padStart(18, '0').slice(0, 6); // 6 frac digits
    const trimmed  = frac.replace(/0+$/, '').padEnd(2, '0');
    return `${intPart.toLocaleString('en-US')}.${trimmed}`;
  };

  async function getProvider() {
    if (typeof window === 'undefined') throw new Error('Browser only');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const eth = (window as unknown as Record<string, unknown>).ethereum;
    if (!eth) throw new Error('No injected wallet found. Install MetaMask.');
    const { ethers } = await import('ethers');
    const provider = new ethers.BrowserProvider(eth as Parameters<typeof ethers.BrowserProvider>[0]);
    const signer = await provider.getSigner();
    return { ethers, signer };
  }

  async function handleMint() {
    if (!inputWei || !address) return;
    setPhase('approve_pending'); setErrMsg(null); setTxHash(null);
    try {
      const { ethers, signer } = await getProvider();

      // Step 1: approve USDC to PSM
      const usdc = new ethers.Contract(USDC_ADDR, USDC_APPROVE_ABI, signer);
      const approveTx = await usdc.approve(CANONICAL_PSM_ADDR, inputWei);
      await approveTx.wait();
      setPhase('approve_done');

      // Step 2: call mint(usdcAmount) — PSM pulls USDC, mints AXUSD to caller
      setPhase('tx_pending');
      const psm = new ethers.Contract(CANONICAL_PSM_ADDR, PSM_MINT_ABI, signer);
      const mintTx = await psm.mint(inputWei);
      setTxHash(mintTx.hash);
      await mintTx.wait();
      setPhase('success');
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  async function handleRedeem() {
    if (!inputWei || !address) return;
    setPhase('tx_pending'); setErrMsg(null); setTxHash(null);
    try {
      const { ethers, signer } = await getProvider();

      // T-REX agent-burn does not require ERC20 allowance — call redeem directly.
      const psm = new ethers.Contract(CANONICAL_PSM_ADDR, PSM_REDEEM_ABI, signer);
      const redeemTx = await psm.redeem(inputWei);
      setTxHash(redeemTx.hash);
      await redeemTx.wait();
      setPhase('success');
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  }

  function reset() { setPhase('idle'); setTxHash(null); setErrMsg(null); setAmountStr(''); }

  if (!isConnected) {
    return (
      <div className="border border-dl-border p-6 mb-8 text-center">
        <p className="text-sm text-dl-gray">Connect your wallet to use the Canonical PSM.</p>
      </div>
    );
  }

  if (identityLoading) {
    return <p className="text-sm text-dl-gray font-dl-mono py-4">Checking identity status...</p>;
  }

  if (identityStatus && !identityStatus.isVerified) {
    return (
      <div className="border border-dl-border p-4 mb-8">
        <p className="text-xs font-dl-mono text-dl-navy font-semibold mb-2">Identity Verification Required</p>
        <p className="text-xs text-dl-gray font-dl-mono mb-2">
          Your wallet (<span className="text-dl-navy">{shortAddr(address)}</span>) is not verified in the ERC-3643 Identity Registry.
          The Canonical PSM checks <span className="text-dl-navy">isVerified()</span> on every mint and redeem — unverified wallets are rejected on-chain.
        </p>
        <p className="text-xs text-dl-gray font-dl-mono">
          {identityStatus.hasIdentity
            ? 'Identity registered but claims are incomplete or expired. Contact your claim issuer.'
            : 'No on-chain identity found. Submit KYC verification on the Identity tab to begin the process.'}
        </p>
      </div>
    );
  }

  if (paused) {
    return (
      <div className="border border-dl-border p-4 mb-8 text-xs text-dl-gray font-dl-mono">
        <span className="text-dl-navy font-semibold">PSM Paused</span> — Mint and redeem are currently suspended by governance.
      </div>
    );
  }

  return (
    <div className="border border-dl-border p-4 mb-8">
      {/* Identity verified notice */}
      <div className="flex items-center gap-2 mb-4 text-xs font-dl-mono text-green-700 border border-green-200 bg-green-50 px-3 py-2">
        <span>Identity verified — wallet {shortAddr(address)} is cleared for PSM operations.</span>
      </div>

      {/* Operation toggle */}
      <div className="flex gap-0 border-b border-dl-border mb-4">
        {(['mint', 'redeem'] as PsmOp[]).map(o => (
          <button
            key={o}
            onClick={() => { setOp(o); reset(); }}
            className={`px-4 py-1.5 text-sm border-b-2 -mb-px capitalize ${op === o ? 'border-dl-navy text-dl-navy font-medium' : 'border-transparent text-dl-gray'}`}
          >
            {o === 'mint' ? 'Mint AXUSD' : 'Redeem AXUSD'}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="mb-3">
        <label className="text-xs text-dl-gray mb-1 block font-dl-mono">
          {op === 'mint' ? 'USDC to Deposit' : 'AXUSD to Redeem'}
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={e => { setAmountStr(e.target.value); if (phase !== 'idle') reset(); }}
            placeholder={op === 'mint' ? '100.000000 USDC' : '100.000000 AXUSD'}
            className="flex-1 border border-dl-border px-3 py-1.5 text-sm font-dl-mono bg-white"
          />
          <span className="text-xs font-dl-mono text-dl-gray">{op === 'mint' ? 'USDC' : 'AXUSD'}</span>
        </div>
      </div>

      {/* Preview */}
      {outputPreview !== null && inputWei !== null && (
        <div className="border border-dl-border bg-dl-bg-alt px-3 py-2 mb-4 text-xs font-dl-mono">
          {op === 'mint' ? (
            <p>AXUSD to receive: <span className="text-dl-navy font-semibold">{fmtAxusd18(outputPreview)} AXUSD</span> (after {mintFeeBps / 100}% fee on USDC deposit)</p>
          ) : (
            <p>USDC to receive: <span className="text-dl-navy font-semibold">{fmtUsdc6(outputPreview)} USDC</span> (after {redeemFeeBps / 100}% fee)</p>
          )}
        </div>
      )}

      {/* Status messages */}
      {phase === 'approve_pending' && (
        <p className="text-xs text-dl-gray font-dl-mono mb-3">
          Step 1/2 — Awaiting USDC approval in wallet...
        </p>
      )}
      {phase === 'approve_done' && (
        <p className="text-xs text-dl-gray font-dl-mono mb-3">
          Step 1/2 complete — USDC approved. Awaiting mint transaction...
        </p>
      )}
      {phase === 'tx_pending' && (
        <p className="text-xs text-dl-gray font-dl-mono mb-3">
          {op === 'mint' ? 'Step 2/2' : 'Step 1/1'} — Transaction submitted. Awaiting confirmation...
          {txHash && (
            <> <a href={blockscoutTxLink(txHash)} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline ml-1">View on Blockscout</a></>
          )}
        </p>
      )}
      {phase === 'success' && (
        <div className="border border-green-200 bg-green-50 px-3 py-2 mb-3 text-xs font-dl-mono text-green-700">
          Transaction confirmed.
          {txHash && (
            <> <a href={blockscoutTxLink(txHash)} target="_blank" rel="noopener noreferrer" className="underline ml-1">View TX</a></>
          )}
          <button onClick={reset} className="ml-4 text-dl-navy underline bg-transparent border-0 p-0 text-xs font-dl-mono cursor-pointer">New operation</button>
        </div>
      )}
      {phase === 'error' && (
        <div className="border border-red-200 bg-red-50 px-3 py-2 mb-3 text-xs font-dl-mono text-red-700">
          Error: {errMsg}
          <button onClick={reset} className="ml-4 text-dl-navy underline bg-transparent border-0 p-0 text-xs font-dl-mono cursor-pointer">Try again</button>
        </div>
      )}

      {/* Action button — disabled until PSM is activated as AXUSD agent */}
      {(phase === 'idle') && (
        <SolidButton
          onClick={op === 'mint' ? handleMint : handleRedeem}
          disabled={!inputWei || !isConnected || !agentRegistered}
          size="sm"
          title={!agentRegistered ? 'PSM not yet activated — awaiting grantRole(AGENT_ROLE) call' : undefined}
        >
          {op === 'mint' ? 'Approve USDC + Mint AXUSD' : 'Redeem AXUSD for USDC'}
        </SolidButton>
      )}

      {/* Activation status banner — only shown when PSM is not yet registered as agent */}
      {!agentRegistered && (
        <div className="mt-4 border border-dl-border bg-white px-3 py-2 text-xs font-dl-mono text-dl-gray">
          <span className="text-dl-navy font-semibold">Activation Pending:</span> Canonical PSM requires Governance Safe to call{' '}
          <span className="text-dl-navy">addAgent(CANONICAL_PSM)</span> on the AXUSD token before mint/redeem succeed on-chain.
          The form is ready — transactions will revert until activated.
        </div>
      )}
    </div>
  );
}

function PsmTab({
  psmData,
  psmLoading,
  psmError,
  address,
  isConnected,
  onRefresh,
}: {
  psmData: PsmApiData | null;
  psmLoading: boolean;
  psmError: string | null;
  address: string | null;
  isConnected: boolean;
  onRefresh: () => void;
}) {
  const canonicalDeployed = isCanonicalPsmDeployed();

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-dl-serif text-lg text-dl-navy">Peg Stability Modules</h2>
        <SolidButton size="sm" onClick={onRefresh} disabled={psmLoading}>
          {psmLoading ? 'Refreshing...' : 'Refresh'}
        </SolidButton>
      </div>

      {!canonicalDeployed && (
        <div className="border border-dl-border p-4 mb-8 text-sm text-dl-gray font-dl-mono">
          Canonical PSM not yet deployed. Check back after deployment.
        </div>
      )}

      {psmLoading && !psmData && (
        <p className="text-sm text-dl-gray font-dl-mono py-8 text-center">Loading PSM data...</p>
      )}

      {psmError && (
        <p className="text-sm text-dl-error font-dl-mono py-4">Error: {psmError}</p>
      )}

      {psmData && (
        <>
          <SectionHeading>Canonical PSM (ERC-3643 Identity-Gated)</SectionHeading>
          <div className="border border-dl-border p-4 mb-4 text-xs text-dl-gray font-dl-mono bg-dl-bg-alt">
            {psmData.canonical.note}
          </div>
          <DetailGrid
            left={[
              { label: 'PSM Address', value: (
                <a href={blockscoutLink(psmData.canonical.address)} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline font-dl-mono text-xs">
                  {psmData.canonical.address}
                </a>
              ), mono: false },
              { label: 'AXUSD Token (ERC-3643)', value: (
                <a href={blockscoutLink(psmData.canonical.axusdToken)} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline font-dl-mono text-xs">
                  {shortAddr(psmData.canonical.axusdToken)}
                </a>
              ), mono: false },
              { label: 'Deployed', value: psmData.canonical.deployedAt },
              { label: 'Owner', value: shortAddr(psmData.canonical.owner) },
            ]}
            right={[
              { label: 'Status', value: <StatusBadge status={psmData.canonical.paused ? 'PAUSED' : 'ACTIVE'} />, mono: false },
              { label: 'Mint Fee', value: psmData.canonical.mintFeePct },
              { label: 'Redeem Fee', value: psmData.canonical.redeemFeePct },
              { label: 'Access Control', value: 'Owner (Governance Safe)' },
            ]}
          />

          <SectionHeading>Reserve Metrics</SectionHeading>
          <DetailGrid
            left={[
              { label: 'USDC Reserves', value: `${parseFloat(psmData.canonical.usdcReserves).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC` },
              { label: 'Available Liquidity', value: `${parseFloat(psmData.canonical.availableLiquidity).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC` },
              { label: 'Fees Accrued', value: `${parseFloat(psmData.canonical.feesAccrued).toLocaleString('en-US', { minimumFractionDigits: 6 })} USDC` },
              { label: 'AXUSD Total Supply', value: `${parseFloat(psmData.canonical.canonicalAxusdSupply).toLocaleString('en-US', { minimumFractionDigits: 2 })} AXUSD` },
            ]}
            right={[
              { label: 'Debt Ceiling', value: `${parseFloat(psmData.canonical.debtCeiling).toLocaleString('en-US', { maximumFractionDigits: 0 })} AXUSD` },
              { label: 'Debt Outstanding', value: `${parseFloat(psmData.canonical.debtOutstanding).toLocaleString('en-US', { minimumFractionDigits: 2 })} AXUSD` },
              { label: 'Utilization', value: `${psmData.canonical.utilizationPct}%` },
              { label: 'Available Capacity', value: `${parseFloat(psmData.canonical.availableCapacity).toLocaleString('en-US', { maximumFractionDigits: 0 })} AXUSD` },
            ]}
          />

          <SectionHeading>Mint / Redeem</SectionHeading>
          <PsmMintRedeemPanel
            address={address}
            isConnected={isConnected}
            mintFeeBps={psmData.canonical.mintFee ?? 10}
            redeemFeeBps={psmData.canonical.redeemFee ?? 10}
            paused={psmData.canonical.paused}
            agentRegistered={psmData.canonical.agentRegistered ?? false}
          />

          <SectionHeading>Legacy PSM (GENIUS — Configured-Inactive)</SectionHeading>
          <div className="border border-dl-border p-4 mb-4 text-xs text-dl-gray font-dl-mono bg-dl-bg-alt">
            {psmData.legacy.note}
          </div>
          <DetailGrid
            left={[
              { label: 'PSM Address', value: (
                <a href={blockscoutLink(psmData.legacy.address)} target="_blank" rel="noopener noreferrer" className="text-dl-navy underline font-dl-mono text-xs">
                  {shortAddr(psmData.legacy.address)}
                </a>
              ), mono: false },
              { label: 'Paired AXUSD', value: shortAddr(psmData.legacy.axusdToken) },
              { label: 'Mint Fee', value: psmData.legacy.mintFeePct },
              { label: 'Redeem Fee', value: psmData.legacy.redeemFeePct },
            ]}
            right={[
              { label: 'Status', value: <StatusBadge status="PENDING" />, mono: false },
              { label: 'USDC Reserves', value: `${parseFloat(psmData.legacy.usdcReserves).toLocaleString('en-US', { minimumFractionDigits: 2 })} USDC` },
              { label: 'Debt Ceiling', value: `${parseFloat(psmData.legacy.debtCeiling).toLocaleString('en-US', { maximumFractionDigits: 0 })} AXUSD` },
              { label: 'Deprecated', value: 'Yes — no new issuance' },
            ]}
          />

          <SectionHeading>Euler PSM (Deprecated)</SectionHeading>
          <div className="border border-dl-border p-4 mb-8 text-xs text-dl-gray font-dl-mono">
            <p className="mb-1"><span className="text-dl-navy">Address:</span> {shortAddr(psmData.eulerPsm.address)}</p>
            <p>{psmData.eulerPsm.note}</p>
          </div>

          <p className="text-xs text-dl-gray font-dl-mono mb-8">
            Last fetched: {new Date(psmData.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false })} ET
          </p>
        </>
      )}
    </>
  );
}

function ContractsTab({ data }: { data: DashboardData }) {
  const contractList = [
    { label: 'AXUSD Token (ERC-3643)', address: data.contracts.token, role: 'T-REX identity standard stablecoin' },
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
    { label: 'Lending Platform Module', address: data.contracts.modules.lendingPlatform, role: 'DeFi platform whitelist for identity-gated lending' },
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
          ERC-3643 (T-REX) identity standard token. All transfers are validated through the Modular
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
