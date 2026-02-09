import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../lib/db';

/**
 * AXUSD Reserve Transparency API
 * 
 * GENIUS Act Compliance Endpoint
 * Provides monthly public disclosures of reserve composition
 * 
 * GET /api/axusd/reserves
 * Returns current reserve status for AXUSD stablecoin
 */

interface ReserveData {
  timestamp: string;
  totalSupply: string;
  reserves: {
    usdc: {
      amount: string;
      percentage: number;
      source: string;
    };
    tbills: {
      amount: string;
      percentage: number;
      assets: {
        name: string;
        amount: string;
        maturityDate?: string;
      }[];
    };
    other: {
      amount: string;
      percentage: number;
    };
  };
  totalReserves: string;
  reserveRatio: number;
  isFullyBacked: boolean;
  compliance: {
    geniusActCompliant: boolean;
    lastDisclosure: string;
    nextDisclosureDue: string;
    yieldDistributionBlocked: boolean;
    auditorAttestation?: string;
  };
  contracts: {
    axusd: string;
    psm: string;
    vaultEngine: string;
    tbillVault: string;
    backstopVault: string;
    geniusCompliance: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Contract addresses on Arbitrum One
    const contracts = {
      axusd: process.env.AXUSD_ADDRESS || '0x0000000000000000000000000000000000000000',
      psm: process.env.PSM_ADDRESS || '0x0000000000000000000000000000000000000000',
      vaultEngine: process.env.VAULT_ENGINE_ADDRESS || '0x0000000000000000000000000000000000000000',
      tbillVault: process.env.TBILL_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000',
      backstopVault: process.env.BACKSTOP_VAULT_ADDRESS || '0x0000000000000000000000000000000000000000',
      geniusCompliance: process.env.GENIUS_COMPLIANCE_ADDRESS || '0x0000000000000000000000000000000000000000',
    };

    // In production, these would be fetched from on-chain
    // For now, we return the structure with placeholder data
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Simulated reserve data (replace with actual on-chain calls)
    const reserveData: ReserveData = {
      timestamp: now.toISOString(),
      totalSupply: '0', // Will be populated from chain
      reserves: {
        usdc: {
          amount: '0',
          percentage: 0,
          source: 'PSM (Peg Stability Module)'
        },
        tbills: {
          amount: '0',
          percentage: 0,
          assets: [
            {
              name: 'Ondo OUSG (Short-Term US Treasuries)',
              amount: '0',
              maturityDate: undefined
            },
            {
              name: 'Backed bIB01 (0-1 Year Treasury)',
              amount: '0',
              maturityDate: undefined
            }
          ]
        },
        other: {
          amount: '0',
          percentage: 0
        }
      },
      totalReserves: '0',
      reserveRatio: 0,
      isFullyBacked: false,
      compliance: {
        geniusActCompliant: false,
        lastDisclosure: lastMonth.toISOString(),
        nextDisclosureDue: nextMonth.toISOString(),
        yieldDistributionBlocked: true, // GENIUS Act requirement
        auditorAttestation: undefined
      },
      contracts
    };

    // Try to get actual data from database
    try {
      const result = await db.execute(`
        SELECT 
          key, 
          value::text,
          updated_at
        FROM system_config 
        WHERE key IN (
          'axusd_total_supply',
          'axusd_usdc_reserves',
          'axusd_tbill_reserves',
          'axusd_last_disclosure',
          'axusd_auditor_attestation'
        )
      `);

      const configMap: Record<string, string> = {};
      if (result.rows) {
        for (const row of result.rows) {
          configMap[row.key as string] = row.value as string;
        }
      }

      if (configMap['axusd_total_supply']) {
        reserveData.totalSupply = configMap['axusd_total_supply'];
      }
      if (configMap['axusd_usdc_reserves']) {
        reserveData.reserves.usdc.amount = configMap['axusd_usdc_reserves'];
      }
      if (configMap['axusd_tbill_reserves']) {
        reserveData.reserves.tbills.amount = configMap['axusd_tbill_reserves'];
      }
      if (configMap['axusd_last_disclosure']) {
        reserveData.compliance.lastDisclosure = configMap['axusd_last_disclosure'];
      }
      if (configMap['axusd_auditor_attestation']) {
        reserveData.compliance.auditorAttestation = configMap['axusd_auditor_attestation'];
      }

      // Calculate totals and percentages
      const usdcAmount = parseFloat(reserveData.reserves.usdc.amount) || 0;
      const tbillAmount = parseFloat(reserveData.reserves.tbills.amount) || 0;
      const otherAmount = parseFloat(reserveData.reserves.other.amount) || 0;
      const totalReserves = usdcAmount + tbillAmount + otherAmount;
      const totalSupply = parseFloat(reserveData.totalSupply) || 0;

      reserveData.totalReserves = totalReserves.toString();
      
      if (totalReserves > 0) {
        reserveData.reserves.usdc.percentage = (usdcAmount / totalReserves) * 100;
        reserveData.reserves.tbills.percentage = (tbillAmount / totalReserves) * 100;
        reserveData.reserves.other.percentage = (otherAmount / totalReserves) * 100;
      }

      if (totalSupply > 0) {
        reserveData.reserveRatio = (totalReserves / totalSupply) * 100;
        reserveData.isFullyBacked = reserveData.reserveRatio >= 100;
      }

      // Check GENIUS compliance
      const lastDisclosure = new Date(reserveData.compliance.lastDisclosure);
      const daysSinceDisclosure = (now.getTime() - lastDisclosure.getTime()) / (1000 * 60 * 60 * 24);
      const disclosureUpToDate = daysSinceDisclosure <= 30;

      reserveData.compliance.geniusActCompliant = 
        reserveData.isFullyBacked && 
        disclosureUpToDate && 
        reserveData.compliance.yieldDistributionBlocked;

    } catch (dbError) {
      console.log('Database query failed, using placeholder data:', dbError);
    }

    // Set cache headers for transparency
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minute cache
    
    return res.status(200).json({
      success: true,
      data: reserveData,
      disclaimer: 'This data is provided for informational purposes. For official attestations, please refer to the auditor attestation document.',
      documentation: 'https://axiomprotocol.app/docs/axusd-reserves'
    });

  } catch (error) {
    console.error('Reserve API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reserve data'
    });
  }
}
