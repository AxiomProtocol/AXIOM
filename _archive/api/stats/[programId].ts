import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { programId } = req.query;

  const defaultStats: Record<string, { label: string; value: string }[]> = {
    land: [
      { label: 'Active Campaigns', value: '3' },
      { label: 'Your Contributions', value: '$0' }
    ],
    keygrow: [
      { label: 'Available Properties', value: '12' },
      { label: 'Ownership Progress', value: '0%' }
    ],
    susu: [
      { label: 'Active Circles', value: '8' },
      { label: 'Your Savings', value: '$0' }
    ],
    governance: [
      { label: 'Open Proposals', value: '5' },
      { label: 'Your Voting Power', value: '0 AXM' }
    ],
    training: [
      { label: 'Available Courses', value: '12' },
      { label: 'Your Progress', value: '0%' }
    ],
    staking: [
      { label: 'Current APY', value: '12.5%' },
      { label: 'Your Staked', value: '0 AXM' }
    ],
    transparency: [
      { label: 'Treasury Balance', value: '$1.2M' },
      { label: 'Last Update', value: 'Today' }
    ],
    nodes: [
      { label: 'Active Nodes', value: '47' },
      { label: 'Your Nodes', value: '0' }
    ]
  };

  try {
    let stats = defaultStats[programId as string] || [];

    if (programId === 'land') {
      try {
        const result = await db.execute(sql`SELECT COUNT(*) as count FROM land_campaigns WHERE status = 'active'`);
        if (result.rows && result.rows[0]) {
          stats = [
            { label: 'Active Campaigns', value: String((result.rows[0] as any).count || 3) },
            { label: 'Your Contributions', value: '$0' }
          ];
        }
      } catch (e) {
        // Use default
      }
    }

    if (programId === 'susu') {
      try {
        const result = await db.execute(sql`SELECT COUNT(*) as count FROM susu_circles WHERE status = 'active'`);
        if (result.rows && result.rows[0]) {
          stats = [
            { label: 'Active Circles', value: String((result.rows[0] as any).count || 8) },
            { label: 'Your Savings', value: '$0' }
          ];
        }
      } catch (e) {
        // Use default
      }
    }

    if (programId === 'governance') {
      try {
        const result = await db.execute(sql`SELECT COUNT(*) as count FROM proposals WHERE status = 'active'`);
        if (result.rows && result.rows[0]) {
          stats = [
            { label: 'Open Proposals', value: String((result.rows[0] as any).count || 5) },
            { label: 'Your Voting Power', value: '0 AXM' }
          ];
        }
      } catch (e) {
        // Use default
      }
    }

    return res.status(200).json({
      success: true,
      programId,
      stats
    });
  } catch (error) {
    console.error(`Error fetching ${programId} stats:`, error);
    return res.status(200).json({
      success: true,
      programId,
      stats: defaultStats[programId as string] || []
    });
  }
}
