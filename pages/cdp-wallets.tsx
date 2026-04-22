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
      setData({ accounts: [], isLive: false, configured: false, canCreate: false, error: 'Request failed' });
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
        <title>Treasury Wallet Infrastructure | Axiom Protocol</title>
        <meta
          name="description"
          content="Axiom uses Coinbase-managed distributed key infrastructure to secure treasury assets, operational reserves, and capital movement — without exposing private keys."
        />
      </Head>

      <SectionHeading
        title="Treasury Wallet Infrastructure"
        subtitle="Institutional wallet security for Axiom treasury and operations — powered by Coinbase distributed key infrastructure"
      />

      {/* ── Cinematic Hero Banner ────────────────────────────────────────────── */}
      <div className="mt-6 relative overflow-hidden border border-dl-border" style={{ height: '320px' }}>
        <img
          src="/images/coinbase/cdp-hero.png"
          alt="Institutional treasury infrastructure secured by Coinbase"
          className="w-full h-full object-cover"
          style={{ objectPosition: 'center center' }}
        />
        <div
          className="absolute inset-0 flex flex-col justify-end p-8"
          style={{ background: 'linear-gradient(to top, rgba(10,20,50,0.95) 0%, rgba(10,20,50,0.5) 55%, transparent 100%)' }}
        >
          <p className="text-xs font-dl-mono text-blue-300 uppercase tracking-widest mb-2">Coinbase Treasury Infrastructure</p>
          <p className="text-2xl md:text-3xl font-bold text-white font-dl-serif leading-tight">
            Institutional Wallet Security<br />for Treasury and Operations.
          </p>
          <p className="text-sm text-blue-100 font-dl-mono mt-3 max-w-2xl leading-relaxed">
            Axiom uses Coinbase-managed distributed key infrastructure to secure treasury assets, operational reserves, and capital movement — without exposing private keys.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a
              href="#architecture"
              className="inline-block border-2 border-white text-white px-5 py-2.5 text-xs font-bold hover:bg-white hover:text-dl-navy font-dl-mono uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(255,255,255,0.10)' }}
            >
              View Wallet Architecture
            </a>
            <a
              href="#create-wallet"
              className="inline-block border border-white text-white px-5 py-2.5 text-xs font-bold hover:bg-white hover:text-dl-navy font-dl-mono uppercase tracking-wider"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
            >
              Create Treasury Wallet
            </a>
          </div>
        </div>
      </div>

      {/* ── Trust Strip — 4 institutional guarantees ───────────────────────── */}
      <div className="mt-0 border-l border-r border-b border-dl-border grid md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-dl-border bg-dl-bg">
        {[
          { label: 'No Key Exposure',    detail: 'Private keys never stored on Axiom side' },
          { label: 'Distributed Security', detail: 'Key shares split across secure nodes' },
          { label: 'Separated Accounts', detail: 'Treasury and operations kept distinct' },
          { label: 'Auditable History',  detail: 'Every action recorded on-chain' },
        ].map(item => (
          <div key={item.label} className="p-4 flex items-start gap-3">
            <span
              className="inline-flex items-center justify-center shrink-0"
              style={{ width: 18, height: 18, border: '1px solid #b8860b', marginTop: 2 }}
            >
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                <path d="M1 4l2.5 2.5L9 1" stroke="#b8860b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-dl-mono text-dl-navy uppercase tracking-wider font-bold">{item.label}</p>
              <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mt-1">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Intro ─────────────────────────────────────────────────────────── */}
      <div id="architecture" className="mt-6 grid lg:grid-cols-2 gap-0 border border-dl-border">
        <div className="p-6 border-b lg:border-b-0 lg:border-r border-dl-border">
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">What Are Axiom Treasury Wallets?</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-3">
            Axiom&apos;s treasury wallets are institutionally managed blockchain accounts accessed through Coinbase infrastructure. Private keys are never stored on Axiom&apos;s side.
          </p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-3">
            Wallet operations are authorized through secure session controls and distributed key protection. This allows treasury activity to remain programmable, auditable, and operationally secure.
          </p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
            Axiom uses these accounts as an institutional-grade layer for treasury management and operational reserves on Base, with USDC and Base-native assets.
          </p>
        </div>
        <div className="p-6">
          <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">Why Base?</p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-3">
            Base gives Axiom access to fast settlement, low fees, and direct integration with Coinbase infrastructure.
          </p>
          <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-3">
            These treasury wallets support reserve and operational functions on Base while the core Axiom protocol continues to operate on Arbitrum One. The result is cleaner separation between treasury execution and protocol settlement.
          </p>
          <div className="border border-dl-border bg-dl-bg p-3 space-y-1">
            <div className="flex justify-between text-xs font-dl-mono">
              <span className="text-dl-gray">Treasury network</span>
              <span className="text-dl-navy">Base Mainnet (Chain 8453)</span>
            </div>
            <div className="flex justify-between text-xs font-dl-mono">
              <span className="text-dl-gray">Key protection</span>
              <span className="text-dl-navy">Distributed key (Coinbase)</span>
            </div>
            <div className="flex justify-between text-xs font-dl-mono">
              <span className="text-dl-gray">Authorization</span>
              <span className="text-dl-navy">Secure session (short-lived)</span>
            </div>
            <div className="flex justify-between text-xs font-dl-mono">
              <span className="text-dl-gray">Public verification</span>
              <span className="text-dl-navy">Basescan.org</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Wallet Purposes ───────────────────────────────────────────────── */}
      <div className="mt-0 border-l border-r border-b border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Deployed Treasury Accounts — Purpose and Scope</p>
        </div>
        <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-dl-border">
          <div className="p-6">
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-1">Treasury Account · axiom-treasury</p>
            <p className="font-dl-mono text-xs text-dl-gray mb-3 break-all">0x103A1F07836C4b33543F8BF6D49b062a0F71AbC5</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-2">
              Long-term capital and reserve positioning on Base. Holds USDC and ETH received through the Coinbase entry path and other protocol inflows.
            </p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              All movement is authorized through secure session controls. No manual private key access is used at any point.
            </p>
          </div>
          <div className="p-6">
            <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-1">Operations Reserve · axiom-operations-reserve</p>
            <p className="font-dl-mono text-xs text-dl-gray mb-3 break-all">0x8424Eb7e1A79bcC8fdE8c1D705ba0A44747758c1</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-2">
              Day-to-day operational flows, gas, and execution buffer on Base. Sits between the main treasury and live protocol activity.
            </p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Keeping treasury and operations separate reduces risk exposure and produces cleaner on-chain accounting. Transfers between accounts are authorized and recorded.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid md:grid-cols-3 gap-0 border border-dl-border">
        <div className="p-5 border-b md:border-b-0 md:border-r border-dl-border">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Infrastructure Configured</p>
          {loading ? (
            <p className="text-lg font-dl-mono text-dl-navy mt-1">—</p>
          ) : (
            <p className="text-lg font-dl-mono text-dl-navy mt-1">{data?.configured ? 'Yes' : 'No'}</p>
          )}
        </div>
        <div className="p-5 border-b md:border-b-0 md:border-r border-dl-border">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Treasury Accounts</p>
          <p className="text-lg font-dl-mono text-dl-navy mt-1">{loading ? '—' : data?.accounts.length ?? 0}</p>
        </div>
        <div className="p-5">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Connection Status</p>
          <p className="text-lg font-dl-mono text-dl-navy mt-1">
            {loading ? '—' : data?.isLive ? 'Live' : 'Offline'}
          </p>
        </div>
      </div>

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-dl-navy font-dl-serif">Treasury Accounts</h3>
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
              <p className="text-sm text-dl-gray font-dl-mono">Coinbase treasury infrastructure is not yet configured. Set COINBASE_API_KEY and COINBASE_API_KEY2 to enable.</p>
            </div>
          ) : data.accounts.length === 0 ? (
            <div className="border border-dl-border p-6 text-center">
              <p className="text-sm text-dl-gray font-dl-mono">No treasury accounts found. Create one using the panel.</p>
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

        <div id="create-wallet">
          <h3 className="text-base font-bold text-dl-navy font-dl-serif mb-3">Create Treasury Wallet</h3>
          <div className="border border-dl-border p-5">
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed mb-4">
              Provision a new institutional treasury account on Base. Private keys are protected by Coinbase distributed key infrastructure — never stored on the Axiom side.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider block mb-1">
                  Account Label (optional)
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
                <p role="alert" aria-live="polite" className="text-xs font-dl-mono text-red-700 border border-red-300 bg-red-50 px-3 py-2">{createError}</p>
              )}
              {createSuccess && (
                <p role="status" aria-live="polite" className="text-xs font-dl-mono text-green-700 border border-green-300 bg-green-50 px-3 py-2">
                  Created: {createSuccess}
                </p>
              )}

              {data && !data.canCreate && data.configured && (
                <p className="text-xs font-dl-mono text-amber-700 border border-amber-300 bg-amber-50 px-3 py-2">
                  Set CDP_WALLET_SECRET in environment secrets to enable account provisioning.
                </p>
              )}

              <button
                onClick={handleCreate}
                disabled={creating || !data?.configured || !data?.canCreate}
                className="w-full py-2 bg-dl-navy text-white font-dl-mono text-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Provisioning...' : 'Create Treasury Wallet'}
              </button>
            </div>

            <div className="mt-5 pt-5 border-t border-dl-border">
              <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider mb-2">About Treasury Wallets</p>
              <ul className="text-xs text-dl-gray font-dl-mono space-y-1">
                <li>Institutionally managed blockchain accounts</li>
                <li>Deployed on Base for fast, low-fee settlement</li>
                <li>Authorized through secure session controls</li>
                <li>Private keys never stored on Axiom side</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border border-dl-border">
        <div className="px-6 py-4 border-b border-dl-border bg-dl-bg">
          <p className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider">Security Model</p>
        </div>
        {/* Security visual strip */}
        <div className="relative overflow-hidden border-b border-dl-border" style={{ height: '180px' }}>
          <img
            src="/images/coinbase/blockchain-network.png"
            alt="Blockchain network infrastructure"
            className="w-full h-full object-cover"
            style={{ objectPosition: 'center center' }}
          />
          <div
            className="absolute inset-0 flex items-center gap-6 px-8"
            style={{ background: 'linear-gradient(to right, rgba(10,20,50,0.92) 0%, rgba(10,20,50,0.6) 50%, transparent 100%)' }}
          >
            <img
              src="/images/coinbase/security-shield.png"
              alt="Digital security shield"
              className="h-28 w-28 object-cover shrink-0"
            />
            <div>
              <p className="text-xs font-dl-mono text-blue-300 uppercase tracking-widest mb-1">Distributed Key Security</p>
              <p className="text-lg font-bold text-white font-dl-serif leading-tight">
                Zero single points of failure.<br />Keys never exist in full.
              </p>
              <p className="text-xs text-blue-100 font-dl-mono mt-1">
                Coinbase distributes key shares across independent secure nodes.
              </p>
            </div>
          </div>
        </div>
        <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-dl-border">
          <div className="p-5">
            <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">Distributed Key Security</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Treasury wallet keys are split into shares held inside Coinbase&apos;s secure infrastructure. The complete private key never exists on any single server, eliminating single-point-of-failure exposure and meeting institutional custody standards.
            </p>
          </div>
          <div className="p-5">
            <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">Secure Session Authorization</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Every request to move treasury assets is authorized through short-lived signed sessions that expire within minutes. Credentials are stored as protected environment secrets and never exposed to client-side code.
            </p>
          </div>
          <div className="p-5">
            <p className="text-sm font-bold text-dl-navy font-dl-serif mb-2">Every Action Is Recorded</p>
            <p className="text-xs text-dl-gray font-dl-mono leading-relaxed">
              Account creation, balance checks, and transaction signing are logged on both the Coinbase platform and Axiom&apos;s internal database. On-chain activity is fully verifiable on Basescan. No funds can move without an authorized request.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 border border-dl-border p-6">
        <h3 className="text-base font-bold text-dl-navy font-dl-serif mb-4">Treasury Infrastructure Capabilities</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Treasury Accounts',           status: 'Live',      desc: 'Provision and manage institutional blockchain accounts on Base.' },
            { label: 'Programmable Account Controls', status: 'Available', desc: 'Account abstraction features supporting gas sponsorship and batched operations.' },
            { label: 'Asset Conversion',            status: 'Available', desc: 'Built-in conversion between ETH, USDC, and other Base ecosystem assets.' },
            { label: 'Spending Controls',           status: 'Available', desc: 'Transaction rules, spending limits, and multi-party authorization policies.' },
            { label: 'Embedded Funding Infrastructure', status: 'Available', desc: 'Programmatic dollar-to-digital-asset funding without an external widget.' },
            { label: 'Automation Layer',            status: 'Available', desc: 'Tooling for authorized automated treasury and operational workflows.' },
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
