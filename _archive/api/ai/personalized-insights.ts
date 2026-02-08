import type { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from '../../../lib/server/gemini';
import { db } from '../../../server/db';
import { users, userGoals, susuGroupMembers, susuPurposeGroups } from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';

interface InsightRequest {
  userId?: string;
  walletAddress?: string;
  insightType: 'journey' | 'goals' | 'next-steps' | 'weekly-summary';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, walletAddress, insightType = 'journey' } = req.body as InsightRequest;

    let userData: typeof users.$inferSelect | null = null;
    let userGroupData: Array<{ groupId: number; role: string | null; groupName: string | null; memberCount: number | null }> | null = null;
    let goals: Array<typeof userGoals.$inferSelect> = [];

    if (userId) {
      const numericId = parseInt(userId, 10);
      
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, numericId));
        
        if (user) {
          userData = user;
        }

        goals = await db
          .select()
          .from(userGoals)
          .where(eq(userGoals.userId, numericId))
          .orderBy(desc(userGoals.createdAt))
          .limit(5);

        const memberships = await db
          .select({
            groupId: susuGroupMembers.groupId,
            role: susuGroupMembers.role,
            groupName: susuPurposeGroups.displayName,
            memberCount: susuPurposeGroups.memberCount
          })
          .from(susuGroupMembers)
          .leftJoin(susuPurposeGroups, eq(susuGroupMembers.groupId, susuPurposeGroups.id))
          .where(eq(susuGroupMembers.userId, numericId));

        if (memberships.length > 0) {
          userGroupData = memberships;
        }
      } catch (dbError) {
        console.log('Using sample data for personalized insights');
      }
    }

    const sampleUserContext = userData ? {
      name: userData.firstName || 'Member',
      memberSince: userData.memberSince,
      tier: userData.memberTier || 'explorer',
      groupsJoined: userData.totalGroupsJoined || 0,
      contributions: userData.totalSavingsContributions || 0
    } : {
      name: 'Member',
      memberSince: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      tier: 'explorer',
      groupsJoined: 1,
      contributions: 6
    };

    const prompts = {
      journey: `Create a personalized journey summary for this Axiom member:
- Name: ${sampleUserContext.name}
- Member since: ${sampleUserContext.memberSince}
- Current tier: ${sampleUserContext.tier}
- Groups joined: ${sampleUserContext.groupsJoined}
- Total contributions: ${sampleUserContext.contributions}
${goals.length > 0 ? `- Active goals: ${goals.map(g => g.title).join(', ')}` : ''}
${userGroupData ? `- Active in ${userGroupData.length} SUSU groups` : ''}

Provide an encouraging, personalized summary of their wealth-building journey so far. Include achievements, progress, and motivation.`,

      goals: `Analyze and provide insights on these financial goals:
${goals.length > 0 
  ? goals.map(g => `- ${g.title}: Target $${g.targetAmount}, Current $${g.currentAmount || 0}`).join('\n')
  : '- Emergency Fund: Target $3,000, Current $600\n- Home Down Payment: Target $20,000, Current $2,500'}

Provide specific, actionable advice for achieving each goal faster. Include timeline estimates and recommended contribution adjustments.`,

      'next-steps': `Based on this member's profile, recommend the best next steps:
- Tier: ${sampleUserContext.tier}
- Groups: ${sampleUserContext.groupsJoined}
- Contributions: ${sampleUserContext.contributions}

Suggest 3-5 concrete actions they should take this week to advance their wealth-building journey. Include specific features of the Axiom platform they should explore.`,

      'weekly-summary': `Create a weekly summary for this member:
- Contributions this week: $${Math.round(Math.random() * 200 + 50)}
- Payment status: On-time
- Group trust score: ${75 + Math.round(Math.random() * 20)}%
- Upcoming: Payment due in 5 days

Provide an encouraging weekly wrap-up with key highlights and preparation for the week ahead.`
    };

    const response = await generateText(prompts[insightType], {
      systemPrompt: `You are a supportive AI financial coach for Axiom, America's first on-chain smart city. 
You help members build wealth through community savings (SUSU circles), real estate, and DePIN infrastructure.
Be encouraging, specific, and action-oriented. Use the member's name when available.
Keep responses concise but impactful.`,
      model: 'gemini-2.5-flash'
    });

    const actionItems = [
      { action: 'Review your contribution schedule', priority: 'high' },
      { action: 'Check your group\'s graduation progress', priority: 'medium' },
      { action: 'Connect with new group members', priority: 'medium' }
    ];

    return res.status(200).json({
      success: true,
      insightType,
      insight: response,
      actionItems,
      userContext: {
        tier: sampleUserContext.tier,
        groupsJoined: sampleUserContext.groupsJoined,
        daysSinceMember: Math.round((Date.now() - new Date(sampleUserContext.memberSince || Date.now()).getTime()) / (1000 * 60 * 60 * 24))
      },
      dataSource: userData ? 'database' : 'sample',
      generatedAt: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Personalized insights error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
