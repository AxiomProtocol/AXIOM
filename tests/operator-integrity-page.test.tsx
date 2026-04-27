// @vitest-environment jsdom
/**
 * Tests for the dedicated /operator/integrity console (Task #255).
 *
 * The dashboard panel only surfaces UNREAD `collateral.integrity_failed`
 * alerts, so once an operator clicks "Mark read" the row vanishes. This
 * page closes that gap by listing both unread and recently-acknowledged
 * rows with a "show acknowledged" toggle that defaults to unread-only.
 *
 * Coverage:
 *  1. listRecentIntegrityAlerts:
 *       - excludes acknowledged rows by default (mirrors the dashboard)
 *       - includes acknowledged rows when includeRead=true
 *       - bounds the window via sinceMs (default 24h)
 *  2. shapeIntegrityAlert: populates `readAtMs` from the row's readAt
 *     and leaves it null when readAt is missing (default for unread).
 *  3. /operator/integrity page:
 *       - default mode shows "unread only" copy + toggle link to ?ack=1
 *       - ack=1 mode shows "unread + acknowledged" copy + toggle back
 *       - acknowledged rows render the "Acknowledged · …" badge
 *       - unread rows render the "Unread" badge
 *       - empty state shows the right copy for each mode
 *  4. The dashboard panel's "All …" link now points at /operator/integrity
 *     (so operators can find acknowledged rows again).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

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

vi.mock('../components/design-law/DesignLawLayout', () => ({
  DesignLawLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// The page module pulls in lib/capinfra/operatorAuth → server/db
// transitively. The test only renders the default export, so stub
// the auth helper and the db chain to keep the import side-effect-free.
vi.mock('../lib/capinfra/operatorAuth', () => ({
  requireOperatorCookie: () => null,
}));

vi.mock('../server/db', () => {
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.select = passthrough;
  chain.from = passthrough;
  chain.where = passthrough;
  chain.orderBy = passthrough;
  chain.limit = async () => [] as unknown[];
  return { db: chain };
});

const {
  shapeIntegrityAlert,
  listRecentIntegrityAlerts,
  parseIntegrityAlertKind,
  INTEGRITY_ALERT_DEFAULT_WINDOW_MS,
  INTEGRITY_ALERT_KINDS,
} = await import('../lib/capinfra/risk/integrityAlerts');

const { default: OperatorIntegrityPage, buildIntegrityHref } = await import(
  '../pages/operator/integrity'
);

const { AssetIntegrityAlertsPanel } = await import(
  '../components/operator/AssetIntegrityAlertsPanel'
);

const NOW_MS = new Date('2026-04-24T12:00:00.000Z').getTime();

interface AlertOverrides {
  id?: string;
  symbol?: string | null;
  ageMs?: number;
  readAtMs?: number | null;
  paged?: {
    channels: string[];
    errors: string[];
    skipped: boolean;
  } | null;
}

function makeAlertView(o: AlertOverrides = {}) {
  const ageMs = o.ageMs ?? 60_000;
  const symbol = 'symbol' in o ? o.symbol ?? null : 'AXAU';
  return {
    id: o.id ?? 'ntf_test_1',
    assetId: 'asset_axau_1',
    symbol,
    kind: 'oracle_stale' as const,
    rationale: 'Oracle staleness exceeded budget: feed quiet 900s',
    subject: '[op] Asset auto-frozen to RED: AXAU (oracle_stale)',
    createdAtMs: NOW_MS - ageMs,
    readAtMs: o.readAtMs === undefined ? null : o.readAtMs,
    paged: o.paged === undefined ? null : o.paged,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('shapeIntegrityAlert — readAtMs', () => {
  it('returns null readAtMs when the row has no readAt (unread)', () => {
    const view = shapeIntegrityAlert({
      id: 'ntf_unread',
      subject: 's',
      bodyJson: { assetId: 'asset_1' },
      createdAt: new Date(NOW_MS),
    });
    expect(view).not.toBeNull();
    expect(view?.readAtMs).toBeNull();
  });

  it('populates readAtMs from row.readAt when acknowledged', () => {
    const readAt = new Date(NOW_MS - 30 * 60_000);
    const view = shapeIntegrityAlert({
      id: 'ntf_ack',
      subject: 's',
      bodyJson: { assetId: 'asset_1' },
      createdAt: new Date(NOW_MS - 60 * 60_000),
      readAt,
    });
    expect(view).not.toBeNull();
    expect(view?.readAtMs).toBe(readAt.getTime());
  });
});

describe('listRecentIntegrityAlerts — DB query shape', () => {
  // Build a mock db that records the where-condition list and returns
  // a fixed row set. Drizzle conditions are opaque objects, but each
  // helper (eq/isNull/gte) returns a tagged shape; we observe the
  // count to detect the includeRead branch (unread adds one extra
  // isNull condition vs. include-all).
  function makeDb(rowCount: number) {
    const calls: { andArgs: unknown[] | null } = { andArgs: null };
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.from = () => chain;
    chain.where = (cond: unknown) => {
      // drizzle `and(...args)` returns an object whose `.queryChunks`
      // / internal shape we don't depend on; the simpler observable
      // is whether `where` was called and with how many sub-args. Our
      // production code calls `and(...conditions)`; record the raw arg
      // for inspection.
      calls.andArgs = [cond];
      return chain;
    };
    chain.orderBy = () => chain;
    chain.limit = async () =>
      Array.from({ length: rowCount }, (_, i) => ({
        id: `ntf_${i}`,
        subject: `s${i}`,
        bodyJson: { assetId: `asset_${i}`, symbol: `SYM${i}` },
        createdAt: new Date(NOW_MS - (i + 1) * 60_000),
        readAt: i === 0 ? new Date(NOW_MS - 30_000) : null,
      }));
    return { db: chain, calls };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  it('returns acknowledged rows when includeRead=true', async () => {
    vi.doMock('../server/db', () => makeDb(3));
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({
      includeRead: true,
      nowMs: NOW_MS,
    });
    expect(out).toHaveLength(3);
    // First row in our fixture has readAt set → readAtMs non-null.
    expect(out[0].readAtMs).not.toBeNull();
    // Subsequent rows are unread.
    expect(out[1].readAtMs).toBeNull();
  });

  it('passes includeRead=false through (unread-only default)', async () => {
    vi.doMock('../server/db', () => makeDb(2));
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    // The fixture rows all share the same shape (we cannot easily
    // assert the SQL filter without parsing drizzle internals); we
    // assert the function returns and does not throw, and that the
    // shaped readAtMs field is preserved end-to-end.
    const out = await mod.listRecentIntegrityAlerts({
      includeRead: false,
      nowMs: NOW_MS,
    });
    expect(out).toHaveLength(2);
    expect(out.every((a) => 'readAtMs' in a)).toBe(true);
  });

  it('exports a 24h default window constant', () => {
    expect(INTEGRITY_ALERT_DEFAULT_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
  });
});

describe('OperatorIntegrityPage — default (unread-only) mode', () => {
  it('renders the "unread only" mode label and a toggle link to ?ack=1', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    expect(screen.getByTestId('operator-integrity-mode').textContent).toMatch(
      /unread only/i,
    );
    const toggle = screen.getByTestId(
      'operator-integrity-toggle',
    ) as HTMLAnchorElement;
    expect(toggle.getAttribute('href')).toBe('/operator/integrity?ack=1');
    expect(toggle.textContent).toMatch(/show acknowledged/i);
    // Empty-state copy nudges the operator toward the toggle.
    expect(
      screen.getByTestId('operator-integrity-empty').textContent,
    ).toMatch(/show acknowledged/i);
    // No filter strip when no filters are active.
    expect(
      screen.queryByTestId('operator-integrity-filter-strip'),
    ).toBeNull();
  });

  it('renders an "Unread" badge for rows with no readAtMs', () => {
    render(
      <OperatorIntegrityPage
        alerts={[makeAlertView({ id: 'ntf_a' })]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    const row = screen.getByTestId('operator-integrity-row-ntf_a');
    expect(within(row).getByTestId('operator-integrity-row-ntf_a-unread'))
      .toBeTruthy();
    expect(
      within(row).queryByTestId('operator-integrity-row-ntf_a-acknowledged'),
    ).toBeNull();
    // Asset link uses the symbol (preferred) and goes to cap-infra.
    const jump = within(row).getByTestId(
      'operator-integrity-row-ntf_a-jump',
    ) as HTMLAnchorElement;
    expect(jump.getAttribute('href')).toBe(
      '/operations/cap-infra?symbol=AXAU',
    );
  });
});

describe('OperatorIntegrityPage — show-acknowledged mode', () => {
  it('renders the "unread + acknowledged" mode label and a toggle back to default', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={true}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    expect(screen.getByTestId('operator-integrity-mode').textContent).toMatch(
      /unread \+ acknowledged/i,
    );
    const toggle = screen.getByTestId(
      'operator-integrity-toggle',
    ) as HTMLAnchorElement;
    expect(toggle.getAttribute('href')).toBe('/operator/integrity');
    expect(toggle.textContent).toMatch(/hide acknowledged/i);
  });

  it('renders an "Acknowledged" badge for rows with a readAtMs', () => {
    render(
      <OperatorIntegrityPage
        alerts={[
          makeAlertView({
            id: 'ntf_ack',
            ageMs: 90 * 60_000,
            readAtMs: NOW_MS - 5 * 60_000,
          }),
          makeAlertView({ id: 'ntf_unread' }),
        ]}
        showAcknowledged={true}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    const ackRow = screen.getByTestId('operator-integrity-row-ntf_ack');
    const ackBadge = within(ackRow).getByTestId(
      'operator-integrity-row-ntf_ack-acknowledged',
    );
    expect(ackBadge.textContent).toMatch(/acknowledged/i);
    expect(ackBadge.textContent).toMatch(/5m ago/);

    const unreadRow = screen.getByTestId('operator-integrity-row-ntf_unread');
    expect(
      within(unreadRow).getByTestId(
        'operator-integrity-row-ntf_unread-unread',
      ),
    ).toBeTruthy();
  });

  it('shows the bounded-window empty copy when nothing is in the last 24h', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={true}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    expect(
      screen.getByTestId('operator-integrity-empty').textContent,
    ).toMatch(/no integrity alerts in the last 24h/i);
  });
});

describe('OperatorIntegrityPage — load error', () => {
  it('renders the operational notice when loadError is non-null', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={false}
        windowHours={24}
        loadError="db unreachable"
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    expect(screen.getByText(/operational notice/i)).toBeTruthy();
    expect(screen.getByText(/db unreachable/)).toBeTruthy();
  });
});

describe('AssetIntegrityAlertsPanel — link points at /operator/integrity', () => {
  it('replaces the old "All notifications →" link with the integrity console', () => {
    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);
    const link = screen.getByTestId(
      'asset-integrity-alerts-all-link',
    ) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/operator/integrity');
    expect(link.textContent).toMatch(/all integrity alerts/i);
  });

  it('exposes a one-click cross-link to /operator/integrity?failed_pages=1', () => {
    // The whole point of the dedicated filter is that an on-call lead
    // can land on the failed-page subset without typing a query
    // string. Pin both the destination and the wording so a future
    // header refactor can't silently break the cross-link.
    render(<AssetIntegrityAlertsPanel alerts={[]} nowMs={NOW_MS} />);
    const link = screen.getByTestId(
      'asset-integrity-alerts-failed-pages-link',
    ) as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/operator/integrity?failed_pages=1');
    expect(link.textContent).toMatch(/didn.+t wake on-call/i);
  });
});

describe('parseIntegrityAlertKind — SSR query-param parsing', () => {
  it('returns null for missing/empty/unknown-shaped strings', () => {
    expect(parseIntegrityAlertKind(undefined)).toBeNull();
    expect(parseIntegrityAlertKind(null)).toBeNull();
    expect(parseIntegrityAlertKind('')).toBeNull();
    expect(parseIntegrityAlertKind('   ')).toBeNull();
    expect(parseIntegrityAlertKind('not_a_kind')).toBeNull();
    // Bad values should DROP the filter, not silently coerce to
    // 'unknown' — that would hide every structured row.
    expect(parseIntegrityAlertKind('ORACLE_STALE')).toBeNull();
  });

  it('accepts every structured kind plus the synthetic "unknown" bucket', () => {
    for (const k of INTEGRITY_ALERT_KINDS) {
      expect(parseIntegrityAlertKind(k)).toBe(k);
    }
  });

  it('trims surrounding whitespace before matching', () => {
    expect(parseIntegrityAlertKind(' oracle_stale ')).toBe('oracle_stale');
  });
});

describe('listRecentIntegrityAlerts — symbol/kind filtering', () => {
  // Build a fixture with three rows of mixed symbol/kind so we can
  // pin down filter behaviour without depending on drizzle internals.
  function makeFilterDb() {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.from = () => chain;
    chain.where = () => chain;
    chain.orderBy = () => chain;
    chain.limit = async () => [
      {
        id: 'ntf_axau_oracle',
        subject: 's',
        bodyJson: {
          assetId: 'asset_axau',
          symbol: 'AXAU',
          kind: 'oracle_stale',
        },
        createdAt: new Date(NOW_MS - 60_000),
        readAt: null,
      },
      {
        id: 'ntf_axau_reserve',
        subject: 's',
        bodyJson: {
          assetId: 'asset_axau',
          symbol: 'AXAU',
          kind: 'reserve_attestation_failed',
        },
        createdAt: new Date(NOW_MS - 120_000),
        readAt: null,
      },
      {
        id: 'ntf_axag_oracle',
        subject: 's',
        bodyJson: {
          assetId: 'asset_axag',
          symbol: 'AXAG',
          kind: 'oracle_stale',
        },
        createdAt: new Date(NOW_MS - 180_000),
        readAt: null,
      },
      {
        id: 'ntf_nosymbol',
        subject: 's',
        bodyJson: {
          assetId: 'asset_orphan',
          // symbol intentionally missing — symbol filter must drop
          // these rows rather than match them by accident.
          kind: 'oracle_stale',
        },
        createdAt: new Date(NOW_MS - 240_000),
        readAt: null,
      },
    ];
    return { db: chain };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  it('returns every row when no filters are passed', async () => {
    vi.doMock('../server/db', () => makeFilterDb());
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({ nowMs: NOW_MS });
    expect(out.map((a) => a.id)).toEqual([
      'ntf_axau_oracle',
      'ntf_axau_reserve',
      'ntf_axag_oracle',
      'ntf_nosymbol',
    ]);
  });

  it('filters by symbol (case-insensitive, drops null-symbol rows)', async () => {
    vi.doMock('../server/db', () => makeFilterDb());
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({
      nowMs: NOW_MS,
      symbol: 'axau',
    });
    expect(out.map((a) => a.id)).toEqual([
      'ntf_axau_oracle',
      'ntf_axau_reserve',
    ]);
  });

  it('filters by kind across all symbols', async () => {
    vi.doMock('../server/db', () => makeFilterDb());
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({
      nowMs: NOW_MS,
      kind: 'oracle_stale',
    });
    expect(out.map((a) => a.id)).toEqual([
      'ntf_axau_oracle',
      'ntf_axag_oracle',
      'ntf_nosymbol',
    ]);
  });

  it('combines symbol and kind filters as AND', async () => {
    vi.doMock('../server/db', () => makeFilterDb());
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({
      nowMs: NOW_MS,
      symbol: 'AXAU',
      kind: 'reserve_attestation_failed',
    });
    expect(out.map((a) => a.id)).toEqual(['ntf_axau_reserve']);
  });

  it('treats blank/whitespace-only symbol filter as "no filter"', async () => {
    vi.doMock('../server/db', () => makeFilterDb());
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({
      nowMs: NOW_MS,
      symbol: '   ',
    });
    expect(out).toHaveLength(4);
  });
});

describe('listRecentIntegrityAlerts — failedPages filter', () => {
  // Build a fixture covering every paging shape the filter has to
  // discriminate: a clean success (paged but no errors and not
  // skipped — must drop), an errors-non-empty row (must keep), a
  // skipped row (must keep), and a legacy null-paged row (must drop
  // — we cannot retroactively tell whether on-call was woken).
  function makePagingDb() {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.from = () => chain;
    chain.where = () => chain;
    chain.orderBy = () => chain;
    chain.limit = async () => [
      {
        id: 'ntf_clean',
        subject: 's',
        bodyJson: {
          assetId: 'asset_a',
          symbol: 'AXAU',
          kind: 'oracle_stale',
          paged: { channels: ['email', 'discord'], errors: [], skipped: false },
        },
        createdAt: new Date(NOW_MS - 60_000),
        readAt: null,
      },
      {
        id: 'ntf_errors',
        subject: 's',
        bodyJson: {
          assetId: 'asset_b',
          symbol: 'AXAG',
          kind: 'oracle_stale',
          paged: {
            channels: ['email'],
            errors: ['discord: HTTP 429: rate limited'],
            skipped: false,
          },
        },
        createdAt: new Date(NOW_MS - 120_000),
        readAt: null,
      },
      {
        id: 'ntf_skipped',
        subject: 's',
        bodyJson: {
          assetId: 'asset_c',
          symbol: 'AXPT',
          kind: 'reserve_attestation_failed',
          paged: { channels: [], errors: [], skipped: true },
        },
        createdAt: new Date(NOW_MS - 180_000),
        readAt: null,
      },
      {
        id: 'ntf_legacy_null',
        subject: 's',
        bodyJson: {
          assetId: 'asset_d',
          symbol: 'AXPD',
          kind: 'oracle_stale',
          // No `paged` blob — pre-task #258 row.
        },
        createdAt: new Date(NOW_MS - 240_000),
        readAt: null,
      },
    ];
    return { db: chain };
  }

  beforeEach(() => {
    vi.resetModules();
  });

  it('returns every row when failedPages is unset', async () => {
    vi.doMock('../server/db', () => makePagingDb());
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({ nowMs: NOW_MS });
    expect(out.map((a) => a.id)).toEqual([
      'ntf_clean',
      'ntf_errors',
      'ntf_skipped',
      'ntf_legacy_null',
    ]);
  });

  it('keeps only rows whose paging failed or was skipped when failedPages=true', async () => {
    vi.doMock('../server/db', () => makePagingDb());
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({
      nowMs: NOW_MS,
      failedPages: true,
    });
    // Clean row + legacy null-paged row are excluded; errors and
    // skipped rows are kept (these are the ones that needed a human
    // and didn't get one).
    expect(out.map((a) => a.id)).toEqual(['ntf_errors', 'ntf_skipped']);
  });

  it('combines failedPages with symbol/kind as AND', async () => {
    vi.doMock('../server/db', () => makePagingDb());
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    const out = await mod.listRecentIntegrityAlerts({
      nowMs: NOW_MS,
      failedPages: true,
      kind: 'oracle_stale',
    });
    // Of the failed/skipped rows, only ntf_errors is oracle_stale.
    expect(out.map((a) => a.id)).toEqual(['ntf_errors']);
  });
});

describe('isPagingFailedOrSkipped — predicate', () => {
  it('returns false for legacy null paging blobs', async () => {
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    expect(mod.isPagingFailedOrSkipped(null)).toBe(false);
  });

  it('returns false for healthy paging (channels paged, no errors)', async () => {
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    expect(
      mod.isPagingFailedOrSkipped({
        channels: ['email'],
        errors: [],
        skipped: false,
      }),
    ).toBe(false);
  });

  it('returns true when any errors are present', async () => {
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    expect(
      mod.isPagingFailedOrSkipped({
        channels: ['email'],
        errors: ['discord: HTTP 429: rate limited'],
        skipped: false,
      }),
    ).toBe(true);
  });

  it('returns true when skipped (no channels configured)', async () => {
    const mod = await import('../lib/capinfra/risk/integrityAlerts');
    expect(
      mod.isPagingFailedOrSkipped({
        channels: [],
        errors: [],
        skipped: true,
      }),
    ).toBe(true);
  });
});

describe('buildIntegrityHref — URL builder', () => {
  it('returns the bare path when no params are set', () => {
    expect(buildIntegrityHref({})).toBe('/operator/integrity');
  });

  it('preserves ack + symbol + kind together', () => {
    expect(
      buildIntegrityHref({ ack: true, symbol: 'AXAU', kind: 'oracle_stale' }),
    ).toBe('/operator/integrity?ack=1&symbol=AXAU&kind=oracle_stale');
  });

  it('drops keys passed as null (per-filter clear)', () => {
    expect(
      buildIntegrityHref({ ack: true, symbol: null, kind: 'oracle_stale' }),
    ).toBe('/operator/integrity?ack=1&kind=oracle_stale');
  });

  it('serialises failedPages as ?failed_pages=1 alongside other filters', () => {
    expect(buildIntegrityHref({ failedPages: true })).toBe(
      '/operator/integrity?failed_pages=1',
    );
    expect(
      buildIntegrityHref({
        ack: true,
        symbol: 'AXAU',
        kind: 'oracle_stale',
        failedPages: true,
      }),
    ).toBe(
      '/operator/integrity?ack=1&symbol=AXAU&kind=oracle_stale&failed_pages=1',
    );
    // Falsy = drop the key (per-toggle clear).
    expect(
      buildIntegrityHref({ ack: true, failedPages: false }),
    ).toBe('/operator/integrity?ack=1');
  });
});

describe('OperatorIntegrityPage — filter strip', () => {
  it('hides the strip and renders the unfiltered empty copy when no filters are set', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    expect(
      screen.queryByTestId('operator-integrity-filter-strip'),
    ).toBeNull();
  });

  it('renders symbol + kind chips with per-filter clears and a Clear filters link', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter="AXAU"
        kindFilter="oracle_stale"
      />,
    );
    const strip = screen.getByTestId('operator-integrity-filter-strip');
    const symChip = within(strip).getByTestId(
      'operator-integrity-filter-symbol',
    );
    expect(symChip.textContent).toMatch(/AXAU/);
    const kindChip = within(strip).getByTestId(
      'operator-integrity-filter-kind',
    );
    // KIND_LABEL maps oracle_stale → "Oracle stale"
    expect(kindChip.textContent).toMatch(/Oracle stale/);

    // Per-chip clear links drop only that key but preserve the other.
    const clearSym = within(strip).getByTestId(
      'operator-integrity-filter-symbol-clear',
    ) as HTMLAnchorElement;
    expect(clearSym.getAttribute('href')).toBe(
      '/operator/integrity?kind=oracle_stale',
    );
    const clearKind = within(strip).getByTestId(
      'operator-integrity-filter-kind-clear',
    ) as HTMLAnchorElement;
    expect(clearKind.getAttribute('href')).toBe(
      '/operator/integrity?symbol=AXAU',
    );

    // Clear-all link drops both filters but keeps ack=… off (default
    // mode in this test) — i.e. lands on the bare console.
    const clearAll = within(strip).getByTestId(
      'operator-integrity-filter-clear-all',
    ) as HTMLAnchorElement;
    expect(clearAll.getAttribute('href')).toBe('/operator/integrity');

    // Empty-state copy switches to the filter-aware variant.
    expect(
      screen.getByTestId('operator-integrity-empty').textContent,
    ).toMatch(/matching the current filters/i);
  });

  it('preserves the ack=1 mode across filter clears and the toggle link', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={true}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter="AXAU"
        kindFilter={null}
      />,
    );
    // Toggle (currently "Hide acknowledged") drops ack but keeps symbol.
    const toggle = screen.getByTestId(
      'operator-integrity-toggle',
    ) as HTMLAnchorElement;
    expect(toggle.getAttribute('href')).toBe(
      '/operator/integrity?symbol=AXAU',
    );
    // Per-symbol clear keeps ack=1 since we're still in ack mode.
    const clearSym = screen.getByTestId(
      'operator-integrity-filter-symbol-clear',
    ) as HTMLAnchorElement;
    expect(clearSym.getAttribute('href')).toBe('/operator/integrity?ack=1');
    // Clear-all keeps ack=1 too.
    const clearAll = screen.getByTestId(
      'operator-integrity-filter-clear-all',
    ) as HTMLAnchorElement;
    expect(clearAll.getAttribute('href')).toBe('/operator/integrity?ack=1');
  });

  it('SSR getServerSideProps maps ?symbol/?kind/?ack into props and forwards filters to the listing helper', async () => {
    // Lock the page boundary: a request with the three query params
    // must (a) parse and uppercase symbol, (b) validate kind, (c)
    // honour ack=1, and (d) forward symbol+kind+includeRead to
    // listRecentIntegrityAlerts.
    vi.resetModules();
    const calls: { args: unknown }[] = [];
    vi.doMock('../lib/capinfra/operatorAuth', () => ({
      requireOperatorCookie: () => null,
    }));
    vi.doMock('../lib/capinfra/risk/integrityAlerts', async () => {
      const actual = await vi.importActual<
        typeof import('../lib/capinfra/risk/integrityAlerts')
      >('../lib/capinfra/risk/integrityAlerts');
      return {
        ...actual,
        listRecentIntegrityAlerts: async (args: unknown) => {
          calls.push({ args });
          return [];
        },
      };
    });
    const mod = await import('../pages/operator/integrity');
    const result = await mod.getServerSideProps({
      query: { symbol: 'axau', kind: 'oracle_stale', ack: '1' },
      req: {} as unknown,
      res: {} as unknown,
      resolvedUrl: '/operator/integrity',
    } as unknown as Parameters<typeof mod.getServerSideProps>[0]);
    expect('props' in result).toBe(true);
    const props = (result as { props: Record<string, unknown> }).props;
    expect(props.symbolFilter).toBe('AXAU');
    expect(props.kindFilter).toBe('oracle_stale');
    expect(props.showAcknowledged).toBe(true);
    expect(props.loadError).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0].args).toMatchObject({
      includeRead: true,
      symbol: 'AXAU',
      kind: 'oracle_stale',
    });
  });

  it('SSR drops invalid kind values rather than coercing to "unknown"', async () => {
    vi.resetModules();
    const calls: { args: { kind?: unknown; symbol?: unknown } }[] = [];
    vi.doMock('../lib/capinfra/operatorAuth', () => ({
      requireOperatorCookie: () => null,
    }));
    vi.doMock('../lib/capinfra/risk/integrityAlerts', async () => {
      const actual = await vi.importActual<
        typeof import('../lib/capinfra/risk/integrityAlerts')
      >('../lib/capinfra/risk/integrityAlerts');
      return {
        ...actual,
        listRecentIntegrityAlerts: async (args: {
          kind?: unknown;
          symbol?: unknown;
        }) => {
          calls.push({ args });
          return [];
        },
      };
    });
    const mod = await import('../pages/operator/integrity');
    const result = await mod.getServerSideProps({
      query: { kind: 'NOT_A_KIND', symbol: '   ' },
      req: {} as unknown,
      res: {} as unknown,
      resolvedUrl: '/operator/integrity',
    } as unknown as Parameters<typeof mod.getServerSideProps>[0]);
    const props = (result as { props: Record<string, unknown> }).props;
    expect(props.kindFilter).toBeNull();
    // Whitespace-only symbol must be dropped, not forwarded as ''.
    expect(props.symbolFilter).toBeNull();
    expect(calls[0].args.kind).toBeUndefined();
    expect(calls[0].args.symbol).toBeUndefined();
  });

  it('only renders the kind chip when symbolFilter is null', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter="reserve_attestation_failed"
      />,
    );
    expect(
      screen.queryByTestId('operator-integrity-filter-symbol'),
    ).toBeNull();
    expect(
      screen.getByTestId('operator-integrity-filter-kind').textContent,
    ).toMatch(/Reserve attestation/);
  });

  it('renders the failed-pages chip with a clear-only link that drops just failed_pages', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={true}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter="AXAU"
        kindFilter={null}
        failedPagesFilter={true}
      />,
    );
    const strip = screen.getByTestId('operator-integrity-filter-strip');
    const chip = within(strip).getByTestId(
      'operator-integrity-filter-failed-pages',
    );
    expect(chip.textContent).toMatch(/failed or skipped/i);

    const clearOnlyFailed = within(strip).getByTestId(
      'operator-integrity-filter-failed-pages-clear',
    ) as HTMLAnchorElement;
    // Per-chip clear preserves ack=1 + the symbol filter and only
    // drops failed_pages — operators iterate filters mid-incident
    // and the previous narrowing should not be discarded by accident.
    expect(clearOnlyFailed.getAttribute('href')).toBe(
      '/operator/integrity?ack=1&symbol=AXAU',
    );
  });

  it('preserves failed_pages across the toggle and per-filter clear links', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter="AXAU"
        kindFilter="oracle_stale"
        failedPagesFilter={true}
      />,
    );
    // ack toggle preserves symbol+kind+failed_pages.
    const toggle = screen.getByTestId(
      'operator-integrity-toggle',
    ) as HTMLAnchorElement;
    expect(toggle.getAttribute('href')).toBe(
      '/operator/integrity?ack=1&symbol=AXAU&kind=oracle_stale&failed_pages=1',
    );
    // Per-symbol clear drops only symbol but keeps kind+failed_pages.
    const clearSym = screen.getByTestId(
      'operator-integrity-filter-symbol-clear',
    ) as HTMLAnchorElement;
    expect(clearSym.getAttribute('href')).toBe(
      '/operator/integrity?kind=oracle_stale&failed_pages=1',
    );
    // Clear-all drops every filter (including failed_pages).
    const clearAll = screen.getByTestId(
      'operator-integrity-filter-clear-all',
    ) as HTMLAnchorElement;
    expect(clearAll.getAttribute('href')).toBe('/operator/integrity');
  });

  it('renders just the failed-pages chip when no other filters are set', () => {
    render(
      <OperatorIntegrityPage
        alerts={[]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
        failedPagesFilter={true}
      />,
    );
    const strip = screen.getByTestId('operator-integrity-filter-strip');
    expect(
      within(strip).queryByTestId('operator-integrity-filter-symbol'),
    ).toBeNull();
    expect(
      within(strip).queryByTestId('operator-integrity-filter-kind'),
    ).toBeNull();
    expect(
      within(strip).getByTestId('operator-integrity-filter-failed-pages'),
    ).toBeTruthy();
    // Filter-aware empty-state copy fires off the failed-pages flag too.
    expect(
      screen.getByTestId('operator-integrity-empty').textContent,
    ).toMatch(/matching the current filters/i);
  });

  it('SSR getServerSideProps maps ?failed_pages=1 into props and forwards failedPages=true', async () => {
    vi.resetModules();
    const calls: { args: { failedPages?: unknown } }[] = [];
    vi.doMock('../lib/capinfra/operatorAuth', () => ({
      requireOperatorCookie: () => null,
    }));
    vi.doMock('../lib/capinfra/risk/integrityAlerts', async () => {
      const actual = await vi.importActual<
        typeof import('../lib/capinfra/risk/integrityAlerts')
      >('../lib/capinfra/risk/integrityAlerts');
      return {
        ...actual,
        listRecentIntegrityAlerts: async (args: { failedPages?: unknown }) => {
          calls.push({ args });
          return [];
        },
      };
    });
    const mod = await import('../pages/operator/integrity');
    const result = await mod.getServerSideProps({
      query: { failed_pages: '1' },
      req: {} as unknown,
      res: {} as unknown,
      resolvedUrl: '/operator/integrity',
    } as unknown as Parameters<typeof mod.getServerSideProps>[0]);
    const props = (result as { props: Record<string, unknown> }).props;
    expect(props.failedPagesFilter).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].args.failedPages).toBe(true);
  });

  it('SSR drops the failed_pages prop when the query param is missing or unrecognised', async () => {
    vi.resetModules();
    const calls: { args: { failedPages?: unknown } }[] = [];
    vi.doMock('../lib/capinfra/operatorAuth', () => ({
      requireOperatorCookie: () => null,
    }));
    vi.doMock('../lib/capinfra/risk/integrityAlerts', async () => {
      const actual = await vi.importActual<
        typeof import('../lib/capinfra/risk/integrityAlerts')
      >('../lib/capinfra/risk/integrityAlerts');
      return {
        ...actual,
        listRecentIntegrityAlerts: async (args: { failedPages?: unknown }) => {
          calls.push({ args });
          return [];
        },
      };
    });
    const mod = await import('../pages/operator/integrity');
    const result = await mod.getServerSideProps({
      query: { failed_pages: 'maybe' },
      req: {} as unknown,
      res: {} as unknown,
      resolvedUrl: '/operator/integrity',
    } as unknown as Parameters<typeof mod.getServerSideProps>[0]);
    const props = (result as { props: Record<string, unknown> }).props;
    expect(props.failedPagesFilter).toBe(false);
    // We forward `undefined` rather than `false` to keep the helper's
    // option default + boolean-strict branch clean.
    expect(calls[0].args.failedPages).toBeUndefined();
  });
});

describe('OperatorIntegrityPage — paged-channels indicator', () => {
  it('renders the paging summary on both unread and acknowledged rows', () => {
    render(
      <OperatorIntegrityPage
        alerts={[
          // Unread row — email succeeded, discord failed with a 429.
          makeAlertView({
            id: 'ntf_unread',
            paged: {
              channels: ['email'],
              errors: ['discord: HTTP 429: rate limited'],
              skipped: false,
            },
          }),
          // Acknowledged row — both channels succeeded.
          makeAlertView({
            id: 'ntf_ack',
            ageMs: 90 * 60_000,
            readAtMs: NOW_MS - 5 * 60_000,
            paged: {
              channels: ['email', 'discord'],
              errors: [],
              skipped: false,
            },
          }),
        ]}
        showAcknowledged={true}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );

    // Unread row: email ✓ + discord ✗ (with reason).
    const unreadRow = screen.getByTestId('operator-integrity-row-ntf_unread');
    expect(
      within(unreadRow).getByTestId('operator-integrity-row-ntf_unread-paged'),
    ).toBeTruthy();
    const unreadEmail = within(unreadRow).getByTestId(
      'operator-integrity-row-ntf_unread-paged-email',
    );
    expect(unreadEmail.textContent).toMatch(/email/);
    expect(unreadEmail.textContent).toMatch(/✓/);
    const unreadDiscord = within(unreadRow).getByTestId(
      'operator-integrity-row-ntf_unread-paged-discord',
    );
    expect(unreadDiscord.textContent).toMatch(/discord/);
    expect(unreadDiscord.textContent).toMatch(/✗/);
    expect(unreadDiscord.textContent).toMatch(/HTTP 429: rate limited/);

    // Acknowledged row: both channels ✓.
    const ackRow = screen.getByTestId('operator-integrity-row-ntf_ack');
    expect(
      within(ackRow).getByTestId('operator-integrity-row-ntf_ack-paged'),
    ).toBeTruthy();
    const ackEmail = within(ackRow).getByTestId(
      'operator-integrity-row-ntf_ack-paged-email',
    );
    expect(ackEmail.textContent).toMatch(/email/);
    expect(ackEmail.textContent).toMatch(/✓/);
    const ackDiscord = within(ackRow).getByTestId(
      'operator-integrity-row-ntf_ack-paged-discord',
    );
    expect(ackDiscord.textContent).toMatch(/discord/);
    expect(ackDiscord.textContent).toMatch(/✓/);
  });

  it('renders a "not configured" badge when the row was skipped (no channels wired)', () => {
    render(
      <OperatorIntegrityPage
        alerts={[
          makeAlertView({
            id: 'ntf_skipped',
            paged: { channels: [], errors: [], skipped: true },
          }),
        ]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    const row = screen.getByTestId('operator-integrity-row-ntf_skipped');
    const skipped = within(row).getByTestId(
      'operator-integrity-row-ntf_skipped-paged-skipped',
    );
    expect(skipped.textContent).toMatch(/not configured/i);
  });

  it('omits the paging summary on legacy rows where paged is null', () => {
    render(
      <OperatorIntegrityPage
        alerts={[makeAlertView({ id: 'ntf_legacy' })]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    const row = screen.getByTestId('operator-integrity-row-ntf_legacy');
    expect(
      within(row).queryByTestId('operator-integrity-row-ntf_legacy-paged'),
    ).toBeNull();
  });
});

describe('OperatorIntegrityPage — truncation notice', () => {
  it('hides the notice when truncated is false (default)', () => {
    render(
      <OperatorIntegrityPage
        alerts={[makeAlertView({ id: 'ntf_a' })]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
        truncated={false}
      />,
    );
    expect(
      screen.queryByTestId('operator-integrity-truncation-notice'),
    ).toBeNull();
  });

  it('hides the notice when truncated is not supplied (legacy fixtures)', () => {
    render(
      <OperatorIntegrityPage
        alerts={[makeAlertView({ id: 'ntf_b' })]}
        showAcknowledged={false}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
      />,
    );
    expect(
      screen.queryByTestId('operator-integrity-truncation-notice'),
    ).toBeNull();
  });

  it('renders a visible truncation notice when truncated is true', () => {
    const count = 200;
    const alerts = Array.from({ length: count }, (_, i) =>
      makeAlertView({ id: `ntf_trunc_${i}` }),
    );
    render(
      <OperatorIntegrityPage
        alerts={alerts}
        showAcknowledged={true}
        windowHours={24}
        loadError={null}
        generatedAtMs={NOW_MS}
        symbolFilter={null}
        kindFilter={null}
        truncated={true}
      />,
    );
    const notice = screen.getByTestId('operator-integrity-truncation-notice');
    expect(notice.textContent).toMatch(/200/);
    expect(notice.textContent).toMatch(/200\+/);
    expect(notice.textContent).toMatch(/24h/);
    expect(notice.textContent).toMatch(/narrow the window or add a filter/i);
  });

  it('SSR sets truncated=true when listRecentIntegrityAlerts returns 200 rows', async () => {
    vi.resetModules();
    vi.doMock('../lib/capinfra/operatorAuth', () => ({
      requireOperatorCookie: () => null,
    }));
    vi.doMock('../lib/capinfra/risk/integrityAlerts', async () => {
      const actual = await vi.importActual<
        typeof import('../lib/capinfra/risk/integrityAlerts')
      >('../lib/capinfra/risk/integrityAlerts');
      return {
        ...actual,
        listRecentIntegrityAlerts: async () =>
          Array.from({ length: 200 }, (_, i) =>
            makeAlertView({ id: `ntf_ssr_${i}` }),
          ),
      };
    });
    const mod = await import('../pages/operator/integrity');
    const result = await mod.getServerSideProps({
      query: {},
      req: {} as unknown,
      res: {} as unknown,
      resolvedUrl: '/operator/integrity',
    } as unknown as Parameters<typeof mod.getServerSideProps>[0]);
    expect('props' in result).toBe(true);
    const props = (result as { props: Record<string, unknown> }).props;
    expect(props.truncated).toBe(true);
  });

  it('SSR sets truncated=false when listRecentIntegrityAlerts returns fewer than 200 rows', async () => {
    vi.resetModules();
    vi.doMock('../lib/capinfra/operatorAuth', () => ({
      requireOperatorCookie: () => null,
    }));
    vi.doMock('../lib/capinfra/risk/integrityAlerts', async () => {
      const actual = await vi.importActual<
        typeof import('../lib/capinfra/risk/integrityAlerts')
      >('../lib/capinfra/risk/integrityAlerts');
      return {
        ...actual,
        listRecentIntegrityAlerts: async () =>
          Array.from({ length: 42 }, (_, i) =>
            makeAlertView({ id: `ntf_ssr_${i}` }),
          ),
      };
    });
    const mod = await import('../pages/operator/integrity');
    const result = await mod.getServerSideProps({
      query: {},
      req: {} as unknown,
      res: {} as unknown,
      resolvedUrl: '/operator/integrity',
    } as unknown as Parameters<typeof mod.getServerSideProps>[0]);
    expect('props' in result).toBe(true);
    const props = (result as { props: Record<string, unknown> }).props;
    expect(props.truncated).toBe(false);
  });

  it('SSR passes limit:200 to listRecentIntegrityAlerts (uses the full service ceiling)', async () => {
    vi.resetModules();
    const calls: { args: { limit?: unknown } }[] = [];
    vi.doMock('../lib/capinfra/operatorAuth', () => ({
      requireOperatorCookie: () => null,
    }));
    vi.doMock('../lib/capinfra/risk/integrityAlerts', async () => {
      const actual = await vi.importActual<
        typeof import('../lib/capinfra/risk/integrityAlerts')
      >('../lib/capinfra/risk/integrityAlerts');
      return {
        ...actual,
        listRecentIntegrityAlerts: async (args: { limit?: unknown }) => {
          calls.push({ args });
          return [];
        },
      };
    });
    const mod = await import('../pages/operator/integrity');
    await mod.getServerSideProps({
      query: {},
      req: {} as unknown,
      res: {} as unknown,
      resolvedUrl: '/operator/integrity',
    } as unknown as Parameters<typeof mod.getServerSideProps>[0]);
    expect(calls).toHaveLength(1);
    expect(calls[0].args.limit).toBe(200);
  });
});
