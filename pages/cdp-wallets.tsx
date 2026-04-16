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
        subtitle="Coinbase Developer Platform server wallet accounts — treasury and institutional custody layer"
      />

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
                  placeholder="e.g. Treasury Reserve"
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

      <div className="mt-8 border border-dl-border p-6">
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
