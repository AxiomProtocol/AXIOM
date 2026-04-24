// @vitest-environment jsdom
/**
 * Render tests pinning the operator-console placements of
 * <CollateralClassificationPanel/> introduced in task #223.
 *
 * The shared panel must appear in two places on /operations/cap-infra:
 *   1. Below the Asset Registry table (rationale + last-update timestamp
 *      from /api/capinfra/assets), so operators see the same live
 *      GREEN/YELLOW/RED state allocators see on /disclosure.
 *   2. Above the Audit Search results, filtered to the asset id the
 *      operator selected in the Asset ID picker.
 *
 * If a future refactor drops either placement, these tests fail.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

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

const { AssetSummarySection, AuditSearchSection } = await import(
  '../pages/operations/cap-infra'
);

interface SummaryRow {
  asset: {
    id: string;
    symbol: string;
    displayName: string;
    assetType: string;
    custodyModel: string;
    settlementType: string;
    status: string;
    collateralClass?: 'GREEN' | 'YELLOW' | 'RED';
  };
  latestSpot: null;
  latestReserve: null;
  auditEventCount: number;
}

function makeSummaryRow(
  id: string,
  symbol: string,
  collateralClass: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN',
): SummaryRow {
  return {
    asset: {
      id,
      symbol,
      displayName: `${symbol} Display`,
      assetType: 'STABLE_ASSET',
      custodyModel: 'SELF',
      settlementType: 'ON_CHAIN',
      status: 'ACTIVE',
      collateralClass,
    },
    latestSpot: null,
    latestReserve: null,
    auditEventCount: 0,
  };
}

const SUMMARY_ROWS: SummaryRow[] = [
  makeSummaryRow('asset-axusd', 'AXUSD', 'GREEN'),
  makeSummaryRow('asset-axeur', 'AXEUR', 'YELLOW'),
];

const PANEL_ASSETS = [
  {
    id: 'asset-axusd',
    symbol: 'AXUSD',
    displayName: 'AX USD Stable',
    collateralClass: 'GREEN',
    collateralClassificationRationale:
      'AXUSD GREEN under §3 of the Collateral Risk Policy.',
    basePolicyJson: null,
    updatedAt: '2026-04-22T15:30:00.000Z',
  },
  {
    id: 'asset-axeur',
    symbol: 'AXEUR',
    displayName: 'AX EUR Stable',
    collateralClass: 'YELLOW',
    collateralClassificationRationale:
      'AXEUR YELLOW pending custodian re-attestation.',
    basePolicyJson: { perTransactionMax: 250000 },
    updatedAt: '2026-04-22T16:45:00.000Z',
  },
];

const ORIGINAL_FETCH = globalThis.fetch;

function mockOperatorConsoleFetch() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    // Asset summary table feed
    if (url.startsWith('/api/capinfra/operator/assets/summary')) {
      const qIndex = url.indexOf('?');
      const params = new URLSearchParams(qIndex >= 0 ? url.slice(qIndex + 1) : '');
      const typeParam = params.get('type');
      const statusParam = params.get('status');
      const symbolParam = params.get('symbol');
      const filtered = SUMMARY_ROWS.filter((row) => {
        if (typeParam && row.asset.assetType !== typeParam) return false;
        if (statusParam && row.asset.status !== statusParam) return false;
        if (
          symbolParam &&
          !row.asset.symbol.toLowerCase().includes(symbolParam.toLowerCase())
        ) {
          return false;
        }
        return true;
      });
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ items: filtered }),
        json: async () => ({ items: filtered }),
      } as unknown as Response;
    }
    // Public asset registry — feeds the CollateralClassificationPanel
    if (url.startsWith('/api/capinfra/assets')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ items: PANEL_ASSETS }),
        json: async () => ({ items: PANEL_ASSETS }),
      } as unknown as Response;
    }
    // Audit search — returns no events; we only care about the panel placement
    if (url.startsWith('/api/capinfra/operator/audit')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ items: [], nextCursor: null }),
        json: async () => ({ items: [], nextCursor: null }),
      } as unknown as Response;
    }
    throw new Error(`Unmocked fetch URL: ${url}`);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

describe('Cap-Infra operator console — CollateralClassificationPanel below Asset Registry', () => {
  beforeEach(() => {
    mockOperatorConsoleFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
    vi.restoreAllMocks();
  });

  it('renders the live classification panel below the Asset Registry table with rationale and last-update timestamp', async () => {
    render(<AssetSummarySection operatorKey="test-key" />);

    // Wait for the Asset Registry rows to load (Download CSV appears once rows arrive).
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /Download CSV/i })).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // The "Live Collateral Classification" section header is rendered immediately
    // after the table when there are rows to show.
    const sectionHeading = await screen.findByRole('heading', {
      name: /Live Collateral Classification/i,
    });
    expect(sectionHeading).toBeTruthy();

    // The panel must mount and surface rationale text + the last-update line for
    // each classified asset returned by /api/capinfra/assets.
    await waitFor(() => {
      expect(
        screen.getByText('AXUSD GREEN under §3 of the Collateral Risk Policy.'),
      ).toBeTruthy();
      expect(
        screen.getByText('AXEUR YELLOW pending custodian re-attestation.'),
      ).toBeTruthy();
    });

    const lastUpdateLines = screen.getAllByText(/Last classification update:/);
    expect(lastUpdateLines.length).toBeGreaterThanOrEqual(2);

    // The panel must appear AFTER the Asset Registry data table in DOM order
    // (otherwise it is not "below" the registry).
    const tbody = document.querySelector('table tbody');
    expect(tbody).not.toBeNull();
    const tableNode = tbody!.closest('table')!;
    const rationale = screen.getByText(
      'AXUSD GREEN under §3 of the Collateral Risk Policy.',
    );
    const ordering = tableNode.compareDocumentPosition(rationale);
    expect(ordering & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('Cap-Infra operator console — CollateralClassificationPanel above Audit Search results', () => {
  beforeEach(() => {
    mockOperatorConsoleFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
    vi.restoreAllMocks();
  });

  it('does not render the classification panel when no Asset ID filter is selected', async () => {
    render(<AuditSearchSection operatorKey="test-key" />);
    // Heading is present without a selected asset id.
    expect(
      screen.getByRole('heading', { name: 'Audit Search' }),
    ).toBeTruthy();
    // No "Live collateral classification for asset" preface should appear.
    expect(
      screen.queryByText(/Live collateral classification for asset/i),
    ).toBeNull();
  });

  it('mounts the panel filtered by the selected asset id once the operator picks an asset in Audit Search', async () => {
    render(<AuditSearchSection operatorKey="test-key" />);

    // Asset ID is the second TypeAheadPicker; locate it via its placeholder.
    const assetInput = screen.getByPlaceholderText(
      'symbol or asset ID',
    ) as HTMLInputElement;

    // Simulate the operator selecting an asset id (e.g. via a typeahead pick).
    fireEvent.change(assetInput, { target: { value: 'asset-axeur' } });

    // The preface and the panel must mount once an asset id is set.
    await waitFor(() => {
      expect(
        screen.getByText(/Live collateral classification for asset/i),
      ).toBeTruthy();
    });

    // The panel must be filtered to the chosen asset id (AXEUR), not the other
    // classified asset (AXUSD) returned by /api/capinfra/assets.
    await waitFor(() => {
      expect(
        screen.getByText('AXEUR YELLOW pending custodian re-attestation.'),
      ).toBeTruthy();
    });
    expect(
      screen.queryByText('AXUSD GREEN under §3 of the Collateral Risk Policy.'),
    ).toBeNull();

    // Last-classification-update line is present (single asset → single line).
    expect(screen.getByText(/Last classification update:/)).toBeTruthy();

    // The panel must mount ABOVE the Audit Search results region (the form is
    // the first results-area block in this section). Confirm DOM ordering.
    const rationaleNode = screen.getByText(
      'AXEUR YELLOW pending custodian re-attestation.',
    );
    const formNode = document.querySelector('form');
    expect(formNode).not.toBeNull();
    const ordering = rationaleNode.compareDocumentPosition(formNode!);
    expect(ordering & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Switching the selection re-filters the panel to the new asset id.
    fireEvent.change(assetInput, { target: { value: 'asset-axusd' } });
    await waitFor(() => {
      expect(
        screen.getByText('AXUSD GREEN under §3 of the Collateral Risk Policy.'),
      ).toBeTruthy();
    });
    expect(
      screen.queryByText('AXEUR YELLOW pending custodian re-attestation.'),
    ).toBeNull();

    // Clearing the Asset ID filter unmounts the panel entirely.
    fireEvent.change(assetInput, { target: { value: '' } });
    await waitFor(() => {
      expect(
        screen.queryByText(/Live collateral classification for asset/i),
      ).toBeNull();
    });
  });
});
