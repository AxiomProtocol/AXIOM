/**
 * /api/oracle/axusd-price
 *
 * Off-chain ERC-7726 compatible price oracle for AXUSD.
 * Provides the same logical interface as AXIOMOracleAdapter.sol —
 * returns price quotes normalised to 18-decimal WAD precision.
 *
 * Sources (priority order):
 *   1. PSM backing ratio  (USDC in PSM / AXUSD circulating supply)
 *   2. Chainlink USDC/USD via CoinGecko public API
 *   3. Static 1:1 parity fallback
 *
 * Used by:
 *   - Solvency auto-ingest for AXUSD valuation
 *   - AXUSD dashboard oracle section
 *   - EulerVaultService for supply-side pricing
 *   - Loan lifecycle charge-off write-down calculations
 *
 * When AXIOMOracleAdapter is deployed on-chain, this API will additionally
 * read `getQuote()` from the deployed contract and surface it as the
 * canonical on-chain price.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { ACTIVE_AXUSD, ACTIVE_PSM, EULER_AXUSD, EULER_PSM } from '../../../src/config/activeContracts.generated';
import { AXUSD_ORACLE_ADAPTER } from '../../../src/config/oracleConfig';

const ARBITRUM_RPC = process.env.ALCHEMY_API_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

const ERC20_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function decimals() view returns (uint8)',
];

const ORACLE_ADAPTER_ABI = [
  'function getQuote(uint256 inAmount, address base, address quote) external view returns (uint256 outAmount)',
  'function axusdUsdPrice() external view returns (uint256 priceWad, uint8 source)',
  'function ethUsdPrice() external view returns (uint256)',
];

const WAD = BigInt('1000000000000000000'); // 1e18

export interface OraclePriceResponse {
  success: boolean;
  axusdUsdPrice: string;
  axusdUsdPriceWad: string;
  source: 'on_chain_erc7726' | 'psm_ratio' | 'coingecko_fallback' | 'static_parity';
  sourceLabel: string;
  psmBacking: {
    primaryPsmUsdcBalance: string;
    eulerPsmUsdcBalance: string;
    totalPsmUsdc: string;
    primaryAxusdSupply: string;
    backingRatio: string;
    isFullyBacked: boolean;
  } | null;
  onChainOracle: {
    address: string;
    deployed: boolean;
    priceWad: string | null;
    source: number | null;
  };
  erc7726Quote: {
    inAmount: string;
    base: string;
    quote: string;
    outAmount: string;
    description: string;
  } | null;
  timestamp: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<OraclePriceResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      axusdUsdPrice: '1.000000',
      axusdUsdPriceWad: WAD.toString(),
      source: 'static_parity',
      sourceLabel: 'Method not allowed',
      psmBacking: null,
      onChainOracle: { address: AXUSD_ORACLE_ADAPTER, deployed: false, priceWad: null, source: null },
      erc7726Quote: null,
      timestamp: new Date().toISOString(),
    });
  }

  const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
  const primaryAxusdToken = new ethers.Contract(ACTIVE_AXUSD, ERC20_ABI, provider);

  let psmBacking: OraclePriceResponse['psmBacking'] = null;
  let axusdUsdPrice = 1.0;
  let source: OraclePriceResponse['source'] = 'static_parity';
  let sourceLabel = 'Static 1:1 parity (AXUSD USD-peg assumption)';
  let onChainOracle: OraclePriceResponse['onChainOracle'] = {
    address: AXUSD_ORACLE_ADAPTER,
    deployed: false,
    priceWad: null,
    source: null,
  };
  let erc7726Quote: OraclePriceResponse['erc7726Quote'] = null;

  // ── Step 1: Try on-chain ERC-7726 adapter via getQuote() ────────────────────
  // ERC-7726 canonical interface: getQuote(inAmount, base, quote) → outAmount
  // We call getQuote(1e6, USDC, AXUSD) — "how many AXUSD wei equal 1 USDC?"
  // outAmount (AXUSD wei, 18 dec) per 1 USDC (6 dec):
  //   1 AXUSD = (1e18 / outAmount) USDC ≈ USD → priceWad = (1e18 * 1e18) / outAmount
  if (AXUSD_ORACLE_ADAPTER && AXUSD_ORACLE_ADAPTER !== ethers.ZeroAddress && AXUSD_ORACLE_ADAPTER.length === 42) {
    try {
      const oracleContract = new ethers.Contract(AXUSD_ORACLE_ADAPTER, ORACLE_ADAPTER_ABI, provider);
      const ONE_USDC = BigInt(1_000_000); // 1 USDC in 6-dec units
      const quoteOut: bigint = await oracleContract.getQuote(ONE_USDC, USDC_ADDRESS, ACTIVE_AXUSD);

      // Derive AXUSD/USD price from ERC-7726 quote
      // quoteOut = AXUSD wei per 1 USDC → priceUSD of 1 AXUSD = 1e18 / (quoteOut / 1e18) = 1e36 / quoteOut
      const priceWadBig = quoteOut > 0n
        ? (BigInt('1000000000000000000') * BigInt('1000000000000000000')) / quoteOut
        : BigInt('1000000000000000000');

      axusdUsdPrice = parseFloat(ethers.formatEther(priceWadBig));
      source = 'on_chain_erc7726';
      sourceLabel = `AXIOMOracleAdapter.getQuote(1 USDC → AXUSD) — ERC-7726 standard interface`;

      erc7726Quote = {
        inAmount: ONE_USDC.toString(),
        base: USDC_ADDRESS,
        quote: ACTIVE_AXUSD,
        outAmount: quoteOut.toString(),
        description: 'getQuote(1 USDC → AXUSD) — ERC-7726 canonical interface',
      };

      onChainOracle = {
        address: AXUSD_ORACLE_ADAPTER,
        deployed: true,
        priceWad: priceWadBig.toString(),
        source: null, // source enum is internal to contract; ERC-7726 getQuote() is source-agnostic
      };
    } catch {
      // Oracle not yet deployed — fall through to off-chain sources
    }
  }

  // ── Step 2: PSM backing ratio ──────────────────────────────────────────────
  if (source !== 'on_chain_erc7726') {
    try {
      const [
        primaryPsmUsdcRaw,
        eulerPsmUsdcRaw,
        primaryAxusdSupplyRaw,
      ] = await Promise.all([
        usdc.balanceOf(ACTIVE_PSM),
        usdc.balanceOf(EULER_PSM),
        primaryAxusdToken.totalSupply(),
      ]);

      const primaryPsmUsdc  = parseFloat(ethers.formatUnits(primaryPsmUsdcRaw, 6));
      const eulerPsmUsdc    = parseFloat(ethers.formatUnits(eulerPsmUsdcRaw,   6));
      const totalPsmUsdc    = primaryPsmUsdc + eulerPsmUsdc;
      // ACTIVE_AXUSD (ERC-3643) has 18 decimals from on-chain decimals() call
      const primaryAxusdSupply = parseFloat(ethers.formatEther(primaryAxusdSupplyRaw));

      if (primaryAxusdSupply > 0 && totalPsmUsdc > 0) {
        const backingRatio  = totalPsmUsdc / primaryAxusdSupply;
        // Clamp PSM-derived price to [0.90, 1.10] to prevent oracle manipulation edge cases
        axusdUsdPrice  = Math.min(1.10, Math.max(0.90, Math.min(1.0, backingRatio)));
        source         = 'psm_ratio';
        sourceLabel    = `PSM backing ratio: ${backingRatio.toFixed(6)} USDC per AXUSD`;

        psmBacking = {
          primaryPsmUsdcBalance: primaryPsmUsdc.toFixed(6),
          eulerPsmUsdcBalance:   eulerPsmUsdc.toFixed(6),
          totalPsmUsdc:          totalPsmUsdc.toFixed(6),
          primaryAxusdSupply:    primaryAxusdSupply.toFixed(6),
          backingRatio:          backingRatio.toFixed(6),
          isFullyBacked:         backingRatio >= 1.0,
        };
      }
    } catch (psmErr) {
      console.warn('[oracle/axusd-price] PSM read failed:', psmErr instanceof Error ? psmErr.message : String(psmErr));
    }
  }

  // ── Step 3: CoinGecko fallback (last resort for non-PSM price) ────────────
  if (source === 'static_parity') {
    try {
      const cgRes = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd',
        { signal: AbortSignal.timeout(4000) }
      );
      const cgData = await cgRes.json() as { 'usd-coin'?: { usd?: number } };
      if (cgData?.['usd-coin']?.usd) {
        // USDC/USD ≈ AXUSD/USD since AXUSD pegs to USDC via PSM
        axusdUsdPrice = cgData['usd-coin'].usd;
        source        = 'coingecko_fallback';
        sourceLabel   = `CoinGecko USDC/USD: $${axusdUsdPrice.toFixed(6)} (proxy for AXUSD)`;
      }
    } catch {}
  }

  // ── Build WAD price ─────────────────────────────────────────────────────────
  const priceWadBig = BigInt(Math.round(axusdUsdPrice * 1e18));

  return res.status(200).json({
    success: true,
    axusdUsdPrice: axusdUsdPrice.toFixed(6),
    axusdUsdPriceWad: priceWadBig.toString(),
    source,
    sourceLabel,
    psmBacking,
    onChainOracle,
    erc7726Quote,
    timestamp: new Date().toISOString(),
  });
}
