'use client';

import Head from 'next/head';
import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { initOnRamp } from '@coinbase/cbpay-js';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

const CHAIN_OPTIONS = [
  { label: 'Arbitrum One', id: 42161, cbNet: 'arbitrum' },
  { label: 'Base', id: 8453, cbNet: 'base' },
];

const ASSET_OPTIONS = ['USDC', 'ETH', 'USDT'];

interface PurchaseIntent {
  id: number;
  intentId: string;
  asset: string;
  fiatCurrency: string;
  fiatAmount: string;
  chainId: number;
  status: string;
  createdAt: string;
}

interface OnrampConfig {
  appId: string;
  configured: boolean;
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function chainLabel(id: number) {
  return CHAIN_OPTIONS.find(c => c.id === id)?.label ?? String(id);
}

export default function OnrampPage() {
  const { address, isConnected } = useAccount();

  const [flow, setFlow] = useState<'buy' | 'sell'>('buy');
  const [selectedChain, setSelectedChain] = useState(42161);
  const [selectedAsset, setSelectedAsset] = useState('USDC');
  const [fiatAmount, setFiatAmount] = useState('100');
  const [launching, setLaunching] = useState(false);
  const [intents, setIntents] = useState<PurchaseIntent[]>([]);
  const [intentsLoading, setIntentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onrampConfig, setOnrampConfig] = useState<OnrampConfig | null>(null);

  useEffect(() => {
    fetch('/api/onramp/config')
      .then(r => r.json() as Promise<OnrampConfig>)
      .then(setOnrampConfig)
      .catch(() => setOnrampConfig({ appId: '', configured: false }));
  }, []);

  const loadHistory = useCallback(async () => {
    if (!address) return;
    setIntentsLoading(true);
    try {
      const res = await fetch(`/api/onramp/history?wallet=${address}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json() as { intents: PurchaseIntent[] };
        setIntents(data.intents ?? []);
      }
    } catch {
    } finally {
      setIntentsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (isConnected) loadHistory();
  }, [isConnected, loadHistory]);

  async function handleLaunch() {
    if (!address) return;
    if (!onrampConfig?.configured) {
      setError('Onramp not configured. Contact support.');
      return;
    }

    setLaunching(true);
    setError(null);

    try {
      const intentRes = await fetch('/api/onramp/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          asset: selectedAsset,
          fiatAmount: parseFloat(fiatAmount) || 100,
          fiatCurrency: 'USD',
          chainId: selectedChain,
          flow,
        }),
      });

      if (!intentRes.ok) {
        const errData = await intentRes.json() as { error?: string };
        throw new Error(errData.error ?? 'Failed to create intent');
      }

      const { widgetUrl } = await intentRes.json() as { intentId: string; widgetUrl: string | null };

      if (!widgetUrl) {
        throw new Error('Widget URL not available. Ensure COINBASE_PROJECT_ID is set.');
      }

      if (flow === 'buy') {
        const chainOption = CHAIN_OPTIONS.find(c => c.id === selectedChain);
        const cbNet = chainOption?.cbNet ?? 'arbitrum';

        initOnRamp(
          {
            appId: onrampConfig.appId,
            widgetParameters: {
              addresses: { [address]: [cbNet] },
              assets: [selectedAsset],
              defaultAsset: selectedAsset,
              defaultPaymentMethod: 'CARD',
              presetFiatAmount: parseFloat(fiatAmount) || 100,
              fiatCurrency: 'USD',
            },
            onSuccess: () => { loadHistory(); },
            onExit: () => { setLaunching(false); loadHistory(); },
            onEvent: () => {},
            experienceLoggedIn: 'popup',
            experienceLoggedOut: 'popup',
          },
          (err, instance) => {
            if (err) {
              setError(err.message);
              setLaunching(false);
              return;
            }
            instance?.open();
            setLaunching(false);
          }
        );
      } else {
        window.open(widgetUrl, '_blank', 'noopener,noreferrer,width=480,height=700');
        setLaunching(false);
        setTimeout(loadHistory, 2000);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLaunching(false);
    }
  }

  return (
    <DesignLawLayout>
      <Head>
        <title>On / Off Ramp | Axiom Protocol</title>
      </Head>

      <SectionHeading
        title="On / Off Ramp"
        subtitle="Convert fiat to crypto or crypto to fiat — powered by Coinbase Pay"
      />

      {!isConnected ? (
        <div className="mt-8 border border-dl-border p-8 text-center">
          <p className="text-sm text-dl-gray font-dl-mono">Connect your wallet to access the on/off ramp.</p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid lg:grid-cols-2 gap-0 border border-dl-border">
            <div className="p-6 border-b lg:border-b-0 lg:border-r border-dl-border">
              <h3 className="text-sm font-dl-mono text-dl-gray uppercase tracking-wider mb-4">Flow</h3>
              <div className="flex gap-0">
                <button
                  onClick={() => setFlow('buy')}
                  className={`flex-1 py-2 text-sm font-dl-mono border ${
                    flow === 'buy'
                      ? 'bg-dl-navy text-white border-dl-navy'
                      : 'text-dl-navy border-dl-border hover:border-dl-navy'
                  }`}
                >
                  Buy (On-Ramp)
                </button>
                <button
                  onClick={() => setFlow('sell')}
                  className={`flex-1 py-2 text-sm font-dl-mono border-t border-r border-b ${
                    flow === 'sell'
                      ? 'bg-dl-navy text-white border-dl-navy'
                      : 'text-dl-navy border-dl-border hover:border-dl-navy'
                  }`}
                >
                  Sell (Off-Ramp)
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider block mb-1">Network</label>
                  <select
                    value={selectedChain}
                    onChange={e => setSelectedChain(Number(e.target.value))}
                    className="w-full border border-dl-border bg-white text-dl-navy text-sm font-dl-mono px-3 py-2 focus:outline-none focus:border-dl-navy"
                  >
                    {CHAIN_OPTIONS.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider block mb-1">Asset</label>
                  <select
                    value={selectedAsset}
                    onChange={e => setSelectedAsset(e.target.value)}
                    className="w-full border border-dl-border bg-white text-dl-navy text-sm font-dl-mono px-3 py-2 focus:outline-none focus:border-dl-navy"
                  >
                    {ASSET_OPTIONS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {flow === 'buy' && (
                  <div>
                    <label className="text-xs font-dl-mono text-dl-gray uppercase tracking-wider block mb-1">Amount (USD)</label>
                    <input
                      type="number"
                      min="1"
                      value={fiatAmount}
                      onChange={e => setFiatAmount(e.target.value)}
                      className="w-full border border-dl-border text-dl-navy text-sm font-dl-mono px-3 py-2 focus:outline-none focus:border-dl-navy"
                      placeholder="100"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 flex flex-col">
              <h3 className="text-sm font-dl-mono text-dl-gray uppercase tracking-wider mb-4">Summary</h3>
              <dl className="space-y-3 text-sm flex-1">
                <div className="flex justify-between border-b border-dl-border pb-2">
                  <dt className="text-dl-gray font-dl-mono">Wallet</dt>
                  <dd className="text-dl-navy font-dl-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</dd>
                </div>
                <div className="flex justify-between border-b border-dl-border pb-2">
                  <dt className="text-dl-gray font-dl-mono">Network</dt>
                  <dd className="text-dl-navy font-dl-mono">{chainLabel(selectedChain)}</dd>
                </div>
                <div className="flex justify-between border-b border-dl-border pb-2">
                  <dt className="text-dl-gray font-dl-mono">Asset</dt>
                  <dd className="text-dl-navy font-dl-mono">{selectedAsset}</dd>
                </div>
                {flow === 'buy' && (
                  <div className="flex justify-between border-b border-dl-border pb-2">
                    <dt className="text-dl-gray font-dl-mono">Amount</dt>
                    <dd className="text-dl-navy font-dl-mono">${parseFloat(fiatAmount || '0').toFixed(2)} USD</dd>
                  </div>
                )}
                <div className="flex justify-between border-b border-dl-border pb-2">
                  <dt className="text-dl-gray font-dl-mono">Provider</dt>
                  <dd className="text-dl-navy font-dl-mono">Coinbase Pay</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-dl-gray font-dl-mono">Widget Status</dt>
                  <dd className="text-dl-navy font-dl-mono">
                    {onrampConfig === null ? 'Checking...' : onrampConfig.configured ? 'Ready' : 'Not configured'}
                  </dd>
                </div>
              </dl>

              {error && (
                <p className="mt-4 text-xs font-dl-mono text-red-700 border border-red-300 bg-red-50 px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleLaunch}
                disabled={launching || onrampConfig === null || !onrampConfig.configured}
                className="mt-6 w-full py-3 bg-dl-navy text-white font-dl-mono text-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {launching
                  ? 'Opening...'
                  : flow === 'buy'
                  ? `Buy ${selectedAsset} with Coinbase`
                  : `Sell ${selectedAsset} via Coinbase`}
              </button>

              <p className="mt-3 text-xs text-dl-gray font-dl-mono text-center">
                KYC handled by Coinbase. Fees: 1–3% depending on method.
              </p>
            </div>
          </div>

          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-dl-navy font-dl-serif">Transaction History</h3>
              <button
                onClick={loadHistory}
                className="text-xs font-dl-mono text-dl-gray hover:text-dl-navy border border-dl-border px-3 py-1"
              >
                Refresh
              </button>
            </div>

            {intentsLoading ? (
              <p className="text-sm text-dl-gray font-dl-mono">Loading...</p>
            ) : intents.length === 0 ? (
              <div className="border border-dl-border p-6 text-center">
                <p className="text-sm text-dl-gray font-dl-mono">No transactions yet for this wallet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-dl-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dl-bg border-b border-dl-border">
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Date</th>
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Asset</th>
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Amount</th>
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Network</th>
                      <th className="text-left p-3 font-dl-mono text-dl-gray text-xs uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {intents.map(intent => (
                      <tr key={intent.intentId} className="border-b border-dl-border last:border-b-0">
                        <td className="p-3 font-dl-mono text-dl-gray text-xs">{formatDate(intent.createdAt)}</td>
                        <td className="p-3 font-dl-mono text-dl-navy">{intent.asset}</td>
                        <td className="p-3 font-dl-mono text-dl-navy">${Number(intent.fiatAmount).toFixed(2)} {intent.fiatCurrency}</td>
                        <td className="p-3 font-dl-mono text-dl-navy">{chainLabel(intent.chainId)}</td>
                        <td className="p-3">
                          <span className="font-dl-mono text-xs text-dl-gray border border-dl-border px-2 py-0.5 uppercase">
                            {intent.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </DesignLawLayout>
  );
}
