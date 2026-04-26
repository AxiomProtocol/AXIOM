// @vitest-environment jsdom
/**
 * Render tests for the PruneStatusPanel React component.
 *
 * Covers:
 *   - "Pruning Overdue" banner renders when lastPrune is null (never_run)
 *   - "Pruning Overdue" banner renders when lastPrune is stale (> PRUNE_STALE_HOURS ago)
 *   - "Pruning Overdue" banner is absent when lastPrune is recent
 *   - Amber border class is present on the warning container when stale
 *   - Most-recent run summary strip is absent when lastPrune is null
 *   - Most-recent run summary strip renders when lastPrune is provided
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { PRUNE_STALE_HOURS, PRUNE_GAP_WARN_HOURS } from '../lib/admin/config';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/design-law', () => ({
  DesignLawLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const { PruneStatusPanel, AlertLogRetentionPanel } = await import('../pages/admin/oracle-fallbacks');

const ADMIN_KEY = 'test-key';
const EMPTY_HISTORY: never[] = [];

function makeLastPrune(hoursAgo: number) {
  const prunedAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
  return {
    pruned_at: prunedAt,
    deleted_count: 42,
    retention_days: 90,
    triggered_by: 'http',
  };
}

describe('PruneStatusPanel – staleness warning', () => {
  const FROZEN_NOW = new Date('2026-04-20T10:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows "Pruning Overdue" banner when lastPrune is null (never run)', () => {
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.getByText('Pruning Overdue')).toBeTruthy();
  });

  it('shows the "never recorded" message when lastPrune is null', () => {
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(
      screen.getByText(/No pruning run has ever been recorded/),
    ).toBeTruthy();
  });

  it('shows "Pruning Overdue" banner when last prune exceeded PRUNE_STALE_HOURS', () => {
    const staleLastPrune = makeLastPrune(PRUNE_STALE_HOURS + 5);
    render(
      <PruneStatusPanel
        lastPrune={staleLastPrune}
        pruneHistory={[staleLastPrune]}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.getByText('Pruning Overdue')).toBeTruthy();
  });

  it('shows the overdue threshold message when prune is stale', () => {
    const staleLastPrune = makeLastPrune(PRUNE_STALE_HOURS + 10);
    render(
      <PruneStatusPanel
        lastPrune={staleLastPrune}
        pruneHistory={[staleLastPrune]}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(
      screen.getByText(new RegExp(`${PRUNE_STALE_HOURS}-hour threshold`)),
    ).toBeTruthy();
  });

  it('does NOT show "Pruning Overdue" banner when lastPrune is recent', () => {
    const recentLastPrune = makeLastPrune(1);
    render(
      <PruneStatusPanel
        lastPrune={recentLastPrune}
        pruneHistory={[recentLastPrune]}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.queryByText('Pruning Overdue')).toBeNull();
  });

  it('does NOT show "Pruning Overdue" banner when prune is just under the threshold', () => {
    const justUnderHours = PRUNE_STALE_HOURS - 1;
    const recentLastPrune = makeLastPrune(justUnderHours);
    render(
      <PruneStatusPanel
        lastPrune={recentLastPrune}
        pruneHistory={[recentLastPrune]}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.queryByText('Pruning Overdue')).toBeNull();
  });

  it('warning container has amber border class when stale', () => {
    const { container } = render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    const warning = container.querySelector('.border-l-amber-500');
    expect(warning).not.toBeNull();
  });
});

describe('PruneStatusPanel – summary strip', () => {
  afterEach(() => {
    cleanup();
  });

  it('does NOT render the "Last Pruned At" strip when lastPrune is null', () => {
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.queryByText(/Last Pruned At/i)).toBeNull();
  });

  it('renders the "Last Pruned At" strip when a recent lastPrune is provided', () => {
    const recentLastPrune = makeLastPrune(1);
    render(
      <PruneStatusPanel
        lastPrune={recentLastPrune}
        pruneHistory={[recentLastPrune]}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.getByText(/Last Pruned At/i)).toBeTruthy();
  });

  it('renders "Rows Removed" count when lastPrune is provided', () => {
    const lastPrune = makeLastPrune(1);
    render(
      <PruneStatusPanel
        lastPrune={lastPrune}
        pruneHistory={[lastPrune]}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.getByText(/Rows Removed/i)).toBeTruthy();
  });
});

describe('PruneStatusPanel – CSV export status message', () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  function mockCsvFetch(rowCount: number) {
    global.fetch = vi.fn(async () =>
      new Response('pruned_at,deleted_count,retention_days,triggered_by\r\n', {
        status: 200,
        headers: { 'Content-Type': 'text/csv', 'X-Row-Count': String(rowCount) },
      }),
    ) as unknown as typeof fetch;
  }

  it('shows "Exported N runs" message after a successful download with rows', async () => {
    mockCsvFetch(7);
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(screen.getByText(/Exported 7 runs/i)).toBeTruthy();
    });
  });

  it('uses singular "run" when exactly 1 row is exported', async () => {
    mockCsvFetch(1);
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(screen.getByText(/Exported 1 run\b/i)).toBeTruthy();
    });
  });

  it('shows a generic empty-result warning when 0 rows are returned with no date filter set', async () => {
    mockCsvFetch(0);
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(screen.getByText(/the prune history table is empty/i)).toBeTruthy();
    });
  });

  it('shows a date-range-specific warning when 0 rows match a filtered query', async () => {
    mockCsvFetch(0);
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    const fromInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(fromInputs[0], { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(screen.getByText(/No prune runs match the selected date range/i)).toBeTruthy();
    });
  });

  it('does not trigger a file download when 0 rows match', async () => {
    mockCsvFetch(0);
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(screen.getByText(/the prune history table is empty/i)).toBeTruthy();
    });
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('shows an inline error banner when the response is non-2xx with a JSON error body', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'database_unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/CSV export failed: database_unavailable/i),
      ).toBeTruthy();
    });
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('falls back to statusText when the non-2xx response has no JSON body', async () => {
    global.fetch = vi.fn(async () =>
      new Response('not json', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      }),
    ) as unknown as typeof fetch;
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/CSV export failed: Service Unavailable/i),
      ).toBeTruthy();
    });
  });

  it('shows an inline error banner when fetch throws (network rejection)', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('connection_refused');
    }) as unknown as typeof fetch;
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={EMPTY_HISTORY}
        adminKey={ADMIN_KEY}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/CSV export failed: connection_refused/i),
      ).toBeTruthy();
    });
  });
});

function makeRun(hoursAgo: number, triggeredBy = 'http') {
  return {
    pruned_at: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString(),
    deleted_count: 10,
    retention_days: 90,
    triggered_by: triggeredBy,
  };
}

describe('PruneStatusPanel – history table', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows the empty-state message when pruneHistory is empty', () => {
    render(
      <PruneStatusPanel
        lastPrune={null}
        pruneHistory={[]}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.getByText('No pruning runs recorded yet.')).toBeTruthy();
  });

  it('renders one table row per entry in pruneHistory', () => {
    const history = [makeRun(1), makeRun(26), makeRun(52)];
    const lastPrune = history[0];
    render(
      <PruneStatusPanel
        lastPrune={lastPrune}
        pruneHistory={history}
        adminKey={ADMIN_KEY}
      />,
    );
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBe(history.length);
  });

  it('shows the ⚠ gap warning icon when the gap between runs exceeds PRUNE_GAP_WARN_HOURS', () => {
    const newerRun = makeRun(1);
    const olderRun = makeRun(1 + PRUNE_GAP_WARN_HOURS + 1);
    const history = [newerRun, olderRun];
    render(
      <PruneStatusPanel
        lastPrune={newerRun}
        pruneHistory={history}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.getByText('⚠')).toBeTruthy();
  });

  it('does NOT show the ⚠ gap warning icon when runs are within PRUNE_GAP_WARN_HOURS', () => {
    const newerRun = makeRun(1);
    const olderRun = makeRun(1 + PRUNE_GAP_WARN_HOURS - 1);
    const history = [newerRun, olderRun];
    render(
      <PruneStatusPanel
        lastPrune={newerRun}
        pruneHistory={history}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.queryByText('⚠')).toBeNull();
  });

  it('renders the triggered_by label for each history row', () => {
    const history = [makeRun(1, 'cron'), makeRun(25, 'http')];
    render(
      <PruneStatusPanel
        lastPrune={history[0]}
        pruneHistory={history}
        adminKey={ADMIN_KEY}
      />,
    );
    expect(screen.getByText('cron')).toBeTruthy();
    expect(screen.getByText('http')).toBeTruthy();
  });
});

describe('AlertLogRetentionPanel', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the unavailable fallback when status is null', () => {
    render(<AlertLogRetentionPanel adminKey="test-key" status={null} />);
    expect(screen.getByText(/Alert-log status unavailable/i)).toBeTruthy();
  });

  it('renders the current row count formatted with thousands separators', () => {
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{ rowCount: 1234, retentionDays: 90, lastCleanup: null }}
      />,
    );
    expect(screen.getByTestId('alert-log-row-count').textContent).toBe('1,234');
  });

  it('renders the configured retention window in days', () => {
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{ rowCount: 0, retentionDays: 30, lastCleanup: null }}
      />,
    );
    expect(screen.getByText('30 days')).toBeTruthy();
  });

  it('shows the "no cleanup yet" message when lastCleanup is null', () => {
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{ rowCount: 5, retentionDays: 90, lastCleanup: null }}
      />,
    );
    expect(screen.getByText(/No cleanup has run yet/i)).toBeTruthy();
  });

  it('renders the last cleanup deletedCount and triggeredBy when present', () => {
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{
          rowCount: 12,
          retentionDays: 90,
          lastCleanup: {
            ranAt: new Date('2026-04-20T02:30:00.000Z').toISOString(),
            deletedCount: 7,
            retentionDays: 90,
            triggeredBy: 'pg_cron',
          },
        }}
      />,
    );
    expect(screen.getByText(/removed/i)).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText(/pg_cron/)).toBeTruthy();
  });

  it('shows the empty-state message when cleanupHistory is empty', () => {
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{
          rowCount: 5,
          retentionDays: 90,
          lastCleanup: null,
          cleanupHistory: [],
        }}
      />,
    );
    expect(
      screen.getByText('No alert-log cleanup runs recorded yet.'),
    ).toBeTruthy();
  });

  it('renders one history-table row per entry in cleanupHistory', () => {
    const now = Date.now();
    const history = [
      {
        ranAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        deletedCount: 3,
        retentionDays: 90,
        triggeredBy: 'cron',
      },
      {
        ranAt: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
        deletedCount: 0,
        retentionDays: 90,
        triggeredBy: 'http',
      },
      {
        ranAt: new Date(now - 50 * 60 * 60 * 1000).toISOString(),
        deletedCount: 4,
        retentionDays: 90,
        triggeredBy: 'cron',
      },
    ];
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{
          rowCount: 12,
          retentionDays: 90,
          lastCleanup: history[0],
          cleanupHistory: history,
        }}
      />,
    );
    const rows = document.querySelectorAll('tbody tr');
    expect(rows.length).toBe(history.length);
  });

  it('shows the ⚠ gap warning when consecutive cleanup runs exceed PRUNE_GAP_WARN_HOURS', () => {
    const now = Date.now();
    const newer = {
      ranAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      deletedCount: 1,
      retentionDays: 90,
      triggeredBy: 'cron',
    };
    const older = {
      ranAt: new Date(
        now - (1 + PRUNE_GAP_WARN_HOURS + 5) * 60 * 60 * 1000,
      ).toISOString(),
      deletedCount: 2,
      retentionDays: 90,
      triggeredBy: 'cron',
    };
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{
          rowCount: 9,
          retentionDays: 90,
          lastCleanup: newer,
          cleanupHistory: [newer, older],
        }}
      />,
    );
    expect(screen.getByText('⚠')).toBeTruthy();
  });

  it('does NOT show the ⚠ gap warning when consecutive runs are within PRUNE_GAP_WARN_HOURS', () => {
    const now = Date.now();
    const newer = {
      ranAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      deletedCount: 1,
      retentionDays: 90,
      triggeredBy: 'cron',
    };
    const older = {
      ranAt: new Date(
        now - (1 + PRUNE_GAP_WARN_HOURS - 1) * 60 * 60 * 1000,
      ).toISOString(),
      deletedCount: 2,
      retentionDays: 90,
      triggeredBy: 'cron',
    };
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{
          rowCount: 9,
          retentionDays: 90,
          lastCleanup: newer,
          cleanupHistory: [newer, older],
        }}
      />,
    );
    expect(screen.queryByText('⚠')).toBeNull();
  });

  it('uses singular "row" when exactly one row was removed', () => {
    render(
      <AlertLogRetentionPanel adminKey="test-key"
        status={{
          rowCount: 4,
          retentionDays: 90,
          lastCleanup: {
            ranAt: new Date().toISOString(),
            deletedCount: 1,
            retentionDays: 90,
            triggeredBy: 'http',
          },
        }}
      />,
    );
    expect(screen.getByText(/row via http/i)).toBeTruthy();
  });
});

describe('AlertLogRetentionPanel – CSV export', () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;

  const BASE_STATUS = {
    rowCount: 0,
    retentionDays: 90,
    lastCleanup: null,
    cleanupHistory: [],
  };

  beforeEach(() => {
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  function mockCsvFetch(rowCount: number) {
    global.fetch = vi.fn(async () =>
      new Response('ran_at,deleted_count,retention_days,triggered_by\r\n', {
        status: 200,
        headers: { 'Content-Type': 'text/csv', 'X-Row-Count': String(rowCount) },
      }),
    ) as unknown as typeof fetch;
  }

  it('shows "Exported N runs" message after a successful download with rows', async () => {
    mockCsvFetch(7);
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(screen.getByText(/Exported 7 runs/i)).toBeTruthy();
    });
  });

  it('uses singular "run" when exactly 1 row is exported', async () => {
    mockCsvFetch(1);
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(screen.getByText(/Exported 1 run\b/i)).toBeTruthy();
    });
  });

  it('shows a generic empty-result warning when 0 rows are returned with no date filter set', async () => {
    mockCsvFetch(0);
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/the cleanup history table is empty/i),
      ).toBeTruthy();
    });
  });

  it('shows a date-range-specific warning when 0 rows match a filtered query', async () => {
    mockCsvFetch(0);
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(
          /No alert-log cleanup runs match the selected date range/i,
        ),
      ).toBeTruthy();
    });
  });

  it('does not trigger a file download when 0 rows match', async () => {
    mockCsvFetch(0);
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/the cleanup history table is empty/i),
      ).toBeTruthy();
    });
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('shows an inline error banner when the response is non-2xx with a JSON error body', async () => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: 'database_unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }),
    ) as unknown as typeof fetch;
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/CSV export failed: database_unavailable/i),
      ).toBeTruthy();
    });
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('falls back to statusText when the non-2xx response has no JSON body', async () => {
    global.fetch = vi.fn(async () =>
      new Response('not json', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      }),
    ) as unknown as typeof fetch;
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/CSV export failed: Service Unavailable/i),
      ).toBeTruthy();
    });
  });

  it('shows an inline error banner when fetch throws (network rejection)', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('connection_refused');
    }) as unknown as typeof fetch;
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/CSV export failed: connection_refused/i),
      ).toBeTruthy();
    });
  });

  it('clears a prior error banner on the next click when the next attempt succeeds', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('connection_refused');
    }) as unknown as typeof fetch;
    render(<AlertLogRetentionPanel adminKey={ADMIN_KEY} status={BASE_STATUS} />);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/CSV export failed: connection_refused/i),
      ).toBeTruthy();
    });
    mockCsvFetch(3);
    fireEvent.click(screen.getByRole('button', { name: /Download CSV/i }));
    await waitFor(() => {
      expect(screen.getByText(/Exported 3 runs/i)).toBeTruthy();
    });
    expect(screen.queryByText(/CSV export failed/i)).toBeNull();
  });
});
