import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const [claims, disclosures, thresholds, stats] = await Promise.all([
      pool.query(`
        SELECT 
          id, claim_type, claim_text, feature_scope, evidence_type, evidence_url,
          verified_at, is_active, created_at
        FROM compliance_claims
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 50
      `),
      pool.query(`
        SELECT 
          id, disclosure_type, title, content, feature_scope,
          risk_level, is_required, is_active, created_at
        FROM compliance_disclosures
        WHERE is_active = true AND feature_scope LIKE '%susu%'
        ORDER BY risk_level DESC, created_at DESC
      `),
      pool.query(`
        SELECT threshold_key, threshold_value, description, updated_at
        FROM susu_mode_thresholds
        ORDER BY threshold_key
      `),
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM susu_purpose_groups WHERE is_active = true) as active_groups,
          (SELECT COUNT(*) FROM susu_interest_hubs WHERE is_active = true) as active_hubs,
          (SELECT COUNT(DISTINCT user_id) FROM susu_hub_members) as total_participants,
          (SELECT COUNT(*) FROM susu_purpose_groups WHERE graduated_to_pool_id IS NOT NULL) as graduated_pools,
          (SELECT COUNT(*) FROM susu_charters) as total_charters,
          (SELECT COUNT(*) FROM susu_charter_acceptances) as total_charter_acceptances
      `)
    ]);

    const susuClaims = claims.rows.filter(c => 
      c.feature_scope?.includes('susu') || c.claim_type?.includes('susu')
    );

    const trustCenter = {
      productName: 'Axiom SUSU',
      description: 'Peer-to-peer rotating savings circles powered by smart contracts',
      
      custodyModel: {
        type: 'non-custodial',
        description: 'Funds flow directly between participants through smart contract. Axiom does not hold or control member funds.',
        contractAddress: '0x6C69D730327930B49A7997B7b5fb0865F30c95A5',
        network: 'Arbitrum One'
      },

      riskDisclosures: [
        {
          category: 'Participation Risk',
          description: 'SUSU pools depend on all members making timely contributions. If a member fails to pay, other members may not receive their expected payout.'
        },
        {
          category: 'No Guarantee',
          description: 'This is not an investment product. There are no guaranteed returns, profits, or yields. You receive only what other members contribute.'
        },
        {
          category: 'Not Insured',
          description: 'SUSU pools are not FDIC insured, not bank deposits, and not guaranteed by any government agency.'
        },
        {
          category: 'Smart Contract Risk',
          description: 'While the smart contract has been reviewed, all blockchain-based systems carry inherent technical risks.'
        },
        {
          category: 'Regulatory Status',
          description: 'SUSU operates as a peer-to-peer mutual aid arrangement. It is not a securities offering or investment contract.'
        }
      ],

      prohibitedClaims: [
        'Guaranteed returns or profits',
        'FDIC insured or bank-backed',
        'Risk-free savings',
        'Investment opportunity',
        'Yield or APY promises',
        'SEC compliant or regulated'
      ],

      allowedClaims: [
        'Peer-to-peer rotating savings',
        'Non-custodial smart contract',
        'Community savings circles',
        'Traditional ROSCA model',
        'Transparent rotation schedule',
        'Member-driven governance'
      ],

      operationalStats: stats.rows[0],
      
      capitalModeThresholds: thresholds.rows.reduce((acc, row) => {
        acc[row.threshold_key] = {
          value: parseFloat(row.threshold_value),
          description: row.description,
          lastUpdated: row.updated_at
        };
        return acc;
      }, {}),

      activeDisclosures: disclosures.rows,
      verifiedClaims: susuClaims,

      supportContact: {
        email: 'support@axiomprotocol.io',
        website: 'https://axiomprotocol.io/support'
      },

      lastUpdated: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      trustCenter
    });
  } catch (error: any) {
    console.error('Error fetching trust center data:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch trust center data' });
  }
}
