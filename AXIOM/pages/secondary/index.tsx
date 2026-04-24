import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout } from '../../components/design-law/DesignLawLayout';
import { useWallet } from '../../components/WalletConnect/WalletContext';
import { openAppKit } from '../../lib/web3/appKitModal';

interface Position {
  id: string;
  series_id: string;
  series_name: string;
  series_slug: string;
  asset_class: string;
  status: string;
  total_units: string;
  available_units: string;
  locked_units: string;
  cost_basis: string | null;
  current_nav: string | null;
  unit_price: string | null;
  transferability_status: string;
  distribution_frequency: string;
  series_status: string;
}

interface Notification {
  id: string;
  event_type: string;
  subject: string;
  created_at: string;
}

interface Investor {
  id: string;
  legal_name: string | null;
  email: string;
  investor_category: string;
  status: string;
}

interface ComplianceProfile {
  kyc_status: string;
  aml_status: string;
  accreditation_status: string;
  risk_tier: string;
}

const ASSET_CLASS_LABELS: Record<string, string> = {
  fund_interest: 'Fund Interest',
  private_credit: 'Private Credit',
  mortgage_note: 'Mortgage Note',
  dscr_loan: 'DSCR Loan',
  fix_flip_debt: 'Fix & Flip Debt',
  rent_stream: 'Rent Stream',
  land_interest: 'Land Interest',
  treasury_yield: 'Treasury Yield',
};

const TRANSFERABILITY_LABELS: Record<string, string> = {
  not_transferable: 'Not Transferable',
  issuer_approval_required: 'Issuer Approval Required',
  compliance_only: 'Compliance Review',
  open_within_platform: 'Open Transfer',
};

const CATEGORY_LABELS: Record<string, string> = {
  accredited_individual: 'Accredited Individual',
  accredited_entity: 'Accredited Entity',
  qualified_purchaser: 'Qualified Purchaser',
  qualified_institutional_buyer: 'QIB',
  non_accredited: 'Non-Accredited',
  unverified: 'Unverified',
};

const COMPLIANCE_STATUS_COLORS: Record<string, string> = {
  approved: 'text-dl-forest',
  verified: 'text-dl-forest',
  clear: 'text-dl-forest',
  pending: 'text-dl-gold',
  not_started: 'text-dl-muted',
  not_verified: 'text-dl-muted',
  flagged: 'text-amber-600',
  blocked: 'text-dl-error',
  rejected: 'text-dl-error',
  expired: 'text-dl-error',
};

function fmtUnits(n: string | number): string {
  const v = parseFloat(String(n));
  if (isNaN(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtCurrency(n: string | number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  const v = parseFloat(String(n));
  if (isNaN(v)) return '—';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(2)}`;
}

export default function SecondaryPortfolio() {
  const { siweState, walletState } = useWallet();
  const [investor, setInvestor] = useState<Investor | null>(null);
  const [compliance, setCompliance] = useState<ComplianceProfile | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [roles, setRoles] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [meRes, posRes] = await Promise.all([
        fetch('/api/secondary/me'),
        fetch('/api/secondary/positions'),
      ]);

      if (!meRes.ok) {
        setError('not_authenticated');
        setLoading(false);
        return;
      }

      const meData = await meRes.json();
      if (meData.success) {
        setInvestor(meData.investor);
        setCompliance(meData.compliance);
        setWalletAddress(meData.walletAddress || '');
        setRoles(meData.roles || []);
      }

      if (posRes.ok) {
        const posData = await posRes.json();
        if (posData.success) setPositions(posData.positions || []);
      }
    } catch {
      setError('Failed to load portfolio data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (siweState.isAuthenticated) {
      load();
    }
  }, [siweState.isAuthenticated, load]);

  const totalPortfolioValue = positions.reduce((sum, p) => {
    const units = parseFloat(p.total_units || '0');
    const nav = parseFloat(p.current_nav || p.unit_price || '0');
    return sum + units * nav;
  }, 0);

  const totalAvailableUnits = positions.reduce((sum, p) => sum + parseFloat(p.available_units || '0'), 0);

  return (
    <DesignLawLayout>
      <Head><title>Secondary Network — Portfolio | Axiom Protocol</title></Head>

      <div className="border-b border-gray-200 pb-6 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-dl-navy">Secondary Network</h1>
            <p className="text-sm text-dl-muted mt-1">Permissioned secondary transfer and settlement for Axiom private market positions</p>
          </div>
          <div className="flex gap-3">
            <Link href="/secondary/marketplace">
              <button className="px-4 py-2 bg-dl-navy text-white text-sm font-mono">Marketplace</button>
            </Link>
            {(roles.includes('issuer') || roles.includes('admin')) && (
              <Link href="/secondary/issuer">
                <button className="px-4 py-2 border border-dl-navy text-dl-navy text-sm font-mono">Issuer Console</button>
              </Link>
            )}
            {roles.includes('admin') && (
              <Link href="/secondary/admin">
                <button className="px-4 py-2 border border-gray-300 text-dl-muted text-sm font-mono">Admin</button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <div className="font-mono text-sm text-dl-muted">Loading portfolio...</div>
      )}

      {!loading && error === 'not_authenticated' && (
        <div className="border border-gray-200 p-8 text-center">
          <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-3">Authentication Required</div>
          <p className="text-sm text-dl-navy mb-2">Sign in with your wallet to access your Secondary Network portfolio.</p>
          <p className="font-mono text-xs text-dl-muted mb-6">Use the "Access Platform" button above to connect and sign with MetaMask or another supported wallet.</p>
          <button
            onClick={() => openAppKit()}
            className="px-6 py-3 bg-dl-navy text-white text-sm font-mono"
          >
            {siweState.isAuthenticating ? 'Signing in...' : 'Connect Wallet'}
          </button>
          {walletState.isConnected && !siweState.isAuthenticated && (
            <p className="font-mono text-xs text-amber-600 mt-3">Wallet connected but not signed in. Click "Connect Wallet" to sign the authentication request.</p>
          )}
        </div>
      )}

      {!loading && error && error !== 'not_authenticated' && (
        <div className="border border-dl-error bg-red-50 p-4">
          <p className="font-mono text-sm text-dl-error">{error}</p>
        </div>
      )}

      {!loading && !error && investor && (
        <>
          {/* Identity + Compliance strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 border border-gray-200 p-4 bg-gray-50">
            <div>
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">Investor</div>
              <div className="text-sm text-dl-navy font-medium">{investor.legal_name || 'Unregistered'}</div>
              <div className="font-mono text-xs text-dl-muted truncate">{walletAddress.slice(0, 10)}…{walletAddress.slice(-4)}</div>
            </div>
            <div>
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">Category</div>
              <div className="text-sm text-dl-navy">{CATEGORY_LABELS[investor.investor_category] || investor.investor_category}</div>
            </div>
            {compliance && (
              <>
                <div>
                  <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">KYC / AML</div>
                  <div className={`text-sm font-mono ${COMPLIANCE_STATUS_COLORS[compliance.kyc_status]}`}>{compliance.kyc_status.toUpperCase().replace('_', ' ')}</div>
                  <div className={`text-xs font-mono ${COMPLIANCE_STATUS_COLORS[compliance.aml_status]}`}>AML: {compliance.aml_status.toUpperCase()}</div>
                </div>
                <div>
                  <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-1">Accreditation</div>
                  <div className={`text-sm font-mono ${COMPLIANCE_STATUS_COLORS[compliance.accreditation_status]}`}>
                    {compliance.accreditation_status.toUpperCase().replace('_', ' ')}
                  </div>
                  <div className="text-xs font-mono text-dl-muted">Risk: {compliance.risk_tier?.toUpperCase()}</div>
                </div>
              </>
            )}
          </div>

          {/* Portfolio summary */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="border border-gray-200 p-4">
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Portfolio NAV</div>
              <div className="font-mono text-2xl text-dl-navy">{fmtCurrency(totalPortfolioValue)}</div>
            </div>
            <div className="border border-gray-200 p-4">
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Active Positions</div>
              <div className="font-mono text-2xl text-dl-navy">{positions.length}</div>
            </div>
            <div className="border border-gray-200 p-4">
              <div className="font-mono text-xs text-dl-muted uppercase tracking-wider mb-2">Transferable Units</div>
              <div className="font-mono text-2xl text-dl-navy">{fmtUnits(totalAvailableUnits)}</div>
            </div>
          </div>

          {/* Positions table */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-serif text-lg text-dl-navy">Holdings</h2>
            <Link href="/secondary/marketplace">
              <button className="text-xs font-mono text-dl-forest hover:text-dl-navy">View marketplace →</button>
            </Link>
          </div>

          {positions.length === 0 ? (
            <div className="border border-gray-200 p-8 text-center">
              <p className="text-sm text-dl-muted">No positions found.</p>
              <p className="text-xs text-dl-muted mt-1">Positions appear here once you hold units in an Axiom-issued series.</p>
            </div>
          ) : (
            <div className="border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Series</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Asset Class</th>
                    <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Total Units</th>
                    <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Available</th>
                    <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">NAV / Unit</th>
                    <th className="text-right font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Position Value</th>
                    <th className="text-left font-mono text-xs text-dl-muted uppercase tracking-wider px-4 py-3">Transferability</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {positions.map((p) => {
                    const nav = parseFloat(p.current_nav || p.unit_price || '0');
                    const posValue = parseFloat(p.total_units) * nav;
                    const canTransfer = p.transferability_status !== 'not_transferable' && parseFloat(p.available_units) > 0;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="text-dl-navy font-medium">{p.series_name}</div>
                          <div className="font-mono text-xs text-dl-muted">{p.series_status?.toUpperCase()}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-dl-muted">{ASSET_CLASS_LABELS[p.asset_class] || p.asset_class}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{fmtUnits(p.total_units)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-mono text-sm ${parseFloat(p.available_units) > 0 ? 'text-dl-forest' : 'text-dl-muted'}`}>
                            {fmtUnits(p.available_units)}
                          </span>
                          {parseFloat(p.locked_units) > 0 && (
                            <div className="font-mono text-xs text-amber-600">{fmtUnits(p.locked_units)} locked</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">
                          {nav > 0 ? fmtCurrency(nav) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-sm text-dl-navy">{fmtCurrency(posValue)}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-dl-muted">{TRANSFERABILITY_LABELS[p.transferability_status] || p.transferability_status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex gap-2 justify-end">
                            <Link href={`/secondary/position/${p.id}`}>
                              <button className="text-xs font-mono text-dl-navy border border-dl-navy px-2 py-1 hover:bg-dl-navy hover:text-white transition-colors">
                                Detail
                              </button>
                            </Link>
                            {canTransfer && (
                              <Link href={`/secondary/marketplace?createListing=1&positionId=${p.id}&seriesId=${p.series_id}`}>
                                <button className="text-xs font-mono text-dl-forest border border-dl-forest px-2 py-1 hover:bg-dl-forest hover:text-white transition-colors">
                                  List
                                </button>
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Disclosure note */}
          <div className="mt-8 border-t border-gray-200 pt-4">
            <p className="font-mono text-xs text-dl-muted">
              Secondary transfers are subject to issuer approval, compliance verification, and applicable hold periods. Units are transferred on the Arbitrum One network. Settlement asset: AXUSD (ERC-3643). Platform fee: 0.5% of gross proceeds. This interface does not constitute an offer to sell or solicitation to buy securities.
            </p>
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
