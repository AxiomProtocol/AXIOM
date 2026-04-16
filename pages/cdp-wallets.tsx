import Head from 'next/head';
import { useState, useEffect } from 'react';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface CdpWalletAccount {
  address: string;
  name: string | null;
  network: string;
  createdAt?: string;
}

interface WalletListData {
  accounts: CdpWalletAccount[];
  isLive: boolean;
  configured: boolean;
  canCreate: boolean;
  error?: string;
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function CdpWalletsPage() {
  const [data, setData] = useState<WalletListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  async function loadWallets() {
    setLoading(true);
    try {
      const res = await fetch('/api/cdp/wallets', { cache: 'no-store' });
      const json = await res.json() as WalletListData;
      setData(json);
    } catch {
      setData({ accounts: [], isLive: false, configured: false, error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadWallets(); }, []);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    try {
      const res = await fetch('/api/cdp/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() || undefined }),
      });
      const json = await res.json() as { account?: CdpWalletAccount; error?: string };
      if (!res.ok || json.error) {
        setCreateError(json.error ?? 'Failed to create wallet');
      } else if (json.account) {
        setCreateSuccess(json.account.address);
        setNewName('');
        await loadWallets();
      }
    } catch {
      setCreateError('Request failed');
    } finally {
      setCreating(false);
    }
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>CDP Wallet Infrastructure | Axiom Protocol</title>
      </Head>

      <SectionHeading
        title="CDP Wallet Infrastructure"
        subtitle="Coinbase Developer Platform server wallets — Axiom Protocol treasury and operational reserve accounts on Base"
      />

      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      <div className="mt-6 grid lg:grid-cols-2 gap-0 border border-dl-border">
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-dl-border">
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">What are CDP Server Wallets?</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-3">
            Coinbase Developer Platform (CDP) server wallets are EVM accounts managed entirely through the Coinbase API — no private key storage required on the Axiom side. The private key is generated and held inside Coinbase's secure multi-party computation (MPC) infrastructure, meaning no single party can unilaterally move funds. Transactions are signed via API call with programmatic controls.
          </p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
            Axiom uses CDP server wallets as an institutional-grade layer for treasury management and operational reserves. These accounts are deployed on Base mainnet and interact with USDC and other Base-native assets.
          </p>
        </div>
        <div className="p-6">
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">Why Base Mainnet?</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-3">
            Base is an Ethereum Layer 2 network built and supported by Coinbase. It offers low transaction fees, fast finality, and native integration with Coinbase infrastructure. CDP server wallets are natively supported on Base, making it the natural network for Axiom's Coinbase-managed treasury accounts. Note that the primary Axiom Protocol operates on Arbitrum One — these CDP wallets serve a separate treasury and operational function.
          </p>
          <div className="border border-dl-border bg-dl-bg p-3 space-y-1">
            <div className="flex justify-between text-xs font-dl-mono">
              <span className="text-dl-gray">Network</span>
              <span className="text-dl-navy">Base Mainnet (Chain 8453)</span>
            </div>
            <div className="flex justify-between text-xs font-dl-mono">
              <span className="text-dl-gray">Key custody</span>
              <span className="text-dl-navy">Coinbase MPC</span>
            </div>
            <div className="flex justify-between text-xs font-dl-mono">
              <span className="text-dl-gray">Access method</span>
              <span className="text-dl-navy">CDP API (JWT-authenticated)</span>
            </div>
            <div className="flex justify-between text-xs font-dl-mono">
              <span className="text-dl-gray">Explorer</span>
              <span className="text-dl-navy">Basescan.org</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Wallet Purposes ───────────────────────────────────────────────── */}
      <div className="mt-0 border-l border-r border-b border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Deployed Wallets — Purpose and Scope</p>
        </div>
        <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-dl-border">
          <div className="p-6">
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-1">axiom-treasury</p>
            <p className="font-dl-mono text-xs text-dl-gray mb-3 break-all">0x103A1F07836C4b33543F8BF6D49b062a0F71AbC5</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-2">
              The primary treasury account for Axiom Protocol on Base. This wallet is designated for holding USDC and ETH acquired through the Coinbase Pay onramp and other protocol capital inflows. It serves as the starting point for capital deployed across Base-native positions.
            </p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Funds in this wallet are managed through CDP API calls with programmatic authorization. No manual private key access is used at any point.
            </p>
          </div>
          <div className="p-6">
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-1">axiom-operations-reserve</p>
            <p className="font-dl-mono text-xs text-dl-gray mb-3 break-all">0x8424Eb7e1A79bcC8fdE8c1D705ba0A44747758c1</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-2">
              The operational reserve account for day-to-day protocol activities on Base. This wallet covers gas fees, small operational disbursements, and acts as a buffer between the main treasury and live protocol interactions.
            </p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Keeping treasury and operations reserve separate reduces risk exposure and provides cleaner on-chain accounting. Transfers between accounts go through the CDP API with full audit logs.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-0 border border-dl-border">
        <div className="p-5 border-b md:border-b-0 md:border-r border-dl-border">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">CDP Configured</p>
          {loading ? (
            <p className="text-lg font-dl-mono text-dl-navy mt-1">—</p>
          ) : (
            <p className="text-lg font-dl-mono text-dl-navy mt-1">{data?.configured ? 'Yes' : 'No'}</p>
          )}
        </div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-dl-border">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Server Wallets</p>
          <p className="text-lg font-dl-mono text-dl-navy mt-1">{loading ? '—' : data?.accounts.length ?? 0}</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">API Status</p>
          <p className="text-lg font-dl-mono text-dl-navy mt-1">
            {loading ? '—' : data?.isLive ? 'Live' : 'Offline'}
          </p>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-dl-navy font-dl-serif">Server Wallet Accounts</h3>
            <button
              onClick={loadWallets}
              className="text-xs font-dl-mono text-dl-gray hover:text-dl-navy border border-dl-border px-3 py-1"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="border border-dl-border p-6 text-center">
              <p className="text-sm text-dl-gray font-dl-mono">Loading...</p>
            </div>
          ) : data?.error ? (
            <div className="border border-dl-border p-6">
              <p className="text-sm font-dl-mono text-red-700">{data.error}</p>
            </div>
          ) : !data?.configured ? (
            <div className="border border-dl-border p-6">
              <p className="text-sm text-dl-gray font-dl-mono">CDP API keys not configured. Set COINBASE_API_KEY and COINBASE_API_KEY2.</p>
            </div>
          ) : data.accounts.length === 0 ? (
            <div className="border border-dl-border p-6 text-center">
              <p className="text-sm text-dl-gray font-dl-mono">No server wallet accounts found. Create one using the panel.</p>
            </div>
          ) : (
            <div className="border border-dl-border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-dl-bg border-b border-dl-border">
                    <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Name</th>
                    <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Address</th>
                    <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Network</th>
                  </tr>
                </thead>
                <tbody>
                  {data.accounts.map(acc => (
                    <tr key={acc.address} className="border-b border-dl-border last:border-b-0">
                      <td className="p-3 text-dl-navy font-dl-mono">{acc.name ?? '—'}</td>
                      <td className="p-3 font-dl-mono text-dl-navy">
                        <span title={acc.address}>{truncateAddress(acc.address)}</span>
                      </td>
                      <td className="p-3 font-dl-mono text-dl-gray text-xs">{acc.network}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-base font-bold text-dl-navy font-dl-serif mb-3">Create Wallet</h3>
          <div className="border border-dl-border p-5">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider block mb-1">
                  Wallet Name (optional)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. Treasury Reserve (auto-formatted)"
                  className="w-full border border-dl-border text-dl-navy text-sm font-dl-mono px-3 py-2 focus:outline-none focus:border-dl-navy"
                />
              </div>

              {createError && (
                <p className="text-xs font-dl-mono text-red-700 border border-red-300 bg-red-50 px-3 py-2">{createError}</p>
              )}
              {createSuccess && (
                <p className="text-xs font-dl-mono text-green-700 border border-green-300 bg-green-50 px-3 py-2">
                  Created: {createSuccess}
                </p>
              )}

              {data && !data.canCreate && data.configured && (
                <p className="text-xs font-dl-mono text-amber-700 border border-amber-300 bg-amber-50 px-3 py-2">
                  Set CDP_WALLET_SECRET in environment secrets to enable wallet creation.
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={creating || !data?.configured || !data?.canCreate}
                className="w-full py-2 bg-dl-navy text-white font-dl-mono text-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Server Wallet'}
              </button>
            </div>

            <div className="mt-5 pt-5 border-t border-dl-border">
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">About CDP Wallets</p>
              <ul className="text-xs text-dl-gray font-dl-mono space-y-1">
                <li>Server-side managed EVM accounts</li>
                <li>Deployed on Base mainnet</li>
                <li>Accessible via CDP API</li>
                <li>No private key storage required</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Security Model</p>
        </div>
        <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-dl-border">
          <div className="p-5">
            <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">MPC Key Architecture</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              CDP uses multi-party computation to ensure the private key never exists in full form on any single server. Key shares are distributed across Coinbase's infrastructure. This eliminates single-point-of-failure key exposure and meets institutional custody standards.
            </p>
          </div>
          <div className="p-5">
            <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">JWT Authentication</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Every API call to CDP is authenticated via a short-lived JWT signed with Axiom's EC private key. The JWT expires after 2 minutes, preventing replay attacks. API key credentials are stored as environment secrets and never exposed to client-side code.
            </p>
          </div>
          <div className="p-5">
            <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">Audit Trail</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              All wallet operations — account creation, balance checks, transaction signing — generate audit logs on both the CDP platform and Axiom's internal database. On-chain activity is fully verifiable on Basescan. No funds can move without an authenticated API request.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 border border-dl-border p-6">
        <h3 className="text-base font-bold text-dl-navy font-dl-serif mb-4">CDP Infrastructure Capabilities</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Server Wallets', status: 'Live', desc: 'Create and manage EVM server wallet accounts via the CDP API.' },
            { label: 'Smart Accounts', status: 'Available', desc: 'ERC-4337 account abstraction wallets for gas sponsorship and batch transactions.' },
            { label: 'Token Swaps', status: 'Available', desc: 'Built-in swap API supporting ETH, USDC, and Base ecosystem assets.' },
            { label: 'Policy Engine', status: 'Available', desc: 'Transaction rules, spending limits, and multi-party authorization controls.' },
            { label: 'Headless Onramp', status: 'Available', desc: 'Programmatic fiat-to-crypto onramp without iframe widget dependency.' },
            { label: 'AgentKit', status: 'Available', desc: 'AI agent tooling for autonomous treasury and DAO operations.' },
          ].map(cap => (
            <div key={cap.label} className="border border-dl-border p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-sm font-bold text-dl-navy font-dl-serif">{cap.label}</p>
                <span className="text-xs font-dl-mono text-dl-gray border border-dl-border px-2 py-0.5">{cap.status}</span>
              </div>
              <p className="text-xs text-dl-gray">{cap.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </DesignLawLayout>
  );
}
