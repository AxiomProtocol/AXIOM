/**
 * /earn/axusd — Axiom Earn AXUSD Vault
 *
 * Bootstrap / Pre-Live integration page for the earnAXUSD ERC-4626 vault
 * (0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B, Arbitrum One).
 *
 * Delivers:
 *   - Bootstrap/Pre-Live status banner with exact approved copy
 *   - Live ERC-4626 on-chain reads via wagmi useReadContract
 *   - Network gating (Arbitrum One required)
 *   - User share balance and AXUSD value estimate
 *   - Deposit section feature-flagged off by default
 *   - Borrow section explicitly disabled with explanation
 *   - Structured disclosure section
 *
 * Never implies active yield, live APY, or production-ready borrow
 * functionality — controlled by the status metadata in lib/vaults/earnAXUSD.ts.
 */

import Head from 'next/head';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useSwitchChain } from 'wagmi';
import { DesignLawLayout } from '../../components/design-law';
import { VaultStatusBanner } from '../../components/design-law/VaultStatusBanner';
import {
  EARN_AXUSD_VAULT,
  ERC4626_ABI,
  ARBITRUM_ONE_CHAIN_ID,
  formatUnits18,
  shortAddr,
} from '../../lib/vaults/earnAXUSD';

// ── Analytics stubs (extend with your analytics provider here) ───────────────
function trackEvent(name: string, props?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.debug('[analytics]', name, props);
  }
  // TODO: replace stub with posthog.capture / segment.track / etc.
}

// ── Sub-components ─────────────────────────────────────────────────────────
function Row({ label, value, mono = true }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-2.5 border-b border-dl-border last:border-b-0 gap-1">
      <span className="text-dl-gray text-sm">{label}</span>
      <span className={`text-dl-navy text-sm ${mono ? 'font-dl-mono' : 'font-medium'}`}>
        {value}
      </span>
    </div>
  );
}

function Badge({ label, variant = 'neutral' }: {
  label: string;
  variant?: 'neutral' | 'warning' | 'disabled' | 'network';
}) {
  const styles: Record<string, string> = {
    neutral:  'border-dl-border text-dl-gray',
    warning:  'border-dl-gold text-dl-gold',
    disabled: 'border-dl-border text-dl-gray opacity-60',
    network:  'border-dl-navy text-dl-navy',
  };
  return (
    <span className={`font-dl-mono text-xs px-2 py-0.5 border ${styles[variant]} uppercase tracking-wider`}>
      {label}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-3">
      {children}
    </p>
  );
}

function DisabledAction({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="border border-dl-border bg-dl-bg-alt p-4">
      <p className="text-dl-navy font-medium mb-1">{title}</p>
      <p className="text-dl-gray text-xs">{reason}</p>
      <button
        disabled
        className="mt-3 w-full py-2 border border-dl-border text-dl-gray text-sm font-medium cursor-not-allowed opacity-50"
        aria-disabled="true"
        onClick={() => trackEvent('blocked_action_earn_axusd_deposit_disabled')}
      >
        Not available — pending activation
      </button>
    </div>
  );
}

// ── Network guard ──────────────────────────────────────────────────────────
function WrongNetworkBanner({ currentChainId }: { currentChainId: number | undefined }) {
  const { switchChain } = useSwitchChain();
  return (
    <div className="border border-dl-gold bg-dl-bg-alt p-4 mb-6">
      <p className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest mb-1">
        Wrong Network
      </p>
      <p className="text-dl-navy text-sm mb-3">
        This vault is on Arbitrum One. Your wallet is connected to chain{' '}
        <span className="font-dl-mono">{currentChainId ?? '?'}</span>.
        Switch to Arbitrum One to view live vault data.
      </p>
      <button
        onClick={() => switchChain?.({ chainId: ARBITRUM_ONE_CHAIN_ID })}
        className="px-4 py-2 bg-dl-navy text-white text-sm font-medium"
      >
        Switch to Arbitrum One
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function EarnAXUSDPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    trackEvent('page_view_earn_axusd');
  }, []);

  const onCorrectChain = mounted && isConnected && chainId === ARBITRUM_ONE_CHAIN_ID;
  const v = EARN_AXUSD_VAULT;

  // ── ERC-4626 on-chain reads ──────────────────────────────────────────────
  const contractBase = {
    address: v.address,
    abi: ERC4626_ABI,
    chainId: ARBITRUM_ONE_CHAIN_ID,
  } as const;

  const { data: totalAssets } = useReadContract({
    ...contractBase,
    functionName: 'totalAssets',
  });
  const { data: totalSupply } = useReadContract({
    ...contractBase,
    functionName: 'totalSupply',
  });
  // Share price: how many AXUSD does 1 earnAXUSD represent?
  const { data: sharePrice } = useReadContract({
    ...contractBase,
    functionName: 'convertToAssets',
    args: [BigInt(10 ** 18)],
  });
  const { data: maxDeposit } = useReadContract({
    ...contractBase,
    functionName: 'maxDeposit',
    args: ['0x0000000000000000000000000000000000000000' as `0x${string}`],
  });
  // User balance (shares)
  const { data: userShares } = useReadContract({
    ...contractBase,
    functionName: 'balanceOf',
    args: [address ?? '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!address },
  });
  // User AXUSD value estimate
  const { data: userValue } = useReadContract({
    ...contractBase,
    functionName: 'convertToAssets',
    args: [userShares ?? 0n],
    query: { enabled: !!userShares && userShares > 0n },
  });
  // Governance roles
  const { data: vaultOwner } = useReadContract({ ...contractBase, functionName: 'owner' });
  const { data: vaultCurator } = useReadContract({ ...contractBase, functionName: 'curator' });

  const isZeroAddr = (a: unknown) =>
    !a || (a as string).toLowerCase() === '0x0000000000000000000000000000000000000000';

  return (
    <DesignLawLayout>
      <Head>
        <title>Axiom AXUSD Earn Vault — Configured | Axiom Protocol</title>
        <meta
          name="description"
          content="Axiom AXUSD Earn Vault on Arbitrum One. Configured — deposits not yet open. Euler Earn integration withdrawn. Axiom-native earn architecture in formation."
        />
      </Head>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-dl-gray text-xs font-dl-mono mb-3">
          <Link href="/earn" className="hover:text-dl-navy">Earn</Link>
          <span>/</span>
          <span className="text-dl-navy">AXUSD Vault</span>
        </div>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">Axiom AXUSD Earn Vault</h1>
        <p className="text-dl-gray text-sm">
          Configured — Deposits Not Yet Open · Arbitrum One
        </p>
      </div>

      {/* ── Status badges ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge label="Configured"       variant="network"  />
        <Badge label="Deposits Paused"  variant="warning"  />
        <Badge label="Arbitrum One"     variant="network"  />
        <Badge label="Yield Inactive"   variant="disabled" />
        <Badge label="Euler — Legacy"   variant="disabled" />
      </div>

      {/* ── Configured status banner ───────────────────────────────────── */}
      <VaultStatusBanner
        vaultName="Axiom AXUSD Earn Vault"
        network="Arbitrum One"
        limitations={v.limitations}
        launchConditions={v.launchConditions}
        status="configured"
      />

      {/* ── Wrong network notice (client-side only) ─────────────────────── */}
      {mounted && isConnected && chainId !== ARBITRUM_ONE_CHAIN_ID && (
        <WrongNetworkBanner currentChainId={chainId} />
      )}

      {/* ── Vault identity ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Vault Identity</SectionLabel>
        <div className="border border-dl-border bg-dl-bg-alt divide-y divide-dl-border">
          <Row label="Contract"        value={v.address} />
          <Row label="Name"            value={v.name} mono={false} />
          <Row label="Symbol"          value={v.symbol} />
          <Row label="Standard"        value={v.standard} mono={false} />
          <Row label="Underlying asset" value={`${v.asset.symbol} — ${v.asset.address}`} />
          <Row label="Chain"           value="Arbitrum One (42161)" />
          <Row label="Factory (Legacy)" value={v.factory} />
          <Row
            label="Euler V2 UI (Archived)"
            value={
              <span className="text-dl-gray text-xs">
                Integration withdrawn — endpoint archived.{' '}
                <a
                  href={v.eulerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-dl-gray"
                >
                  app.euler.finance ↗
                </a>
              </span>
            }
            mono={false}
          />
          <Row label="Deployment status" value="Configured — Deposits Not Yet Open" mono={false} />
        </div>
      </section>

      {/* ── Live on-chain vault data ────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Live On-Chain Data</SectionLabel>
        <div className="border border-dl-border bg-dl-bg-alt divide-y divide-dl-border">
          <Row
            label="Total assets (TVL)"
            value={totalAssets !== undefined ? `${formatUnits18(totalAssets)} AXUSD` : '…'}
          />
          <Row
            label="Total supply (shares)"
            value={totalSupply !== undefined ? `${formatUnits18(totalSupply)} earnAXUSD` : '…'}
          />
          <Row
            label="Share price (1 earnAXUSD → AXUSD)"
            value={sharePrice !== undefined ? `${formatUnits18(sharePrice, 6)} AXUSD` : '…'}
          />
          <Row
            label="Max deposit"
            value={maxDeposit !== undefined ? `${formatUnits18(maxDeposit)} AXUSD` : '…'}
          />
          <Row
            label="Active yield"
            value={<span className="text-dl-gray">Inactive — strategy cap is zero</span>}
            mono={false}
          />
        </div>

        {/* Governance roles */}
        <div className="border border-dl-border bg-dl-bg-alt divide-y divide-dl-border mt-3">
          <Row
            label="Owner"
            value={vaultOwner ? shortAddr(vaultOwner as string) : '…'}
          />
          <Row
            label="Curator"
            value={
              vaultCurator && !isZeroAddr(vaultCurator)
                ? shortAddr(vaultCurator as string)
                : <span className="text-dl-gray">Not assigned</span>
            }
            mono={false}
          />
        </div>
      </section>

      {/* ── User position ───────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Your Position</SectionLabel>
        <div className="border border-dl-border bg-dl-bg-alt divide-y divide-dl-border">
          {!mounted ? (
            <Row label="Wallet" value="Loading…" />
          ) : !isConnected ? (
            <div className="p-4 text-dl-gray text-sm">
              Connect a wallet to view your earnAXUSD balance.
            </div>
          ) : !onCorrectChain ? (
            <div className="p-4 text-dl-gray text-sm">
              Switch to Arbitrum One to view your balance.
            </div>
          ) : (
            <>
              <Row label="Wallet" value={shortAddr(address!)} />
              <Row
                label="earnAXUSD shares"
                value={
                  userShares !== undefined
                    ? `${formatUnits18(userShares)} earnAXUSD`
                    : '…'
                }
              />
              <Row
                label="Estimated AXUSD value"
                value={
                  userShares === 0n
                    ? '0 AXUSD'
                    : userValue !== undefined
                    ? `${formatUnits18(userValue)} AXUSD`
                    : '…'
                }
              />
            </>
          )}
        </div>
      </section>

      {/* ── Legacy Integration Record ───────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Legacy Integration — Euler Earn</SectionLabel>
        <details className="border border-red-400 bg-dl-bg-alt">
          <summary className="px-5 py-3 cursor-pointer flex items-center gap-3 select-none">
            <span className="font-dl-mono text-xs border border-red-400 text-red-600 px-2 py-0.5 uppercase tracking-widest">Withdrawn</span>
            <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">Euler Earn Integration — Empty · No Active Position</span>
          </summary>
          <div className="px-5 pb-5 pt-3 border-t border-red-200">
            <p className="text-sm text-dl-gray leading-relaxed mb-3">
              The Euler Earn AXUSD wrapper — which provided auto-compounding yield via
              Euler V2 strategy allocation — has been withdrawn from the Axiom stack.
              No user capital was at risk; no public deposits were open at time of withdrawal.
              The vault retains its on-chain deployment for reference reads only.
            </p>
            <div className="border border-dl-border bg-dl-bg p-4 mb-3">
              <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wider mb-2">Integration Status</p>
              <div className="space-y-1.5 font-dl-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-dl-gray">Euler Earn strategy</span>
                  <span className="text-red-600">Withdrawn — strategy cap zeroed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dl-gray">EVK vault API</span>
                  <span className="text-red-600">HTTP 410 — Decommissioned</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dl-gray">User capital at risk</span>
                  <span className="text-dl-forest">None — no public deposits were open</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dl-gray">earnAXUSD on-chain contract</span>
                  <span className="text-dl-navy">Retained for reference reads only</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-dl-gray leading-relaxed">
              See{' '}
              <Link href="/disclosure" className="text-dl-navy underline">Institutional Disclosure</Link>
              {' '}for the full Euler transition record, or{' '}
              <Link href="/reserves" className="text-dl-navy underline">Reserves</Link>
              {' '}for current reserve posture.
            </p>
          </div>
        </details>
      </section>

      {/* ── Deposit section ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Deposit</SectionLabel>
        <DisabledAction
          title="Deposits not yet open"
          reason="The Axiom AXUSD Earn Vault is configured but deposits are not yet open. The Euler Earn integration has been withdrawn. Axiom-native earn infrastructure is in formation. No yield, APY, or performance data is available."
        />
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href="/disclosure" className="font-dl-mono text-xs text-dl-navy underline">Institutional Disclosure →</Link>
          <Link href="/reserves" className="font-dl-mono text-xs text-dl-navy underline">Reserve Status →</Link>
        </div>
      </section>

      {/* ── Borrow section ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Borrow / Collateral</SectionLabel>
        <div className="border border-dl-border bg-dl-bg-alt p-4">
          <p className="text-dl-navy font-medium mb-1">Borrow-side functionality not available</p>
          <p className="text-dl-gray text-xs mb-3">
            Borrow-side functionality is not available. The Euler V2 integration
            that powered collateralized borrowing against this vault has been
            withdrawn. Axiom-native credit infrastructure is in formation under
            the Axiom Credit Vault programme.
          </p>
          <button
            disabled
            className="w-full py-2 border border-dl-border text-dl-gray text-sm font-medium cursor-not-allowed opacity-50"
            aria-disabled="true"
            onClick={() => trackEvent('blocked_action_earn_axusd_borrow_disabled')}
          >
            Borrowing unavailable
          </button>
        </div>
      </section>

      {/* ── Structured disclosure ────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Disclosure</SectionLabel>
        <div className="border border-dl-border bg-dl-bg-alt p-5 space-y-5">

          <div>
            <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-widest mb-2">
              Current Status
            </p>
            <ul className="space-y-1 text-sm text-dl-gray">
              <li>— Vault is deployed on Arbitrum One and retains on-chain configuration</li>
              <li>— Euler Earn integration has been withdrawn (Task #510)</li>
              <li>— No active yield — no strategy is deployed</li>
              <li>— Deposits are disabled pending Axiom-native earn infrastructure</li>
            </ul>
          </div>

          <div className="border-t border-dl-border pt-4">
            <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-widest mb-2">
              What Works Today
            </p>
            <ul className="space-y-1 text-sm text-dl-gray">
              <li>— Wallet connection and on-chain balance reads (reference only)</li>
              <li>— Read-only on-chain vault data (totalAssets, share price, maxDeposit)</li>
              <li>— Identity verification visibility</li>
            </ul>
          </div>

          <div className="border-t border-dl-border pt-4">
            <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-widest mb-2">
              What Is Pending — Axiom-Native Path
            </p>
            <ul className="space-y-1 text-sm text-dl-gray">
              <li>— Axiom-native earn vault architecture design and governance approval</li>
              <li>— New vault deployment and verification on Arbitrum One</li>
              <li>— Deposit activation for credentialed participants</li>
            </ul>
          </div>

          <div className="border-t border-dl-border pt-4">
            <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-widest mb-2">
              Launch Conditions
            </p>
            <ul className="space-y-1 text-sm text-dl-gray">
              {EARN_AXUSD_VAULT.launchConditions.map((c) => (
                <li key={c.id}>
                  <span className="font-dl-mono">{c.done ? '[x]' : '[ ]'}</span>{' '}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>

        </div>
      </section>

      {/* ── Footer note ─────────────────────────────────────────────────── */}
      <div className="text-dl-gray text-xs leading-relaxed border-t border-dl-border pt-6">
        <p>
          On-chain data is read directly from{' '}
          <span className="font-dl-mono">{v.address}</span> on Arbitrum One.
          Rates shown as Variable or Inactive. No APY is stated or implied.
          Past rates do not indicate future performance. This page is for
          integration visibility and controlled testing only.
        </p>
        <p className="mt-2">
          Technical reference:{' '}
          <span className="font-dl-mono">documents/axusd-earn-vault-technical-reference.md</span>
        </p>
      </div>
    </DesignLawLayout>
  );
}
