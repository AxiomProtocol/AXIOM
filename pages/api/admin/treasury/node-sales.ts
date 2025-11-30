import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { Pool } from '../../../../lib/db';
import { withAdminAuth, AuthenticatedRequest } from '../../../../lib/adminAuth';

const DEPIN_SALES_CONTRACT = '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd';
const DEPIN_SUITE_CONTRACT = '0x16dC3884d88b767D99E0701Ba026a1ed39a250F1';
const TREASURY_VAULT = '0x2bb2c2a7a1d82097488bf0b9c2a59c1910cd8d5d';
const AXM_TOKEN = '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D';

const provider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const DEFAULT_TIER_PRICES_ETH = [0.02, 0.05, 0.08, 0.15, 0.25];
const DEFAULT_TIER_PRICES_AXM = [51, 127.5, 204, 382.5, 637.5];
const TIER_NAMES = ['Mobile Light', 'Desktop Standard', 'Desktop Advanced', 'Pro Infrastructure', 'Enterprise Premium'];
const TIER_ICONS = ['📱', '💻', '🖥️', '🏢', '🏛️'];

const DEPIN_SALES_ABI = [
  'function totalEthCollected() view returns (uint256)',
  'function totalAxmCollected() view returns (uint256)',
  'function totalNodesSold() view returns (uint256)',
  'function paused() view returns (bool)'
];

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const salesContract = new ethers.Contract(DEPIN_SALES_CONTRACT, DEPIN_SALES_ABI, provider);
    
    const [
      totalEthCollectedRaw,
      totalAxmCollectedRaw,
      totalNodesSold,
      isPaused
    ] = await Promise.all([
      salesContract.totalEthCollected().catch(() => BigInt(0)),
      salesContract.totalAxmCollected().catch(() => BigInt(0)),
      salesContract.totalNodesSold().catch(() => BigInt(0)),
      salesContract.paused().catch(() => false)
    ]);

    const totalEthCollected = ethers.formatEther(totalEthCollectedRaw);
    const totalAxmCollected = ethers.formatEther(totalAxmCollectedRaw);

    let tierSalesFromDb = [0, 0, 0, 0, 0];
    let tierEthRevenue = [0, 0, 0, 0, 0];
    let tierAxmRevenue = [0, 0, 0, 0, 0];
    let recentPurchases: any[] = [];

    try {
      const client = await pool.connect();
      try {
        const tierSalesQuery = `
          SELECT 
            tier,
            COUNT(*) as count,
            COALESCE(SUM(CASE WHEN price_eth IS NOT NULL AND price_eth::numeric > 0 THEN price_eth::numeric ELSE 0 END), 0) as eth_revenue,
            COALESCE(SUM(CASE WHEN price_axm IS NOT NULL AND price_axm::numeric > 0 THEN price_axm::numeric ELSE 0 END), 0) as axm_revenue
          FROM depin_events
          WHERE event_type = 'node_minted' AND tier IS NOT NULL
          GROUP BY tier
          ORDER BY tier
        `;
        const tierResult = await client.query(tierSalesQuery);
        
        for (const row of tierResult.rows) {
          const tierIndex = row.tier - 1;
          if (tierIndex >= 0 && tierIndex < 5) {
            tierSalesFromDb[tierIndex] = parseInt(row.count);
            tierEthRevenue[tierIndex] = parseFloat(row.eth_revenue) || 0;
            tierAxmRevenue[tierIndex] = parseFloat(row.axm_revenue) || 0;
          }
        }

        const purchasesQuery = `
          SELECT 
            transaction_hash,
            tier,
            buyer_address,
            price_eth,
            price_axm,
            processed_at,
            block_timestamp
          FROM depin_events
          WHERE event_type = 'node_minted'
          ORDER BY block_timestamp DESC, processed_at DESC
          LIMIT 20
        `;
        const result = await client.query(purchasesQuery);
        recentPurchases = result.rows.map(row => {
          const tierIndex = row.tier ? row.tier - 1 : 0;
          return {
            txHash: row.transaction_hash,
            tier: row.tier,
            tierName: TIER_NAMES[tierIndex] || `Tier ${row.tier}`,
            tierIcon: TIER_ICONS[tierIndex] || '📦',
            buyer: row.buyer_address,
            priceEth: row.price_eth,
            priceAxm: row.price_axm,
            paymentMethod: row.price_axm && parseFloat(row.price_axm) > 0 ? 'AXM' : 'ETH',
            timestamp: row.block_timestamp || row.processed_at
          };
        });
      } finally {
        client.release();
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
    }

    const totalFromDb = tierSalesFromDb.reduce((a, b) => a + b, 0);

    const tierBreakdown = TIER_NAMES.map((name, i) => ({
      id: i + 1,
      name,
      priceEth: DEFAULT_TIER_PRICES_ETH[i],
      priceAxm: DEFAULT_TIER_PRICES_AXM[i],
      icon: TIER_ICONS[i],
      sold: tierSalesFromDb[i],
      revenueEth: tierEthRevenue[i],
      revenueAxm: tierAxmRevenue[i],
      percentage: totalFromDb > 0 
        ? ((tierSalesFromDb[i] / totalFromDb) * 100).toFixed(1)
        : '0'
    }));

    const ethUsdPrice = 3500;
    const axmUsdPrice = 0.00033;
    const ethValue = parseFloat(totalEthCollected);
    const axmValue = parseFloat(totalAxmCollected);
    const totalUsdValue = (ethValue * ethUsdPrice) + (axmValue * axmUsdPrice);

    const evenSplitBreakdown = TIER_NAMES.map((name, i) => ({ 
      name, 
      count: 20, 
      eth: parseFloat((20 * DEFAULT_TIER_PRICES_ETH[i]).toFixed(2)),
      axm: parseFloat((20 * DEFAULT_TIER_PRICES_AXM[i]).toFixed(2))
    }));
    const evenSplitTotalEth = evenSplitBreakdown.reduce((sum, t) => sum + t.eth, 0);
    const evenSplitTotalAxm = evenSplitBreakdown.reduce((sum, t) => sum + t.axm, 0);

    const popularDistribution = [50, 30, 15, 4, 1];
    const popularTiersBreakdown = TIER_NAMES.map((name, i) => ({ 
      name, 
      count: popularDistribution[i], 
      eth: parseFloat((popularDistribution[i] * DEFAULT_TIER_PRICES_ETH[i]).toFixed(2)),
      axm: parseFloat((popularDistribution[i] * DEFAULT_TIER_PRICES_AXM[i]).toFixed(2))
    }));
    const popularTiersTotalEth = popularTiersBreakdown.reduce((sum, t) => sum + t.eth, 0);
    const popularTiersTotalAxm = popularTiersBreakdown.reduce((sum, t) => sum + t.axm, 0);

    const projections = {
      if100Nodes: {
        evenSplit: {
          totalEth: parseFloat(evenSplitTotalEth.toFixed(2)),
          totalAxm: parseFloat(evenSplitTotalAxm.toFixed(2)),
          usdValue: parseFloat(((evenSplitTotalEth * ethUsdPrice) + (evenSplitTotalAxm * axmUsdPrice)).toFixed(0)),
          breakdown: evenSplitBreakdown
        },
        popularTiers: {
          totalEth: parseFloat(popularTiersTotalEth.toFixed(2)),
          totalAxm: parseFloat(popularTiersTotalAxm.toFixed(2)),
          usdValue: parseFloat(((popularTiersTotalEth * ethUsdPrice) + (popularTiersTotalAxm * axmUsdPrice)).toFixed(0)),
          breakdown: popularTiersBreakdown
        }
      }
    };

    const ethPurchases = recentPurchases.filter(p => p.paymentMethod === 'ETH').length;
    const axmPurchases = recentPurchases.filter(p => p.paymentMethod === 'AXM').length;
    const totalPurchases = recentPurchases.length;

    res.json({
      contract: {
        address: DEPIN_SALES_CONTRACT,
        status: isPaused ? 'paused' : 'active'
      },
      summary: {
        totalNodesSold: Math.max(Number(totalNodesSold), totalFromDb),
        totalEthCollected,
        totalAxmCollected,
        estimatedUsdValue: totalUsdValue.toFixed(2)
      },
      tierBreakdown,
      paymentMethods: {
        eth: {
          count: ethPurchases,
          total: totalEthCollected,
          percentage: totalPurchases > 0 
            ? ((ethPurchases / totalPurchases) * 100).toFixed(1)
            : '0'
        },
        axm: {
          count: axmPurchases,
          total: totalAxmCollected,
          percentage: totalPurchases > 0 
            ? ((axmPurchases / totalPurchases) * 100).toFixed(1)
            : '0',
          discountRate: '15%'
        }
      },
      projections,
      recentPurchases: recentPurchases.slice(0, 10),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error fetching node sales data:', error);
    res.status(500).json({ 
      message: 'Failed to fetch node sales data', 
      error: error.message 
    });
  }
}

export default withAdminAuth(handler);
