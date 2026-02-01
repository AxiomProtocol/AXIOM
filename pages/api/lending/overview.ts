import type { NextApiRequest, NextApiResponse } from 'next';
import { morphoMarketService } from '@/server/services/lending/MorphoMarketService';
import { eulerVaultService } from '@/server/services/lending/EulerVaultService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const morphoStatus = morphoMarketService.getIntegrationStatus();
    const morphoMarkets = morphoMarketService.getProposedMarkets();
    const eulerStatus = eulerVaultService.getIntegrationStatus();
    const eulerVaults = eulerVaultService.getProposedVaults();
    const comparison = eulerVaultService.compareWithMorpho();

    const observationEndDate = new Date('2026-03-26');
    const now = new Date();
    const daysRemaining = Math.ceil((observationEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return res.status(200).json({
      success: true,
      data: {
        observationWindow: {
          active: true,
          endDate: '2026-03-26',
          daysRemaining: Math.max(0, daysRemaining),
          deploymentBlocked: true
        },
        summary: {
          totalProposedMarkets: morphoMarkets.length + eulerVaults.length,
          morphoMarkets: morphoMarkets.length,
          eulerVaults: eulerVaults.length,
          estimatedTotalAPY: '5-10%',
          deploymentCost: '$15-50 (gas only)'
        },
        protocols: {
          morpho: {
            status: morphoStatus,
            markets: morphoMarkets.map(m => ({
              name: m.name,
              loanToken: m.loanTokenSymbol,
              collateralToken: m.collateralTokenSymbol,
              lltv: m.lltv,
              estimatedAPY: m.estimatedAPY,
              status: m.status,
              blockReason: m.blockReason
            }))
          },
          euler: {
            status: eulerStatus,
            vaults: eulerVaults.map(v => ({
              name: v.name,
              asset: v.assetSymbol,
              vaultType: v.vaultType,
              collaterals: v.collaterals.map(c => c.symbol),
              estimatedAPY: v.estimatedAPY,
              status: v.status,
              blockReason: v.blockReason
            }))
          }
        },
        comparison,
        nextSteps: [
          {
            phase: 'Current (Observation)',
            actions: [
              'Review market specifications',
              'Monitor protocol developments',
              'Prepare oracle configurations',
              'Test on Arbitrum Sepolia'
            ]
          },
          {
            phase: 'Post-Observation (2026-03-26+)',
            actions: [
              'Deploy AXUSD/USDY market on Morpho',
              'Deploy AXUSD vault on Euler',
              'Seed initial liquidity',
              'Announce to community'
            ]
          }
        ],
        benefits: {
          forProtocol: [
            'External liquidity without capital deployment',
            'Protocol fee revenue (10% of interest)',
            'AXUSD utility and demand',
            'Institutional credibility'
          ],
          forLPs: [
            '5-10% APY on AXUSD deposits',
            'Access to RWA-backed lending',
            'Battle-tested protocol security'
          ],
          forBorrowers: [
            'Borrow against yield-bearing collateral',
            'USDY continues earning 5.35% while deposited',
            'Low liquidation risk with stablecoin collateral'
          ]
        }
      }
    });
  } catch (error) {
    console.error('Lending overview API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
