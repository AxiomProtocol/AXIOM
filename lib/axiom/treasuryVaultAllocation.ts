import { formatUnits, parseUnits, type Address } from 'viem';
import { ARBITRUM_ONE_CHAIN_ID } from './treasuryVaultRegistry';

export type AllocationValidationResult =
  | {
      ok: true;
      parsedAmountRaw: bigint;
      idleRaw: bigint;
      idleFormatted: string;
      maxAllocatableFormatted: string;
    }
  | {
      ok: false;
      reason: 'wrong-chain' | 'invalid-amount' | 'insufficient-idle';
      message: string;
      parsedAmountRaw: bigint | null;
      idleRaw: bigint;
      idleFormatted: string;
      maxAllocatableFormatted: string;
      suggestedFix: string;
    };

export function formatTokenAmount(raw: bigint, decimals: number, maxFractionDigits = decimals): string {
  const formatted = formatUnits(raw, decimals);
  const [whole, fraction = ''] = formatted.split('.');
  if (maxFractionDigits <= 0 || !fraction) return whole;

  const trimmed = fraction.slice(0, maxFractionDigits).replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function parseAllocationAmount(amountInput: string, decimals: number): bigint {
  const amount = amountInput.trim();
  if (!amount || Number(amount) <= 0 || !Number.isFinite(Number(amount))) {
    throw new Error('Enter a valid amount greater than zero.');
  }
  return parseUnits(amount, decimals);
}

export function validateAllocationRequest(input: {
  amountInput: string;
  idleRaw: bigint;
  assetAddress: Address;
  assetSymbol: string;
  assetDecimals: number;
  chainId: number | undefined;
  expectedChainId?: number;
}): AllocationValidationResult {
  const expectedChainId = input.expectedChainId ?? ARBITRUM_ONE_CHAIN_ID;
  const idleFormatted = formatTokenAmount(input.idleRaw, input.assetDecimals, input.assetDecimals === 6 ? 2 : 8);

  if (input.chainId !== expectedChainId) {
    return {
      ok: false,
      reason: 'wrong-chain',
      message: 'Switch to Arbitrum One to operate the Axiom Treasury Vault.',
      parsedAmountRaw: null,
      idleRaw: input.idleRaw,
      idleFormatted,
      maxAllocatableFormatted: idleFormatted,
      suggestedFix: 'Switch wallet network to Arbitrum One before simulating or sending transactions.',
    };
  }

  let parsedAmountRaw: bigint;
  try {
    parsedAmountRaw = parseAllocationAmount(input.amountInput, input.assetDecimals);
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid-amount',
      message: error instanceof Error ? error.message : 'Enter a valid amount greater than zero.',
      parsedAmountRaw: null,
      idleRaw: input.idleRaw,
      idleFormatted,
      maxAllocatableFormatted: idleFormatted,
      suggestedFix: `Enter an amount up to ${idleFormatted} ${input.assetSymbol}.`,
    };
  }

  if (parsedAmountRaw > input.idleRaw) {
    return {
      ok: false,
      reason: 'insufficient-idle',
      message: 'Insufficient idle balance. Deposit asset into the vault before allocating.',
      parsedAmountRaw,
      idleRaw: input.idleRaw,
      idleFormatted,
      maxAllocatableFormatted: idleFormatted,
      suggestedFix: `vault.depositToken(${input.assetAddress}, amount)`,
    };
  }

  return {
    ok: true,
    parsedAmountRaw,
    idleRaw: input.idleRaw,
    idleFormatted,
    maxAllocatableFormatted: idleFormatted,
  };
}
