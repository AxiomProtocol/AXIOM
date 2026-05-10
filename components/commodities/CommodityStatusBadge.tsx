/**
 * CommodityStatusBadge
 *
 * Normalized status badge for all commodity surfaces.
 * Supports: LIVE, EXTERNAL_SUPPORTED, DEPLOYED_INACTIVE,
 *           NOT_LIVE_NOT_ISSUED, DEFERRED
 *
 * Inline styles only — no Tailwind dependency so this component
 * can be safely rendered in SSR pages and static exports.
 */

import type { CommodityProductStatus } from '../../lib/commodities/registry';

interface BadgeConfig {
  label: string;
  color: string;
  bg: string;
  border: string;
}

const STATUS_CONFIG: Record<CommodityProductStatus, BadgeConfig> = {
  LIVE: {
    label: 'LIVE',
    color: '#2d5a27',
    bg: '#f0f7f0',
    border: '#2d5a27',
  },
  EXTERNAL_SUPPORTED: {
    label: 'EXTERNAL SUPPORTED',
    color: '#1a3a6e',
    bg: '#f0f4fb',
    border: '#1a3a6e',
  },
  DEPLOYED_INACTIVE: {
    label: 'DEPLOYED — INACTIVE',
    color: '#7a6010',
    bg: '#fffbf0',
    border: '#7a6010',
  },
  NOT_LIVE_NOT_ISSUED: {
    label: 'NOT LIVE · NOT ISSUED',
    color: '#8b1a1a',
    bg: '#fff8f8',
    border: '#8b1a1a',
  },
  DEFERRED: {
    label: 'DEFERRED',
    color: '#555',
    bg: '#f5f5f5',
    border: '#999',
  },
};

interface CommodityStatusBadgeProps {
  status: CommodityProductStatus;
  size?: 'sm' | 'md';
}

export function CommodityStatusBadge({ status, size = 'sm' }: CommodityStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DEFERRED;
  const fontSize = size === 'md' ? '12px' : '10px';
  const padding = size === 'md' ? '3px 10px' : '2px 7px';
  return (
    <span
      style={{
        display: 'inline-block',
        padding,
        fontSize,
        fontFamily: 'monospace',
        letterSpacing: '0.05em',
        fontWeight: 600,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        backgroundColor: cfg.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
}
