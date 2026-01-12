/**
 * AXUSD Transaction Service
 * Handles mint, swap (PSM), and add liquidity transactions
 * Network: Arbitrum One (Chain ID: 42161)
 */

import { ethers } from 'ethers';

export const AXUSD_CONTRACTS = {
  AXUSD: '0x73585df5E62a5E85E6dd6b1df3C08E00eee5b89C',
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  CAMELOT_ROUTER: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
  CAMELOT_FACTORY: '0x6EcCab422D763aC031210895C81787E87B43A652',
};

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

const CAMELOT_ROUTER_ABI = [
  'function addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline) external returns (uint256 amountA, uint256 amountB, uint256 liquidity)',
  'function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint256 amountIn, uint256 amountOutMin, tuple(address from, address to, bool stable)[] routes, address to, uint256 deadline) external',
  'function getAmountsOut(uint256 amountIn, tuple(address from, address to, bool stable)[] routes) external view returns (uint256[] memory amounts)',
];

const CAMELOT_FACTORY_ABI = [
  'function getPair(address tokenA, address tokenB, bool stable) external view returns (address pair)',
];

const PAIR_ABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint16 token0FeePercent, uint16 token1FeePercent)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  receipt?: any;
}

export class AXUSDTransactionService {
  private signer: ethers.Signer;
  private address: string;

  constructor(signer: ethers.Signer, address: string) {
    this.signer = signer;
    this.address = address;
  }

  async getBalances(): Promise<{ axusd: string; usdc: string; eth: string }> {
    const axusd = new ethers.Contract(AXUSD_CONTRACTS.AXUSD, ERC20_ABI, this.signer);
    const usdc = new ethers.Contract(AXUSD_CONTRACTS.USDC, ERC20_ABI, this.signer);
    
    const [axusdBalance, usdcBalance, ethBalance] = await Promise.all([
      axusd.balanceOf(this.address),
      usdc.balanceOf(this.address),
      this.signer.provider?.getBalance(this.address) || BigInt(0),
    ]);

    return {
      axusd: ethers.formatEther(axusdBalance),
      usdc: ethers.formatUnits(usdcBalance, 6),
      eth: ethers.formatEther(ethBalance),
    };
  }

  async checkPoolLiquidity(): Promise<{ hasLiquidity: boolean; pairAddress: string | null; axusdReserve: string; usdcReserve: string }> {
    try {
      const factory = new ethers.Contract(AXUSD_CONTRACTS.CAMELOT_FACTORY, CAMELOT_FACTORY_ABI, this.signer);
      
      // Camelot requires stable parameter - try volatile first (false), then stable (true)
      let pairAddress = await factory.getPair(AXUSD_CONTRACTS.AXUSD, AXUSD_CONTRACTS.USDC, false);
      
      if (pairAddress === ethers.ZeroAddress) {
        pairAddress = await factory.getPair(AXUSD_CONTRACTS.AXUSD, AXUSD_CONTRACTS.USDC, true);
      }
      
      if (pairAddress === ethers.ZeroAddress) {
        return { hasLiquidity: false, pairAddress: null, axusdReserve: '0', usdcReserve: '0' };
      }

      const pair = new ethers.Contract(pairAddress, PAIR_ABI, this.signer);
      const [reserves, token0] = await Promise.all([
        pair.getReserves(),
        pair.token0(),
      ]);

      const isToken0Axusd = token0.toLowerCase() === AXUSD_CONTRACTS.AXUSD.toLowerCase();
      const axusdReserve = isToken0Axusd ? reserves[0] : reserves[1];
      const usdcReserve = isToken0Axusd ? reserves[1] : reserves[0];

      const hasLiquidity = axusdReserve > 0n && usdcReserve > 0n;
      
      return {
        hasLiquidity,
        pairAddress,
        axusdReserve: ethers.formatEther(axusdReserve),
        usdcReserve: ethers.formatUnits(usdcReserve, 6),
      };
    } catch (error) {
      console.error('Check pool liquidity error:', error);
      return { hasLiquidity: false, pairAddress: null, axusdReserve: '0', usdcReserve: '0' };
    }
  }

  async approveToken(tokenAddress: string, spenderAddress: string, amount: bigint): Promise<TransactionResult> {
    try {
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, this.signer);
      
      const currentAllowance = await token.allowance(this.address, spenderAddress);
      if (currentAllowance >= amount) {
        return { success: true, txHash: 'already-approved' };
      }

      const tx = await token.approve(spenderAddress, ethers.MaxUint256);
      const receipt = await tx.wait();
      
      return { success: true, txHash: tx.hash, receipt };
    } catch (error: any) {
      console.error('Approve error:', error);
      return { success: false, error: error.message || 'Approval failed' };
    }
  }

  async addLiquidity(axusdAmount: string, usdcAmount: string): Promise<TransactionResult> {
    try {
      const axusdWei = ethers.parseEther(axusdAmount);
      const usdcWei = ethers.parseUnits(usdcAmount, 6);

      const balances = await this.getBalances();
      if (parseFloat(balances.axusd) < parseFloat(axusdAmount)) {
        return { success: false, error: `Insufficient AXUSD balance. You have ${balances.axusd} AXUSD` };
      }
      if (parseFloat(balances.usdc) < parseFloat(usdcAmount)) {
        return { success: false, error: `Insufficient USDC balance. You have ${balances.usdc} USDC` };
      }

      const axusdApproval = await this.approveToken(AXUSD_CONTRACTS.AXUSD, AXUSD_CONTRACTS.CAMELOT_ROUTER, axusdWei);
      if (!axusdApproval.success) {
        return { success: false, error: `AXUSD approval failed: ${axusdApproval.error}` };
      }

      const usdcApproval = await this.approveToken(AXUSD_CONTRACTS.USDC, AXUSD_CONTRACTS.CAMELOT_ROUTER, usdcWei);
      if (!usdcApproval.success) {
        return { success: false, error: `USDC approval failed: ${usdcApproval.error}` };
      }

      const router = new ethers.Contract(AXUSD_CONTRACTS.CAMELOT_ROUTER, CAMELOT_ROUTER_ABI, this.signer);
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const minAxusd = axusdWei * 95n / 100n;
      const minUsdc = usdcWei * 95n / 100n;

      const tx = await router.addLiquidity(
        AXUSD_CONTRACTS.AXUSD,
        AXUSD_CONTRACTS.USDC,
        axusdWei,
        usdcWei,
        minAxusd,
        minUsdc,
        this.address,
        deadline
      );

      const receipt = await tx.wait();
      return { success: true, txHash: tx.hash, receipt };
    } catch (error: any) {
      console.error('Add liquidity error:', error);
      return { success: false, error: error.reason || error.message || 'Add liquidity failed' };
    }
  }

  async swapUSDCToAXUSD(usdcAmount: string): Promise<TransactionResult> {
    try {
      const usdcWei = ethers.parseUnits(usdcAmount, 6);

      const poolInfo = await this.checkPoolLiquidity();
      if (!poolInfo.hasLiquidity) {
        return { 
          success: false, 
          error: poolInfo.pairAddress 
            ? `No liquidity in pool. Pool has ${poolInfo.axusdReserve} AXUSD and ${poolInfo.usdcReserve} USDC. Please add liquidity first.`
            : 'No AXUSD/USDC liquidity pool exists yet. Please add liquidity first to create the pool.'
        };
      }

      const balances = await this.getBalances();
      if (parseFloat(balances.usdc) < parseFloat(usdcAmount)) {
        return { success: false, error: `Insufficient USDC balance. You have ${balances.usdc} USDC` };
      }

      const router = new ethers.Contract(AXUSD_CONTRACTS.CAMELOT_ROUTER, CAMELOT_ROUTER_ABI, this.signer);
      
      // Camelot uses Route[] struct: { from, to, stable }
      const routes = [{ from: AXUSD_CONTRACTS.USDC, to: AXUSD_CONTRACTS.AXUSD, stable: false }];
      
      let expectedOut: bigint;
      try {
        const amountsOut = await router.getAmountsOut(usdcWei, routes);
        expectedOut = amountsOut[amountsOut.length - 1];
        console.log('Expected output:', ethers.formatEther(expectedOut), 'AXUSD');
      } catch (quoteError) {
        console.error('Quote error:', quoteError);
        return { success: false, error: 'Unable to get swap quote. Pool may have insufficient liquidity for this amount.' };
      }

      const usdcApproval = await this.approveToken(AXUSD_CONTRACTS.USDC, AXUSD_CONTRACTS.CAMELOT_ROUTER, usdcWei);
      if (!usdcApproval.success) {
        return { success: false, error: `USDC approval failed: ${usdcApproval.error}` };
      }

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const minOut = expectedOut * 95n / 100n; // 5% slippage

      const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        usdcWei,
        minOut,
        routes,
        this.address,
        deadline
      );

      const receipt = await tx.wait();
      return { success: true, txHash: tx.hash, receipt };
    } catch (error: any) {
      console.error('Swap USDC->AXUSD error:', error);
      if (error.message?.includes('require(false)') || error.reason?.includes('INSUFFICIENT_LIQUIDITY')) {
        return { success: false, error: 'Swap failed: Insufficient liquidity in pool. Try a smaller amount or add liquidity first.' };
      }
      return { success: false, error: error.reason || error.message || 'Swap failed' };
    }
  }

  async swapAXUSDToUSDC(axusdAmount: string): Promise<TransactionResult> {
    try {
      const axusdWei = ethers.parseEther(axusdAmount);

      const poolInfo = await this.checkPoolLiquidity();
      if (!poolInfo.hasLiquidity) {
        return { 
          success: false, 
          error: poolInfo.pairAddress 
            ? `No liquidity in pool. Pool has ${poolInfo.axusdReserve} AXUSD and ${poolInfo.usdcReserve} USDC. Please add liquidity first.`
            : 'No AXUSD/USDC liquidity pool exists yet. Please add liquidity first to create the pool.'
        };
      }

      const balances = await this.getBalances();
      if (parseFloat(balances.axusd) < parseFloat(axusdAmount)) {
        return { success: false, error: `Insufficient AXUSD balance. You have ${balances.axusd} AXUSD` };
      }

      const router = new ethers.Contract(AXUSD_CONTRACTS.CAMELOT_ROUTER, CAMELOT_ROUTER_ABI, this.signer);
      
      // Camelot uses Route[] struct: { from, to, stable }
      const routes = [{ from: AXUSD_CONTRACTS.AXUSD, to: AXUSD_CONTRACTS.USDC, stable: false }];
      
      let expectedOut: bigint;
      try {
        const amountsOut = await router.getAmountsOut(axusdWei, routes);
        expectedOut = amountsOut[amountsOut.length - 1];
        console.log('Expected output:', ethers.formatUnits(expectedOut, 6), 'USDC');
      } catch (quoteError) {
        console.error('Quote error:', quoteError);
        return { success: false, error: 'Unable to get swap quote. Pool may have insufficient liquidity for this amount.' };
      }

      const axusdApproval = await this.approveToken(AXUSD_CONTRACTS.AXUSD, AXUSD_CONTRACTS.CAMELOT_ROUTER, axusdWei);
      if (!axusdApproval.success) {
        return { success: false, error: `AXUSD approval failed: ${axusdApproval.error}` };
      }

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const minOut = expectedOut * 95n / 100n; // 5% slippage

      const tx = await router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        axusdWei,
        minOut,
        routes,
        this.address,
        deadline
      );

      const receipt = await tx.wait();
      return { success: true, txHash: tx.hash, receipt };
    } catch (error: any) {
      console.error('Swap AXUSD->USDC error:', error);
      if (error.message?.includes('require(false)') || error.reason?.includes('INSUFFICIENT_LIQUIDITY')) {
        return { success: false, error: 'Swap failed: Insufficient liquidity in pool. Try a smaller amount or add liquidity first.' };
      }
      return { success: false, error: error.reason || error.message || 'Swap failed' };
    }
  }
}

export async function getAXUSDTransactionService(): Promise<AXUSDTransactionService | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const { WalletService } = await import('./WalletService');
    const wallet = WalletService.getInstance();
    const state = wallet.getState();
    const signer = wallet.getSigner();
    
    if (!state.isConnected || !state.address || !signer) {
      return null;
    }
    
    return new AXUSDTransactionService(signer, state.address);
  } catch (error) {
    console.error('Failed to get AXUSD transaction service:', error);
    return null;
  }
}
