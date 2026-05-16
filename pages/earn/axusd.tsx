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
  EARN_AXUSD_DEPOSITS_ENABLED,
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
        <title>Axiom Earn AXUSD — Bootstrap / Pre-Live | Axiom Protocol</title>
        <meta
          name="description"
          content="Axiom Earn AXUSD (earnAXUSD) vault on Arbitrum One. Deployed and recognized by Euler, pending activation. Not yet a live yield product."
        />
        <meta name="robots" content="noindex" />
      </Head>

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-dl-gray text-xs font-dl-mono mb-3">
          <Link href="/earn" className="hover:text-dl-navy">Earn</Link>
          <span>/</span>
          <span className="text-dl-navy">AXUSD Vault</span>
        </div>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-1">{v.name}</h1>
        <p className="text-dl-gray text-sm">
          ERC-4626 yield vault on Arbitrum One — Bootstrap / Pre-Live
        </p>
      </div>

      {/* ── Status badges ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Badge label="Bootstrap"     variant="warning"  />
        <Badge label="Euler Earn"    variant="neutral"  />
        <Badge label="Arbitrum One"  variant="network"  />
        <Badge label="Yield Inactive" variant="disabled" />
        <Badge label="Borrow Disabled" variant="disabled" />
      </div>

      {/* ── Bootstrap/Pre-Live banner ───────────────────────────────────── */}
      <VaultStatusBanner
        vaultName={v.name}
        network="Arbitrum One"
        limitations={v.limitations}
        launchConditions={v.launchConditions}
        status={v.status}
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
          <Row label="Factory"         value={v.factory} />
          <Row
            label="Euler V2 UI"
            value={
              <a
                href={v.eulerLink}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-dl-navy"
              >
                app.euler.finance
              </a>
            }
            mono={false}
          />
          <Row label="Deployment status" value="Bootstrap / Pre-Live" mono={false} />
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

      {/* ── Deposit section ─────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Deposit</SectionLabel>

        {EARN_AXUSD_DEPOSITS_ENABLED ? (
          /* Testing-mode deposit stub — never imply yield is active */
          <div className="border border-dl-border bg-dl-bg-alt p-5">
            <div className="border border-dl-gold bg-dl-bg p-3 mb-4 text-xs text-dl-navy">
              Deposits may be enabled for testing purposes only. Active strategy
              yield is not yet live. No earnings will accrue on deposited capital
              at this stage.
            </div>
            <p className="text-dl-gray text-sm mb-4">
              Testing deposit UI — AXUSD will be sent to the vault but will not
              earn yield until the supply queue is activated.
            </p>
            <button
              disabled={!onCorrectChain}
              className="w-full py-2.5 border border-dl-navy text-dl-navy text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              onClick={() => {
                trackEvent('click_deposit_earn_axusd');
                // TODO: integrate approve + deposit call via wagmi useWriteContract
                // when ENABLE_EARN_AXUSD_DEPOSITS is active
              }}
            >
              Deposit AXUSD (testing mode)
            </button>
            <p className="text-dl-gray text-xs text-center mt-2">
              Arbitrum One required. AXUSD identity registration may be required.
            </p>
          </div>
        ) : (
          <DisabledAction
            title="Deposits not yet enabled"
            reason="The earnAXUSD vault is in bootstrap / pre-live state. Deposits may be enabled for controlled testing in the future, but active strategy yield is not yet live. No APY, earnings, or performance data is available at this stage."
          />
        )}
      </section>

      {/* ── Borrow section ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <SectionLabel>Borrow / Collateral</SectionLabel>
        <div className="border border-dl-border bg-dl-bg-alt p-4">
          <p className="text-dl-navy font-medium mb-1">Borrow-side functionality not live</p>
          <p className="text-dl-gray text-xs mb-3">
            Borrow-side functionality is not yet live for this vault. The
            underlying eVault strategy has a broken oracle configuration and
            unrenounced governance that prevents the Euler V2 risk engine from
            pricing collateral. This will be resolved when the canonical EVK
            vault is deployed and the supply queue is migrated.
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
              <li>— earnAXUSD is deployed and recognized as an Euler Earn vault</li>
              <li>— Public live yield is not yet active</li>
              <li>— Vault is visible in the Axiom Protocol interface for integration and testing</li>
            </ul>
          </div>

          <div className="border-t border-dl-border pt-4">
            <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-widest mb-2">
              What Works Today
            </p>
            <ul className="space-y-1 text-sm text-dl-gray">
              <li>— Wallet connection and on-chain balance reads</li>
              <li>— Vault visibility and identity verification</li>
              <li>— Read-only on-chain vault data (totalAssets, share price, maxDeposit)</li>
              <li>— Controlled integration testing (deposits require feature flag)</li>
            </ul>
          </div>

          <div className="border-t border-dl-border pt-4">
            <p className="font-dl-mono text-xs text-dl-navy uppercase tracking-widest mb-2">
              What Is Still Pending
            </p>
            <ul className="space-y-1 text-sm text-dl-gray">
              <li>— Euler governance registration of required oracle adapters</li>
              <li>— Canonical EVK vault deployment and perspective-verification</li>
              <li>— Strategy queue migration from legacy to canonical EVK vault</li>
              <li>— Ownership transfer to the AXIOM Risk Council Safe</li>
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
