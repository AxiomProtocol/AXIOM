/**
 * pages/operator/reserve-registry.tsx
 *
 * Phase 2 — AXUSD Reserve Registry Operator Dashboard
 *
 * Shows the full approved reserve asset registry including:
 *   - Live USDC PSM reserves (canonical backing)
 *   - Planned Treasury sleeve (clearly labeled, not counted in coverage)
 *   - Excluded operator treasury assets
 *   - Haircut policy and eligibility flags per asset
 *   - Custody source and attestation status
 *   - Manual review flags
 *
 * All reserve separation invariants are enforced by ReserveManager.
 * This page is read-only — it does not modify reserve state.
 */

import type { GetServerSideProps } from 'next';
import { OperatorConsoleLayout } from '../../components/operator/OperatorConsoleLayout';
import { requireOperatorCookie } from '../../lib/capinfra/operatorAuth';
import { getReserveManagerSummary } from '../../lib/reserves/phase2/reserveManager';
import { getAttestationStatusSummary } from '../../lib/reserves/phase2/reserveManager';
import type {
  ReserveManagerSummary,
  AttestationStatusSummary,
  ApprovedReserveAsset,
  ReserveSleeveAggregate,
} from '../../lib/reserves/phase2/types';

interface Props {
  summary: ReserveManagerSummary;
  attestation: AttestationStatusSummary;
  loadError: string | null;
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const redirect = requireOperatorCookie(ctx);
  if (redirect) return redirect;

  try {
    const [summary, attestation] = await Promise.all([
      getReserveManagerSummary(),
      getAttestationStatusSummary(),
    ]);
    return { props: { summary, attestation, loadError: null } };
  } catch (err) {
    return {
      props: {
        summary: null as unknown as ReserveManagerSummary,
        attestation: null as unknown as AttestationStatusSummary,
        loadError: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function usd(n: number | null) {
  if (n === null) return '—';
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function bps(n: number) {
  return `${n} bps (${(n / 100).toFixed(2)}%)`;
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    LIVE:          'color: #2d6a4f; background: #d8f3dc; border: 1px solid #2d6a4f;',
    PLANNED:       'color: #6b4c1e; background: #fff3cd; border: 1px solid #b88a2f;',
    DISABLED:      'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    DEPRECATED:    'color: #6b7280; background: #f3f4f6; border: 1px solid #6b7280;',
    INTERNAL_ONLY: 'color: #1e3a5f; background: #dbeafe; border: 1px solid #1e3a5f;',
    CURRENT:       'color: #2d6a4f; background: #d8f3dc; border: 1px solid #2d6a4f;',
    NONE:          'color: #6b7280; background: #f3f4f6; border: 1px solid #6b7280;',
    PENDING:       'color: #6b4c1e; background: #fff3cd; border: 1px solid #b88a2f;',
    STALE:         'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    FAILED:        'color: #7f1d1d; background: #fee2e2; border: 1px solid #991b1b;',
    MANUAL_REVIEW: 'color: #6b4c1e; background: #fff3cd; border: 1px solid #b88a2f;',
  };
  const style = colors[status] ?? 'color: #374151; background: #f9fafb;';
  return (
    <span style={{
      ...Object.fromEntries(style.split(';').filter(Boolean).map(s => {
        const [k, v] = s.split(':');
        return [k.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v.trim()];
      })),
      fontFamily: 'monospace',
      fontSize: '10px',
      fontWeight: 700,
      padding: '2px 6px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    }}>
      {status}
    </span>
  );
}

function Flag({ active, label }: { active: boolean; label: string }) {
  return (
    <span style={{
      fontFamily: 'monospace',
      fontSize: '10px',
      color: active ? '#2d6a4f' : '#9ca3af',
      fontWeight: active ? 700 : 400,
    }}>
      {active ? '✓ ' : '✗ '}{label}
    </span>
  );
}

// ── Asset Row ────────────────────────────────────────────────────────────────

function AssetRow({ asset }: { asset: ApprovedReserveAsset }) {
  const isExcluded = !asset.isLive;
  return (
    <tr style={{ background: isExcluded ? '#fafafa' : '#ffffff', opacity: isExcluded ? 0.75 : 1 }}>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}>
          {asset.assetSymbol}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', marginTop: 2 }}>
          {asset.id}
        </div>
      </td>
      <td style={td}><StatusPill status={asset.status} /></td>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>{asset.sleeve}</div>
      </td>
      <td style={{ ...td, textAlign: 'right' }}>
        <div style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {usd(asset.grossValueUsd)}
        </div>
      </td>
      <td style={{ ...td, textAlign: 'right' }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          color: asset.eligibleReserveValueUsd > 0 ? '#2d6a4f' : '#9ca3af',
          fontWeight: asset.eligibleReserveValueUsd > 0 ? 700 : 400,
        }}>
          {usd(asset.eligibleReserveValueUsd)}
        </div>
      </td>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px' }}>
          {bps(asset.haircutPolicy.haircutBps)}
        </div>
        {asset.haircutPolicy.emergencyDisabled && (
          <div style={{ color: '#991b1b', fontSize: '10px', fontWeight: 700 }}>⚠ EMERGENCY DISABLED</div>
        )}
        {asset.haircutPolicy.manualReviewRequired && (
          <div style={{ color: '#b88a2f', fontSize: '10px' }}>⚑ MANUAL REVIEW</div>
        )}
      </td>
      <td style={td}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Flag active={asset.isLive} label="Live" />
          <Flag active={asset.isRedeemable} label="Redeemable" />
          <Flag active={asset.isMintEligible} label="Mint Eligible" />
        </div>
      </td>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#374151' }}>
          {asset.valuationSource}
        </div>
      </td>
      <td style={td}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px' }}>
          <StatusPill status={asset.custody.attestationStatus} />
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', marginTop: 2 }}>
          {asset.custody.custodyVenue}
        </div>
      </td>
      <td style={{ ...td, maxWidth: 220 }}>
        <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', lineHeight: 1.4 }}>
          {asset.adminNotes}
        </div>
      </td>
    </tr>
  );
}

// ── Sleeve Section ────────────────────────────────────────────────────────────

function SleeveSection({ sleeve }: { sleeve: ReserveSleeveAggregate }) {
  const isEligible = sleeve.isEligibleForAxusdBacking;
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid #1e3a5f',
        paddingBottom: 6,
        marginBottom: 12,
      }}>
        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '14px', fontWeight: 700, margin: 0 }}>
          {sleeve.sleeveName}
        </h3>
        <StatusPill status={isEligible ? 'LIVE' : 'INTERNAL_ONLY'} />
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280' }}>
          {sleeve.sleeve}
        </span>
        {!isEligible && (
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#991b1b', fontWeight: 700 }}>
            ⚠ EXCLUDED FROM AXUSD BACKING
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'Gross Value (Live)', value: usd(sleeve.grossValueUsd) },
          { label: 'Eligible Reserve Value', value: usd(sleeve.eligibleReserveValueUsd), highlight: isEligible },
          { label: 'Live Assets', value: String(sleeve.liveAssetCount) },
          { label: 'Planned Assets', value: String(sleeve.plannedAssetCount) },
        ].map(m => (
          <div key={m.label} style={{
            border: '1px solid #ccc',
            padding: '8px 12px',
            background: '#f9fafb',
          }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#6b7280', marginBottom: 4 }}>
              {m.label}
            </div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              fontWeight: 700,
              color: m.highlight ? '#2d6a4f' : '#1e3a5f',
            }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {sleeve.disclosureCaution && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #b88a2f',
          padding: '8px 12px',
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#6b4c1e',
          marginBottom: 12,
        }}>
          ⚑ {sleeve.disclosureCaution}
        </div>
      )}

      {sleeve.assets.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ background: '#1e3a5f' }}>
              {['Asset', 'Status', 'Sleeve', 'Gross Value', 'Eligible Value', 'Haircut', 'Flags', 'Valuation', 'Attestation', 'Notes'].map(h => (
                <th key={h} style={{
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '10px',
                  padding: '6px 8px',
                  textAlign: 'left',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}>
                  {h.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sleeve.assets.map((asset, i) => (
              <AssetRow key={asset.id} asset={asset} />
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#9ca3af', padding: '8px 0' }}>
          No assets registered in this sleeve.
        </div>
      )}
    </div>
  );
}

// ── Shared cell style ────────────────────────────────────────────────────────

const td: React.CSSProperties = {
  padding: '8px',
  borderBottom: '1px solid #e5e7eb',
  verticalAlign: 'top',
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ReserveRegistryPage({ summary, attestation, loadError }: Props) {
  if (loadError) {
    return (
      <OperatorConsoleLayout title="Reserve Registry — Error">
        <div style={{ background: '#fee2e2', border: '1px solid #991b1b', padding: 16, fontFamily: 'monospace' }}>
          <strong>Failed to load reserve registry:</strong> {loadError}
        </div>
      </OperatorConsoleLayout>
    );
  }

  const attSummary = attestation.summary;

  return (
    <OperatorConsoleLayout title="Reserve Registry">
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 64px' }}>

        {/* Header */}
        <div style={{ borderBottom: '2px solid #1e3a5f', marginBottom: 24, paddingBottom: 12 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 700, margin: 0 }}>
            AXUSD Reserve and Collateral Registry
          </h1>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b7280', marginTop: 4 }}>
            Phase 2 — Reserve Asset Registry Architecture · Operator View
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af', marginTop: 2 }}>
            Fetched: {summary.fetchedAt}
          </div>
        </div>

        {/* Warnings */}
        {summary.warnings.length > 0 && (
          <div style={{
            background: '#fffbeb',
            border: '1px solid #b88a2f',
            padding: '10px 14px',
            marginBottom: 24,
          }}>
            {summary.warnings.map((w, i) => (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b4c1e' }}>
                ⚑ {w}
              </div>
            ))}
          </div>
        )}

        {/* Canonical Source Separation Banner */}
        <div style={{
          background: '#f0f4ff',
          border: '1px solid #1e3a5f',
          padding: '12px 16px',
          marginBottom: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          {[
            {
              label: 'CanonicalPSM',
              desc:  'Live USDC mint/redeem backing. Source of truth for AXUSD supply.',
              color: '#2d6a4f',
            },
            {
              label: 'ReserveManager (Phase 2)',
              desc:  'Reserve accounting and asset eligibility layer. Aggregates registry.',
              color: '#1e3a5f',
            },
            {
              label: 'AxiomTreasuryVault',
              desc:  'Internal operator capital management. EXCLUDED from AXUSD backing.',
              color: '#991b1b',
            },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: s.color, fontWeight: 700, marginBottom: 2 }}>
                {s.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#374151' }}>
                {s.desc}
              </div>
            </div>
          ))}
        </div>

        {/* Summary metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 12,
          marginBottom: 32,
        }}>
          {[
            { label: 'Eligible Reserve Value',      value: usd(summary.eligibleReserveValueUsd),   color: '#2d6a4f' },
            { label: 'Canonical PSM Reserve',        value: usd(summary.canonicalPsmReserveUsd),    color: '#2d6a4f' },
            { label: 'Planned (Excluded)',            value: usd(summary.plannedGrossValueUsd),      color: '#b88a2f' },
            { label: 'Operator Treasury (Excluded)',  value: usd(summary.operatorTreasuryValueUsd),  color: '#991b1b' },
            { label: 'Total Registered Assets',       value: String(summary.totalAssetCount),        color: '#1e3a5f' },
            { label: 'Live Assets',                   value: String(summary.liveAssetCount),         color: '#2d6a4f' },
          ].map(m => (
            <div key={m.label} style={{
              border: '1px solid #d1d5db',
              padding: '10px 12px',
              background: '#ffffff',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {m.label}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: m.color }}>
                {m.value}
              </div>
            </div>
          ))}
        </div>

        {/* Attestation summary */}
        <div style={{
          border: '1px solid #d1d5db',
          padding: '12px 16px',
          marginBottom: 32,
          background: '#f9fafb',
        }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, marginBottom: 10 }}>
            Attestation Status Overview
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Current',       value: attSummary.current,      color: '#2d6a4f' },
              { label: 'Pending',       value: attSummary.pending,       color: '#b88a2f' },
              { label: 'Stale',         value: attSummary.stale,         color: '#991b1b' },
              { label: 'Failed',        value: attSummary.failed,        color: '#991b1b' },
              { label: 'Manual Review', value: attSummary.manualReview,  color: '#b88a2f' },
              { label: 'None',          value: attSummary.none,          color: '#9ca3af' },
            ].map(s => (
              <div key={s.label} style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                <span style={{ color: s.color, fontWeight: 700 }}>{s.value}</span>
                {' '}<span style={{ color: '#6b7280' }}>{s.label}</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9ca3af', marginTop: 8 }}>
            Phase 2: attestation infrastructure not yet deployed. All assets show NONE.
            Phase 3 objective: deploy attestation publisher and connect custody proof sources.
          </div>
        </div>

        {/* Methodology */}
        <div style={{
          background: '#f9fafb',
          border: '1px solid #d1d5db',
          padding: '10px 14px',
          marginBottom: 32,
          fontFamily: 'monospace',
          fontSize: '11px',
          color: '#374151',
          lineHeight: 1.6,
        }}>
          <strong>Methodology:</strong> {summary.methodology}
        </div>

        {/* Sleeve sections */}
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 700, marginBottom: 20, borderBottom: '1px solid #d1d5db', paddingBottom: 8 }}>
          Reserve Sleeves
        </h2>
        {summary.sleeves.map(sleeve => (
          <SleeveSection key={sleeve.sleeve} sleeve={sleeve} />
        ))}

        {/* Compliance gap notes */}
        <div style={{
          border: '1px solid #b88a2f',
          background: '#fffbeb',
          padding: '14px 16px',
          marginTop: 32,
        }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, marginBottom: 10 }}>
            Phase 1 Compliance Gaps — Phase 3 Blockers for T-Bill Integration
          </div>
          {[
            {
              module: 'LendingPlatformModule',
              gap: 'Whitelist does not enforce platform restrictions. TOKENIZED_TBILL sleeve cannot rely on on-chain compliance gating alone.',
            },
            {
              module: 'CountryAllowModule',
              gap: 'Treats country code 0 as pass-through. Future T-Bill participants must be verified off-chain until this is fixed.',
            },
            {
              module: 'TransferLimitModule',
              gap: 'Defines institutional tier 3 but does not operationally assign it. Transfer limit controls are not fully operational for T-Bill holders.',
            },
          ].map(c => (
            <div key={c.module} style={{ marginBottom: 8 }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, color: '#1e3a5f' }}>
                {c.module}
              </span>
              {' — '}
              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#6b4c1e' }}>
                {c.gap}
              </span>
            </div>
          ))}
        </div>

        {/* Footer disclaimer */}
        <div style={{
          marginTop: 32,
          borderTop: '1px solid #d1d5db',
          paddingTop: 12,
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#9ca3af',
        }}>
          OPERATOR INTERNAL USE ONLY · Phase 2 Reserve Registry · Not a public investment product ·
          Tokenized Treasury backing is planned infrastructure, not current AXUSD backing ·
          AxiomTreasuryVault AUM is excluded from AXUSD coverage per governance invariant
        </div>
      </div>
    </OperatorConsoleLayout>
  );
}
