import { ethers } from 'ethers';
import { AXUSD_ORACLE_ADAPTER, ERC7726_ABI, LEGACY_ORACLE, isOracleDeployed } from '../../../src/config/oracleConfig';

const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';

export const EULER_CONFIG = {
  EVK_FACTORY: '0x29a56a1b8214D9Cf7c5561811750D5cBDb45CC8e',
  EVC: '0x0C9a3dd6b8F28529d72d7f9cE918D493519EE383',
  ORACLE_ADAPTER_REGISTRY: LEGACY_ORACLE.ORACLE_ADAPTER_REGISTRY,
  ERC7726_ORACLE: AXUSD_ORACLE_ADAPTER,
} as const;

export const AXUSD_ADDRESS = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';
export const USDY_ADDRESS = '0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d';
export const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
export const USTBL_ADDRESS = '0x3096e7bfd0878cc65be71f8899bc4cfb57187ba3';
export const AXIOM_MULTISIG = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

export const OBSERVATION_END_DATE = new Date('2026-03-26T00:00:00Z');

export function isObservationWindowActive(): boolean {
  return new Date() < OBSERVATION_END_DATE;
}

export function getObservationStatus(): {
  active: boolean;
  endDate: string;
  daysRemaining: number;
} {
  const now = new Date();
  const active = now < OBSERVATION_END_DATE;
  const daysRemaining = Math.max(0, Math.ceil((OBSERVATION_END_DATE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  return {
    active,
    endDate: '2026-03-26',
    daysRemaining
  };
}

const TOKEN_DECIMALS: Record<string, number> = {
  [AXUSD_ADDRESS.toLowerCase()]: 18,
  [USDY_ADDRESS.toLowerCase()]: 18,
  [USDC_ADDRESS.toLowerCase()]: 6,
  [USTBL_ADDRESS.toLowerCase()]: 18
};

const EVK_FACTORY_ABI = [
  'function createProxy(address implementation, bool upgradeable, bytes calldata trailingData) external returns (address)',
  'function getProxyConfig(address proxy) external view returns (bool upgradeable, address implementation, address trailingData)'
];

const EULER_VAULT_ABI = [
  'function asset() external view returns (address)',
  'function totalAssets() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function totalBorrows() external view returns (uint256)',
  'function interestRate() external view returns (uint256)',
  'function governor() external view returns (address)',
  'function LTV(address collateral) external view returns (uint16 borrowLTV, uint16 liquidationLTV, uint16 initialLiquidationLTV, uint48 targetTimestamp, uint32 rampDuration)',
  'function setLTV(address collateral, uint16 borrowLTV, uint16 liquidationLTV, uint32 rampDuration) external',
  'function setGovernorAdmin(address newGovernorAdmin) external'
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

export interface EulerVaultParams {
  asset: string;
  oracle: string;
  unitOfAccount: string;
  upgradeable: boolean;
  governor: string;
}

export interface EulerVaultInfo {
  address: string;
  asset: string;
  assetSymbol: string;
  totalAssets: string;
  totalBorrows: string;
  utilizationRate: number;
  interestRate: number;
  governor: string;
  collateralConfigs: {
    token: string;
    symbol: string;
    borrowLTV: number;
    liquidationLTV: number;
  }[];
}

export interface ProposedVault {
  name: string;
  asset: string;
  assetSymbol: string;
  governor: string;
  collaterals: {
    token: string;
    symbol: string;
    borrowLTV: number;
    liquidationLTV: number;
  }[];
  estimatedAPY: number;
  description: string;
  vaultType: 'governed' | 'ungoverned';
  status: 'proposed' | 'ready' | 'deployed' | 'blocked';
  blockReason?: string;
}

export interface OraclePriceResult {
  priceUsd: number;
  priceWad: string;
  source: 'erc7726_on_chain' | 'api_psm' | 'api_static';
  oracleAddress: string;
  oracleDeployed: boolean;
}

class EulerVaultService {
  private provider: ethers.JsonRpcProvider;
  private evkFactory: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.evkFactory = new ethers.Contract(EULER_CONFIG.EVK_FACTORY, EVK_FACTORY_ABI, this.provider);
  }

  /**
   * Returns AXUSD/USD price using the ERC-7726 standardized interface.
   *
   * When the AXIOMOracleAdapter is deployed on-chain, calls the canonical
   * ERC-7726 interface: getQuote(1e6, USDC, AXUSD) which returns how many
   * AXUSD wei equal 1 USDC (normalized from 6-dec USDC to 18-dec AXUSD).
   * USD price = 1 / (outAmount / 1e18) → price of 1 AXUSD in USD.
   *
   * Falls back to the off-chain /api/oracle/axusd-price endpoint (which
   * internally applies the same PSM-ratio → CoinGecko → static priority).
   */
  async getAxusdOraclePrice(baseUrl?: string): Promise<OraclePriceResult> {
    const WAD = BigInt('1000000000000000000');
    const USDC_ADDR = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
    const ACTIVE_AXUSD_ADDR = '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C';

    // ── Try on-chain ERC-7726 oracle via getQuote() ───────────────────────────
    // getQuote(inAmount, base, quote) is the standardized ERC-7726 interface.
    // We quote 1 USDC (1e6 units, 6 dec) → AXUSD (18 dec).
    // outAmount ≥ 1e18 means AXUSD is worth ≤ 1 USDC → price = 1e18 / outAmount
    if (isOracleDeployed()) {
      try {
        const oracleContract = new ethers.Contract(
          AXUSD_ORACLE_ADAPTER,
          ERC7726_ABI as string[],
          this.provider
        );
        const ONE_USDC = BigInt(1_000_000); // 1 USDC in 6-dec units
        const outAmount: bigint = await oracleContract.getQuote(ONE_USDC, USDC_ADDR, ACTIVE_AXUSD_ADDR);
        // outAmount = AXUSD wei per 1 USDC. Price of 1 AXUSD in USD:
        // 1 USDC = outAmount / 1e18 AXUSD → 1 AXUSD = (1e18 / outAmount) USDC ≈ USD
        const priceWadBig = outAmount > 0n ? (WAD * WAD) / outAmount : WAD;
        const priceUsd = parseFloat(ethers.formatEther(priceWadBig));
        return {
          priceUsd,
          priceWad: priceWadBig.toString(),
          source: 'erc7726_on_chain',
          oracleAddress: AXUSD_ORACLE_ADAPTER,
          oracleDeployed: true,
        };
      } catch {
        // fall through to API
      }
    }

    // ── Off-chain oracle API fallback ─────────────────────────────────────────
    if (baseUrl) {
      try {
        const res = await fetch(`${baseUrl}/api/oracle/axusd-price`);
        if (res.ok) {
          const data = await res.json() as {
            axusdUsdPrice?: string;
            axusdUsdPriceWad?: string;
            source?: string;
            erc7726Quote?: { outAmount?: string } | null;
          };
          if (data.axusdUsdPrice) {
            return {
              priceUsd: parseFloat(data.axusdUsdPrice),
              priceWad: data.axusdUsdPriceWad ?? WAD.toString(),
              source: data.source?.includes('psm') ? 'api_psm' : 'api_static',
              oracleAddress: AXUSD_ORACLE_ADAPTER,
              oracleDeployed: false,
            };
          }
        }
      } catch {}
    }

    // ── Static 1:1 parity ─────────────────────────────────────────────────────
    return {
      priceUsd: 1.0,
      priceWad: WAD.toString(),
      source: 'api_static',
      oracleAddress: AXUSD_ORACLE_ADAPTER,
      oracleDeployed: false,
    };
  }

  getProposedVaults(): ProposedVault[] {
    return [
      {
        name: 'AXUSD Lending Vault',
        asset: AXUSD_ADDRESS,
        assetSymbol: 'AXUSD',
        governor: AXIOM_MULTISIG,
        collaterals: [
          { token: USDY_ADDRESS, symbol: 'USDY', borrowLTV: 85, liquidationLTV: 90 },
          { token: USDC_ADDRESS, symbol: 'USDC', borrowLTV: 88, liquidationLTV: 92 },
          { token: USTBL_ADDRESS, symbol: 'USTBL', borrowLTV: 85, liquidationLTV: 90 }
        ],
        estimatedAPY: 8,
        description: 'Full-featured AXUSD lending vault with multi-collateral support. Accepts USDY, USDC, and USTBL as collateral via cross-vault borrowing.',
        vaultType: 'governed',
        status: 'ready'
      },
      {
        name: 'AXUSD Conservative Vault',
        asset: AXUSD_ADDRESS,
        assetSymbol: 'AXUSD',
        governor: ethers.ZeroAddress,
        collaterals: [
          { token: USDC_ADDRESS, symbol: 'USDC', borrowLTV: 80, liquidationLTV: 85 }
        ],
        estimatedAPY: 5,
        description: 'Immutable, ungoverned vault for maximum security. USDC-only collateral with conservative parameters.',
        vaultType: 'ungoverned',
        status: 'ready'
      }
    ];
  }

  async getVaultInfo(vaultAddress: string): Promise<EulerVaultInfo | null> {
    try {
      const vault = new ethers.Contract(vaultAddress, EULER_VAULT_ABI, this.provider);
      
      const [asset, totalAssets, totalBorrows, interestRate, governor] = await Promise.all([
        vault.asset(),
        vault.totalAssets(),
        vault.totalBorrows(),
        vault.interestRate(),
        vault.governor()
      ]);

      const assetContract = new ethers.Contract(asset, ERC20_ABI, this.provider);
      const assetSymbol = await assetContract.symbol();

      const assetDecimals = TOKEN_DECIMALS[asset.toLowerCase()] || 18;
      const totalAssetsNum = parseFloat(ethers.formatUnits(totalAssets, assetDecimals));
      const totalBorrowsNum = parseFloat(ethers.formatUnits(totalBorrows, assetDecimals));
      const utilization = totalAssetsNum > 0 ? (totalBorrowsNum / totalAssetsNum) * 100 : 0;
      const rate = parseFloat(ethers.formatUnits(interestRate, 27)) * 100;

      return {
        address: vaultAddress,
        asset,
        assetSymbol,
        totalAssets: totalAssetsNum.toFixed(2),
        totalBorrows: totalBorrowsNum.toFixed(2),
        utilizationRate: utilization,
        interestRate: rate,
        governor,
        collateralConfigs: []
      };
    } catch (error) {
      return null;
    }
  }

  calculateAPY(utilization: number): number {
    const kink1 = 80;
    const kink2 = 90;
    const rateAtKink1 = 5;
    const rateAtKink2 = 10;
    const maxRate = 100;

    if (utilization <= kink1) {
      return (utilization / kink1) * rateAtKink1;
    } else if (utilization <= kink2) {
      return rateAtKink1 + ((utilization - kink1) / (kink2 - kink1)) * (rateAtKink2 - rateAtKink1);
    } else {
      return rateAtKink2 + ((utilization - kink2) / (100 - kink2)) * (maxRate - rateAtKink2);
    }
  }

  generateDeploymentParams(vault: ProposedVault): {
    asset: string;
    upgradeable: boolean;
    governor: string;
    collateralConfigs: {
      collateral: string;
      borrowLTV: number;
      liquidationLTV: number;
    }[];
  } {
    return {
      asset: vault.asset,
      upgradeable: vault.vaultType === 'governed',
      governor: vault.governor,
      collateralConfigs: vault.collaterals.map(c => ({
        collateral: c.token,
        borrowLTV: c.borrowLTV * 100,
        liquidationLTV: c.liquidationLTV * 100
      }))
    };
  }

  getDeploymentGuide(): {
    steps: { step: number; title: string; description: string; action: string }[];
    estimatedGas: string;
    requirements: string[];
    eulerAdvantages: string[];
  } {
    return {
      steps: [
        {
          step: 1,
          title: 'Configure Oracle',
          description: 'Set up price oracle for AXUSD and collateral assets',
          action: 'Deploy oracle adapter or use existing Chainlink integration'
        },
        {
          step: 2,
          title: 'Deploy Vault',
          description: 'Create AXUSD vault via EVK Factory',
          action: 'Call createProxy() on EVK Factory contract'
        },
        {
          step: 3,
          title: 'Configure Collateral',
          description: 'Set LTV parameters for each accepted collateral',
          action: 'Call setLTV() for USDY, USDC, USTBL'
        },
        {
          step: 4,
          title: 'Set Governor',
          description: 'Transfer governance to Axiom multisig',
          action: 'Call setGovernorAdmin() with multisig address'
        },
        {
          step: 5,
          title: 'Enable Cross-Vault',
          description: 'Connect vault to EVC for cross-vault collateral',
          action: 'Configure EVC controller permissions'
        },
        {
          step: 6,
          title: 'Seed Liquidity',
          description: 'Deposit initial AXUSD to enable borrowing',
          action: 'Call deposit() with initial AXUSD amount'
        }
      ],
      estimatedGas: '~800,000 gas (~$3-8 on Arbitrum)',
      requirements: [
        'AXUSD contract deployed and verified',
        'Collateral tokens available on Arbitrum',
        'Oracle adapters configured',
        'Axiom multisig wallet ready',
        'ETH for gas fees',
        'Initial AXUSD for seed liquidity'
      ],
      eulerAdvantages: [
        'Cross-vault collateral via EVC',
        'Batched operations (one-click leverage)',
        'Customizable interest rate models',
        'Hook system for KYC/compliance',
        'Governed or ungoverned vault options'
      ]
    };
  }

  getIntegrationStatus(): {
    protocol: string;
    networkSupported: boolean;
    contractsVerified: boolean;
    permissionless: boolean;
    readyForDeployment: boolean;
    estimatedCost: string;
    uniqueFeatures: string[];
  } {
    return {
      protocol: 'Euler Finance',
      networkSupported: true,
      contractsVerified: true,
      permissionless: true,
      readyForDeployment: true,
      estimatedCost: '$10-30 (gas only)',
      uniqueFeatures: [
        'Cross-vault collateral (EVC)',
        'Governed vs ungoverned vaults',
        'Custom hooks (KYC, pause, limits)',
        'Batched transactions',
        'Dutch auction liquidations'
      ]
    };
  }

  compareWithMorpho(): {
    feature: string;
    morpho: string;
    euler: string;
    recommendation: string;
  }[] {
    return [
      {
        feature: 'Market Creation',
        morpho: 'Permissionless, isolated markets',
        euler: 'Permissionless, multi-collateral vaults',
        recommendation: 'Both suitable'
      },
      {
        feature: 'Collateral Types',
        morpho: 'One collateral per market',
        euler: 'Multiple collaterals via EVC',
        recommendation: 'Euler for flexibility'
      },
      {
        feature: 'Governance',
        morpho: 'Optional curator role',
        euler: 'Governed or ungoverned vaults',
        recommendation: 'Both offer options'
      },
      {
        feature: 'Gas Efficiency',
        morpho: 'Very efficient (~100k per operation)',
        euler: 'Efficient with batching',
        recommendation: 'Morpho slightly better'
      },
      {
        feature: 'TVL on Arbitrum',
        morpho: '$271M+',
        euler: '$50M+',
        recommendation: 'Morpho has more liquidity'
      },
      {
        feature: 'Composability',
        morpho: 'ERC-4626 compatible',
        euler: 'ERC-4626 + EVC ecosystem',
        recommendation: 'Euler for advanced DeFi'
      }
    ];
  }
}

export const eulerVaultService = new EulerVaultService();
export default EulerVaultService;
