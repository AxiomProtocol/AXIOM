import { ethers } from 'ethers';
import { getArbitrumRpcUrl } from '../../../lib/config';

const RPC_URL = getArbitrumRpcUrl();

export const MORPHO_CONFIG = {
  MORPHO_CORE: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
  ADAPTIVE_CURVE_IRM: '0x870aC11D48B15DB9a138Cf899d20F13F79Ba00BC',
  CHAINLINK_ORACLE_FACTORY: '0x4E68CF95d8a7EE3a9FDE8e4cDBD8A6C7d0C76C7E'
} as const;

export const AXUSD_ADDRESS = '0xA7907b6B6169D66012Bf1c36f27a72C06AEC065c';
export const USDY_ADDRESS = '0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d';
export const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
export const USTBL_ADDRESS = '0x3096e7bfd0878cc65be71f8899bc4cfb57187ba3';

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

const MORPHO_ABI = [
  'function createMarket((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)) external returns (bytes32 id)',
  'function market(bytes32 id) external view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)',
  'function idToMarketParams(bytes32 id) external view returns (address loanToken, address collateralToken, address oracle, address irm, uint256 lltv)',
  'function supply((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv), uint256 assets, uint256 shares, address onBehalf, bytes data) external returns (uint256 assetsSupplied, uint256 sharesSupplied)',
  'function withdraw((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv), uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256 assetsWithdrawn, uint256 sharesWithdrawn)',
  'function borrow((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv), uint256 assets, uint256 shares, address onBehalf, address receiver) external returns (uint256 assetsBorrowed, uint256 sharesBorrowed)',
  'function repay((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv), uint256 assets, uint256 shares, address onBehalf, bytes data) external returns (uint256 assetsRepaid, uint256 sharesRepaid)',
  'function supplyCollateral((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv), uint256 assets, address onBehalf, bytes data) external',
  'function withdrawCollateral((address loanToken, address collateralToken, address oracle, address irm, uint256 lltv), uint256 assets, address onBehalf, address receiver) external'
];

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

export interface MorphoMarketParams {
  loanToken: string;
  collateralToken: string;
  oracle: string;
  irm: string;
  lltv: bigint;
}

export interface MorphoMarketInfo {
  id: string;
  loanToken: string;
  collateralToken: string;
  loanTokenSymbol: string;
  collateralTokenSymbol: string;
  totalSupply: string;
  totalBorrow: string;
  utilizationRate: number;
  lltv: number;
  estimatedAPY: number;
}

export interface ProposedMarket {
  name: string;
  loanToken: string;
  loanTokenSymbol: string;
  collateralToken: string;
  collateralTokenSymbol: string;
  lltv: number;
  estimatedAPY: number;
  description: string;
  status: 'proposed' | 'ready' | 'deployed' | 'blocked';
  blockReason?: string;
}

class MorphoMarketService {
  private provider: ethers.JsonRpcProvider;
  private morpho: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.morpho = new ethers.Contract(MORPHO_CONFIG.MORPHO_CORE, MORPHO_ABI, this.provider);
  }

  getProposedMarkets(): ProposedMarket[] {
    return [
      {
        name: 'AXUSD/USDY',
        loanToken: AXUSD_ADDRESS,
        loanTokenSymbol: 'AXUSD',
        collateralToken: USDY_ADDRESS,
        collateralTokenSymbol: 'USDY',
        lltv: 90,
        estimatedAPY: 8,
        description: 'Borrow AXUSD using yield-bearing USDY as collateral. Collateral continues earning 5.35% while deposited.',
        status: 'ready'
      },
      {
        name: 'AXUSD/USDC',
        loanToken: AXUSD_ADDRESS,
        loanTokenSymbol: 'AXUSD',
        collateralToken: USDC_ADDRESS,
        collateralTokenSymbol: 'USDC',
        lltv: 92,
        estimatedAPY: 6,
        description: 'Standard stablecoin borrowing market. Lower risk, lower yield.',
        status: 'ready'
      },
      {
        name: 'AXUSD/USTBL',
        loanToken: AXUSD_ADDRESS,
        loanTokenSymbol: 'AXUSD',
        collateralToken: USTBL_ADDRESS,
        collateralTokenSymbol: 'USTBL',
        lltv: 90,
        estimatedAPY: 7,
        description: 'European T-Bill backed collateral. Collateral earns 4.9% APY.',
        status: 'ready'
      }
    ];
  }

  async getMarketParams(loanToken: string, collateralToken: string, oracle: string, lltv: number): Promise<MorphoMarketParams> {
    return {
      loanToken,
      collateralToken,
      oracle,
      irm: MORPHO_CONFIG.ADAPTIVE_CURVE_IRM,
      lltv: ethers.parseUnits(String(lltv / 100), 18)
    };
  }

  computeMarketId(params: MorphoMarketParams): string {
    const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'address', 'address', 'uint256'],
      [params.loanToken, params.collateralToken, params.oracle, params.irm, params.lltv]
    );
    return ethers.keccak256(encoded);
  }

  async getMarketInfo(marketId: string): Promise<MorphoMarketInfo | null> {
    try {
      const [market, params] = await Promise.all([
        this.morpho.market(marketId),
        this.morpho.idToMarketParams(marketId)
      ]);

      const loanContract = new ethers.Contract(params.loanToken, ERC20_ABI, this.provider);
      const collateralContract = new ethers.Contract(params.collateralToken, ERC20_ABI, this.provider);
      
      const [loanSymbol, collateralSymbol] = await Promise.all([
        loanContract.symbol(),
        collateralContract.symbol()
      ]);

      const loanDecimals = TOKEN_DECIMALS[params.loanToken.toLowerCase()] || 18;
      const totalSupply = parseFloat(ethers.formatUnits(market.totalSupplyAssets, loanDecimals));
      const totalBorrow = parseFloat(ethers.formatUnits(market.totalBorrowAssets, loanDecimals));
      const utilization = totalSupply > 0 ? (totalBorrow / totalSupply) * 100 : 0;
      const lltv = parseFloat(ethers.formatUnits(params.lltv, 18)) * 100;
      const estimatedAPY = this.calculateAPY(utilization);

      return {
        id: marketId,
        loanToken: params.loanToken,
        collateralToken: params.collateralToken,
        loanTokenSymbol: loanSymbol,
        collateralTokenSymbol: collateralSymbol,
        totalSupply: totalSupply.toFixed(2),
        totalBorrow: totalBorrow.toFixed(2),
        utilizationRate: utilization,
        lltv,
        estimatedAPY
      };
    } catch (error) {
      return null;
    }
  }

  calculateAPY(utilization: number): number {
    const targetUtil = 90;
    const baseRate = 0.5;
    const rateAtTarget = 4;
    const maxRate = 50;

    if (utilization <= targetUtil) {
      return baseRate + (utilization / targetUtil) * (rateAtTarget - baseRate);
    } else {
      const excessUtil = (utilization - targetUtil) / (100 - targetUtil);
      return rateAtTarget + excessUtil * (maxRate - rateAtTarget);
    }
  }

  generateDeploymentTx(params: MorphoMarketParams): {
    to: string;
    data: string;
    description: string;
  } {
    const morphoInterface = new ethers.Interface(MORPHO_ABI);
    const data = morphoInterface.encodeFunctionData('createMarket', [
      [params.loanToken, params.collateralToken, params.oracle, params.irm, params.lltv]
    ]);

    return {
      to: MORPHO_CONFIG.MORPHO_CORE,
      data,
      description: `Create Morpho market: Loan=${params.loanToken.slice(0, 10)}..., Collateral=${params.collateralToken.slice(0, 10)}..., LLTV=${ethers.formatUnits(params.lltv, 16)}%`
    };
  }

  getDeploymentGuide(): {
    steps: { step: number; title: string; description: string; action: string }[];
    estimatedGas: string;
    requirements: string[];
  } {
    return {
      steps: [
        {
          step: 1,
          title: 'Configure Oracle',
          description: 'Deploy or verify Chainlink oracle for USDY/USD price feed',
          action: 'Deploy AXUSDOracle contract or use existing Chainlink feed'
        },
        {
          step: 2,
          title: 'Create Market',
          description: 'Call createMarket() on Morpho Core contract',
          action: 'Execute transaction with market parameters'
        },
        {
          step: 3,
          title: 'Verify Market',
          description: 'Confirm market is active and parameters are correct',
          action: 'Query market() function with computed market ID'
        },
        {
          step: 4,
          title: 'Seed Liquidity',
          description: 'Supply initial AXUSD to enable borrowing',
          action: 'Call supply() with initial deposit amount'
        },
        {
          step: 5,
          title: 'Announce Market',
          description: 'Add to Observer Dashboard and announce to community',
          action: 'Update dashboard and publish announcement'
        }
      ],
      estimatedGas: '~500,000 gas (~$2-5 on Arbitrum)',
      requirements: [
        'AXUSD contract must be deployed and verified',
        'Collateral token (USDY/USDC) must be available on Arbitrum',
        'Oracle must provide accurate price feeds',
        'Deployer must have ETH for gas',
        'Deployer must have initial AXUSD for seed liquidity'
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
  } {
    return {
      protocol: 'Morpho',
      networkSupported: true,
      contractsVerified: true,
      permissionless: true,
      readyForDeployment: true,
      estimatedCost: '$5-20 (gas only)'
    };
  }
}

export const morphoMarketService = new MorphoMarketService();
export default MorphoMarketService;
