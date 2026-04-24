import type { PaymasterEstimate } from './types';

export const CIRCLE_PAYMASTER_ADDRESS = '0x00000000301b5f3f3c3c3c3c3c3c3c3c3c3c3c3c' as const;

export const CIRCLE_USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;

const USDC_SURCHARGE_BPS = 1000;

export function buildPaymasterAndData(
  paymasterAddress: string,
  validUntil: number,
  validAfter: number
): `0x${string}` {
  const validUntilHex = validUntil.toString(16).padStart(12, '0');
  const validAfterHex = validAfter.toString(16).padStart(12, '0');
  const encoded = `${paymasterAddress}${validUntilHex}${validAfterHex}`;
  return encoded as `0x${string}`;
}

export function estimateGasInUsdc(
  baseGasWei: bigint,
  ethPriceUsd: number,
  usdcDecimals = 6
): PaymasterEstimate {
  const surcharge = (baseGasWei * BigInt(USDC_SURCHARGE_BPS)) / BigInt(10000);
  const totalEth = baseGasWei + surcharge;

  const ethAmount = Number(totalEth) / 1e18;
  const usdcRaw = ethAmount * ethPriceUsd;
  const usdcFormatted = usdcRaw.toFixed(usdcDecimals > 4 ? 4 : usdcDecimals);

  return {
    baseGasEth: baseGasWei,
    surchargeEth: surcharge,
    totalEth,
    totalUsdc: usdcFormatted,
  };
}

export async function fetchEthPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
      { next: { revalidate: 60 } } as RequestInit
    );
    const data = await res.json();
    return data?.ethereum?.usd ?? 3000;
  } catch {
    return 3000;
  }
}
