// @vitest-environment jsdom
/**
 * Render tests for the AssetSummarySection component (Asset Registry).
 *
 * Covers:
 *   - Selecting a Type filter narrows the displayed rows
 *   - Selecting a Status filter narrows the displayed rows
 *   - Combining Type + Status filters narrows further
 *   - The "Clear" button resets both filters
 *   - The downloaded CSV filename includes the active filter segments
 *     (e.g. asset-registry-ACTIVE-STABLE_ASSET-2026-04-19.csv)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('../components/design-law', () => ({
  DesignLawLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollateralClassBadge: ({ value }: { value: string }) => (
    <span data-testid="collateral-class-badge">{value}</span>
  ),
}));

const { AssetSummarySection } = await import('../pages/operations/cap-infra');

interface AssetRow {
  asset: {
    id: string;
    symbol: string;
    displayName: string;
    assetType: string;
    custodyModel: string;
    settlementType: string;
    status: string;
  };
  latestSpot: null;
  latestReserve: null;
  auditEventCount: number;
}

function makeRow(
  id: string,
  symbol: string,
  assetType: string,
  status: string,
): AssetRow {
  return {
    asset: {
      id,
      symbol,
      displayName: `${symbol} Display`,
      assetType,
      custodyModel: 'SELF',
      settlementType: 'ON_CHAIN',
      status,
    },
    latestSpot: null,
    latestReserve: null,
    auditEventCount: 0,
  };
}

const TEST_ROWS: AssetRow[] = [
  makeRow('a1', 'AXUSD', 'STABLE_ASSET', 'ACTIVE'),
  makeRow('a2', 'AXEUR', 'STABLE_ASSET', 'INACTIVE'),
  makeRow('a3', 'GOLD', 'PHYSICAL_METAL', 'ACTIVE'),
  makeRow('a4', 'SILVER', 'PHYSICAL_METAL', 'SUSPENDED'),
  makeRow('a5', 'PLOT1', 'REAL_ESTATE', 'ACTIVE'),
];

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetchRows(rows: AssetRow[]) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    const qIndex = url.indexOf('?');
    const params = new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : '');
    const typeParam = params.get('type');
    const statusParam = params.get('status');
    const symbolParam = params.get('symbol');
    const filtered = rows.filter((row) => {
      if (typeParam && row.asset.assetType !== typeParam) return false;
      if (statusParam && row.asset.status !== statusParam) return false;
      if (symbolParam && !row.asset.symbol.toLowerCase().includes(symbolParam.toLowerCase())) {
        return false;
      }
      return true;
    });
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ items: filtered }),
    } as unknown as Response;
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

async function renderAndWaitForRows() {
  render(<AssetSummarySection operatorKey="test-key" />);
  // Wait until the CSV button appears, indicating rows have loaded.
  await waitFor(
    () => {
      expect(screen.getByRole('button', { name: /Download CSV/i })).toBeTruthy();
    },
    { timeout: 3000 },
  );
}

function getDataRowSymbols(): string[] {
  // Each row's first cell contains the symbol; rows live inside a <tbody>.
  const tbody = document.querySelector('table tbody');
  if (!tbody) return [];
  return Array.from(tbody.querySelectorAll('tr')).map((tr) => {
    const firstCell = tr.querySelector('td');
    return firstCell?.textContent?.trim() ?? '';
  });
}

describe('AssetSummarySection — filter dropdowns narrow rows', () => {
  beforeEach(() => {
    mockFetchRows(TEST_ROWS);
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
    vi.restoreAllMocks();
  });

  it('shows all rows initially when no filter is selected', async () => {
    await renderAndWaitForRows();
    const symbols = getDataRowSymbols();
    expect(symbols.sort()).toEqual(['AXEUR', 'AXUSD', 'GOLD', 'PLOT1', 'SILVER']);
  });

  it('selecting a Type filter narrows the displayed rows to that type only', async () => {
    await renderAndWaitForRows();
    const typeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });

    await waitFor(() => {
      expect(getDataRowSymbols().sort()).toEqual(['AXEUR', 'AXUSD']);
    });
    const symbols = getDataRowSymbols();
    expect(symbols).not.toContain('GOLD');
    expect(symbols).not.toContain('PLOT1');
  });

  it('selecting a Status filter narrows the displayed rows to that status only', async () => {
    await renderAndWaitForRows();
    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(getDataRowSymbols().sort()).toEqual(['AXUSD', 'GOLD', 'PLOT1']);
    });
    const symbols = getDataRowSymbols();
    expect(symbols).not.toContain('AXEUR');
    expect(symbols).not.toContain('SILVER');
  });

  it('combining Type + Status filters narrows rows to the intersection', async () => {
    await renderAndWaitForRows();
    const [typeSelect, statusSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    await waitFor(() => {
      expect(getDataRowSymbols()).toEqual(['AXUSD']);
    });
  });

  it('does not show the "N of M shown" indicator under server-side filtering (N always equals M)', async () => {
    // The component now re-fetches with the active filters, so `rows` and
    // `filteredRows` share the same length and the "N of M shown" indicator
    // never renders. This test pins that contract so the indicator's
    // (intentional) absence is part of the regression suite.
    await renderAndWaitForRows();
    const [typeSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });

    await waitFor(() => {
      expect(getDataRowSymbols().sort()).toEqual(['AXEUR', 'AXUSD']);
    });
    expect(screen.queryByText(/of \d+ shown/)).toBeNull();
  });
});

describe('AssetSummarySection — Clear button resets both filters', () => {
  beforeEach(() => {
    mockFetchRows(TEST_ROWS);
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
    vi.restoreAllMocks();
  });

  it('does not render the Clear button when no filters are active', async () => {
    await renderAndWaitForRows();
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });

  it('renders the Clear button once a filter is selected', async () => {
    await renderAndWaitForRows();
    const [typeSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
    });
  });

  it('clicking Clear resets both filters back to "All" and shows every row', async () => {
    await renderAndWaitForRows();
    const [typeSelect, statusSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];

    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    await waitFor(() => {
      expect(getDataRowSymbols()).toEqual(['AXUSD']);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(typeSelect.value).toBe('');
    expect(statusSelect.value).toBe('');
    await waitFor(() => {
      expect(getDataRowSymbols().sort()).toEqual([
        'AXEUR',
        'AXUSD',
        'GOLD',
        'PLOT1',
        'SILVER',
      ]);
    });
    // Clear button itself disappears once both filters are reset.
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull();
  });
});

describe('AssetSummarySection — CSV download filename includes filter segments', () => {
  const FROZEN_NOW = new Date('2026-04-19T12:34:56.000Z').getTime();
  const EXPECTED_DATE = '2026-04-19';

  let capturedDownloadName: string | null = null;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FROZEN_NOW);
    mockFetchRows(TEST_ROWS);

    capturedDownloadName = null;

    // jsdom does not implement these Blob URL helpers.
    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () =>
      'blob:mock';
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};

    // Intercept anchor creation so we can read the download filename without
    // actually triggering a navigation in jsdom.
    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag.toLowerCase() === 'a') {
        const anchor = el as HTMLAnchorElement;
        anchor.click = () => {
          capturedDownloadName = anchor.download;
        };
      }
      return el;
    });
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function clickDownload() {
    const section = screen.getByRole('heading', { name: 'Asset Registry' }).closest('section');
    if (!section) throw new Error('Asset Registry section not found');
    const downloadBtn = within(section as HTMLElement).getByRole('button', {
      name: /Download CSV/i,
    });
    fireEvent.click(downloadBtn);
  }

  it('uses asset-registry-<date>.csv when no filters are active', async () => {
    await renderAndWaitForRows();
    await clickDownload();
    expect(capturedDownloadName).toBe(`asset-registry-${EXPECTED_DATE}.csv`);
  });

  async function waitForRowSymbols(expected: string[]) {
    await waitFor(() => {
      expect(getDataRowSymbols().sort()).toEqual([...expected].sort());
    });
  }

  it('includes the Status segment when only Status is filtered', async () => {
    await renderAndWaitForRows();
    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    await waitForRowSymbols(['AXUSD', 'GOLD', 'PLOT1']);
    await clickDownload();
    expect(capturedDownloadName).toBe(`asset-registry-ACTIVE-${EXPECTED_DATE}.csv`);
  });

  it('includes the Type segment when only Type is filtered', async () => {
    await renderAndWaitForRows();
    const typeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    await waitForRowSymbols(['AXEUR', 'AXUSD']);
    await clickDownload();
    expect(capturedDownloadName).toBe(`asset-registry-STABLE_ASSET-${EXPECTED_DATE}.csv`);
  });

  it('includes both Status and Type segments (status before type) when both are filtered', async () => {
    await renderAndWaitForRows();
    const [typeSelect, statusSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    await waitForRowSymbols(['AXUSD']);
    await clickDownload();
    expect(capturedDownloadName).toBe(
      `asset-registry-ACTIVE-STABLE_ASSET-${EXPECTED_DATE}.csv`,
    );
  });

  it('reverts the filename back to the unfiltered form after clicking Clear', async () => {
    await renderAndWaitForRows();
    const [typeSelect, statusSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    await waitForRowSymbols(['AXUSD']);
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await waitForRowSymbols(['AXEUR', 'AXUSD', 'GOLD', 'PLOT1', 'SILVER']);
    await clickDownload();
    expect(capturedDownloadName).toBe(`asset-registry-${EXPECTED_DATE}.csv`);
  });
});

describe('AssetSummarySection — CSV download confirmation banners', () => {
  const FROZEN_NOW = new Date('2026-04-19T12:34:56.000Z').getTime();
  const EXPECTED_DATE = '2026-04-19';

  let capturedDownloadName: string | null = null;
  let anchorClickCount = 0;
  let originalCreateElement: typeof document.createElement;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(FROZEN_NOW);

    capturedDownloadName = null;
    anchorClickCount = 0;

    (URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = () =>
      'blob:mock';
    (URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {};

    originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreateElement(tag);
      if (tag.toLowerCase() === 'a') {
        const anchor = el as HTMLAnchorElement;
        anchor.click = () => {
          capturedDownloadName = anchor.download;
          anchorClickCount += 1;
        };
      }
      return el;
    });
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  async function clickDownload() {
    const section = screen.getByRole('heading', { name: 'Asset Registry' }).closest('section');
    if (!section) throw new Error('Asset Registry section not found');
    const downloadBtn = within(section as HTMLElement).getByRole('button', {
      name: /Download CSV/i,
    });
    fireEvent.click(downloadBtn);
  }

  it('shows the success banner with the exported row count after clicking Download CSV', async () => {
    mockFetchRows(TEST_ROWS);
    await renderAndWaitForRows();
    await clickDownload();

    await waitFor(() => {
      expect(
        screen.getByText(
          new RegExp(`Exported 5 assets to asset-registry-${EXPECTED_DATE}\\.csv\\.`),
        ),
      ).toBeTruthy();
    });
    expect(anchorClickCount).toBe(1);
  });

  it('uses singular "asset" in the success banner when exactly one row is exported', async () => {
    mockFetchRows([makeRow('a1', 'AXUSD', 'STABLE_ASSET', 'ACTIVE')]);
    await renderAndWaitForRows();
    await clickDownload();

    await waitFor(() => {
      expect(
        screen.getByText(
          new RegExp(`Exported 1 asset to asset-registry-${EXPECTED_DATE}\\.csv\\.`),
        ),
      ).toBeTruthy();
    });
    expect(anchorClickCount).toBe(1);
  });

  it('shows the empty-result warning (and produces no file) when filters narrow rows to zero', async () => {
    // Server-side filtering: when a Status filter is set, the API returns zero rows.
    // Until then, return the full dataset so the row table mounts and Download CSV renders.
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      const rows = url.includes('status=') ? [] : TEST_ROWS;
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ items: rows }),
      } as unknown as Response;
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await renderAndWaitForRows();

    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'SUSPENDED' } });

    // Wait for the re-fetch with the status filter to settle to zero rows.
    await waitFor(() => {
      const tbody = document.querySelector('table tbody');
      expect(tbody?.querySelectorAll('tr').length ?? 0).toBe(0);
    });

    await clickDownload();

    await waitFor(() => {
      expect(
        screen.getByText(
          /No assets match the current filters — nothing was exported\. Adjust the filters and try again\./,
        ),
      ).toBeTruthy();
    });
    // Empty result must not trigger an actual download.
    expect(anchorClickCount).toBe(0);
    expect(capturedDownloadName).toBeNull();
    // And the success banner must not appear.
    expect(screen.queryByText(/^Exported /)).toBeNull();
  });

  it('shows the empty-registry warning (and produces no file) when the registry itself is empty', async () => {
    mockFetchRows([]);
    render(<AssetSummarySection operatorKey="test-key" />);
    // With zero rows, the Download CSV button still renders, but the table is empty.
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /Download CSV/i })).toBeTruthy();
      },
      { timeout: 3000 },
    );

    await clickDownload();

    await waitFor(() => {
      expect(
        screen.getByText(/No assets to export — the asset registry is empty\./),
      ).toBeTruthy();
    });
    expect(anchorClickCount).toBe(0);
    expect(capturedDownloadName).toBeNull();
  });
});
