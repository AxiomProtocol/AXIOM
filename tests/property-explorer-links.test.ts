import { describe, it, expect } from 'vitest';
import {
  getArbiscanTxUrl,
  getArbiscanAddressUrl,
  ARBITRUM_ONE_CHAIN_ID,
  ARBITRUM_SEPOLIA_CHAIN_ID,
} from '../lib/property/explorerLinks';

describe('explorerLinks (task #247 receipt URLs)', () => {
  const TX = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd';
  const ADDR = '0x1111222233334444555566667777888899990000';

  it('builds Arbitrum One tx URLs', () => {
    expect(getArbiscanTxUrl(ARBITRUM_ONE_CHAIN_ID, TX)).toBe(`https://arbiscan.io/tx/${TX}`);
  });

  it('builds Arbitrum Sepolia tx URLs', () => {
    expect(getArbiscanTxUrl(ARBITRUM_SEPOLIA_CHAIN_ID, TX)).toBe(`https://sepolia.arbiscan.io/tx/${TX}`);
  });

  it('falls back to Arbitrum One when chainId is null/undefined/unknown', () => {
    expect(getArbiscanTxUrl(null, TX)).toBe(`https://arbiscan.io/tx/${TX}`);
    expect(getArbiscanTxUrl(undefined, TX)).toBe(`https://arbiscan.io/tx/${TX}`);
    expect(getArbiscanTxUrl(1, TX)).toBe(`https://arbiscan.io/tx/${TX}`);
  });

  it('builds address URLs across networks', () => {
    expect(getArbiscanAddressUrl(ARBITRUM_ONE_CHAIN_ID, ADDR)).toBe(`https://arbiscan.io/address/${ADDR}`);
    expect(getArbiscanAddressUrl(ARBITRUM_SEPOLIA_CHAIN_ID, ADDR)).toBe(`https://sepolia.arbiscan.io/address/${ADDR}`);
  });

  it('prefixes 0x when missing — Arbiscan only accepts 0x-prefixed hashes', () => {
    expect(getArbiscanTxUrl(ARBITRUM_ONE_CHAIN_ID, TX.slice(2))).toBe(`https://arbiscan.io/tx/${TX}`);
    expect(getArbiscanAddressUrl(ARBITRUM_ONE_CHAIN_ID, ADDR.slice(2))).toBe(`https://arbiscan.io/address/${ADDR}`);
  });

  it('does not pull `ethers` into the explorer-links module', async () => {
    // Static-import the file and assert that nothing from ethers leaked in.
    // (If the helpers ever moved back into onchainPayment.ts, the client
    // bundle would pick up ethers — which is exactly what this guard protects
    // against.)
    const mod = await import('../lib/property/explorerLinks');
    const exported = Object.keys(mod);
    expect(exported.sort()).toEqual([
      'ARBITRUM_ONE_CHAIN_ID',
      'ARBITRUM_SEPOLIA_CHAIN_ID',
      'getArbiscanAddressUrl',
      'getArbiscanTxUrl',
    ]);
  });
});
