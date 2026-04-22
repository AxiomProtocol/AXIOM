// @vitest-environment jsdom
/**
 * Render tests for CollateralClassificationPanel.
 *
 * Verifies the live collateral classification surfaced on public asset and
 * disclosure pages:
 *   - Renders the GREEN/YELLOW/RED badge from /api/capinfra/assets
 *   - Shows the rationale verbatim from the asset record
 *   - Shows the per-transaction cap from basePolicyJson.perTransactionMax
 *     for YELLOW assets (no hardcoded numbers)
 *   - Shows the "Last classification update" timestamp
 *   - When a `symbol` prop is provided, only renders that one asset
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

import { CollateralClassificationPanel } from '../components/disclosure/CollateralClassificationPanel';

const ASSETS = [
  {
    id: 'a-1',
    symbol: 'AXAU',
    displayName: 'Axiom Gold Reserve Unit',
    collateralClass: 'GREEN',
    collateralClassificationRationale:
      'AXAU GREEN under Collateral Risk Policy.',
    basePolicyJson: null,
    updatedAt: '2026-04-22T15:30:00.000Z',
  },
  {
    id: 'a-2',
    symbol: 'AXUSD-TREASURY',
    displayName: 'AXUSD Treasury Segment',
    collateralClass: 'YELLOW',
    collateralClassificationRationale:
      'AXUSD treasury YELLOW with per-asset cap.',
    basePolicyJson: { perTransactionMax: 1000000 },
    updatedAt: '2026-04-22T15:31:00.000Z',
  },
  {
    id: 'a-3',
    symbol: 'PAXG',
    displayName: 'Paxos Gold',
    collateralClass: 'GREEN',
    collateralClassificationRationale: 'PAXG GREEN under §2.',
    basePolicyJson: null,
    updatedAt: '2026-04-22T15:32:00.000Z',
  },
];

beforeEach(() => {
  (global as any).fetch = vi.fn(async () => ({
    ok: true,
    json: async () => ({ items: ASSETS }),
  }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CollateralClassificationPanel', () => {
  it('renders all classified assets when no symbol is provided', async () => {
    render(<CollateralClassificationPanel />);
    await waitFor(() => {
      expect(screen.getByText('AXAU')).toBeTruthy();
      expect(screen.getByText('AXUSD-TREASURY')).toBeTruthy();
      expect(screen.getByText('PAXG')).toBeTruthy();
    });
  });

  it('renders the rationale and last-updated timestamp', async () => {
    render(<CollateralClassificationPanel symbol="AXAU" />);
    await waitFor(() => {
      expect(
        screen.getByText('AXAU GREEN under Collateral Risk Policy.'),
      ).toBeTruthy();
      expect(
        screen.getByText(/Last classification update:/),
      ).toBeTruthy();
    });
  });

  it('renders the per-transaction cap for YELLOW assets from basePolicyJson', async () => {
    render(<CollateralClassificationPanel symbol="AXUSD-TREASURY" />);
    await waitFor(() => {
      const capLine = screen.getByText(/Per-transaction cap:/);
      expect(capLine.textContent).toContain('1,000,000');
    });
  });

  it('does not render a per-transaction cap for GREEN assets', async () => {
    render(<CollateralClassificationPanel symbol="AXAU" />);
    await waitFor(() => {
      expect(screen.getByText('AXAU')).toBeTruthy();
    });
    expect(screen.queryByText(/Per-transaction cap:/)).toBeNull();
  });

  it('renders only the requested symbol when filtered', async () => {
    render(<CollateralClassificationPanel symbol="PAXG" />);
    await waitFor(() => {
      expect(screen.getByText('PAXG')).toBeTruthy();
    });
    expect(screen.queryByText('AXAU')).toBeNull();
    expect(screen.queryByText('AXUSD-TREASURY')).toBeNull();
  });

  it('shows a graceful "no classification" message for an unknown symbol', async () => {
    render(<CollateralClassificationPanel symbol="DOES-NOT-EXIST" />);
    await waitFor(() => {
      expect(
        screen.getByText(/No classification on file for DOES-NOT-EXIST/),
      ).toBeTruthy();
    });
  });
});
