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
  const fetchMock = vi.fn(async () => {
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ items: rows }),
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

    const symbols = getDataRowSymbols();
    expect(symbols.sort()).toEqual(['AXEUR', 'AXUSD']);
    expect(symbols).not.toContain('GOLD');
    expect(symbols).not.toContain('PLOT1');
  });

  it('selecting a Status filter narrows the displayed rows to that status only', async () => {
    await renderAndWaitForRows();
    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    const symbols = getDataRowSymbols();
    expect(symbols.sort()).toEqual(['AXUSD', 'GOLD', 'PLOT1']);
    expect(symbols).not.toContain('AXEUR');
    expect(symbols).not.toContain('SILVER');
  });

  it('combining Type + Status filters narrows rows to the intersection', async () => {
    await renderAndWaitForRows();
    const [typeSelect, statusSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });

    const symbols = getDataRowSymbols();
    expect(symbols).toEqual(['AXUSD']);
  });

  it('shows the "N of M shown" indicator when filters narrow the rows', async () => {
    await renderAndWaitForRows();
    const [typeSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });

    expect(screen.getByText(/2 of 5 shown/)).toBeTruthy();
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
    expect(screen.getByRole('button', { name: 'Clear' })).toBeTruthy();
  });

  it('clicking Clear resets both filters back to "All" and shows every row', async () => {
    await renderAndWaitForRows();
    const [typeSelect, statusSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[];

    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    expect(getDataRowSymbols()).toEqual(['AXUSD']);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(typeSelect.value).toBe('');
    expect(statusSelect.value).toBe('');
    expect(getDataRowSymbols().sort()).toEqual([
      'AXEUR',
      'AXUSD',
      'GOLD',
      'PLOT1',
      'SILVER',
    ]);
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

  it('includes the Status segment when only Status is filtered', async () => {
    await renderAndWaitForRows();
    const statusSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
    await clickDownload();
    expect(capturedDownloadName).toBe(`asset-registry-ACTIVE-${EXPECTED_DATE}.csv`);
  });

  it('includes the Type segment when only Type is filtered', async () => {
    await renderAndWaitForRows();
    const typeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    await clickDownload();
    expect(capturedDownloadName).toBe(`asset-registry-STABLE_ASSET-${EXPECTED_DATE}.csv`);
  });

  it('includes both Status and Type segments (status before type) when both are filtered', async () => {
    await renderAndWaitForRows();
    const [typeSelect, statusSelect] = screen.getAllByRole('combobox');
    fireEvent.change(typeSelect, { target: { value: 'STABLE_ASSET' } });
    fireEvent.change(statusSelect, { target: { value: 'ACTIVE' } });
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
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    await clickDownload();
    expect(capturedDownloadName).toBe(`asset-registry-${EXPECTED_DATE}.csv`);
  });
});
