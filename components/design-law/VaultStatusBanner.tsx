/**
 * VaultStatusBanner
 *
 * Disclosure banner for vault/integration status pages. Renders a bordered
 * notice block appropriate to the current operational state.
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

type VaultStatus =
  | 'bootstrap'
  | 'live'
  | 'configured'
  | 'withdrawn_empty'
  | 'coming_soon'
  | 'formation'
  | 'open_to_eligible_participants'
  | 'controlled'
  | 'planned';

interface VaultStatusBannerProps {
  vaultName: string;
  network: string;
  limitations?: readonly string[];
  launchConditions?: readonly LaunchCondition[];
  status: VaultStatus;
  className?: string;
}

export function VaultStatusBanner({
  vaultName,
  network,
  limitations = [],
  launchConditions = [],
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

  if (status === 'configured') {
    return (
      <div
        className={`border border-dl-navy bg-dl-bg-alt p-6 mb-8 ${className}`}
        role="status"
        aria-label="Vault configured status"
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="font-dl-mono text-xs bg-dl-navy text-white px-2 py-0.5 uppercase tracking-widest">
            Configured
          </span>
          <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">
            Deposits Not Yet Open
          </span>
        </div>
        <p className="text-dl-navy text-sm leading-relaxed mb-4">
          {vaultName} is deployed and configured on {network}. The Euler Earn
          integration that previously underpinned this vault has been withdrawn.
          An Axiom-native earn architecture is in formation. No active yield is
          being generated — deposits remain disabled pending the new
          infrastructure activation.
        </p>
        {limitations.length > 0 && (
          <div className="mb-4">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">
              Current Limitations
            </p>
            <ul className="space-y-1">
              {limitations.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-dl-navy">
                  <span className="font-dl-mono text-dl-navy mt-0.5 shrink-0">—</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {launchConditions.length > 0 && (
          <div className="border-t border-dl-border pt-4">
            <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">
              Activation Conditions
            </p>
            <ul className="space-y-1.5">
              {launchConditions.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  <span className={`font-dl-mono shrink-0 mt-0.5 ${c.done ? 'text-dl-forest' : 'text-dl-gray'}`}>
                    {c.done ? '[x]' : '[ ]'}
                  </span>
                  <span className={c.done ? 'text-dl-forest' : 'text-dl-navy'}>{c.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  if (status === 'withdrawn_empty') {
    return (
      <div
        className={`border border-red-300 bg-dl-bg-alt p-6 mb-8 ${className}`}
        role="alert"
        aria-label="Integration withdrawn"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="font-dl-mono text-xs bg-red-700 text-white px-2 py-0.5 uppercase tracking-widest">
            Withdrawn
          </span>
          <span className="font-dl-mono text-xs text-red-700 uppercase tracking-widest">
            Integration Decommissioned — No Active Position
          </span>
        </div>
        <p className="text-dl-navy text-sm leading-relaxed">
          The {vaultName} integration on {network} has been withdrawn. All
          protocol-controlled positions associated with this integration have
          been exited. Endpoint returns HTTP 410. No user capital was at risk.
        </p>
      </div>
    );
  }

  if (status === 'formation') {
    return (
      <div
        className={`border border-dl-forest bg-dl-bg-alt p-6 mb-8 ${className}`}
        role="status"
        aria-label="In formation"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="font-dl-mono text-xs bg-dl-forest text-white px-2 py-0.5 uppercase tracking-widest">
            Formation
          </span>
          <span className="font-dl-mono text-xs text-dl-forest uppercase tracking-widest">
            Architecture In Progress
          </span>
        </div>
        <p className="text-dl-navy text-sm leading-relaxed">
          {vaultName} on {network} is in the formation phase. Infrastructure
          components are being built and validated. Not yet open for
          participation.
        </p>
      </div>
    );
  }

  if (status === 'open_to_eligible_participants') {
    return (
      <div
        className={`border border-dl-forest bg-dl-bg-alt p-6 mb-8 ${className}`}
        role="status"
        aria-label="Open to eligible participants"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="font-dl-mono text-xs bg-dl-forest text-white px-2 py-0.5 uppercase tracking-widest">
            Open
          </span>
          <span className="font-dl-mono text-xs text-dl-forest uppercase tracking-widest">
            Eligible Participants Only
          </span>
        </div>
        <p className="text-dl-navy text-sm leading-relaxed">
          {vaultName} on {network} is open to credentialed, eligible
          participants. Identity verification and eligibility requirements
          apply. Not available for general public participation.
        </p>
      </div>
    );
  }

  if (status === 'controlled') {
    return (
      <div
        className={`border border-dl-navy bg-dl-bg-alt p-6 mb-8 ${className}`}
        role="status"
        aria-label="Controlled access"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="font-dl-mono text-xs bg-dl-navy text-white px-2 py-0.5 uppercase tracking-widest">
            Controlled
          </span>
          <span className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest">
            Access Gated by Protocol
          </span>
        </div>
        <p className="text-dl-navy text-sm leading-relaxed">
          {vaultName} on {network} operates under controlled access. Mint,
          redemption, or participation requires explicit protocol authorization
          and identity credential verification.
        </p>
      </div>
    );
  }

  if (status === 'coming_soon') {
    return (
      <div
        className={`border border-dl-border bg-dl-bg-alt p-6 mb-8 ${className}`}
        role="status"
        aria-label="Coming soon"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="font-dl-mono text-xs border border-dl-border text-dl-gray px-2 py-0.5 uppercase tracking-widest">
            Coming Soon
          </span>
        </div>
        <p className="text-dl-gray text-sm leading-relaxed">
          {vaultName} on {network} is planned for future deployment. No
          timeline is guaranteed.
        </p>
      </div>
    );
  }

  if (status === 'planned') {
    return (
      <div
        className={`border border-dl-border bg-dl-bg p-6 mb-8 ${className}`}
        role="status"
        aria-label="Planned"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="font-dl-mono text-xs border border-dl-border text-dl-gray px-2 py-0.5 uppercase tracking-widest">
            Planned
          </span>
        </div>
        <p className="text-dl-gray text-sm leading-relaxed">
          {vaultName} on {network} is on the protocol roadmap. Specifications
          may change prior to deployment.
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
      <div className="flex items-center gap-3 mb-4">
        <span className="font-dl-mono text-xs bg-dl-navy text-white px-2 py-0.5 uppercase tracking-widest">
          Bootstrap / Pre-Live
        </span>
        <span className="font-dl-mono text-xs text-dl-gold uppercase tracking-widest">
          Not a live yield product
        </span>
      </div>

      <p className="text-dl-navy text-sm leading-relaxed mb-5">
        {vaultName} is deployed on {network} and recognized by the Euler Earn
        factory perspective, but it is not yet operating as a fully live public
        yield product. At this stage, deposited AXUSD does not earn active
        strategy yield. The current legacy strategy path is capped at zero, and
        the canonical EVK strategy migration is still pending.
      </p>

      {limitations.length > 0 && (
        <div className="mb-5">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">
            Current Limitations
          </p>
          <ul className="space-y-1">
            {limitations.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-dl-navy">
                <span className="font-dl-mono text-dl-gold mt-0.5 shrink-0">—</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-dl-gray text-xs leading-relaxed border-t border-dl-border pt-4 mb-5">
        This vault may be displayed in the Axiom Protocol interface for
        visibility, wallet connection, balance tracking, and controlled testing.
        It should not yet be represented as a live yield-bearing product for
        general public capital deployment.
      </p>

      {launchConditions.length > 0 && (
        <div>
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-widest mb-2">
            Status Targets Before Public Launch
          </p>
          <ul className="space-y-1.5">
            {launchConditions.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm">
                <span className={`font-dl-mono shrink-0 mt-0.5 ${c.done ? 'text-dl-forest' : 'text-dl-gray'}`}>
                  {c.done ? '[x]' : '[ ]'}
                </span>
                <span className={c.done ? 'text-dl-forest' : 'text-dl-navy'}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default VaultStatusBanner;
