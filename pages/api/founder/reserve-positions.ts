/**
 * /api/founder/reserve-positions
 *
 * Admin-key gated reserves management endpoint for the Founder Ops console.
 * Returns live balances, USD values, deposit addresses, and operational
 * status for all 6 protocol reserve assets:
 *   ETH, PAXG, AXAU, AXM, USDC, AXUSD
 *
 * Balance sources (canonical):
 *   ETH   — deployer EOA native balance (eth_getBalance)
 *   PAXG  — BitGoTreasuryExtension.getReserveAssetBalances() (custodian)
 *   AXAU  — AXAUFulfillmentService.getVaultBuffer() (fulfillment buffer)
 *   AXM   — TREASURY_REVENUE + STAKING_EMISSIONS ERC-20 balanceOf
 *   USDC  — canonical PSM + legacy PSM + backstop vault + deployer EOA
 *   AXUSD — TREASURY_REVENUE ERC-20 balanceOf
 *
 * Status thresholds:
 *   ETH   — LOW if < 0.1 ETH
 *   AXAU  — mirrors bufferCapacity: SUFFICIENT | PARTIAL | DEPLETED
 *   USDC, AXUSD, PAXG, AXM — OK when balance > 0, else ZERO
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { validateAdminKey, GOVERNANCE_SAFE, DEPLOYER_EOA } from '../../../src/config/adminRoles';
import { CORE_CONTRACTS, AXUSD_GENIUS_CONTRACTS, STABLECOINS } from '../../../shared/contracts';
import { ERC3643_CONTRACTS } from '../../../shared/contracts-3643';
import { CANONICAL_PSM, EULER_SWAP_AXUSD_AXM_POOL_ADDRESS, isEulerSwapDeployed } from '../../../src/config/activeContracts.generated';
import { AXAU_ADDRESSES, ORACLE_STALE_THRESHOLD_SECONDS } from '../../../lib/services/AXAUContractService';
import { bitGoTreasuryExtension } from '../../../lib/services/BitGoTreasuryExtension';
import { getVaultBuffer } from '../../../lib/services/AXAUFulfillmentService';

const PAXG_ARBITRUM = '0xfEb4DfC8C4Cf7Ed305bb08065D08eC6ee6728429';
const AXM_ADDRESS   = CORE_CONTRACTS.AXM_TOKEN;
const AXUSD_ADDRESS = ERC3643_CONTRACTS.AXUSD_TOKEN;
const AXAU_ADDRESS  = AXAU_ADDRESSES.AXAUTokenLite3643;
const USDC_ADDRESS  = STABLECOINS.USDC;

const ETH_LOW_THRESHOLD = 0.1;

const ALCHEMY_KEY  = process.env.ALCHEMY_API_KEY ?? '';
const ARBITRUM_RPC = ALCHEMY_KEY
  ? `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`
  : 'https://arb1.arbitrum.io/rpc';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
const POOL_ABI  = [
  'function getReserves() view returns (uint112,uint112,uint32)',
  'function getAssets() view returns (address,address)',
];
const CHAINLINK_ABI = [
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
] as const;
const ZERO = '0x0000000000000000000000000000000000000000';
const AXM_LC = AXM_ADDRESS.toLowerCase();

export interface ReserveAssetPosition {
  symbol: string;
  label: string;
  balance: number;
  balanceFormatted: string;
  usdValue: number | null;
  price: number | null;
  priceSource: string;
  status: 'OK' | 'LOW' | 'ZERO' | 'DEPLETED' | 'PARTIAL' | 'UNKNOWN';
  statusDetail: string;
  depositAddress: string;
  depositLabel: string;
  depositArbiscanUrl: string;
  locationBreakdown: Array<{
    label: string;
    address: string;
    balance: number;
    balanceFormatted: string;
    arbiscanUrl: string;
  }>;
  actionType: 'copy_address' | 'open_bitgo' | 'open_safe' | 'open_contract' | 'axau_buffer';
  actionLabel: string;
  actionUrl?: string;
  bufferCapacity?: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED';
  mintPaused?: boolean;
  oracleStale?: boolean;
  oracleAgeSeconds?: number | null;
  oracleThresholdSeconds?: number;
  lastUpdatedAt: string;
}

export interface ReservePositionsResponse {
  success: boolean;
  assets: ReserveAssetPosition[];
  totals: {
    totalValueUsd: number;
    totalValueUsdFormatted: string;
    ethStatus: 'OK' | 'LOW';
    axauBufferCapacity: 'SUFFICIENT' | 'PARTIAL' | 'DEPLETED' | 'UNKNOWN';
    mintPaused: boolean;
  };
  deployer: string;
  governanceSafe: string;
  fetchedAt: string;
  error?: string;
}

function arbiUrl(addr: string): string {
  return `https://arbiscan.io/address/${addr}`;
}

function fmtBal(n: number, decimals = 6): string {
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

async function fetchAxmPrice(provider: ethers.JsonRpcProvider): Promise<number | null> {
  const poolAddr = EULER_SWAP_AXUSD_AXM_POOL_ADDRESS;
  if (!isEulerSwapDeployed() || !poolAddr || poolAddr === ZERO) return null;
  try {
    const pool = new ethers.Contract(poolAddr, POOL_ABI, provider);
    const [reserves, assets] = await Promise.all([pool.getReserves(), pool.getAssets()]);
    const asset0Lower  = (assets[0] as string).toLowerCase();
    const axmIsAsset0  = asset0Lower === AXM_LC;
    const axmReserve   = Number(ethers.formatUnits(axmIsAsset0 ? reserves[0] : reserves[1], 18));
    const axusdReserve = Number(ethers.formatUnits(axmIsAsset0 ? reserves[1] : reserves[0], 18));
    if (axmReserve <= 0) return null;
    return axusdReserve / axmReserve;
  } catch {
    return null;
  }
}

async function fetchEthPrice(): Promise<number | null> {
  try {
    const url = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';
    const res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const json = await res.json() as { ethereum?: { usd?: number } };
    return json.ethereum?.usd ?? null;
  } catch {
    return null;
  }
}

const EMPTY: Omit<ReservePositionsResponse, 'fetchedAt' | 'error'> = {
  success: false,
  assets: [],
  totals: {
    totalValueUsd: 0,
    totalValueUsdFormatted: '$0.00',
    ethStatus: 'OK',
    axauBufferCapacity: 'UNKNOWN',
    mintPaused: false,
  },
  deployer: DEPLOYER_EOA,
  governanceSafe: GOVERNANCE_SAFE,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReservePositionsResponse>,
) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      ...EMPTY,
      fetchedAt: new Date().toISOString(),
      error: 'Method not allowed',
    });
  }

  const cronSecret = process.env.CRON_SECRET ?? '';
  const bearerToken = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
  const cronHeader  = (req.headers['x-cron-secret'] as string) ?? '';
  const validCron   = !!(cronSecret && (bearerToken === cronSecret || cronHeader === cronSecret));

  if (!validateAdminKey(req) && !validCron) {
    return res.status(401).json({
      ...EMPTY,
      fetchedAt: new Date().toISOString(),
      error: 'Unauthorized — x-admin-key required',
    });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);

    const axm   = new ethers.Contract(AXM_ADDRESS,   ERC20_ABI, provider);
    const axusd = new ethers.Contract(AXUSD_ADDRESS, ERC20_ABI, provider);
    const usdc  = new ethers.Contract(USDC_ADDRESS,  ERC20_ABI, provider);

    const chainlink = new ethers.Contract(AXAU_ADDRESSES.ChainlinkXauUsd, CHAINLINK_ABI, provider);

    const [
      ethPrice,
      axmPrice,
      vault,
      bitgo,
      ethBalRaw,
      axmTreasuryRaw,
      axmStakingRaw,
      axusdTreasuryRaw,
      usdcCanonicalRaw,
      usdcLegacyRaw,
      usdcBackstopRaw,
      usdcDeployerRaw,
      oracleRound,
    ] = await Promise.all([
      fetchEthPrice(),
      fetchAxmPrice(provider),
      getVaultBuffer().catch(() => null),
      bitGoTreasuryExtension.getReserveAssetBalances().catch(() => null),
      provider.getBalance(DEPLOYER_EOA).catch(() => 0n),
      axm.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => 0n),
      axm.balanceOf(CORE_CONTRACTS.STAKING_EMISSIONS).catch(() => 0n),
      axusd.balanceOf(CORE_CONTRACTS.TREASURY_REVENUE).catch(() => 0n),
      usdc.balanceOf(CANONICAL_PSM).catch(() => 0n),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.PSM).catch(() => 0n),
      usdc.balanceOf(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC).catch(() => 0n),
      usdc.balanceOf(DEPLOYER_EOA).catch(() => 0n),
      chainlink.latestRoundData().catch(() => null),
    ]);

    // ── Oracle freshness ────────────────────────────────────────────────────
    const nowSec          = Math.floor(Date.now() / 1000);
    const oracleUpdatedAt = oracleRound ? Number(oracleRound[3]) : 0;
    const oracleAgeSeconds: number | null = oracleUpdatedAt > 0 ? nowSec - oracleUpdatedAt : null;
    const oracleStale     = oracleAgeSeconds !== null ? oracleAgeSeconds > ORACLE_STALE_THRESHOLD_SECONDS : true;

    // ── ETH ────────────────────────────────────────────────────────────────
    const ethBal   = Number(ethers.formatEther(ethBalRaw as bigint));
    const ethValue = ethPrice !== null ? ethBal * ethPrice : null;
    const ethStatus: 'OK' | 'LOW' = ethBal < ETH_LOW_THRESHOLD ? 'LOW' : 'OK';

    // ── PAXG ───────────────────────────────────────────────────────────────
    const bitgoPaxg     = (bitgo?.positions ?? []).find(p => p.assetSymbol === 'PAXG');
    const paxgViaBitgo  = !!(bitgoPaxg && bitgoPaxg.quantity > 0);
    const paxgBal       = paxgViaBitgo
      ? bitgoPaxg!.quantity
      : (vault ? parseFloat(vault.paxgBalanceFormatted) : 0);
    const xauPrice      = vault ? parseFloat(vault.xauUsdPrice) : null;
    const paxgValue     = xauPrice !== null ? paxgBal * xauPrice : null;
    // When BitGo holds PAXG, the on-chain deposit address is the deployer EOA
    // (used by MintRedeemController as collateral source).  The true custodial
    // wallet is managed by BitGo CaaS; its address is not exposed here.
    const paxgDepositAddr  = DEPLOYER_EOA;
    const paxgDepositLabel = paxgViaBitgo
      ? 'Deployer EOA (MintRedeemController collateral source) — primary custody via BitGo CaaS'
      : 'Deployer EOA — on-chain PAXG balance (BitGo CaaS unavailable)';

    // ── AXAU ───────────────────────────────────────────────────────────────
    const axauBal          = vault ? parseFloat(vault.axauBalanceFormatted) : 0;
    const axauValueUsd     = vault ? parseFloat(vault.axauValueUsd) : axauBal * 1.15;
    const axauNavPerToken  = vault && axauBal > 0
      ? parseFloat(vault.axauValueUsd) / axauBal
      : 1.15;
    const bufferCapacity   = vault?.bufferCapacity ?? 'UNKNOWN';
    const mintPaused       = vault?.mintPaused ?? false;

    const axauStatus: ReserveAssetPosition['status'] =
      bufferCapacity === 'SUFFICIENT' ? 'OK' :
      bufferCapacity === 'PARTIAL'    ? 'PARTIAL' :
      bufferCapacity === 'DEPLETED'   ? 'DEPLETED' : 'UNKNOWN';

    // ── AXM ────────────────────────────────────────────────────────────────
    const axmTreasury = Number(ethers.formatUnits(axmTreasuryRaw as bigint, 18));
    const axmStaking  = Number(ethers.formatUnits(axmStakingRaw as bigint, 18));
    const axmTotal    = axmTreasury + axmStaking;
    const axmValue    = axmPrice !== null ? axmTotal * axmPrice : null;

    // ── USDC ───────────────────────────────────────────────────────────────
    const usdcCanonical = Number(ethers.formatUnits(usdcCanonicalRaw as bigint, 6));
    const usdcLegacy    = Number(ethers.formatUnits(usdcLegacyRaw as bigint, 6));
    const usdcBackstop  = Number(ethers.formatUnits(usdcBackstopRaw as bigint, 6));
    const usdcDeployer  = Number(ethers.formatUnits(usdcDeployerRaw as bigint, 6));
    const usdcTotal     = usdcCanonical + usdcLegacy + usdcBackstop + usdcDeployer;

    // ── AXUSD ──────────────────────────────────────────────────────────────
    const axusdTreasury = Number(ethers.formatUnits(axusdTreasuryRaw as bigint, 18));

    // ── Totals ─────────────────────────────────────────────────────────────
    const knownValues   = [ethValue, paxgValue, axauValueUsd, axmValue, usdcTotal, axusdTreasury]
      .filter((v): v is number => v !== null);
    const totalValueUsd = knownValues.reduce((a, b) => a + b, 0);

    // ── Build asset array ──────────────────────────────────────────────────
    const assets: ReserveAssetPosition[] = [
      {
        symbol:          'ETH',
        label:           'Ethereum — Gas Reserve',
        balance:         ethBal,
        balanceFormatted: fmtBal(ethBal, 6) + ' ETH',
        usdValue:        ethValue,
        price:           ethPrice,
        priceSource:     'CoinGecko (ethereum/usd)',
        status:          ethStatus,
        statusDetail:    ethStatus === 'LOW'
          ? `Balance below ${ETH_LOW_THRESHOLD} ETH minimum gas reserve — replenish soon`
          : `ETH gas reserve nominal (${fmtBal(ethBal, 4)} ETH)`,
        depositAddress:    DEPLOYER_EOA,
        depositLabel:      'Deployer EOA (send ETH on Arbitrum One)',
        depositArbiscanUrl: arbiUrl(DEPLOYER_EOA),
        locationBreakdown: [{
          label:           'Deployer EOA',
          address:         DEPLOYER_EOA,
          balance:         ethBal,
          balanceFormatted: fmtBal(ethBal, 6) + ' ETH',
          arbiscanUrl:     arbiUrl(DEPLOYER_EOA),
        }],
        actionType:  'copy_address',
        actionLabel: 'Copy Deposit Address',
      },
      {
        symbol:          'PAXG',
        label:           'PAX Gold — Custodial Reserve',
        balance:         paxgBal,
        balanceFormatted: fmtBal(paxgBal, 6) + ' PAXG',
        usdValue:        paxgValue,
        price:           xauPrice,
        priceSource:     vault
          ? 'Chainlink XAU/USD · Arbitrum One (via AXAUFulfillmentService)'
          : 'Chainlink unavailable — no price',
        status:          paxgBal > 0 ? 'OK' : 'ZERO',
        statusDetail:    paxgBal > 0
          ? `${fmtBal(paxgBal, 4)} PAXG — source: ${paxgViaBitgo ? 'BitGo CaaS custodian-reported' : 'Deployer EOA on-chain (BitGo unavailable)'}`
          : 'No PAXG balance detected — check BitGo CaaS and deployer EOA',
        depositAddress:    paxgDepositAddr,
        depositLabel:      paxgDepositLabel,
        depositArbiscanUrl: arbiUrl(paxgDepositAddr),
        locationBreakdown: [{
          label:           paxgViaBitgo
            ? 'Deployer EOA (collateral source — BitGo CaaS is primary custodian)'
            : 'Deployer EOA (on-chain balance — BitGo CaaS unavailable)',
          address:         DEPLOYER_EOA,
          balance:         paxgBal,
          balanceFormatted: fmtBal(paxgBal, 6) + ' PAXG',
          arbiscanUrl:     arbiUrl(DEPLOYER_EOA),
        }],
        actionType:  'open_bitgo',
        actionLabel: 'Open BitGo Dashboard',
        actionUrl:   'https://app.bitgo.com',
      },
      {
        symbol:          'AXAU',
        label:           'AXAU — Gold Reserve Instrument (Fulfillment Buffer)',
        balance:         axauBal,
        balanceFormatted: fmtBal(axauBal, 6) + ' AXAU',
        usdValue:        axauValueUsd,
        price:           axauNavPerToken,
        priceSource:     'Mint NAV (~$1.15/AXAU) — not XAU/USD spot',
        status:          axauStatus,
        statusDetail:    vault
          ? `Buffer: ${vault.bufferCapacity} · ${vault.pendingOrdersCount} pending order(s) · Covers orders: ${vault.axauCoversOrders ? 'YES' : 'NO'}${mintPaused ? ' · MINT PAUSED' : ''}`
          : 'Vault buffer unavailable — check DEPLOYER_PRIVATE_KEY config',
        depositAddress:    DEPLOYER_EOA,
        depositLabel:      'Deployer EOA — send AXAU (PATH A) or trigger PAXG mint (PATH B) via Arbitrum One',
        depositArbiscanUrl: arbiUrl(DEPLOYER_EOA),
        locationBreakdown: [{
          label:           'Deployer EOA (fulfillment buffer)',
          address:         DEPLOYER_EOA,
          balance:         axauBal,
          balanceFormatted: fmtBal(axauBal, 6) + ' AXAU',
          arbiscanUrl:     arbiUrl(DEPLOYER_EOA),
        }],
        actionType:      'axau_buffer',
        actionLabel:     'Copy Deployer Address',
        bufferCapacity:  vault?.bufferCapacity,
        mintPaused,
        oracleStale,
        oracleAgeSeconds,
        oracleThresholdSeconds: ORACLE_STALE_THRESHOLD_SECONDS,
      },
      {
        symbol:          'AXM',
        label:           'AXM — Governance Token Reserve',
        balance:         axmTotal,
        balanceFormatted: fmtBal(axmTotal, 2) + ' AXM',
        usdValue:        axmValue,
        price:           axmPrice,
        priceSource:     axmPrice !== null
          ? 'On-chain EulerSwap AXUSD/AXM pool reserve ratio'
          : 'Price unavailable — pool reserve ratio failed',
        status:          axmTotal > 0 ? 'OK' : 'ZERO',
        statusDetail:    `${fmtBal(axmTreasury, 2)} AXM in Treasury + ${fmtBal(axmStaking, 2)} AXM in Staking Emissions`,
        depositAddress:    CORE_CONTRACTS.TREASURY_REVENUE,
        depositLabel:      'Treasury Revenue Hub — send AXM here on Arbitrum One',
        depositArbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
        locationBreakdown: [
          {
            label:           'Treasury Revenue Hub',
            address:         CORE_CONTRACTS.TREASURY_REVENUE,
            balance:         axmTreasury,
            balanceFormatted: fmtBal(axmTreasury, 2) + ' AXM',
            arbiscanUrl:     arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
          },
          {
            label:           'Staking Emissions Hub',
            address:         CORE_CONTRACTS.STAKING_EMISSIONS,
            balance:         axmStaking,
            balanceFormatted: fmtBal(axmStaking, 2) + ' AXM',
            arbiscanUrl:     arbiUrl(CORE_CONTRACTS.STAKING_EMISSIONS),
          },
        ],
        actionType:  'copy_address',
        actionLabel: 'Copy Treasury Address',
        actionUrl:   `https://app.safe.global/home?safe=arb1:${GOVERNANCE_SAFE}`,
      },
      {
        symbol:          'USDC',
        label:           'USDC — Stablecoin Reserve (Aggregated)',
        balance:         usdcTotal,
        balanceFormatted: fmtBal(usdcTotal, 2) + ' USDC',
        usdValue:        usdcTotal,
        price:           1.0,
        priceSource:     'Stable peg — $1.00 USDC',
        status:          usdcTotal > 0 ? 'OK' : 'ZERO',
        statusDetail:    `${fmtBal(usdcCanonical, 2)} canonical PSM + ${fmtBal(usdcLegacy, 2)} legacy PSM + ${fmtBal(usdcBackstop, 2)} backstop + ${fmtBal(usdcDeployer, 2)} deployer`,
        depositAddress:    CANONICAL_PSM,
        depositLabel:      'Canonical PSM (ERC-3643) — primary USDC reserve',
        depositArbiscanUrl: arbiUrl(CANONICAL_PSM),
        locationBreakdown: [
          {
            label:           'Canonical PSM (ERC-3643)',
            address:         CANONICAL_PSM,
            balance:         usdcCanonical,
            balanceFormatted: fmtBal(usdcCanonical, 2) + ' USDC',
            arbiscanUrl:     arbiUrl(CANONICAL_PSM),
          },
          {
            label:           'Legacy PSM / GENIUS',
            address:         AXUSD_GENIUS_CONTRACTS.PSM,
            balance:         usdcLegacy,
            balanceFormatted: fmtBal(usdcLegacy, 2) + ' USDC',
            arbiscanUrl:     arbiUrl(AXUSD_GENIUS_CONTRACTS.PSM),
          },
          {
            label:           'Backstop Vault USDC',
            address:         AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC,
            balance:         usdcBackstop,
            balanceFormatted: fmtBal(usdcBackstop, 2) + ' USDC',
            arbiscanUrl:     arbiUrl(AXUSD_GENIUS_CONTRACTS.BACKSTOP_VAULT_USDC),
          },
          {
            label:           'Deployer EOA',
            address:         DEPLOYER_EOA,
            balance:         usdcDeployer,
            balanceFormatted: fmtBal(usdcDeployer, 2) + ' USDC',
            arbiscanUrl:     arbiUrl(DEPLOYER_EOA),
          },
        ],
        actionType:  'copy_address',
        actionLabel: 'Copy PSM Address',
      },
      {
        symbol:          'AXUSD',
        label:           'AXUSD — Treasury Holding',
        balance:         axusdTreasury,
        balanceFormatted: fmtBal(axusdTreasury, 2) + ' AXUSD',
        usdValue:        axusdTreasury,
        price:           1.0,
        priceSource:     'Stable peg — $1.00 AXUSD',
        status:          axusdTreasury > 0 ? 'OK' : 'ZERO',
        statusDetail:    `${fmtBal(axusdTreasury, 2)} AXUSD held in Treasury Revenue Hub`,
        depositAddress:    CORE_CONTRACTS.TREASURY_REVENUE,
        depositLabel:      'Treasury Revenue Hub — AXUSD protocol reserve',
        depositArbiscanUrl: arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
        locationBreakdown: [{
          label:           'Treasury Revenue Hub',
          address:         CORE_CONTRACTS.TREASURY_REVENUE,
          balance:         axusdTreasury,
          balanceFormatted: fmtBal(axusdTreasury, 2) + ' AXUSD',
          arbiscanUrl:     arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
        }],
        actionType:  'open_contract',
        actionLabel: 'View Treasury Contract',
        actionUrl:   arbiUrl(CORE_CONTRACTS.TREASURY_REVENUE),
      },
    ];

    // Stamp every asset with the same fetch timestamp
    const batchFetchedAt = new Date().toISOString();
    const stampedAssets  = assets.map(a => ({ ...a, lastUpdatedAt: batchFetchedAt }));

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      success: true,
      assets:  stampedAssets,
      totals: {
        totalValueUsd,
        totalValueUsdFormatted: '$' + totalValueUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ethStatus,
        axauBufferCapacity: vault?.bufferCapacity ?? 'UNKNOWN',
        mintPaused,
      },
      deployer: DEPLOYER_EOA,
      governanceSafe: GOVERNANCE_SAFE,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[reserve-positions] error:', err?.message);
    return res.status(500).json({
      ...EMPTY,
      fetchedAt: new Date().toISOString(),
      error: err?.message ?? 'Failed to fetch reserve positions',
    });
  }
}
