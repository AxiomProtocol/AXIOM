/**
 * /operations/fuji-status
 *
 * Avalanche Fuji ERC-3643 Contract Status — Operations panel.
 *
 * Reads live on-chain state from the 8 deployed contracts via
 * GET /api/operations/fuji-status and displays the current operational
 * status of the Avalanche compliance stack.
 *
 * Observer-only — no write actions, no wallet signing.
 */

import Head from 'next/head';
import Link from 'next/link';
import React, { useEffect, useState, useCallback } from 'react';
import { DesignLawLayout } from '../../components/design-law';
import type { FujiStatusResponse } from '../api/operations/fuji-status';

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(val: string | number, decimals = 2): string {
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function addrShort(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function explorerAddr(addr: string): string {
  return `https://testnet.snowtrace.io/address/${addr}`;
}

const CONTRACT_LABELS: Record<string, string> = {
  AxiomStable3643: 'AxiomStable3643Fuji (AXUSD)',
  ModularCompliance: 'ModularCompliance',
  IdentityRegistry: 'IdentityRegistry',
  IdentityRegistryStorage: 'IdentityRegistryStorage',
  TrustedIssuersRegistry: 'TrustedIssuersRegistry',
  ClaimTopicsRegistry: 'ClaimTopicsRegistry',
  CountryAllowModule: 'CountryAllowModule',
  TransferLimitModule: 'TransferLimitModule',
};

// ─── Sub-components ────────────────────────────────────────────────────────

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <div className="mb-4">
      <p className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-gold mb-1">{label}</p>
      <h2 className="font-dl-serif text-lg text-dl-navy">{title}</h2>
    </div>
  );
}

function Row({ label, value, mono = true, warn = false }: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-dl-border last:border-0">
      <span className="font-dl-mono text-[11px] uppercase tracking-wider text-dl-gray shrink-0 pt-px">{label}</span>
      <span className={`${mono ? 'font-dl-mono text-[12px]' : 'text-sm'} text-right break-all ${warn ? 'text-amber-700' : 'text-dl-navy'}`}>
        {value}
      </span>
    </div>
  );
}

function StatusPill({ value, trueLabel = 'YES', falseLabel = 'NO', trueClass = 'text-dl-green', falseClass = 'text-red-700' }: {
  value: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
  trueClass?: string;
  falseClass?: string;
}) {
  if (value === null || value === undefined) return <span className="font-dl-mono text-[11px] text-dl-gray">—</span>;
  return (
    <span className={`font-dl-mono text-[11px] uppercase tracking-wider ${value ? trueClass : falseClass}`}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function WarnBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-amber-400 bg-amber-50 px-4 py-3 mb-4">
      <p className="font-dl-mono text-[11px] uppercase tracking-widest text-amber-700 mb-1">Warning</p>
      <p className="text-sm text-amber-900">{children}</p>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dl-border bg-dl-bg mb-6 p-4">
      {children}
    </div>
  );
}

// ─── Loading / Error states ────────────────────────────────────────────────

function LoadingState() {
  return (
    <Panel>
      <p className="font-dl-mono text-[12px] text-dl-gray animate-pulse">
        Connecting to Avalanche Fuji RPC…
      </p>
    </Panel>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="border border-red-300 bg-red-50 px-4 py-4 mb-6">
      <p className="font-dl-mono text-[11px] uppercase tracking-widest text-red-700 mb-1">RPC Failure</p>
      <p className="text-sm text-red-900 mb-3 break-all">{message}</p>
      <button
        onClick={onRetry}
        className="font-dl-mono text-[11px] uppercase tracking-wider border border-red-400 px-3 py-1 text-red-700 hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}

function StaleWarning({ timestamp }: { timestamp: string }) {
  const ageMins = Math.floor((Date.now() - new Date(timestamp).getTime()) / 60000);
  if (ageMins < 2) return null;
  return (
    <div className="border border-amber-300 bg-amber-50 px-3 py-2 mb-4 flex items-center gap-3">
      <span className="font-dl-mono text-[10px] uppercase tracking-widest text-amber-700">Stale Data</span>
      <span className="text-xs text-amber-800">Last read {ageMins}m ago — auto-refresh every 60 s</span>
    </div>
  );
}

// ─── Main sections ─────────────────────────────────────────────────────────

function TokenSection({ data }: { data: FujiStatusResponse }) {
  const { token } = data;
  return (
    <Panel>
      <SectionHeader label="ERC-3643 Token" title="AxiomStable3643Fuji — AXUSD" />
      <Row label="Network" value="Avalanche Fuji Testnet" />
      <Row label="Chain ID" value={String(data.chainId)} />
      <Row label="Token Address" value={
        <a href={explorerAddr(token.address)} target="_blank" rel="noreferrer" className="underline text-dl-navy">
          {token.address}
        </a>
      } />
      <Row label="Name" value={token.name} />
      <Row label="Symbol" value={token.symbol} />
      <Row label="Decimals" value={String(token.decimals)} />
      <Row label="Total Supply" value={`${fmt(token.totalSupply)} ${token.symbol}`} />
      <Row
        label="Paused"
        value={<StatusPill value={token.paused} trueLabel="PAUSED" falseLabel="ACTIVE" trueClass="text-red-700" falseClass="text-dl-green" />}
        mono={false}
      />
    </Panel>
  );
}

function BalancesSection({ data }: { data: FujiStatusResponse }) {
  const { balances } = data;
  return (
    <Panel>
      <SectionHeader label="Balances" title="Known Wallet Balances" />
      <Row label="Deployer" value={
        <span>
          <a href={explorerAddr(balances.deployer.address)} target="_blank" rel="noreferrer" className="underline">
            {addrShort(balances.deployer.address)}
          </a>
          {' '}— {fmt(balances.deployer.balance)} AXUSD
        </span>
      } />
      <Row label="Test Wallet" value={
        <span>
          <a href={explorerAddr(balances.testWallet.address)} target="_blank" rel="noreferrer" className="underline">
            {addrShort(balances.testWallet.address)}
          </a>
          {' '}— {fmt(balances.testWallet.balance)} AXUSD
        </span>
      } />
      <div className="mt-3 font-dl-mono text-[10px] text-dl-gray">
        Test wallet is Fuji-only (Hardhat #0). Deployer: 0x8d7892…C96.
      </div>
    </Panel>
  );
}

function RolesSection({ data }: { data: FujiStatusResponse }) {
  const { deployer } = data.roles;
  const allRoles = deployer.isAdmin && deployer.isMinter && deployer.isAgent;
  return (
    <Panel>
      <SectionHeader label="Access Control" title="Deployer Role Status" />
      <WarnBanner>
        Deployer holds DEFAULT_ADMIN, MINTER, and AGENT_ROLE directly.
        This configuration is <strong>not mainnet-ready</strong>. Roles must be transferred to a multi-party authorization wallet (Gnosis Safe) before Avalanche mainnet deployment.
      </WarnBanner>
      <Row label="DEFAULT_ADMIN_ROLE" value={<StatusPill value={deployer.isAdmin} trueLabel="HELD" falseLabel="NOT HELD" />} mono={false} />
      <Row label="MINTER_ROLE" value={<StatusPill value={deployer.isMinter} trueLabel="HELD" falseLabel="NOT HELD" />} mono={false} />
      <Row label="AGENT_ROLE" value={<StatusPill value={deployer.isAgent} trueLabel="HELD" falseLabel="NOT HELD" />} mono={false} />
      <Row label="All Roles Present" value={<StatusPill value={allRoles} trueLabel="YES" falseLabel="PARTIAL" />} mono={false} />
      <Row label="Mainnet Ready" value={<StatusPill value={false} trueLabel="YES" falseLabel="NOT READY" falseClass="text-amber-700" />} mono={false} warn />
    </Panel>
  );
}

function ComplianceSection({ data }: { data: FujiStatusResponse }) {
  const { compliance } = data;
  const limitDisplay = parseFloat(compliance.transferLimitAxusd) === 0
    ? 'Unlimited (reset after smoke test T11)'
    : `${fmt(compliance.transferLimitAxusd)} AXUSD / day`;
  return (
    <Panel>
      <SectionHeader label="ModularCompliance" title="Compliance Module Status" />
      <WarnBanner>{compliance.countryAllowTestnetWarning}</WarnBanner>
      <Row label="MC Address" value={
        <a href={explorerAddr(data.token.complianceAddress)} target="_blank" rel="noreferrer" className="underline">
          {addrShort(data.token.complianceAddress)}
        </a>
      } />
      <Row label="CountryAllowModule Bound" value={<StatusPill value={compliance.countryAllowModuleBound} />} mono={false} />
      <Row label="TransferLimitModule Bound" value={<StatusPill value={compliance.transferLimitModuleBound} />} mono={false} />
      <Row label="Transfer Limit" value={limitDisplay} />
      <div className="mt-3">
        <p className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-gray mb-2">Attached Modules</p>
        {compliance.modules.length === 0 ? (
          <p className="font-dl-mono text-[11px] text-red-700">No modules returned — check RPC</p>
        ) : (
          <ul className="space-y-1">
            {compliance.modules.map((m) => (
              <li key={m}>
                <a
                  href={explorerAddr(m)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-dl-mono text-[11px] text-dl-navy underline break-all"
                >
                  {m}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function IdentitySection({ data }: { data: FujiStatusResponse }) {
  const { identityRegistry } = data;
  return (
    <Panel>
      <SectionHeader label="Identity Layer" title="IdentityRegistry Wiring" />
      <Row label="IdentityRegistry" value={
        <a href={explorerAddr(identityRegistry.address)} target="_blank" rel="noreferrer" className="underline">
          {addrShort(identityRegistry.address)}
        </a>
      } />
      <Row label="TrustedIssuersRegistry" value={
        <a href={explorerAddr(identityRegistry.issuersRegistry)} target="_blank" rel="noreferrer" className="underline">
          {addrShort(identityRegistry.issuersRegistry)}
        </a>
      } />
      <Row label="ClaimTopicsRegistry" value={
        <a href={explorerAddr(identityRegistry.topicsRegistry)} target="_blank" rel="noreferrer" className="underline">
          {addrShort(identityRegistry.topicsRegistry)}
        </a>
      } />
      <Row label="IdentityRegistryStorage" value={
        <a href={explorerAddr(identityRegistry.identityStorage)} target="_blank" rel="noreferrer" className="underline">
          {addrShort(identityRegistry.identityStorage)}
        </a>
      } />
    </Panel>
  );
}

function ContractsSection({ data }: { data: FujiStatusResponse }) {
  const entries = Object.entries(data.contracts);
  return (
    <Panel>
      <SectionHeader label="Deployed Contracts" title="Explorer Links — Fuji (43113)" />
      <div className="divide-y divide-dl-border">
        {entries.map(([key, { address, explorer }]) => (
          <div key={key} className="flex items-center justify-between gap-4 py-2">
            <span className="font-dl-mono text-[11px] text-dl-gray shrink-0">
              {CONTRACT_LABELS[key] ?? key}
            </span>
            <a
              href={explorer}
              target="_blank"
              rel="noreferrer"
              className="font-dl-mono text-[11px] text-dl-navy underline break-all text-right"
            >
              {address}
            </a>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function SmokeTestSection({ data }: { data: FujiStatusResponse }) {
  const { smokeTest } = data;
  const allPass = smokeTest.failed === 0 && smokeTest.passed === smokeTest.total;
  return (
    <Panel>
      <SectionHeader label="Smoke Test Record" title="Last Behavioral Test Run" />
      <Row label="Task" value={smokeTest.task} mono={false} />
      <Row label="Completed" value={new Date(smokeTest.completedAt).toLocaleString()} />
      <Row label="Result" value={
        <span className={`font-dl-mono text-[11px] uppercase tracking-wider ${allPass ? 'text-dl-green' : 'text-red-700'}`}>
          {smokeTest.passed} / {smokeTest.total} PASSED
        </span>
      } mono={false} />
      <Row label="Failures" value={
        <span className={`font-dl-mono text-[11px] ${smokeTest.failed === 0 ? 'text-dl-green' : 'text-red-700'}`}>
          {smokeTest.failed}
        </span>
      } mono={false} />
      <div className="mt-3">
        <Link
          href="/documents/chains/AXIOM_AVALANCHE_FUJI_SMOKE_REPORT.md"
          className="font-dl-mono text-[11px] text-dl-navy underline"
        >
          View full smoke report →
        </Link>
      </div>
    </Panel>
  );
}

function MainnetGateSection({ data }: { data: FujiStatusResponse }) {
  const items = data.mainnetPromotionGate.items;
  const doneCount = items.filter((i) => i.done).length;
  return (
    <Panel>
      <SectionHeader label="Mainnet Promotion Gate" title={`Avalanche C-Chain Prerequisites (${doneCount} / ${items.length})`} />
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-start gap-3 py-1 border-b border-dl-border last:border-0">
            <span className={`font-dl-mono text-[12px] shrink-0 mt-px ${item.done ? 'text-dl-green' : 'text-dl-gray'}`}>
              {item.done ? '✓' : '○'}
            </span>
            <span className={`text-sm ${item.done ? 'text-dl-navy' : 'text-dl-gray'}`}>{item.label}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function FujiStatusPage() {
  const [data, setData] = useState<FujiStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/operations/fuji-status');
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? 'Unknown error');
      setData(json as FujiStatusResponse);
      setFetchedAt(new Date().toISOString());
    } catch (e: any) {
      setError(e.message ?? 'RPC failure');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <>
      <Head>
        <title>Fuji Contract Status — Operations</title>
      </Head>
      <DesignLawLayout>
        {/* ── Header ── */}
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-2">
            Operations · Avalanche Fuji Testnet
          </p>
          <h1 className="font-dl-serif text-3xl md:text-4xl text-dl-navy mb-2">
            Fuji ERC-3643 Contract Status
          </h1>
          <p className="text-sm text-dl-gray max-w-2xl">
            Live operational status of the 8 deployed ERC-3643 contracts on Avalanche Fuji (Chain ID 43113).
            Observer panel — read-only. Refreshes every 60 seconds.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
            <Link href="/operations/cap-infra" className="text-dl-navy underline">
              ← Cap-Infra Console
            </Link>
            {fetchedAt && (
              <span className="font-dl-mono text-dl-gray">
                Last read: {new Date(fetchedAt).toLocaleTimeString()}
                {data ? ` · RPC ${data.rpcLatencyMs}ms` : ''}
              </span>
            )}
            {!loading && (
              <button
                onClick={load}
                className="font-dl-mono uppercase tracking-wider border border-dl-border px-3 py-1 text-dl-navy hover:bg-dl-bg-alt text-[11px]"
              >
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* ── Testnet banner ── */}
        <div className="border border-dl-border bg-dl-bg-alt px-4 py-3 mb-6 flex items-start gap-3">
          <span className="font-dl-mono text-[10px] uppercase tracking-widest text-dl-gold shrink-0 pt-px">Testnet</span>
          <p className="text-xs text-dl-gray">
            These contracts are deployed on Avalanche Fuji testnet. No real funds are at risk.
            Data is fetched live from the public Fuji RPC endpoint.
          </p>
        </div>

        {/* ── Stale warning ── */}
        {fetchedAt && !loading && <StaleWarning timestamp={fetchedAt} />}

        {/* ── Loading / Error / Content ── */}
        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={load} />}
        {!loading && !error && data && (
          <>
            <TokenSection data={data} />
            <BalancesSection data={data} />
            <RolesSection data={data} />
            <ComplianceSection data={data} />
            <IdentitySection data={data} />
            <ContractsSection data={data} />
            <SmokeTestSection data={data} />
            <MainnetGateSection data={data} />
          </>
        )}

        {/* ── Footer note ── */}
        <div className="mt-4 border-t border-dl-border pt-4">
          <p className="font-dl-mono text-[10px] text-dl-gray">
            Source of truth:{' '}
            <code>shared/contracts-avalanche.ts</code> ·{' '}
            <code>deployments/avalanche/fuji-smoke-results.json</code>
          </p>
        </div>
      </DesignLawLayout>
    </>
  );
}
