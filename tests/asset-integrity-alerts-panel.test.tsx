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
  summarizeAlertsForConfirm,
  MARK_ALL_READ_CONFIRM_THRESHOLD,
  formatTestPageRateLimitedMessage,
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
  paged?: {
    channels: string[];
    errors: string[];
    skipped: boolean;
  } | null;
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
    readAtMs: null,
    paged: 'paged' in overrides ? overrides.paged ?? null : null,
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

describe('AssetIntegrityAlertsPanel — mark all read', () => {
  it('does not render the "Mark all read" button when there are no visible alerts', () => {
    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);
    expect(
      screen.queryByTestId('asset-integrity-alerts-mark-all-read'),
    ).toBeNull();
  });

  it('renders the "Mark all read" button when at least one alert is visible', () => {
    render(
      <AssetIntegrityAlertsPanel
        alerts={[makeAlert({ id: 'ntf_a', symbol: 'AXAU' })]}
        nowMs={NOW_MS}
      />,
    );
    expect(
      screen.getByTestId('asset-integrity-alerts-mark-all-read'),
    ).toBeTruthy();
  });

  it('POSTs all visible ids to the batch endpoint and removes every marked row on full success', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        attempted: 2,
        marked: ['ntf_a', 'ntf_b'],
        notFound: [],
        failed: [],
      }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({ id: 'ntf_a', symbol: 'AXAU' }),
          makeAlert({ id: 'ntf_b', symbol: 'AXAG' }),
        ]}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-mark-all-read'),
    );

    await waitFor(() => {
      expect(screen.queryByTestId('asset-integrity-alert-ntf_a')).toBeNull();
      expect(screen.queryByTestId('asset-integrity-alert-ntf_b')).toBeNull();
    });

    // Empty state is now shown, and the success notice is surfaced.
    expect(screen.getByTestId('asset-integrity-alerts-empty')).toBeTruthy();
    expect(
      screen.getByTestId('asset-integrity-alerts-notice').textContent,
    ).toMatch(/Marked 2 of 2 read/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe(
      '/api/capinfra/operator/notifications/mark-read-batch',
    );
    expect(calledInit.method).toBe('POST');
    expect(JSON.parse(calledInit.body as string)).toEqual({
      ids: ['ntf_a', 'ntf_b'],
    });
  });

  it('surfaces partial failures and keeps the unmarked rows visible ("marked X of Y")', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        attempted: 3,
        marked: ['ntf_a'],
        notFound: ['ntf_b'],
        failed: [{ id: 'ntf_c', error: 'boom' }],
      }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({ id: 'ntf_a', symbol: 'AXAU' }),
          makeAlert({ id: 'ntf_b', symbol: 'AXAG' }),
          makeAlert({ id: 'ntf_c', symbol: 'AXPT' }),
        ]}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-mark-all-read'),
    );

    await waitFor(() => {
      expect(screen.queryByTestId('asset-integrity-alert-ntf_a')).toBeNull();
    });

    // The unmarked rows are still visible and the partial-failure
    // banner spells out the count so the operator knows the panel
    // isn't actually clean yet.
    expect(screen.getByTestId('asset-integrity-alert-ntf_b')).toBeTruthy();
    expect(screen.getByTestId('asset-integrity-alert-ntf_c')).toBeTruthy();
    const banner = screen.getByRole('alert');
    expect(banner.textContent).toMatch(/Marked 1 of 3/);
    expect(banner.textContent).toMatch(/2 could not be marked read/);
  });

  it('keeps every row and shows an error banner when the batch endpoint itself fails', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'boom',
      json: async () => ({}),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({ id: 'ntf_a', symbol: 'AXAU' }),
          makeAlert({ id: 'ntf_b', symbol: 'AXAG' }),
        ]}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-mark-all-read'),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(
        /markAllRead failed/i,
      );
    });
    expect(screen.getByTestId('asset-integrity-alert-ntf_a')).toBeTruthy();
    expect(screen.getByTestId('asset-integrity-alert-ntf_b')).toBeTruthy();
  });
});

describe('AssetIntegrityAlertsPanel — mark all read confirmation (task #300)', () => {
  it('skips the confirm dialog and fires the batch immediately when the visible count is at or below the threshold', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        attempted: MARK_ALL_READ_CONFIRM_THRESHOLD,
        marked: Array.from(
          { length: MARK_ALL_READ_CONFIRM_THRESHOLD },
          (_, i) => `ntf_${i}`,
        ),
        notFound: [],
        failed: [],
      }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AssetIntegrityAlertsPanel
        alerts={Array.from(
          { length: MARK_ALL_READ_CONFIRM_THRESHOLD },
          (_, i) => makeAlert({ id: `ntf_${i}`, symbol: `AX${i}` }),
        )}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-mark-all-read'),
    );

    // No confirm dialog appears for the small-batch path.
    expect(screen.queryByTestId('asset-integrity-alerts-confirm')).toBeNull();

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it('opens the confirm dialog (and does NOT fire the batch) when the visible count exceeds the threshold', () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({}),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const count = MARK_ALL_READ_CONFIRM_THRESHOLD + 3;
    render(
      <AssetIntegrityAlertsPanel
        alerts={Array.from({ length: count }, (_, i) =>
          makeAlert({ id: `ntf_${i}`, symbol: `AX${i}` }),
        )}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-mark-all-read'),
    );

    // Dialog visible, fetch NOT called, rows still present.
    const dialog = screen.getByTestId('asset-integrity-alerts-confirm');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toMatch(
      new RegExp(`Mark all ${count} alerts as read\\?`),
    );
    // Summary names the affected symbols + kinds so the operator can
    // sanity-check what they're about to clear.
    const summary = screen.getByTestId(
      'asset-integrity-alerts-confirm-summary',
    );
    expect(summary.textContent).toMatch(/AX0/);
    expect(summary.textContent).toMatch(/Oracle stale/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('asset-integrity-alert-ntf_0')).toBeTruthy();
  });

  it('cancelling the confirm dialog leaves every row in place and fires no fetch', () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({}),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const count = MARK_ALL_READ_CONFIRM_THRESHOLD + 2;
    render(
      <AssetIntegrityAlertsPanel
        alerts={Array.from({ length: count }, (_, i) =>
          makeAlert({ id: `ntf_${i}`, symbol: `AX${i}` }),
        )}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-mark-all-read'),
    );
    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-confirm-cancel'),
    );

    // Dialog is gone, fetch was never called, every row still visible.
    expect(screen.queryByTestId('asset-integrity-alerts-confirm')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    for (let i = 0; i < count; i++) {
      expect(screen.getByTestId(`asset-integrity-alert-ntf_${i}`)).toBeTruthy();
    }
    // The notice/error banners remain unset — the panel is untouched.
    expect(
      screen.queryByTestId('asset-integrity-alerts-notice'),
    ).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('confirming proceeds with the existing batch call and clears the marked rows', async () => {
    const count = MARK_ALL_READ_CONFIRM_THRESHOLD + 2;
    const ids = Array.from({ length: count }, (_, i) => `ntf_${i}`);
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        attempted: count,
        marked: ids,
        notFound: [],
        failed: [],
      }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <AssetIntegrityAlertsPanel
        alerts={ids.map((id, i) => makeAlert({ id, symbol: `AX${i}` }))}
        nowMs={NOW_MS}
      />,
    );

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-mark-all-read'),
    );
    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-confirm-yes'),
    );

    await waitFor(() => {
      // Every previously-visible row has been dismissed and the
      // empty-state copy is rendered.
      expect(screen.getByTestId('asset-integrity-alerts-empty')).toBeTruthy();
    });

    // Dialog dismissed, batch endpoint hit exactly once with all ids.
    expect(screen.queryByTestId('asset-integrity-alerts-confirm')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe(
      '/api/capinfra/operator/notifications/mark-read-batch',
    );
    expect(JSON.parse(calledInit.body as string)).toEqual({ ids });
    expect(
      screen.getByTestId('asset-integrity-alerts-notice').textContent,
    ).toMatch(new RegExp(`Marked ${count} of ${count} read`));
  });
});

describe('summarizeAlertsForConfirm helper (task #300)', () => {
  it('formats short lists as "SYM (Kind label)" joined with commas', () => {
    expect(
      summarizeAlertsForConfirm([
        { symbol: 'AXAU', assetId: 'asset_1', kind: 'oracle_stale' },
        {
          symbol: 'AXAG',
          assetId: 'asset_2',
          kind: 'reserve_attestation_failed',
        },
      ]),
    ).toBe('AXAU (Oracle stale), AXAG (Reserve attestation)');
  });

  it('falls back to assetId when symbol is missing', () => {
    expect(
      summarizeAlertsForConfirm([
        { symbol: null, assetId: 'asset_x', kind: 'redemption_failed' },
      ]),
    ).toBe('asset_x (Redemption)');
  });

  it('truncates beyond maxItems and appends "+N more"', () => {
    const alerts = Array.from({ length: 8 }, (_, i) => ({
      symbol: `AX${i}`,
      assetId: `asset_${i}`,
      kind: 'oracle_stale' as const,
    }));
    const out = summarizeAlertsForConfirm(alerts, 3);
    expect(out).toMatch(/AX0 \(Oracle stale\)/);
    expect(out).toMatch(/AX1 \(Oracle stale\)/);
    expect(out).toMatch(/AX2 \(Oracle stale\)/);
    expect(out).not.toMatch(/AX3/);
    expect(out).toMatch(/\+5 more/);
  });
});

describe('AssetIntegrityAlertsPanel — send test page', () => {
  it('always renders the "Send test page" button (even with zero alerts)', () => {
    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);
    expect(
      screen.getByTestId('asset-integrity-alerts-send-test-page'),
    ).toBeTruthy();
  });

  it('POSTs to the test-page endpoint and surfaces a success notice listing the channels paged', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        result: {
          channelsPaged: ['email', 'discord'],
          errors: [],
          skipped: false,
        },
      }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-send-test-page'),
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('asset-integrity-alerts-notice').textContent,
      ).toMatch(/Test page sent/);
    });
    expect(
      screen.getByTestId('asset-integrity-alerts-notice').textContent,
    ).toMatch(/email/);
    expect(
      screen.getByTestId('asset-integrity-alerts-notice').textContent,
    ).toMatch(/discord/);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl, calledInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(calledUrl).toBe('/api/capinfra/risk/integrity/test-page');
    expect(calledInit.method).toBe('POST');
  });

  it('surfaces a clear "no channels configured" error when the pager skips', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        result: { channelsPaged: [], errors: [], skipped: true },
      }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-send-test-page'),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(
        /no paging channels are configured/i,
      );
    });
    expect(screen.getByRole('alert').textContent).toMatch(
      /INTEGRITY_ALERT_EMAIL/,
    );
  });

  it('surfaces partial channel failures from the pager envelope', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => '',
      json: async () => ({
        result: {
          channelsPaged: ['email'],
          errors: ['discord: HTTP 429: rate limited'],
          skipped: false,
        },
      }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-send-test-page'),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(
        /channel errors/i,
      );
    });
    const banner = screen.getByRole('alert').textContent ?? '';
    expect(banner).toMatch(/discord: HTTP 429/);
    expect(banner).toMatch(/email/);
  });

  it('surfaces an error banner when the endpoint itself fails', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => 'boom',
      json: async () => ({}),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-send-test-page'),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(
        /sendTestPage failed/i,
      );
    });
  });

  it('surfaces a tailored cooldown banner when the endpoint returns 429 (task #302)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => '',
      headers: { get: (_k: string) => '42' },
      json: async () => ({
        error: 'TEST_PAGE_RATE_LIMITED',
        retry_after_seconds: 42,
        message: 'cooldown active',
      }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-send-test-page'),
    );

    await waitFor(() => {
      const banner = screen.getByRole('alert').textContent ?? '';
      expect(banner).toMatch(/rate-limited/i);
    });
    const banner = screen.getByRole('alert').textContent ?? '';
    // The retry hint from the server is what the operator actually
    // needs to see — generic "500 error" wording must not leak.
    expect(banner).toMatch(/42/);
    expect(banner).toMatch(/on-call inbox/i);
    expect(banner).not.toMatch(/sendTestPage failed/i);
    expect(banner).not.toMatch(/429/);
  });

  it('falls back to the Retry-After header when the body has no retry_after_seconds', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 429,
      text: async () => '',
      headers: { get: (k: string) => (k === 'Retry-After' ? '15' : null) },
      json: async () => ({ error: 'TEST_PAGE_RATE_LIMITED' }),
    } as unknown as Response));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);

    fireEvent.click(
      screen.getByTestId('asset-integrity-alerts-send-test-page'),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/rate-limited/i);
    });
    expect(screen.getByRole('alert').textContent).toMatch(/15/);
  });
});

describe('formatTestPageRateLimitedMessage helper (task #302)', () => {
  it('uses the singular "second" form for a 1-second wait', () => {
    expect(formatTestPageRateLimitedMessage(1)).toMatch(/1 second\b/);
  });

  it('uses the plural "seconds" form for >1', () => {
    expect(formatTestPageRateLimitedMessage(60)).toMatch(/60 seconds/);
  });

  it('falls back to 60s when the retry hint is invalid', () => {
    expect(formatTestPageRateLimitedMessage(0)).toMatch(/60 seconds/);
    expect(formatTestPageRateLimitedMessage(-5)).toMatch(/60 seconds/);
    expect(formatTestPageRateLimitedMessage(Number.NaN)).toMatch(/60 seconds/);
  });

  it('mentions the on-call inbox so an operator understands the rationale', () => {
    expect(formatTestPageRateLimitedMessage(30)).toMatch(/on-call inbox/i);
  });

  it('rounds up partial seconds so a sub-second hint never reads "0 seconds"', () => {
    expect(formatTestPageRateLimitedMessage(0.4)).toMatch(/1 second/);
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

describe('AssetIntegrityAlertsPanel — paged-channels indicator (task #258)', () => {
  it('renders nothing when the alert has no paged metadata (legacy rows)', () => {
    render(
      <AssetIntegrityAlertsPanel
        alerts={[makeAlert({ id: 'ntf_legacy', paged: null })]}
        nowMs={NOW_MS}
      />,
    );
    expect(
      screen.queryByTestId('asset-integrity-alert-ntf_legacy-paged'),
    ).toBeNull();
  });

  it('renders successful channels with a ✓ marker', () => {
    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({
            id: 'ntf_ok',
            paged: {
              channels: ['email', 'discord'],
              errors: [],
              skipped: false,
            },
          }),
        ]}
        nowMs={NOW_MS}
      />,
    );
    const block = screen.getByTestId('asset-integrity-alert-ntf_ok-paged');
    expect(block.textContent).toMatch(/Paged:/);
    const emailBadge = screen.getByTestId(
      'asset-integrity-alert-ntf_ok-paged-email',
    );
    expect(emailBadge.textContent).toMatch(/email/);
    expect(emailBadge.textContent).toMatch(/✓/);
    const discordBadge = screen.getByTestId(
      'asset-integrity-alert-ntf_ok-paged-discord',
    );
    expect(discordBadge.textContent).toMatch(/discord/);
    expect(discordBadge.textContent).toMatch(/✓/);
  });

  it('renders failed channels with a ✗ marker AND the reason in parentheses (e.g. 429)', () => {
    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({
            id: 'ntf_partial',
            paged: {
              channels: ['email'],
              errors: ['discord: HTTP 429: rate limited'],
              skipped: false,
            },
          }),
        ]}
        nowMs={NOW_MS}
      />,
    );
    const block = screen.getByTestId(
      'asset-integrity-alert-ntf_partial-paged',
    );
    expect(block.textContent).toMatch(/email/);
    expect(block.textContent).toMatch(/✓/);
    expect(block.textContent).toMatch(/discord/);
    expect(block.textContent).toMatch(/✗/);
    expect(block.textContent).toMatch(/429/);
    const discordBadge = screen.getByTestId(
      'asset-integrity-alert-ntf_partial-paged-discord',
    );
    // The full error message is mirrored into the title attribute so
    // operators can hover to see the long version.
    expect(discordBadge.getAttribute('title')).toMatch(/HTTP 429/);
  });

  it('renders a "not configured" badge when the pager skipped (no channels set)', () => {
    render(
      <AssetIntegrityAlertsPanel
        alerts={[
          makeAlert({
            id: 'ntf_noenv',
            paged: { channels: [], errors: [], skipped: true },
          }),
        ]}
        nowMs={NOW_MS}
      />,
    );
    const skipped = screen.getByTestId(
      'asset-integrity-alert-ntf_noenv-paged-skipped',
    );
    expect(skipped.textContent).toMatch(/not configured/i);
    // No per-channel badges should appear in the skipped state.
    expect(
      screen.queryByTestId('asset-integrity-alert-ntf_noenv-paged-email'),
    ).toBeNull();
  });
});

describe('shapeIntegrityAlertPaging — paging-blob defensive shaping (task #258)', () => {
  it('returns null when the blob is missing', async () => {
    const { shapeIntegrityAlertPaging } = await import(
      '../lib/capinfra/risk/integrityAlerts'
    );
    expect(shapeIntegrityAlertPaging(undefined)).toBeNull();
    expect(shapeIntegrityAlertPaging(null)).toBeNull();
  });

  it('returns null when channels/errors/skipped are all empty/false', async () => {
    const { shapeIntegrityAlertPaging } = await import(
      '../lib/capinfra/risk/integrityAlerts'
    );
    expect(
      shapeIntegrityAlertPaging({ channels: [], errors: [], skipped: false }),
    ).toBeNull();
  });

  it('preserves channels, errors and skipped on a well-formed blob', async () => {
    const { shapeIntegrityAlertPaging } = await import(
      '../lib/capinfra/risk/integrityAlerts'
    );
    expect(
      shapeIntegrityAlertPaging({
        channels: ['email'],
        errors: ['discord: HTTP 429'],
        skipped: false,
      }),
    ).toEqual({
      channels: ['email'],
      errors: ['discord: HTTP 429'],
      skipped: false,
    });
  });

  it('drops non-string entries inside channels and errors arrays', async () => {
    const { shapeIntegrityAlertPaging } = await import(
      '../lib/capinfra/risk/integrityAlerts'
    );
    expect(
      shapeIntegrityAlertPaging({
        channels: ['email', 42, null, 'discord'],
        errors: [{ msg: 'nope' }, 'pager: boom'],
        skipped: false,
      }),
    ).toEqual({
      channels: ['email', 'discord'],
      errors: ['pager: boom'],
      skipped: false,
    });
  });
});

describe('shapeIntegrityAlert — paged round-trip (task #258)', () => {
  it('round-trips the paged blob from bodyJson into the view-model', () => {
    const view = shapeIntegrityAlert({
      id: 'ntf_with_paged',
      subject: 's',
      bodyJson: {
        assetId: 'asset_1',
        symbol: 'AXAU',
        kind: 'oracle_stale',
        rationale: 'Oracle staleness exceeded budget',
        paged: {
          channels: ['email'],
          errors: ['discord: HTTP 429: rate limited'],
          skipped: false,
        },
      },
      createdAt: new Date(NOW_MS),
    });
    expect(view).not.toBeNull();
    expect(view?.paged).toEqual({
      channels: ['email'],
      errors: ['discord: HTTP 429: rate limited'],
      skipped: false,
    });
  });

  it('leaves paged null on legacy bodyJson with no paged field', () => {
    const view = shapeIntegrityAlert({
      id: 'ntf_legacy',
      subject: 's',
      bodyJson: { assetId: 'asset_1', symbol: 'AXAU', kind: 'oracle_stale' },
      createdAt: new Date(NOW_MS),
    });
    expect(view).not.toBeNull();
    expect(view?.paged).toBeNull();
  });

  it('round-trips skipped=true even when channels/errors are empty', () => {
    const view = shapeIntegrityAlert({
      id: 'ntf_noenv',
      subject: 's',
      bodyJson: {
        assetId: 'asset_1',
        paged: { channels: [], errors: [], skipped: true },
      },
      createdAt: new Date(NOW_MS),
    });
    expect(view?.paged).toEqual({ channels: [], errors: [], skipped: true });
  });
});

describe('shapePagedChannelDisplay — error-string parser (task #258)', () => {
  it('emits ok=true rows for successful channels in order', async () => {
    const { shapePagedChannelDisplay } = await import(
      '../components/operator/AssetIntegrityAlertsPanel'
    );
    const out = shapePagedChannelDisplay({
      channels: ['email', 'discord'],
      errors: [],
      skipped: false,
    });
    expect(out).toEqual([
      { channel: 'email', ok: true, reason: null },
      { channel: 'discord', ok: true, reason: null },
    ]);
  });

  it('splits "<channel>: <reason>" error strings on the first colon', async () => {
    const { shapePagedChannelDisplay } = await import(
      '../components/operator/AssetIntegrityAlertsPanel'
    );
    const out = shapePagedChannelDisplay({
      channels: ['email'],
      errors: ['discord: HTTP 429: rate limited'],
      skipped: false,
    });
    expect(out).toEqual([
      { channel: 'email', ok: true, reason: null },
      { channel: 'discord', ok: false, reason: 'HTTP 429: rate limited' },
    ]);
  });

  it('falls back to a generic channel name when the error has no colon', async () => {
    const { shapePagedChannelDisplay } = await import(
      '../components/operator/AssetIntegrityAlertsPanel'
    );
    const out = shapePagedChannelDisplay({
      channels: [],
      errors: ['something blew up'],
      skipped: false,
    });
    expect(out).toEqual([
      { channel: 'channel', ok: false, reason: 'something blew up' },
    ]);
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
