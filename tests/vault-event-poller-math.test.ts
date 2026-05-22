import { describe, expect, it } from 'vitest';
import { eventAmountToUsd } from '../lib/treasury/vault/eventPoller';

const USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const AXUSD = '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7';
const THBILL = '0xfDD22Ce6D1F66bc0Ec89b20BF16CcB6670F55A5a';

describe('vault event poller amount math', () => {
  it('decodes USDC event amounts with 6 decimals', async () => {
    await expect(eventAmountToUsd({} as never, 125_000_000n, USDC)).resolves.toBe(125);
  });

  it('decodes AXUSD event amounts with 18 decimals', async () => {
    await expect(eventAmountToUsd({} as never, 125_000_000_000_000_000_000n, AXUSD)).resolves.toBe(125);
  });

  it('decodes thBILL event amounts with its 6-decimal Arbitrum token units', async () => {
    await expect(eventAmountToUsd({} as never, 125_000_000n, THBILL)).resolves.toBe(125);
  });

  it('fails closed for events without an asset address', async () => {
    await expect(eventAmountToUsd({} as never, 125_000_000_000_000_000_000n, null)).resolves.toBe(0);
  });
});
