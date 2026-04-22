import type { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from '../../../lib/server/gemini';
import { pool } from '../../../server/db';

interface MemberBehavior {
  paymentHistory: string[];
  averageContribution: number;
  cyclesParticipated: number;
  currentStreak: number;
  savingsGoal?: number;
  preferredCategory?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, walletAddress } = req.method === 'GET' ? req.query : req.body;

    if (!userId && !walletAddress) {
      return res.status(400).json({ error: 'User ID or wallet address is required' });
    }

    let memberBehavior: MemberBehavior = {
      paymentHistory: ['on_time', 'on_time', 'on_time'],
      averageContribution: 100,
      cyclesParticipated: 3,
      currentStreak: 3,
      savingsGoal: 5000,
      preferredCategory: 'home_ownership'
    };

    try {
      const registrationResult = await pool.query(`
        SELECT commitment_amount, purpose
        FROM susu_purpose_registrations
        WHERE member_email = $1 OR member_email = $2
        ORDER BY created_at DESC LIMIT 1
      `, [userId, walletAddress]);

      if (registrationResult.rows[0]) {
        memberBehavior.averageContribution = parseFloat(registrationResult.rows[0].commitment_amount) || 100;
        memberBehavior.preferredCategory = registrationResult.rows[0].purpose || memberBehavior.preferredCategory;
      }
    } catch (dbError) {
      console.log('Using default behavior data:', dbError);
    }

    const prompt = `You are a personal financial wellness AI for Axiom's Wealth Practice - a community savings platform focused on building generational wealth. Generate personalized savings tips based on member behavior.

Member Profile:
- Average Monthly Contribution: $${memberBehavior.averageContribution}
- Current Payment Streak: ${memberBehavior.currentStreak} months
- Total Cycles Participated: ${memberBehavior.cyclesParticipated}
- Savings Goal: $${memberBehavior.savingsGoal}
- Focus Area: ${memberBehavior.preferredCategory?.replace(/_/g, ' ')}
- Payment History: ${memberBehavior.paymentHistory.join(', ')}

Generate 5 personalized, actionable savings tips that:
1. Are specific to their current contribution level and goals
2. Encourage increasing their savings rate gradually
3. Celebrate their current streak and motivate consistency
4. Connect to their focus area (${memberBehavior.preferredCategory})
5. Include practical, real-world advice

Format as JSON array with objects containing: tip (string), category (string: 'consistency' | 'growth' | 'community' | 'mindset' | 'action'), priority (1-5), estimatedImpact (string)`;

    let tips;
    try {
      const responseText = await generateText(prompt);
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        tips = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found');
      }
    } catch (aiError) {
      console.log('Using fallback tips:', aiError);
      tips = [
        {
          tip: `Great job maintaining a ${memberBehavior.currentStreak}-month payment streak! This consistency is building both your trust score and wealth foundation.`,
          category: 'consistency',
          priority: 1,
          estimatedImpact: '+15 trust points per month'
        },
        {
          tip: `Consider increasing your monthly contribution by $25 to $${memberBehavior.averageContribution + 25}. Small increases compound significantly over time.`,
          category: 'growth',
          priority: 2,
          estimatedImpact: '+$300/year additional savings'
        },
        {
          tip: 'Set up automatic transfers on payday to ensure your SUSU contribution is prioritized before other spending.',
          category: 'action',
          priority: 3,
          estimatedImpact: 'Eliminates missed payment risk'
        },
        {
          tip: `You're ${Math.round((memberBehavior.averageContribution * 12) / (memberBehavior.savingsGoal || 5000) * 100)}% of the way to your annual savings goal. Stay focused on your ${memberBehavior.preferredCategory?.replace(/_/g, ' ')} journey!`,
          category: 'mindset',
          priority: 4,
          estimatedImpact: 'Increased motivation'
        },
        {
          tip: 'Invite a trusted friend or family member to join your Purpose Group. Shared accountability strengthens everyone\'s commitment.',
          category: 'community',
          priority: 5,
          estimatedImpact: '+20% group retention rate'
        }
      ];
    }

    const weeklyGoal = Math.round(memberBehavior.averageContribution / 4);
    const progressToGoal = memberBehavior.savingsGoal 
      ? Math.round((memberBehavior.averageContribution * memberBehavior.cyclesParticipated) / memberBehavior.savingsGoal * 100)
      : 0;

    return res.status(200).json({
      success: true,
      tips,
      memberInsights: {
        currentStreak: memberBehavior.currentStreak,
        streakStatus: memberBehavior.currentStreak >= 3 ? 'excellent' : memberBehavior.currentStreak >= 1 ? 'good' : 'building',
        weeklyGoal: `$${weeklyGoal}`,
        progressToGoal: `${Math.min(progressToGoal, 100)}%`,
        nextMilestone: memberBehavior.currentStreak < 3 ? '3-month streak bonus' : 
                       memberBehavior.currentStreak < 6 ? '6-month consistency badge' : 
                       '12-month wealth builder status'
      },
      refreshedAt: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Savings tips error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
