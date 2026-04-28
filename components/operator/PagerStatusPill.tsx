/**
 * PagerStatusPill — compact on-call pager status indicator rendered in the
 * operator console header on every /operator/* page (Task #333).
 *
 * Fetches `GET /api/capinfra/operator/integrity-pager-status` client-side so
 * it never needs to be wired through SSR props. Anonymous / unauthenticated
 * visitors get a 401 from that endpoint, in which case the pill stays hidden.
 *
 * Three visual states (mirrors IntegrityPagerStatusBanner):
 *   - Both configured  → green dot
 *   - One configured   → amber dot
 *   - None configured  → red dot
 *
 * Clicking the pill navigates to /operator/integrity where the full banner
 * and "Send test page" button live.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { IntegrityPagerStatus } from '../../lib/capinfra/notifications/integrityPagerStatus';

type FetchState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'ok'; status: IntegrityPagerStatus };

function tooltipText(status: IntegrityPagerStatus): string {
  if (!status.anyConfigured) {
    return 'Pager NOT configured — set INTEGRITY_ALERT_EMAIL and/or INTEGRITY_ALERT_DISCORD_WEBHOOK. Click to fix.';
  }
  if (status.bothConfigured) {
    return 'Pager: email + discord configured. Click for details.';
  }
  const only = status.email ? 'email' : 'discord';
  const missing = status.email ? 'INTEGRITY_ALERT_DISCORD_WEBHOOK' : 'INTEGRITY_ALERT_EMAIL';
  return `Pager: ${only} only — set ${missing} for redundancy. Click for details.`;
}

type DotColor = 'green' | 'amber' | 'red';

function dotColor(status: IntegrityPagerStatus): DotColor {
  if (!status.anyConfigured) return 'red';
  if (status.bothConfigured) return 'green';
  return 'amber';
}

function labelText(status: IntegrityPagerStatus): string {
  if (!status.anyConfigured) return 'Pager: not configured';
  if (status.bothConfigured) return 'Pager: wired';
  return 'Pager: partial';
}

const DOT_CLASSES: Record<DotColor, string> = {
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-red-600 animate-pulse',
};

const TEXT_CLASSES: Record<DotColor, string> = {
  green: 'text-green-800 dark:text-green-300',
  amber: 'text-amber-800',
  red: 'text-red-700',
};

export function PagerStatusPill() {
  const [state, setState] = useState<FetchState>({ phase: 'idle' });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ phase: 'loading' });
    fetch('/api/capinfra/operator/integrity-pager-status', { credentials: 'same-origin' })
      .then(async (res) => {
        if (!res.ok) {
          if (!cancelled) setState({ phase: 'error' });
          return;
        }
        const data: IntegrityPagerStatus = await res.json();
        if (!cancelled) setState({ phase: 'ok', status: data });
      })
      .catch(() => {
        if (!cancelled) setState({ phase: 'error' });
      });
    return () => { cancelled = true; };
  }, []);

  if (state.phase !== 'ok') return null;

  const { status } = state;
  const color = dotColor(status);
  const tip = tooltipText(status);

  function handleMouseEnter() {
    if (tooltipTimeout.current) clearTimeout(tooltipTimeout.current);
    setTooltipVisible(true);
  }

  function handleMouseLeave() {
    tooltipTimeout.current = setTimeout(() => setTooltipVisible(false), 120);
  }

  return (
    <Link
      href="/operator/integrity"
      className="relative inline-flex items-center gap-1.5 px-2 py-0.5 rounded border font-mono text-xs transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-dl-navy select-none"
      style={{ borderColor: color === 'green' ? '#15803d' : color === 'amber' ? '#b45309' : '#dc2626' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      aria-label={tip}
      data-testid="pager-status-pill"
      data-pager-state={
        !status.anyConfigured ? 'not-configured' : status.bothConfigured ? 'both-configured' : 'partial'
      }
    >
      <span
        className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${DOT_CLASSES[color]}`}
        aria-hidden="true"
      />
      <span className={`hidden sm:inline ${TEXT_CLASSES[color]}`}>{labelText(status)}</span>

      {tooltipVisible && (
        <span
          role="tooltip"
          className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-64 rounded bg-dl-navy text-white text-[11px] leading-snug px-2.5 py-1.5 shadow-lg pointer-events-none"
        >
          {tip}
        </span>
      )}
    </Link>
  );
}
