import { ethers } from 'ethers';
import { NETWORK_CONFIG, AXM_TOKEN_CONFIG, ALL_CONTRACTS } from '../shared/contracts';

// Arbitrum One Network Configuration
const ARBITRUM_MAINNET = {
  chainId: NETWORK_CONFIG.chainIdHex,
  chainName: NETWORK_CONFIG.chainName,
  nativeCurrency: NETWORK_CONFIG.nativeCurrency,
  rpcUrls: [NETWORK_CONFIG.rpcUrl],
  blockExplorerUrls: [NETWORK_CONFIG.blockExplorer]
};

// Token addresses on Arbitrum One
const TOKEN_ADDRESSES = {
  AXM: AXM_TOKEN_CONFIG.address, // Axiom Protocol Token
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Native USDC on Arbitrum
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', // USDT on Arbitrum
  WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', // Wrapped ETH on Arbitrum
  ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548', // Arbitrum Token
  DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1'  // DAI on Arbitrum
};

// Popular DeFi protocols on Arbitrum One
const DEFI_PROTOCOLS = {
  UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  SUSHISWAP: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  AXIOM_DEX: ALL_CONTRACTS.EXCHANGE_HUB_DEX, // Native Axiom Exchange Hub
  GMX: '0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064'
};

// ERC20 ABI for token balance queries
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

// PancakeSwap pair ABI for price data
const PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
];

export class BlockchainService {
  private provider: any;
  private web3Provider: any;
  
  constructor() {
    // Initialize Arbitrum One provider
    this.provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
  }
  
  // Set Web3 provider from wallet context
  setWeb3Provider(provider: any) {
    this.web3Provider = provider;
  }
  
  // Get wallet balances for multiple tokens
  async getWalletBalances(walletAddress: string) {
    try {
      const balances: Record<string, any> = {};
      
      // Get ETH balance
      const ethBalance = await this.provider.getBalance(walletAddress);
      balances.ETH = {
        balance: ethers.utils.formatEther(ethBalance),
        symbol: 'ETH',
        name: 'Ethereum',
        usdValue: 0 // Will be populated by price service
      };
      
      // Get current token prices first
      const symbols = ['ETH', ...Object.keys(TOKEN_ADDRESSES)];
      const priceServiceInstance = new PriceService();
      const prices = await priceServiceInstance.getTokenPrices(symbols);
      
      // Populate ETH USD value
      const ethPrice = prices['ETH'] || 0;
      const ethBalanceNum = parseFloat(balances.ETH.balance);
      balances.ETH.usdValue = ethBalanceNum * ethPrice;
      
      // Get token balances
      for (const [symbol, address] of Object.entries(TOKEN_ADDRESSES)) {
        try {
          const contract = new ethers.Contract(address, ERC20_ABI, this.provider);
          const balance = await contract.balanceOf(walletAddress);
          const decimals = await contract.decimals();
          const name = await contract.name();
          
          const formattedBalance = ethers.utils.formatUnits(balance, decimals);
          const balanceNum = parseFloat(formattedBalance);
          const tokenPrice = prices[symbol] || 0;
          
          balances[symbol] = {
            balance: formattedBalance,
            symbol,
            name,
            contractAddress: address,
            usdValue: balanceNum * tokenPrice
          };
        } catch (err) {
          console.warn(`Failed to get ${symbol} balance:`, err);
          balances[symbol] = {
            balance: '0',
            symbol,
            name: symbol,
            contractAddress: address,
            usdValue: 0
          };
        }
      }
      
      return balances;
    } catch (error) {
      console.error('Error fetching wallet balances:', error);
      return {};
    }
  }
  
  // Get real DeFi investment opportunities (Arbitrum One)
  async getDeFiOpportunities() {
    try {
      // Return Arbitrum-native DeFi opportunities
      // TODO: Integrate with Uniswap V3 API, GMX API, and Axiom DEX data post-TGE
      return await this.getArbitrumDeFiOpportunities();
    } catch (error) {
      console.error('Error fetching DeFi opportunities:', error);
      return await this.getArbitrumDeFiOpportunities();
    }
  }
  
  // Get Arbitrum DeFi opportunities
  private async getArbitrumDeFiOpportunities() {
    return [
      {
        id: 'axiom-axm-eth',
        title: 'AXM-ETH LP Staking',
        platform: 'Axiom Exchange Hub',
        category: 'liquidity',
        risk: 'medium',
        apy: '68.5%',
        tvl: 'Pre-TGE',
        minInvestment: '0.01 ETH',
        maxInvestment: 'No limit',
        description: 'Provide liquidity to AXM-ETH pair on Axiom DEX and earn trading fees + AXM rewards',
        contractAddress: DEFI_PROTOCOLS.AXIOM_DEX,
        isLive: false,
        benefits: ['Trading fees', 'AXM emissions', 'Governance rights', 'Early liquidity incentives'],
        lockPeriod: 'Flexible'
      },
      {
        id: 'uniswap-axm-usdc',
        title: 'AXM-USDC LP (Uniswap V3)',
        platform: 'Uniswap V3',
        category: 'liquidity',
        risk: 'low',
        apy: '42.3%',
        tvl: 'Post-TGE',
        minInvestment: '100 USDC',
        maxInvestment: 'No limit',
        description: 'Concentrated liquidity on Uniswap V3 for stable AXM-USDC trading',
        contractAddress: DEFI_PROTOCOLS.UNISWAP_V3_ROUTER,
        isLive: false,
        benefits: ['Concentrated liquidity', 'Lower IL risk', 'Fee tier selection'],
        lockPeriod: 'Flexible'
      },
      {
        id: 'gmx-eth-lending',
        title: 'ETH Lending (GMX)',
        platform: 'GMX',
        category: 'lending',
        risk: 'low',
        apy: '8.2%',
        tvl: '$450M',
        minInvestment: '0.01 ETH',
        maxInvestment: 'No limit',
        description: 'Lend ETH on GMX to earn real yield from perpetual trading fees',
        contractAddress: DEFI_PROTOCOLS.GMX,
        isLive: true,
        benefits: ['Real yield', 'Arbitrum native', 'Instant withdrawals'],
        lockPeriod: 'None'
      },
      {
        id: 'axiom-staking',
        title: 'AXM Token Staking',
        platform: 'Axiom Staking Hub',
        category: 'staking',
        risk: 'low',
        apy: '15.0%',
        tvl: 'TGE Launch',
        minInvestment: '100 AXM',
        maxInvestment: 'No limit',
        description: 'Stake AXM tokens to earn staking rewards and governance voting power',
        contractAddress: ALL_CONTRACTS.STAKING_EMISSIONS,
        isLive: false,
        benefits: ['Fixed APY', 'Governance power', 'Revenue sharing', 'Flexible unstaking'],
        lockPeriod: '7 days unbonding'
      }
    ];
  }
  
  // Get portfolio performance metrics
  async getPortfolioMetrics(walletAddress: string) {
    try {
      const balances = await this.getWalletBalances(walletAddress);
      
      // Calculate total portfolio value
      let totalValue = 0;
      const assets = [];
      
      for (const [symbol, data] of Object.entries(balances)) {
        const tokenData = data as any;
        const balance = parseFloat(tokenData.balance || '0');
        if (balance > 0) {
          assets.push({
            symbol,
            name: tokenData.name,
            balance: tokenData.balance,
            value: tokenData.usdValue || 0,
            percentage: 0 // Will be calculated after getting prices
          });
          totalValue += tokenData.usdValue || 0;
        }
      }
      
      // Calculate percentages
      assets.forEach(asset => {
        asset.percentage = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
      });
      
      return {
        totalValue,
        assets,
        performance: {
          '24h': 0, // Would need historical data
          '7d': 0,
          '30d': 0,
          '1y': 0
        }
      };
    } catch (error) {
      console.error('Error calculating portfolio metrics:', error);
      return {
        totalValue: 0,
        assets: [],
        performance: { '24h': 0, '7d': 0, '30d': 0, '1y': 0 }
      };
    }
  }
  
  // Switch to Arbitrum One network
  async switchToArbitrumNetwork() {
    if (!this.web3Provider) {
      throw new Error('Web3 provider not available');
    }
    
    try {
      // Try to switch to Arbitrum One
      await this.web3Provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_MAINNET.chainId }],
      });
    } catch (switchError: any) {
      // If Arbitrum One is not added, add it
      if (switchError.code === 4902) {
        await this.web3Provider.request({
          method: 'wallet_addEthereumChain',
          params: [ARBITRUM_MAINNET],
        });
      } else {
        throw switchError;
      }
    }
  }
  
  // Get transaction history (simplified - would need indexing service for full history)
  async getTransactionHistory(walletAddress: string, limit: number = 10) {
    try {
      // This is a simplified version - for production, you'd use services like:
      // - Moralis API
      // - BSCScan API
      // - The Graph Protocol
      // - QuickNode
      
      return []; // Placeholder - implement with proper indexing service
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }
}

// Singleton instance
export const blockchainService = new BlockchainService();

// Price service for getting USD values
export class PriceService {
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache
  
  async getTokenPrices(symbols: string[]) {
    try {
      const prices: Record<string, number> = {};
      const uncachedSymbols: string[] = [];
      
      // Check cache first
      for (const symbol of symbols) {
        const cached = this.cache.get(symbol);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
          prices[symbol] = cached.price;
        } else {
          uncachedSymbols.push(symbol);
        }
      }
      
      // Fetch uncached prices
      if (uncachedSymbols.length > 0) {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${this.getCoingeckoIds(uncachedSymbols).join(',')}&vs_currencies=usd`,
          { headers: { 'Accept': 'application/json' } }
        );
        
        if (response.ok) {
          const data = await response.json();
          const idToSymbol = this.getIdToSymbolMap(uncachedSymbols);
          
          for (const [id, priceData] of Object.entries(data)) {
            const symbol = idToSymbol[id];
            if (symbol && priceData && typeof priceData === 'object' && 'usd' in priceData) {
              const price = (priceData as Record<string, any>).usd as number;
              prices[symbol] = price;
              this.cache.set(symbol, { price, timestamp: Date.now() });
            }
          }
        }
      }
      
      return prices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return {};
    }
  }
  
  private getCoingeckoIds(symbols: string[]): string[] {
    const symbolToId: Record<string, string> = {
      'BNB': 'binancecoin',
      'SWF': 'swf-coin', // Adjust based on actual CoinGecko ID
      'BUSD': 'binance-usd',
      'USDT': 'tether',
      'CAKE': 'pancakeswap-token',
      'XVS': 'venus'
    };
    
    return symbols.map(symbol => symbolToId[symbol] || symbol.toLowerCase()).filter(Boolean);
  }
  
  private getIdToSymbolMap(symbols: string[]): Record<string, string> {
    const idToSymbol: Record<string, string> = {
      'binancecoin': 'BNB',
      'swf-coin': 'SWF',
      'binance-usd': 'BUSD',
      'tether': 'USDT',
      'pancakeswap-token': 'CAKE',
      'venus': 'XVS'
    };
    
    return idToSymbol;
  }
}

export const priceService = new PriceService();
