/**
 * components/reserve/ReserveHealthBadge.tsx
 *
 * Public-facing reserve health badge and real-time confidence meter for AXUSD.
 *
 * Fetches GET /api/axusd/oracles/oracle-health every 60 seconds.
 * Computes a 0–100 confidence score from oracle source types and health state,
 * mirroring the logic in lib/reserves/phase3/valuationConfidence.ts.
 *
 * Design Law: serif label, monospace data, no border-radius, no box-shadow,
 * no CSS animations. dl-* color tokens applied via inline styles.
 *
 * Usage:
 *   import { ReserveHealthBadge } from '../components/reserve/ReserveHealthBadge';
 *   <ReserveHealthBadge />                 — standard (full strip)
 *   <ReserveHealthBadge compact />         — compact single-row variant
 */

import React, { useState, useEffect, useCallback } from 'react';

// ── Source-type base scores — mirrors valuationConfidence.ts ─────────────────

const SOURCE_BASE_SCORES: Record<string, number> = {
  FIXED_PEG:                  99,
  CHAINLINK:                  92,
  ERC4626_CONVERT_TO_ASSETS:  85,
  ISSUER_NAV_API:             80,
  CUSTODIAN_ATTESTATION:      75,
  MANUAL_OPERATOR_INPUT:      50,
  DEX_TWAP:                   40,
  INTERNAL_ACCOUNTING:        60,
  FALLBACK_COMPOSITE:         65,
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface OracleSourceHealth {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  isActive: boolean;
  isDeprecated: boolean;
  isHealthy: boolean;
  latencyMs: number | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  statusNote: string;
}

interface OracleHealthResponse {
  fetchedAt: string;
  meta: {
    sourceType: string;
    isFallback: boolean;
    isFresh: boolean;
    isStale: boolean;
    plannedAssetsNote: string;
  };
  overallHealth: {
    isHealthy: boolean;
    healthySources: number;
    totalActiveSources: number;
    degradedSources: number;
  };
  sources: OracleSourceHealth[];
}

// ── Score computation ─────────────────────────────────────────────────────────

function computeConfidenceScore(data: OracleHealthResponse): number {
  const activeSources = data.sources.filter(s => s.isActive && !s.isDeprecated);
  const healthySources = activeSources.filter(s => s.isHealthy);

  if (activeSources.length === 0) return 0;
  if (healthySources.length === 0) return 0;

  const baseScore =
    healthySources.reduce((sum, s) => sum + (SOURCE_BASE_SCORES[s.sourceType] ?? 60), 0) /
    healthySources.length;

  // Weight by coverage: ratio of healthy to total active
  const coverageRatio = healthySources.length / activeSources.length;
  const weighted = baseScore * coverageRatio;

  // Apply freshness penalty
  const penalized = data.meta.isStale
    ? weighted - 25
    : !data.meta.isFresh
      ? weighted - 5
      : weighted;

  return Math.max(0, Math.min(100, Math.round(penalized)));
}

type FreshnessLabel = 'FRESH' | 'APPROACHING STALE' | 'STALE' | 'UNAVAILABLE';

function getFreshnessLabel(data: OracleHealthResponse): FreshnessLabel {
  if (data.meta.isStale) return 'STALE';
  if (!data.meta.isFresh) return 'APPROACHING STALE';
  return 'FRESH';
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const T = {
  navy:       '#1e3a5f',
  forest:     '#166534',
  gold:       '#b8860b',
  red:        '#991b1b',
  bg:         '#fafaf8',
  bgAlt:      '#f4f3ef',
  border:     '#d1c9b8',
  borderAlt:  '#e5e0d6',
  muted:      '#6b7280',
  text:       '#1a1a18',
};

function scoreColor(score: number): string {
  if (score >= 90) return T.forest;
  if (score >= 70) return T.gold;
  return T.red;
}

function freshnessColor(label: FreshnessLabel): string {
  if (label === 'FRESH') return T.forest;
  if (label === 'APPROACHING STALE') return T.gold;
  if (label === 'STALE') return T.red;
  return T.muted;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'America/New_York', timeZoneName: 'short',
    });
  } catch {
    return iso;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ReserveHealthBadgeProps {
  compact?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ReserveHealthBadge({ compact = false }: ReserveHealthBadgeProps) {
  const [data, setData]       = useState<OracleHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  const poll = useCallback(async () => {
    try {
      const res = await fetch('/api/axusd/oracles/oracle-health', {
        headers: { 'Cache-Control': 'max-age=60' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: OracleHealthResponse = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setPollCount(c => c + 1);
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, [poll]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        background: T.bgAlt,
        borderBottom: `1px solid ${T.border}`,
        padding: compact ? '8px 16px' : '14px 20px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: T.muted, fontStyle: 'italic' }}>
          Reserve Health
        </span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: T.muted, letterSpacing: '0.1em' }}>
          Polling oracle…
        </span>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div style={{
        background: '#fff8f8',
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${T.red}`,
        padding: compact ? '6px 12px' : '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: T.red }}>Reserve Health</span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: T.red, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Oracle Unreachable — {error ?? 'No data'}
        </span>
      </div>
    );
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const score        = computeConfidenceScore(data);
  const freshness    = getFreshnessLabel(data);
  const scoreCol     = scoreColor(score);
  const freshCol     = freshnessColor(freshness);
  const { overallHealth } = data;

  // ── Compact variant ────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div style={{
        background: T.bg,
        border: `1px solid ${T.border}`,
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
        <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: T.navy, fontWeight: 600 }}>
          Reserve Health
        </span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 13, fontWeight: 700, color: scoreCol }}>
          {score}/100
        </span>
        <span style={{
          fontFamily: '"Courier New", monospace', fontSize: 9, fontWeight: 700,
          color: freshCol, border: `1px solid ${freshCol}`,
          padding: '2px 6px', letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {freshness}
        </span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: T.muted, letterSpacing: '0.08em' }}>
          {overallHealth.healthySources}/{overallHealth.totalActiveSources} sources healthy
        </span>
        <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: T.muted }}>
          {formatTimestamp(data.fetchedAt)}
        </span>
      </div>
    );
  }

  // ── Standard variant ───────────────────────────────────────────────────────
  const barWidth = `${score}%`;

  return (
    <div style={{
      background: T.bg,
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '18px 20px' }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <p style={{
            fontFamily: 'Georgia, serif', fontSize: 13,
            fontWeight: 600, color: T.navy, margin: 0,
          }}>
            Reserve Health
          </p>
          <span style={{
            fontFamily: '"Courier New", monospace',
            fontSize: 9, letterSpacing: '0.14em',
            color: T.muted, textTransform: 'uppercase',
            padding: '2px 6px', border: `1px solid ${T.borderAlt}`,
          }}>
            Live Oracle Confidence
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: '"Courier New", monospace', fontSize: 9, color: T.muted }}>
            Polled {formatTimestamp(data.fetchedAt)} · Auto-refresh 60s
          </span>
        </div>

        {/* Metrics strip */}
        <div style={{
          display: 'flex', gap: 0,
          border: `1px solid ${T.border}`,
          background: T.bgAlt,
        }}>

          {/* Confidence score */}
          <div style={{
            flex: '0 0 auto', padding: '12px 20px',
            borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: T.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              Confidence
            </p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 22, fontWeight: 700, color: scoreCol, margin: 0, lineHeight: 1 }}>
              {score}
              <span style={{ fontSize: 11, color: T.muted, fontWeight: 400 }}>/100</span>
            </p>
          </div>

          {/* Freshness state */}
          <div style={{
            flex: '0 0 auto', padding: '12px 20px',
            borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: T.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              Freshness
            </p>
            <span style={{
              fontFamily: '"Courier New", monospace', fontSize: 11, fontWeight: 700,
              color: freshCol, border: `1px solid ${freshCol}`,
              padding: '3px 8px', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {freshness}
            </span>
          </div>

          {/* Source health */}
          <div style={{
            flex: '0 0 auto', padding: '12px 20px',
            borderRight: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: T.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              Oracle Sources
            </p>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 14, fontWeight: 700, color: overallHealth.isHealthy ? T.forest : T.gold, margin: 0 }}>
              {overallHealth.healthySources}
              <span style={{ fontWeight: 400, color: T.muted, fontSize: 11 }}>/{overallHealth.totalActiveSources}</span>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: 9, color: T.muted, fontWeight: 400, marginLeft: 4 }}>healthy</span>
            </p>
          </div>

          {/* Confidence meter bar */}
          <div style={{
            flex: 1, padding: '12px 20px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6,
          }}>
            <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: T.muted, letterSpacing: '0.14em', textTransform: 'uppercase', margin: 0 }}>
              Confidence Meter
            </p>
            <div style={{
              height: 6, background: T.borderAlt,
              border: `1px solid ${T.border}`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: barWidth,
                background: scoreCol,
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: T.muted }}>0</span>
              <span style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: T.muted }}>100</span>
            </div>
          </div>
        </div>

        {/* Source detail rows (only non-deprecated active sources) */}
        {data.sources.filter(s => s.isActive && !s.isDeprecated).length > 0 && (
          <div style={{ marginTop: 8, border: `1px solid ${T.borderAlt}` }}>
            {data.sources.filter(s => s.isActive && !s.isDeprecated).map((src, i, arr) => (
              <div key={src.sourceId} style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px',
                borderBottom: i < arr.length - 1 ? `1px solid ${T.borderAlt}` : 'none',
                flexWrap: 'wrap',
              }}>
                <span style={{
                  fontFamily: '"Courier New", monospace', fontSize: 9, fontWeight: 700,
                  color: src.isHealthy ? T.forest : T.red,
                  letterSpacing: '0.06em',
                }}>
                  {src.isHealthy ? '●' : '○'}
                </span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 10, color: T.navy, fontWeight: 600 }}>
                  {src.sourceName}
                </span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: T.muted, padding: '1px 5px', border: `1px solid ${T.borderAlt}` }}>
                  {src.sourceType}
                </span>
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: T.muted, flex: 1 }}>
                  {src.statusNote}
                </span>
                {src.latencyMs !== null && (
                  <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, color: T.muted }}>
                    {src.latencyMs}ms
                  </span>
                )}
                <span style={{ fontFamily: '"Courier New", monospace', fontSize: 9, fontWeight: 700, color: SOURCE_BASE_SCORES[src.sourceType] !== undefined ? T.navy : T.muted }}>
                  {src.isHealthy ? (SOURCE_BASE_SCORES[src.sourceType] ?? 60) : '—'}
                  {src.isHealthy && <span style={{ fontWeight: 400, color: T.muted }}> base</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Footnote */}
        <p style={{ fontFamily: '"Courier New", monospace', fontSize: 8, color: T.muted, marginTop: 6, letterSpacing: '0.06em' }}>
          Confidence score is a weighted average of active oracle source base scores. Score reflects current oracle state, not a guarantee of reserve solvency.
          Planned/inactive sleeves (T-bills, Treasury funds) contribute zero to AXUSD reserve backing.
        </p>
      </div>
    </div>
  );
}
