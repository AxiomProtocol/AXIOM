/**
 * VaultStatusBanner
 *
 * Prominent Bootstrap / Pre-Live disclosure banner for the earnAXUSD vault
 * page (and any other future bootstrap-state vaults). Renders a bordered
 * notice block with:
 *   - Status heading and summary paragraph
 *   - Current limitations bullet list
 *   - Interface-use guidance sentence
 *   - Pre-launch checklist (checkboxes, status driven by props)
 *
 * Design Law: flat border, navy/gold palette, no rounded corners, no shadows,
 * no emoji in body text, serif headings, monospace data.
 */

import React from 'react';

interface LaunchCondition {
  id: string;
  label: string;
  done: boolean;
}

interface VaultStatusBannerProps {
  vaultName: string;
  network: string;
  limitations: readonly string[];
  launchConditions: readonly LaunchCondition[];
  /** "bootstrap" renders the amber warning style; "live" renders success style */
  status: 'bootstrap' | 'live';
  className?: string;
}

export function VaultStatusBanner({
  vaultName,
  network,
  limitations,
  launchConditions,
  status,
  className = '',
}: VaultStatusBannerProps) {
  if (status === 'live') {
    return (
      <div
        className={`border border-dl-forest bg-dl-bg-alt p-6 mb-8 ${className}`}
        role="status"
        aria-label="Vault live status"
      >
        <p className="font-dl-mono text-xs text-dl-forest uppercase tracking-widest mb-1">
          Vault Status
        </p>
        <p className="font-dl-serif text-lg text-dl-navy">Live</p>
        <p className="text-dl-gray text-sm mt-1">
          {vaultName} is operating as a live yield product on {network}.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`border border-dl-gold bg-dl-bg-alt p-6 mb-8 ${className}`}
      role="alert"
      aria-label="Vault bootstrap / pre-live status"
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-4">
        <span className="font-dl-mono text-xs bg-dl-navy text-white px-2 py-0.5 uppercase tracking-widest">
          Bootstrap / Pre-Live
        </span>
        <span className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest">
          Not a live yield product
        </span>
      </div>

      {/* ── Summary ─────────────────────────────────────────────────────── */}
      <p className="text-dl-navy text-sm leading-relaxed mb-5">
        {vaultName} is deployed on {network} and recognized by the Euler Earn
        factory perspective, but it is not yet operating as a fully live public
        yield product. At this stage, deposited AXUSD does not earn active
        strategy yield. The current legacy strategy path is capped at zero, and
        the canonical EVK strategy migration is still pending.
      </p>

      {/* ── Limitations ─────────────────────────────────────────────────── */}
      <div className="mb-5">
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">
          Current Limitations
        </p>
        <ul className="space-y-1">
          {limitations.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-sm text-dl-navy"
            >
              <span className="font-dl-mono text-dl-gold mt-0.5 shrink-0">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Interface-use guidance ───────────────────────────────────────── */}
      <p className="text-dl-gray text-xs leading-relaxed border-t border-dl-border pt-4 mb-5">
        This vault may be displayed in the Axiom Protocol interface for
        visibility, wallet connection, balance tracking, and controlled testing.
        It should not yet be represented as a live yield-bearing product for
        general public capital deployment.
      </p>

      {/* ── Pre-launch checklist ─────────────────────────────────────────── */}
      <div>
        <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">
          Status Targets Before Public Launch
        </p>
        <ul className="space-y-1.5">
          {launchConditions.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <span
                className={`font-dl-mono shrink-0 mt-0.5 ${
                  c.done ? 'text-dl-forest' : 'text-dl-gray'
                }`}
              >
                {c.done ? '[x]' : '[ ]'}
              </span>
              <span
                className={c.done ? 'text-dl-forest' : 'text-dl-navy'}
              >
                {c.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default VaultStatusBanner;
