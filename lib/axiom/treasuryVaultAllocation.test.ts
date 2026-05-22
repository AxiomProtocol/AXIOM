import { describe, expect, it } from 'vitest';
import { parseAllocationAmount, validateAllocationRequest } from './treasuryVaultAllocation';
import { ARBITRUM_ONE_CHAIN_ID, TREASURY_VAULT_REGISTRY } from './treasuryVaultRegistry';

describe('treasury vault allocation validation', () => {
  it('parses 5 USDC as 5000000 raw units', () => {
    expect(parseAllocationAmount('5', 6)).toBe(5_000_000n);
  });

  it('parses 5 WETH as 5000000000000000000 raw units', () => {
    expect(parseAllocationAmount('5', 18)).toBe(5_000_000_000_000_000_000n);
  });

  it('blocks allocation when idle balance is zero', () => {
    const result = validateAllocationRequest({
      amountInput: '1',
      idleRaw: 0n,
      assetAddress: TREASURY_VAULT_REGISTRY.contracts.weth,
      assetSymbol: 'WETH',
      assetDecimals: 18,
      chainId: ARBITRUM_ONE_CHAIN_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('insufficient-idle');
  });

  it('blocks allocation when requested amount exceeds idle balance', () => {
    const result = validateAllocationRequest({
      amountInput: '96',
      idleRaw: 95_000_000n,
      assetAddress: TREASURY_VAULT_REGISTRY.contracts.usdc,
      assetSymbol: 'USDC',
      assetDecimals: 6,
      chainId: ARBITRUM_ONE_CHAIN_ID,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('insufficient-idle');
      expect(result.maxAllocatableFormatted).toBe('95');
    }
  });

  it('allows allocation when requested amount is less than or equal to idle balance', () => {
    const result = validateAllocationRequest({
      amountInput: '95',
      idleRaw: 95_000_000n,
      assetAddress: TREASURY_VAULT_REGISTRY.contracts.usdc,
      assetSymbol: 'USDC',
      assetDecimals: 6,
      chainId: ARBITRUM_ONE_CHAIN_ID,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.parsedAmountRaw).toBe(95_000_000n);
  });

  it('disables allocation on the wrong chain', () => {
    const result = validateAllocationRequest({
      amountInput: '5',
      idleRaw: 95_000_000n,
      assetAddress: TREASURY_VAULT_REGISTRY.contracts.usdc,
      assetSymbol: 'USDC',
      assetDecimals: 6,
      chainId: 1,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('wrong-chain');
      expect(result.message).toContain('Switch to Arbitrum One');
    }
  });
});
