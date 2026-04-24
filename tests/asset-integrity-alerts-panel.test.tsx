// @vitest-environment jsdom
/**
 * Tests for the operator-dashboard "Asset integrity alerts" panel.
 *
 * Covers the contract documented on Task #234:
 *   - Empty state copy when no unread alerts exist
 *   - Each alert row exposes symbol, kind label, rationale, age, an
 *     "Open asset" link to the cap-infra console filtered by symbol,
 *     and a "Mark read" button
 *   - Mark-read posts to the cookie-auth wrapper endpoint and removes
 *     the row from the list on success
 *   - Mark-read surfaces a visible error when the endpoint fails
 *   - The shaping helper drops malformed (assetId-less) rows
 *
 * Also pins the `formatAge` and `buildAssetLink` helpers since both
 * are part of the panel's documented behaviour.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const {
  AssetIntegrityAlertsPanel,
  formatAge,
  buildAssetLink,
} = await import('../components/operator/AssetIntegrityAlertsPanel');

const { shapeIntegrityAlert } = await import(
  '../lib/capinfra/risk/integrityAlerts'
);

const NOW_MS = new Date('2026-04-24T12:00:00.000Z').getTime();

interface AlertOverrides {
  id?: string;
  assetId?: string;
  symbol?: string | null;
  kind?:
    | 'oracle_stale'
    | 'reserve_attestation_failed'
    | 'redemption_failed'
    | 'issuer_event'
    | 'bridge_event'
    | 'unknown';
  rationale?: string;
  subject?: string;
  ageMs?: number;
}

function makeAlert(overrides: AlertOverrides = {}) {
  const ageMs = overrides.ageMs ?? 60_000;
  // Note: use `in` rather than `??` for symbol so passing `null`
  // explicitly is preserved (the `null` case is exactly what the
  // "fallback to assetId" test exercises).
  const symbol = 'symbol' in overrides ? overrides.symbol ?? null : 'AXAU';
  return {
    id: overrides.id ?? 'ntf_test_1',
    assetId: overrides.assetId ?? 'asset_axau_1',
    symbol,
    kind: overrides.kind ?? 'oracle_stale',
    rationale:
      overrides.rationale ??
      '[2026-04-24T11:59:00.000Z] Oracle staleness exceeded budget: feed quiet 900s',
    subject: overrides.subject ?? '[op] Asset auto-frozen to RED: AXAU (oracle_stale)',
    createdAtMs: NOW_MS - ageMs,
  };
}

const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = ORIGINAL_FETCH;
  vi.restoreAllMocks();
});

describe('AssetIntegrityAlertsPanel — empty state', () => {
  it('shows the documented empty copy when alerts is empty', () => {
    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);
    expect(screen.getByText('No active asset integrity alerts.')).toBeTruthy();
    expect(screen.queryByTestId('asset-integrity-alerts-list')).toBeNull();
  });
});

describe('AssetIntegrityAlertsPanel — row rendering', () => {
  it('renders symbol, kind label, rationale, age and a working asset link', () => {
    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({
            id: 'ntf_oracle_1',
            symbol: 'AXAU',
            assetId: 'asset_axau_1',
            kind: 'oracle_stale',
            rationale: 'Oracle staleness exceeded budget: feed quiet 900s',
            ageMs: 5 * 60_000,
          }),
        ]}
        nowMs={NOW_MS}
      />,
    );

    expect(screen.getByText('AXAU')).toBeTruthy();
    expect(screen.getByText('Oracle stale')).toBeTruthy();
    expect(
      screen.getByText('Oracle staleness exceeded budget: feed quiet 900s'),
    ).toBeTruthy();
    expect(screen.getByText('5m ago')).toBeTruthy();

    const jump = screen.getByTestId(
      'asset-integrity-alert-ntf_oracle_1-jump',
    ) as HTMLAnchorElement;
    expect(jump.getAttribute('href')).toBe('/operations/cap-infra?symbol=AXAU');
  });

  it('falls back to assetId in the link when symbol is null', () => {
    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({
            id: 'ntf_no_sym',
            symbol: null,
            assetId: 'asset_xyz_42',
          }),
        ]}
        nowMs={NOW_MS}
      />,
    );
    const jump = screen.getByTestId(
      'asset-integrity-alert-ntf_no_sym-jump',
    ) as HTMLAnchorElement;
    expect(jump.getAttribute('href')).toBe(
      '/operations/cap-infra?symbol=asset_xyz_42',
    );
  });

  it('renders one row per alert in the order received', () => {
    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({ id: 'ntf_a', symbol: 'AXAU', ageMs: 30_000 }),
          makeAlert({ id: 'ntf_b', symbol: 'AXAG', ageMs: 2 * 60 * 60_000 }),
        ]}
        nowMs={NOW_MS}
      />,
    );
    const rows = screen.getAllByTestId(/^asset-integrity-alert-ntf_[ab]$/);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('AXAU');
    expect(rows[1].textContent).toContain('AXAG');
    expect(rows[1].textContent).toContain('2h ago');
  });
});

describe('AssetIntegrityAlertsPanel — mark read', () => {
  it('POSTs to the cookie-auth endpoint and removes the row on success', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ notification: { id: 'ntf_x' } }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({ id: 'ntf_x', symbol: 'AXAU' }),
          makeAlert({ id: 'ntf_y', symbol: 'AXAG' }),
        ]}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alert-ntf_x-mark-read'),
    );

    await waitFor(() => {
      expect(screen.queryByTestId('asset-integrity-alert-ntf_x')).toBeNull();
    });
    // The other row is unaffected.
    expect(screen.getByTestId('asset-integrity-alert-ntf_y')).toBeTruthy();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe(
      '/api/capinfra/operator/notifications/ntf_x/read',
    );
    expect(calledInit.method).toBe('POST');
  });

  it('keeps the row and shows an error banner when the endpoint fails', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AssetIntegrityAlertsPanel
        alerts={[makeAlert({ id: 'ntf_fail', symbol: 'AXAU' })]}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alert-ntf_fail-mark-read'),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/markRead failed/i);
    });
    // Row still present.
    expect(screen.getByTestId('asset-integrity-alert-ntf_fail')).toBeTruthy();
  });
});

describe('formatAge / buildAssetLink helpers', () => {
  it('formats sub-minute, minute, hour and day ages', () => {
    expect(formatAge(0)).toBe('0s ago');
    expect(formatAge(45_000)).toBe('45s ago');
    expect(formatAge(5 * 60_000)).toBe('5m ago');
    expect(formatAge(3 * 60 * 60_000)).toBe('3h ago');
    expect(formatAge(2 * 24 * 60 * 60_000)).toBe('2d ago');
  });

  it('treats negative or NaN ages as "just now"', () => {
    expect(formatAge(-1)).toBe('just now');
    expect(formatAge(Number.NaN)).toBe('just now');
  });

  it('encodes the link target so symbols with special chars stay valid', () => {
    expect(buildAssetLink('A B', 'asset_x')).toBe(
      '/operations/cap-infra?symbol=A%20B',
    );
    expect(buildAssetLink(null, 'asset_x')).toBe(
      '/operations/cap-infra?symbol=asset_x',
    );
  });
});

describe('shapeIntegrityAlert — defensive shaping', () => {
  it('returns null when assetId is missing from bodyJson', () => {
    const view = shapeIntegrityAlert({
      id: 'ntf_bad',
      subject: 'subject',
      bodyJson: { symbol: 'AXAU', kind: 'oracle_stale' },
      createdAt: new Date(NOW_MS),
    });
    expect(view).toBeNull();
  });

  it('coerces unknown kinds to "unknown" and falls back to subject for rationale', () => {
    const view = shapeIntegrityAlert({
      id: 'ntf_ok',
      subject: 'fallback subject',
      bodyJson: { assetId: 'asset_1', kind: 'not_a_real_kind' },
      createdAt: new Date(NOW_MS),
    });
    expect(view).not.toBeNull();
    expect(view?.kind).toBe('unknown');
    expect(view?.rationale).toBe('fallback subject');
    expect(view?.symbol).toBeNull();
    expect(view?.createdAtMs).toBe(NOW_MS);
  });

  it('preserves canonical kind, symbol and rationale when the body is well-formed', () => {
    const view = shapeIntegrityAlert({
      id: 'ntf_full',
      subject: 'subject',
      bodyJson: {
        assetId: 'asset_1',
        symbol: 'AXAU',
        kind: 'reserve_attestation_failed',
        rationale: 'Reserve attestation failed: stale beyond 24h',
        detail: 'unused detail',
      },
      createdAt: new Date(NOW_MS),
    });
    expect(view).toMatchObject({
      id: 'ntf_full',
      assetId: 'asset_1',
      symbol: 'AXAU',
      kind: 'reserve_attestation_failed',
      rationale: 'Reserve attestation failed: stale beyond 24h',
      createdAtMs: NOW_MS,
    });
  });
});
