import { ethers } from 'ethers';
<<<<<<< HEAD
import { getArbitrumRpcUrl } from '../../../lib/config';

const RPC_URL = getArbitrumRpcUrl();
=======

const RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
>>>>>>> a71dd51e2ca25c5fb2013ac140a4390f21404a26

export const TREASURY_PRODUCTS = {
  BUIDL: {
    name: 'BlackRock BUIDL',
    symbol: 'BUIDL',
    address: '0x2893Ef551B6dD69F661Ac00F11D93E5Dc5Dc0e99',
    decimals: 18,
    type: 'tokenized-treasury',
    provider: 'BlackRock',
    apy: 5.0,
    minInvestment: 100000,
    accessType: 'institutional',
    kycProvider: 'Securitize',
    description: 'USD Institutional Digital Liquidity Fund - tokenized US Treasury fund'
  },
  USDY: {
    name: 'Ondo US Dollar Yield',
    symbol: 'USDY',
    address: '0x35e050d3c0ec2d29d269a8ecea763a183bdf9a9d',
    decimals: 18,
    type: 'yield-bearing-stablecoin',
    provider: 'Ondo Finance',
    apy: 5.35,
    minInvestment: 0,
    accessType: 'non-us-only',
    kycProvider: 'Ondo',
    description: 'Yield-bearing stablecoin backed by US Treasuries and bank deposits'
  },
  BENJI: {
    name: 'Franklin Templeton BENJI',
    symbol: 'BENJI',
    address: '0x0Bb4D3e88243F4A057Db77341e6916B0e449b158',
    decimals: 18,
    type: 'money-market-fund',
    provider: 'Franklin Templeton',
    apy: 4.8,
    minInvestment: 1000,
    accessType: 'institutional',
    kycProvider: 'Franklin Templeton',
    description: 'Tokenized money market fund on Arbitrum'
  },
  USTBL: {
    name: 'Spiko US T-Bill',
    symbol: 'USTBL',
    address: '0x3096e7bfd0878cc65be71f8899bc4cfb57187ba3',
    decimals: 18,
    type: 'tokenized-tbill',
    provider: 'Spiko',
    apy: 4.9,
    minInvestment: 0,
    accessType: 'european',
    kycProvider: 'Spiko',
    description: 'Tokenized US Treasury bills from Paris-based issuer'
  }
} as const;

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)'
];

export interface TreasuryProductInfo {
  symbol: string;
  name: string;
  address: string;
  totalSupply: string;
  apy: number;
  provider: string;
  accessType: string;
  description: string;
}

export interface TreasuryBalance {
  symbol: string;
  balance: string;
  valueUSD: string;
}

export interface TreasuryAllocation {
  totalValueUSD: string;
  products: {
    symbol: string;
    balance: string;
    valueUSD: string;
    percentage: number;
  }[];
}

class InstitutionalTreasuryService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
  }

  async getProductInfo(productKey: keyof typeof TREASURY_PRODUCTS): Promise<TreasuryProductInfo> {
    const product = TREASURY_PRODUCTS[productKey];
    const contract = new ethers.Contract(product.address, ERC20_ABI, this.provider);

    try {
      const totalSupply = await contract.totalSupply();
      
      return {
        symbol: product.symbol,
        name: product.name,
        address: product.address,
        totalSupply: ethers.formatUnits(totalSupply, product.decimals),
        apy: product.apy,
        provider: product.provider,
        accessType: product.accessType,
        description: product.description
      };
    } catch (error) {
      return {
        symbol: product.symbol,
        name: product.name,
        address: product.address,
        totalSupply: '0',
        apy: product.apy,
        provider: product.provider,
        accessType: product.accessType,
        description: product.description
      };
    }
  }

  async getAllProducts(): Promise<TreasuryProductInfo[]> {
    const products = await Promise.all([
      this.getProductInfo('BUIDL'),
      this.getProductInfo('USDY'),
      this.getProductInfo('BENJI'),
      this.getProductInfo('USTBL')
    ]);
    return products;
  }

  async getBalance(productKey: keyof typeof TREASURY_PRODUCTS, walletAddress: string): Promise<TreasuryBalance> {
    const product = TREASURY_PRODUCTS[productKey];
    const contract = new ethers.Contract(product.address, ERC20_ABI, this.provider);

    try {
      const balance = await contract.balanceOf(walletAddress);
      const formattedBalance = ethers.formatUnits(balance, product.decimals);
      
      return {
        symbol: product.symbol,
        balance: formattedBalance,
        valueUSD: formattedBalance
      };
    } catch (error) {
      return {
        symbol: product.symbol,
        balance: '0',
        valueUSD: '0'
      };
    }
  }

  async getTreasuryAllocation(treasuryAddress: string): Promise<TreasuryAllocation> {
    const balances = await Promise.all([
      this.getBalance('BUIDL', treasuryAddress),
      this.getBalance('USDY', treasuryAddress),
      this.getBalance('BENJI', treasuryAddress),
      this.getBalance('USTBL', treasuryAddress)
    ]);

    const totalValue = balances.reduce((sum, b) => sum + parseFloat(b.valueUSD), 0);

    const products = balances.map(b => ({
      symbol: b.symbol,
      balance: b.balance,
      valueUSD: b.valueUSD,
      percentage: totalValue > 0 ? (parseFloat(b.valueUSD) / totalValue) * 100 : 0
    }));

    return {
      totalValueUSD: totalValue.toFixed(2),
      products
    };
  }

  async getMarketOverview(): Promise<{
    totalRWAOnArbitrum: string;
    products: TreasuryProductInfo[];
    stepProgramInfo: {
      phase: string;
      totalAllocated: string;
      yieldGenerated: string;
    };
  }> {
    const products = await this.getAllProducts();
    
    const totalSupply = products.reduce((sum, p) => sum + parseFloat(p.totalSupply), 0);

    return {
      totalRWAOnArbitrum: `$${(totalSupply / 1000000).toFixed(1)}M+`,
      products,
      stepProgramInfo: {
        phase: 'STEP 2.0',
        totalAllocated: '$45M+',
        yieldGenerated: '$700K+'
      }
    };
  }

  getIntegrationStatus(): {
    observationMode: boolean;
    readOnlyAvailable: boolean;
    capitalDeploymentBlocked: boolean;
    products: {
      symbol: string;
      integrationReady: boolean;
      capitalBlocked: boolean;
      accessRequirements: string;
    }[];
  } {
    return {
      observationMode: true,
      readOnlyAvailable: true,
      capitalDeploymentBlocked: true,
      products: [
        {
          symbol: 'BUIDL',
          integrationReady: true,
          capitalBlocked: true,
          accessRequirements: 'Securitize KYC, Institutional investor status'
        },
        {
          symbol: 'USDY',
          integrationReady: true,
          capitalBlocked: true,
          accessRequirements: 'Non-US investor verification via Ondo'
        },
        {
          symbol: 'BENJI',
          integrationReady: true,
          capitalBlocked: true,
          accessRequirements: 'Franklin Templeton onboarding'
        },
        {
          symbol: 'USTBL',
          integrationReady: true,
          capitalBlocked: true,
          accessRequirements: 'Spiko European investor verification'
        }
      ]
    };
  }
}

export const institutionalTreasuryService = new InstitutionalTreasuryService();
export default InstitutionalTreasuryService;
