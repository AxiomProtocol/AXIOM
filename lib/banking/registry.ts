/**
 * Banking provider registry.
 *
 * Selects the active provider by `BANKING_PROVIDER` environment variable.
 * Today this returns `null` (no provider active) because the historical
 * banking integration was disabled when the provider account was cancelled
 * on 2026-04-28.
 *
 * To plug in a replacement bank:
 *   1. Implement `BankingProvider` in `lib/banking/providers/<name>.ts`.
 *   2. Add a `case '<name>':` below that constructs and returns it.
 *   3. Set `BANKING_PROVIDER=<name>` (and the provider's own credentials).
 */

import type { BankingProvider, BankingProviderId } from './types';
import { BankingProviderUnavailableError } from './types';

let cached: BankingProvider | null | undefined;

export function getActiveBankingProvider(): BankingProvider | null {
  if (cached !== undefined) return cached;

  const id = (process.env.BANKING_PROVIDER ?? '').toLowerCase() as BankingProviderId | '';
  switch (id) {
    case '':
    case 'none':
      cached = null;
      return cached;

    // Future providers go here:
    //   case 'mercury': cached = new MercuryProvider(); return cached;
    //   case 'column':  cached = new ColumnProvider();  return cached;

    default:
      console.warn(`[banking/registry] BANKING_PROVIDER='${id}' not implemented — returning null`);
      cached = null;
      return cached;
  }
}

export function requireActiveBankingProvider(): BankingProvider {
  const p = getActiveBankingProvider();
  if (!p) {
    throw new BankingProviderUnavailableError(
      'No banking provider configured. Set BANKING_PROVIDER and provider credentials to enable banking rails.',
    );
  }
  return p;
}

export function getBankingProviderStatus(): {
  providerId: BankingProviderId;
  available: boolean;
  reason?: string;
} {
  const id = (process.env.BANKING_PROVIDER ?? 'none').toLowerCase() as BankingProviderId;
  const provider = getActiveBankingProvider();
  if (!provider) {
    return {
      providerId: id,
      available: false,
      reason: id === 'none'
        ? 'No banking provider selected.'
        : `BANKING_PROVIDER='${id}' is not implemented in this build.`,
    };
  }
  return { providerId: provider.id, available: true };
}

export function __resetBankingRegistryForTests(): void {
  cached = undefined;
}
