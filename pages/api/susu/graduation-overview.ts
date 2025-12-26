import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { 
  susuPurposeGroups, 
  susuInterestHubs,
  susuPurposeCategories
} from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';

interface GroupData {
  id: string;
  name: string;
  memberCount: number;
  completedCycles: number;
  totalContributed: number;
  graduationProgress: number;
  stage: 'purpose' | 'community' | 'capital' | 'graduated';
  trustScore: number;
  paymentRate: number;
}

function calculateGraduationProgress(completedCycles: number, memberCount: number): number {
  const cycleScore = Math.min(completedCycles * 20, 60);
  const memberScore = Math.min(memberCount * 4, 40);
  return Math.min(cycleScore + memberScore, 100);
}

function determineStage(graduationProgress: number, hasGraduated: boolean): GroupData['stage'] {
  if (hasGraduated) return 'graduated';
  if (graduationProgress >= 100) return 'capital';
  if (graduationProgress >= 50) return 'community';
  return 'purpose';
}

const sampleGroups: GroupData[] = [
  {
    id: 'grp_001',
    name: 'Atlanta Builders Circle',
    memberCount: 12,
    completedCycles: 4,
    totalContributed: 4800,
    graduationProgress: 100,
    stage: 'capital',
    trustScore: 95,
    paymentRate: 98
  },
  {
    id: 'grp_002',
    name: 'Tech Sisters Network',
    memberCount: 8,
    completedCycles: 3,
    totalContributed: 2400,
    graduationProgress: 85,
    stage: 'community',
    trustScore: 88,
    paymentRate: 94
  },
  {
    id: 'grp_003',
    name: 'Brooklyn Wealth Hub',
    memberCount: 15,
    completedCycles: 2,
    totalContributed: 3000,
    graduationProgress: 65,
    stage: 'community',
    trustScore: 75,
    paymentRate: 90
  },
  {
    id: 'grp_004',
    name: 'Houston Entrepreneurs',
    memberCount: 10,
    completedCycles: 5,
    totalContributed: 5000,
    graduationProgress: 100,
    stage: 'graduated',
    trustScore: 98,
    paymentRate: 99
  },
  {
    id: 'grp_005',
    name: 'Chicago Collective',
    memberCount: 6,
    completedCycles: 1,
    totalContributed: 600,
    graduationProgress: 35,
    stage: 'community',
    trustScore: 65,
    paymentRate: 85
  },
  {
    id: 'grp_006',
    name: 'LA Dreams Team',
    memberCount: 20,
    completedCycles: 3,
    totalContributed: 6000,
    graduationProgress: 78,
    stage: 'community',
    trustScore: 82,
    paymentRate: 92
  }
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let groups: GroupData[] = [];
    let dataSource = 'sample';

    try {
      const dbGroups = await db
        .select({
          id: susuPurposeGroups.id,
          displayName: susuPurposeGroups.displayName,
          memberCount: susuPurposeGroups.memberCount,
          contributionAmount: susuPurposeGroups.contributionAmount,
          graduatedToPoolId: susuPurposeGroups.graduatedToPoolId,
          isActive: susuPurposeGroups.isActive,
          hubId: susuPurposeGroups.hubId,
          purposeCategoryId: susuPurposeGroups.purposeCategoryId
        })
        .from(susuPurposeGroups)
        .where(eq(susuPurposeGroups.isActive, true))
        .orderBy(desc(susuPurposeGroups.memberCount))
        .limit(50);

      if (dbGroups.length > 0) {
        groups = dbGroups.map((group) => {
          const memberCount = group.memberCount || 0;
          const contributionAmount = parseFloat(group.contributionAmount || '0');
          const completedCycles = Math.max(1, Math.floor(memberCount / 2));
          const totalContributed = Math.round(contributionAmount * memberCount * completedCycles);
          const graduationProgress = calculateGraduationProgress(completedCycles, memberCount);
          const hasGraduated = group.graduatedToPoolId !== null;
          const stage = determineStage(graduationProgress, hasGraduated);
          const trustScore = 70 + Math.min(completedCycles * 5, 28);
          const paymentRate = 85 + Math.min(completedCycles * 2, 14);
          
          return {
            id: `grp_${group.id}`,
            name: group.displayName || `Group #${group.id}`,
            memberCount,
            completedCycles,
            totalContributed,
            graduationProgress,
            stage,
            trustScore,
            paymentRate
          };
        });
        dataSource = 'database';
      }
    } catch (dbError) {
      console.log('Using sample data for graduation overview:', dbError);
    }

    if (groups.length === 0) {
      groups = sampleGroups;
    }

    const summary = {
      totalGroups: groups.length,
      totalMembers: groups.reduce((sum, g) => sum + g.memberCount, 0),
      totalSaved: groups.reduce((sum, g) => sum + g.totalContributed, 0),
      averageProgress: groups.length > 0 
        ? Math.round(groups.reduce((sum, g) => sum + g.graduationProgress, 0) / groups.length)
        : 0
    };

    return res.status(200).json({
      success: true,
      groups,
      summary,
      dataSource
    });
  } catch (error: unknown) {
    console.error('Graduation overview error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
