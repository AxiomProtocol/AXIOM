// @vitest-environment jsdom
/**
 * tests/audit-search-on-call-drills-quick-filter.test.tsx
 *
 * Pins the "On-call drills" quick-filter pill on the cap-infra
 * AuditSearchSection (task #301).
 *
 * Why a dedicated test: the audit-search page is a single free-text
 * Event Type input. Operators discovering on-call pager drills must
 * know the exact `risk.integrity.test_page_sent` event-type string to
 * filter on it. The quick-filter pill makes that lookup discoverable
 * with one click — if a future refactor drops the pill or wires it
 * to the wrong event type, the on-call drill audit rows become
 * invisible to anyone who hasn't memorised the dotted name.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';

vi.mock('next/head', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('../components/design-law', () => ({
  DesignLawLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CollateralClassBadge: ({ value }: { value: string }) => (
    <span data-testid="collateral-class-badge">{value}</span>
  ),
}));

const { AuditSearchSection } = await import('../pages/operations/cap-infra');

const ORIGINAL_FETCH = globalThis.fetch;

function mockFetch() {
  const calls: string[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    calls.push(url);
    if (url.startsWith('/api/capinfra/operator/audit')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ items: [], nextCursor: null }),
        json: async () => ({ items: [], nextCursor: null }),
      } as unknown as Response;
    }
    if (url.startsWith('/api/capinfra/assets')) {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ items: [] }),
        json: async () => ({ items: [] }),
      } as unknown as Response;
    }
    throw new Error(`Unmocked fetch URL: ${url}`);
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return { fetchMock, calls };
}

function restoreFetch() {
  globalThis.fetch = ORIGINAL_FETCH;
}

describe('AuditSearchSection — On-call drills quick filter (task #301)', () => {
  beforeEach(() => {
    mockFetch();
  });

  afterEach(() => {
    cleanup();
    restoreFetch();
    vi.restoreAllMocks();
  });

  it('renders the On-call drills quick filter pill', () => {
    render(<AuditSearchSection operatorKey="test-key" />);
    const pill = screen.getByTestId('audit-quick-filter-test-page');
    expect(pill).toBeTruthy();
    expect(pill.textContent).toMatch(/On-call drills/i);
  });

  it('pre-fills the Event Type input with the canonical test-page event type when clicked', () => {
    render(<AuditSearchSection operatorKey="test-key" />);

    // Locate the Event Type input via its label (other inputs are
    // distinguishable by their own labels).
    const eventTypeLabel = screen.getByText(/^Event Type$/i);
    const eventTypeInput = eventTypeLabel.parentElement!.querySelector(
      'input',
    ) as HTMLInputElement;
    expect(eventTypeInput).not.toBeNull();
    expect(eventTypeInput.value).toBe('');

    fireEvent.click(screen.getByTestId('audit-quick-filter-test-page'));

    expect(eventTypeInput.value).toBe('risk.integrity.test_page_sent');
  });

  it('issues the audit-list request with the canonical event type once the operator submits the search', async () => {
    const { calls } = mockFetch();
    render(<AuditSearchSection operatorKey="test-key" />);

    fireEvent.click(screen.getByTestId('audit-quick-filter-test-page'));
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    await waitFor(() => {
      const auditCall = calls.find((u) =>
        u.startsWith('/api/capinfra/operator/audit'),
      );
      expect(auditCall).toBeDefined();
      expect(auditCall).toContain(
        'eventType=risk.integrity.test_page_sent',
      );
    });
  });
});
