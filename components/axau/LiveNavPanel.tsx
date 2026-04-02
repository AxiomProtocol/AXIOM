'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp, Shield, Layers, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Activity, Coins, BarChart3,
} from 'lucide-react';

interface SystemState {
  totalSupplyFormatted:    string;
  totalBackingUsdFormatted:string;
  backingNavPerToken:      string;
  mintNavPerToken:         string;
  coverageRatioPct:        string;
  isSolvent:               boolean;
  mintPaused:              boolean;
  redeemPaused:            boolean;
  mintFeeBps:              number;
  redeemFeeBps:            number;
  totalMinted:             string;
  goldTotalUnits:          string;
  goldReserveAsset:        string;
  goldFrozen:              boolean;
  goldValueUsd:            string;
  landValueUsd:            string;
  landStale:               boolean;
  landLastTimestamp:       number;
  xauUsdPrice:             string;
  fetchedAt:               string;
}

function Stat({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={`px-5 py-4 border border-dl-border ${accent ? 'bg-dl-bg-alt' : 'bg-dl-bg'}`}>
      <p className="text-xs text-dl-gray uppercase tracking-wider font-dl-mono mb-1">{label}</p>
      <p className={`font-dl-mono text-lg font-semibold ${accent ? 'text-dl-gold' : 'text-dl-navy'}`}>{value}</p>
      {sub && <p className="text-xs text-dl-gray mt-0.5 font-dl-mono">{sub}</p>}
    </div>
  );
}

function StatusChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-dl-mono border ${
      ok ? 'text-dl-forest border-dl-forest bg-green-50' : 'text-red-700 border-red-300 bg-red-50'
    }`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

export default function LiveNavPanel() {
  const [state, setState]     = useState<SystemState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const r = await fetch('/api/axau/nav');
      if (!r.ok) throw new Error(await r.text());
      const d = await r.json();
      setState(d);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="border border-dl-border p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-dl-navy animate-pulse" />
          <span className="text-sm font-dl-mono text-dl-gray">Loading live system state from Arbitrum One...</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-dl-bg-alt border border-dl-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-dl-border border-l-4 border-l-red-400 px-6 py-4 bg-red-50 mb-8">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Could not fetch live state</p>
            <p className="text-xs text-red-600 mt-1 font-dl-mono">{error}</p>
            <button onClick={() => load()} className="mt-2 text-xs font-dl-mono text-red-700 underline">Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (!state) return null;

  const mintActive   = !state.mintPaused;
  const redeemActive = !state.redeemPaused;

  return (
    <div className="border border-dl-border mb-8">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-dl-border bg-dl-bg-alt">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-dl-forest" />
          <span className="text-sm font-semibold text-dl-navy font-dl-mono uppercase tracking-wide">Live System State</span>
          <span className="inline-block w-2 h-2 rounded-full bg-dl-forest animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-dl-gray font-dl-mono">
            {new Date(state.fetchedAt).toLocaleTimeString()}
          </span>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-1 border border-dl-border bg-dl-bg hover:bg-dl-bg-alt"
            title="Refresh"
          >
            <RefreshCw className={`w-3 h-3 text-dl-gray ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-3 flex-wrap px-5 py-3 border-b border-dl-border">
        <StatusChip ok={state.isSolvent}   label={state.isSolvent ? 'Solvent' : 'Under-collateralised'} />
        <StatusChip ok={mintActive}        label={mintActive   ? 'Mint Active'   : 'Mint Paused'} />
        <StatusChip ok={redeemActive}      label={redeemActive ? 'Redeem Active' : 'Redeem Paused'} />
        <StatusChip ok={!state.goldFrozen} label={state.goldFrozen ? 'Gold Vault Frozen' : 'Gold Vault Normal'} />
        {!mintActive && (
          <span className="text-xs text-dl-gray font-dl-mono">
            Reserve activation pending — PAXG bridge required before mint opens
          </span>
        )}
      </div>

      {/* NAV stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-dl-border">
        <Stat label="XAU/USD (Chainlink)" value={`$${state.xauUsdPrice}`}
              sub="Live oracle price" accent />
        <Stat label="Backing NAV / AXAU"  value={`$${state.backingNavPerToken}`}
              sub="Floor value per token" />
        <Stat label="Mint NAV / AXAU"     value={`$${state.mintNavPerToken}`}
              sub="Min reserve to mint" accent />
        <Stat label="Coverage Ratio"      value={state.coverageRatioPct}
              sub="≥105% required to mint" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-dl-border">
        <Stat label="Total Supply"         value={`${state.totalSupplyFormatted} AXAU`}
              sub="Circulating" accent />
        <Stat label="Total Backing (USD)"  value={`$${state.totalBackingUsdFormatted}`}
              sub="Aggregate reserve value" />
        <Stat label="Gold Reserve (units)" value={state.goldTotalUnits}
              sub="XAU vault units" accent />
        <Stat label="Land Reserve (USD)"   value={`$${state.landValueUsd}`}
              sub={`NAV ${state.landStale ? '⚠ Stale' : '✓ Applied'}`} />
      </div>

      {/* Fee and address row */}
      <div className="px-5 py-3 flex flex-wrap gap-6 text-xs text-dl-gray font-dl-mono border-b border-dl-border bg-dl-bg-alt">
        <span>Mint fee: <span className="text-dl-navy">{state.mintFeeBps} bps</span></span>
        <span>Redeem fee: <span className="text-dl-navy">{state.redeemFeeBps} bps</span></span>
        <span>Total minted: <span className="text-dl-navy">{state.totalMinted} AXAU</span></span>
        <span>Reserve asset: <span className="text-dl-navy font-semibold">
          {state.goldReserveAsset.toLowerCase() === '0x82af49447d8a07e3bd95bd0d56f35241523fbab1'
            ? 'WETH (placeholder — PAXG activation pending)'
            : state.goldReserveAsset.slice(0, 6) + '...' + state.goldReserveAsset.slice(-4)}
        </span></span>
      </div>

      {/* Contract addresses */}
      <div className="px-5 py-3 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs font-dl-mono text-dl-gray">
        {[
          ['Token (AXAU)',        '0xbcCA4D937d427829914498423aE6E04C846dB0Bb'],
          ['NAV Engine',          '0x80F8634a43B26a2bd403396A42465F138aeCC519'],
          ['Mint/Redeem Controller','0x036F05a3fB74d35439c074f25F691b36f5D37792'],
          ['Commodity Registry',  '0x6D3aAa92793503B40b3F3593d2fCc409Ca610bDa'],
          ['Gold Vault',          '0xaCc9BFf51AD291fc0c9003C6f8CC09BBa63C4CF8'],
          ['Land Vault',          '0x66Aadce66a359609ec5E18fb3d8927a2363449cf'],
        ].map(([label, addr]) => (
          <div key={addr} className="flex items-center gap-2">
            <span className="text-dl-gray w-44 flex-shrink-0">{label}</span>
            <a
              href={`https://arbitrum.blockscout.com/address/${addr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-dl-navy hover:text-dl-forest font-semibold truncate"
            >
              {addr.slice(0, 10)}...{addr.slice(-6)}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
