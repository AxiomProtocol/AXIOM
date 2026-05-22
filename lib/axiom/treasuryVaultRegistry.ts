import { getAddress, type Address } from 'viem';

export const ARBITRUM_ONE_CHAIN_ID = 42161;

function checksum(address: string): Address {
  return getAddress(address.toLowerCase());
}

function resolveAddress(envValue: string | undefined, fallback: Address, deprecated: Address[] = []): Address {
  if (!envValue) return fallback;

  try {
    const candidate = checksum(envValue);
    if (deprecated.some((addr) => addr.toLowerCase() === candidate.toLowerCase())) {
      return fallback;
    }
    return candidate;
  } catch {
    return fallback;
  }
}

const DEPRECATED = {
  treasuryVault: checksum('0x0d04742A8b5A8e3351B9273e585E980f6e0F46F8'),
  aaveV3UsdcStrategy: checksum('0xf01456B53546031568E83726A9F9C0A8ce5c68C2'),
} as const;

export const TREASURY_VAULT_REGISTRY = {
  chain: {
    id: ARBITRUM_ONE_CHAIN_ID,
    name: 'Arbitrum One',
  },
  contracts: {
    treasuryVault: resolveAddress(
      process.env.NEXT_PUBLIC_AXIOM_TREASURY_VAULT_ADDRESS,
      checksum('0x8c9761D465CB95306266a68FF8935C4690EC6092'),
      [DEPRECATED.treasuryVault],
    ),
    strategyManager: resolveAddress(
      process.env.NEXT_PUBLIC_AXIOM_STRATEGY_MANAGER_ADDRESS,
      checksum('0x432dFEe1DAb2D7d423690819DC65C033FE266E8e'),
    ),
    axusd: checksum('0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7'),
    usdc: checksum('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
    weth: checksum('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
    thbill: checksum('0xfDD22Ce6D1F66bc0Ec89b20BF16CcB6670F55A5a'),
  },
  strategies: {
    aaveV3Usdc: {
      name: 'Aave v3 USDC',
      address: resolveAddress(
        process.env.NEXT_PUBLIC_AXIOM_AAVE_V3_STRATEGY_ADDRESS,
        checksum('0x7d500015C5765456C16Ce2CF38AAF14075C01DD4'),
        [DEPRECATED.aaveV3UsdcStrategy],
      ),
      asset: checksum('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
      assetSymbol: 'USDC',
      assetDecimals: 6,
    },
    camelotUsdcAxusd: {
      name: 'Camelot USDC/AXUSD',
      address: resolveAddress(
        process.env.NEXT_PUBLIC_AXIOM_CAMELOT_STRATEGY_ADDRESS,
        checksum('0x511441D31e629d7513004a692c2dB67438151696'),
      ),
      asset: checksum('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
      assetSymbol: 'USDC',
      assetDecimals: 6,
    },
    eulerUsdcTheo: {
      name: 'Euler v2 USDC Theo',
      address: resolveAddress(
        process.env.NEXT_PUBLIC_EULER_USDC_THEO_STRATEGY_ADDRESS,
        checksum('0x82cBB154e1684C4720c9f5fF16E685F2de28Bd68'),
      ),
      asset: checksum('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
      assetSymbol: 'USDC',
      assetDecimals: 6,
    },
    eulerThbillTheo: {
      name: 'Euler v2 thBILL Theo',
      address: resolveAddress(
        process.env.NEXT_PUBLIC_EULER_THBILL_THEO_STRATEGY_ADDRESS,
        checksum('0x6CBF5Bf949166AaDD439bDd410eDF5FC55Ee9215'),
      ),
      asset: checksum('0xfDD22Ce6D1F66bc0Ec89b20BF16CcB6670F55A5a'),
      assetSymbol: 'thBILL',
      assetDecimals: 6,
    },
    eulerWeth: {
      name: 'Euler v2 WETH',
      address: resolveAddress(
        process.env.NEXT_PUBLIC_EULER_WETH_ARBITRUM_STRATEGY_ADDRESS,
        checksum('0x7a4f0A3290e7152779FCf00eB32183Cb1E0E1211'),
      ),
      asset: checksum('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
      assetSymbol: 'WETH',
      assetDecimals: 18,
    },
  },
} as const;

export type TreasuryStrategyKey = keyof typeof TREASURY_VAULT_REGISTRY.strategies;
