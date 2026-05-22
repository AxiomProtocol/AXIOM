// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ARBITRUM_ONE_CHAIN_ID, TREASURY_VAULT_REGISTRY } from '../lib/axiom/treasuryVaultRegistry';
import { AllocateToEulerPanel } from '../pages/operator/treasury/vault';

let mockChainId = ARBITRUM_ONE_CHAIN_ID;
const mockReadContract = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x0000000000000000000000000000000000000001', isConnected: true }),
  useChainId: () => mockChainId,
  usePublicClient: () => ({ readContract: mockReadContract }),
  useWriteContract: () => ({ writeContractAsync: vi.fn() }),
  useWaitForTransactionReceipt: () => ({ isSuccess: false }),
  useBalance: () => ({ data: null }),
}));

vi.mock('../components/operator/OperatorConsoleLayout', () => ({
  OperatorConsoleLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('treasury vault allocation card', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    mockChainId = ARBITRUM_ONE_CHAIN_ID;
    mockReadContract.mockReset();
    mockReadContract.mockImplementation(({ functionName }: { functionName: string }) => {
      if (functionName === 'getIdleBalance') return Promise.resolve(0n);
      if (functionName === 'currentValue') return Promise.resolve(0n);
      if (functionName === 'principal') return Promise.resolve(0n);
      if (functionName === 'strategyInfo') {
        return Promise.resolve([
          true,
          'Euler v2 WETH',
          TREASURY_VAULT_REGISTRY.contracts.weth,
          0n,
          0n,
          0n,
        ]);
      }
      if (functionName === 'STRATEGY_ADMIN') {
        return Promise.resolve('0x0000000000000000000000000000000000000000000000000000000000000000');
      }
      if (functionName === 'hasRole') return Promise.resolve(true);
      return Promise.resolve(0n);
    });
  });

  it('shows wrong-chain message and disables allocation UI', () => {
    mockChainId = 1;

    render(
      <AllocateToEulerPanel
        label="Euler v2 — WETH Arbitrum"
        marketDesc="WETH market"
        apyLabel="variable"
        strategyAddress={TREASURY_VAULT_REGISTRY.strategies.eulerWeth.address}
        assetAddress={TREASURY_VAULT_REGISTRY.contracts.weth}
        assetSymbol="WETH"
        assetDecimals={18}
      />,
    );

    expect(screen.getByText('Switch to Arbitrum One to operate the Axiom Treasury Vault.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Allocate to/i })).toBeNull();
  });

  it('blocks WETH allocation when vault idle balance is zero', async () => {
    render(
      <AllocateToEulerPanel
        label="Euler v2 — WETH Arbitrum"
        marketDesc="WETH market"
        apyLabel="variable"
        strategyAddress={TREASURY_VAULT_REGISTRY.strategies.eulerWeth.address}
        assetAddress={TREASURY_VAULT_REGISTRY.contracts.weth}
        assetSymbol="WETH"
        assetDecimals={18}
      />,
    );

    await waitFor(() => expect(document.body.textContent).toContain('Required deposit call:'));

    expect(document.body.textContent).toContain(`vault.depositToken(${TREASURY_VAULT_REGISTRY.contracts.weth}, amount)`);
    expect(screen.getByRole('button', { name: /Max 0/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Allocate to Euler v2/i })).toHaveProperty('disabled', true);
  });
});
