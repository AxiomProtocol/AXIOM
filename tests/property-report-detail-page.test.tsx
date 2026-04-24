// @vitest-environment jsdom
/**
 * tests/property-report-detail-page.test.tsx
 *
 * Render-level coverage for the "payment confirmed after delay" banner on
 * the property report detail page (task #278). The threshold helper itself
 * is unit-tested in tests/property-report-auto-confirm-banner.test.ts; this
 * file exists so a future refactor that, e.g., moves the banner inside a
 * conditional block can't silently break the feature without a test
 * failing (architect feedback on #278 → follow-up #282).
 *
 * Strategy:
 *  - Mock next/router + next/head + DesignLawLayout so the page can render
 *    in jsdom without pulling in framework chrome.
 *  - Mock global fetch to return a "ready" report payload synchronously.
 *  - Render <ReportDetail />, wait for the page to leave its loading state,
 *    then assert the banner's data-testid is present (delayed) or absent
 *    (prompt-confirm).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

// ─── Mocks ──────────────────────────────────────────────────────────────────
//
// next/router lives module-level for the page, but the page reads its
// `query.id` lazily inside useEffect, so a stable mock returning a fixed
// id is enough — no per-test rewiring required.
vi.mock('next/router', () => ({
  useRouter: () => ({
    query: { id: 'rep-test-id' },
    pathname: '/property/reports/[id]',
    asPath: '/property/reports/rep-test-id',
    push: vi.fn(),
    replace: vi.fn(),
    isReady: true,
  }),
}));

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// The page imports DesignLawLayout from a deep file path, so the mock must
// match that exact specifier — the layout pulls in the navigation header,
// chain detection, and other hooks we don't want to exercise here.
vi.mock('../components/design-law/DesignLawLayout', () => ({
  DesignLawLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="design-law-layout">{children}</div>
  ),
}));

// Importing AFTER the mocks register so the page picks them up.
const { default: ReportDetail } = await import('../pages/property/reports/[id]');

// ─── Helpers ────────────────────────────────────────────────────────────────

const ORIGINAL_FETCH = globalThis.fetch;

interface ReportPayloadOverrides {
  createdAt: string;
  paymentConfirmedAt: string | null;
}

function makeReadyReportPayload({
  createdAt,
  paymentConfirmedAt,
}: ReportPayloadOverrides) {
  // Minimal "ready" payload — only the fields the page reads to render the
  // header + banner area need to be realistic. Sub-section data (rehab,
  // comps, neighborhood) can stay empty since those sections short-circuit
  // when their inputs are missing.
  return {
    id: 'rep-test-id',
    status: 'ready',
    tier: 'standard',
    addressRaw: '742 Evergreen Terrace, Springfield, OR 97477',
    addressNormalized: '742 Evergreen Terrace, Springfield, OR 97477',
    createdAt,
    paymentConfirmedAt,
    chainId: 42161,
    // Real-shape EVM tx hash (0x + 64 hex chars). Validated client-side
    // before the Arbiscan link renders (#281), so a malformed value would
    // suppress the link entirely.
    paymentTxHash:
      '0xabc1230000000000000000000000000000000000000000000000000000000000',
    valueLow: 250_000,
    valueMid: 285_000,
    valueHigh: 320_000,
    rentLow: 1800,
    rentMid: 2100,
    rentHigh: 2400,
    rehabLow: 5000,
    rehabMid: 12_000,
    rehabHigh: 20_000,
    confidenceScore: 78,
    dealGrade: 'B',
    fullReport: {
      value: { ppsf: 142 },
      rent: { rentToValue: 0.74 },
      rehab: { items: [] },
      confidence: { factors: [], dataQuality: 80 },
      neighborhoodContext: {},
      riskFlags: [],
      dataSources: [],
      propertyDetails: {},
    },
    riskFlags: [],
    rehabItems: [],
    dataSources: [],
    neighborhoodContext: {},
  };
}

function mockFetchOnce(payload: unknown) {
  const fetchMock = vi.fn(async () => {
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    } as unknown as Response;
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

async function renderAndWaitForReport() {
  render(<ReportDetail />);
  // Page shows "Loading Report" / "Generating Your Report" first; the report
  // header lands once fetch resolves. Wait on the address line which only
  // appears in the loaded view.
  await waitFor(
    () => {
      expect(
        screen.getByText('Property Analysis Report'),
      ).toBeTruthy();
    },
    { timeout: 3000 },
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ReportDetail — auto-confirm banner render coverage (task #278/#282)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-24T18:00:00Z'));
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders the banner when paymentConfirmedAt is 6 hours after createdAt (resolver-rescued flow)', async () => {
    const createdAt = new Date('2026-04-24T06:00:00Z').toISOString();
    // 6h 12m after createdAt → exercises the "Xh Ym" duration branch.
    const paymentConfirmedAt = new Date('2026-04-24T12:12:00Z').toISOString();
    mockFetchOnce(makeReadyReportPayload({ createdAt, paymentConfirmedAt }));

    await renderAndWaitForReport();

    const banner = screen.getByTestId('auto-confirm-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toMatch(/Payment Confirmed After Delay/i);
    expect(banner.textContent).toMatch(
      /We detected your AXUSD payment after a delay/i,
    );
    // The on-chain confirmation timestamp is rendered inside the banner —
    // the exact format is locale-dependent so we just assert the year is
    // present, which is enough to prove the timestamp made it through.
    expect(banner.textContent).toMatch(/2026/);

    // Task #281: humanized wait line + Arbiscan link must render together.
    const waitLine = screen.getByTestId('auto-confirm-wait-duration');
    expect(waitLine.textContent).toBe('Confirmed 6h 12m after checkout.');

    const arbiscanLink = screen.getByTestId('auto-confirm-arbiscan-link') as HTMLAnchorElement;
    // chainId 42161 (Arbitrum One) → arbiscan.io.
    expect(arbiscanLink.getAttribute('href')).toBe(
      'https://arbiscan.io/tx/0xabc1230000000000000000000000000000000000000000000000000000000000',
    );
    // External link hardening (no opener leak).
    expect(arbiscanLink.getAttribute('target')).toBe('_blank');
    expect(arbiscanLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('suppresses the Arbiscan link when paymentTxHash is missing (defensive)', async () => {
    const createdAt = new Date('2026-04-24T06:00:00Z').toISOString();
    const paymentConfirmedAt = new Date('2026-04-24T12:00:00Z').toISOString();
    const payload = makeReadyReportPayload({ createdAt, paymentConfirmedAt });
    payload.paymentTxHash = null as unknown as string;
    mockFetchOnce(payload);

    await renderAndWaitForReport();

    // Banner itself still renders (the duration is what matters to the
    // buyer), but the link must NOT — building an /tx/null Arbiscan URL
    // would 404.
    expect(screen.getByTestId('auto-confirm-banner')).toBeTruthy();
    expect(screen.queryByTestId('auto-confirm-arbiscan-link')).toBeNull();
    // Wait-duration line is still expected (it doesn't depend on the tx hash).
    expect(screen.getByTestId('auto-confirm-wait-duration')).toBeTruthy();
  });

  it('suppresses the Arbiscan link when paymentTxHash is malformed (would 404 on Arbiscan)', async () => {
    const createdAt = new Date('2026-04-24T06:00:00Z').toISOString();
    const paymentConfirmedAt = new Date('2026-04-24T12:00:00Z').toISOString();
    const payload = makeReadyReportPayload({ createdAt, paymentConfirmedAt });
    // Truncated tx hash — has 0x prefix but not 64 hex chars. The
    // /^0x[0-9a-fA-F]{64}$/ guard must reject it so the link doesn't
    // render and 404 on Arbiscan.
    payload.paymentTxHash = '0xabc123';
    mockFetchOnce(payload);

    await renderAndWaitForReport();

    expect(screen.getByTestId('auto-confirm-banner')).toBeTruthy();
    expect(screen.queryByTestId('auto-confirm-arbiscan-link')).toBeNull();
  });

  it('does NOT render the banner when paymentConfirmedAt is 30 seconds after createdAt (prompt-confirm flow)', async () => {
    const createdAt = new Date('2026-04-24T12:00:00Z').toISOString();
    const paymentConfirmedAt = new Date('2026-04-24T12:00:30Z').toISOString();
    mockFetchOnce(makeReadyReportPayload({ createdAt, paymentConfirmedAt }));

    await renderAndWaitForReport();

    expect(screen.queryByTestId('auto-confirm-banner')).toBeNull();
  });

  it('does NOT render the banner when paymentConfirmedAt is null (defensive — should never happen for a ready report)', async () => {
    const createdAt = new Date('2026-04-24T12:00:00Z').toISOString();
    mockFetchOnce(
      makeReadyReportPayload({ createdAt, paymentConfirmedAt: null }),
    );

    await renderAndWaitForReport();

    expect(screen.queryByTestId('auto-confirm-banner')).toBeNull();
  });
});
