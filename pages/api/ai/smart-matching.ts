import type { NextApiRequest, NextApiResponse } from 'next';
import { generateText } from '../../../lib/server/gemini';
import { pool } from '../../../server/db';

interface MemberProfile {
  region: string;
  purpose: string;
  commitmentLevel: string;
  contributionAmount: number;
  preferences?: string[];
}

interface GroupMatch {
  groupId: string;
  groupName: string;
  region: string;
  purpose: string;
  memberCount: number;
  maxMembers: number;
  avgContribution: number;
  trustScore: number;
  matchScore: number;
  matchReasons: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const memberProfile: MemberProfile = req.body;

    if (!memberProfile.region || !memberProfile.purpose) {
      return res.status(400).json({ error: 'Region and purpose are required' });
    }

    let availableGroups: GroupMatch[] = [];

    try {
      const groupsResult = await pool.query(`
        SELECT 
          spg.id, spg.member_count, spg.max_members, spg.is_active,
          spg.display_name, spg.contribution_amount, sih.region_display as region,
          spc.name as purpose_category
        FROM susu_purpose_groups spg
        LEFT JOIN susu_interest_hubs sih ON spg.hub_id = sih.id
        LEFT JOIN susu_purpose_categories spc ON spg.purpose_category_id = spc.id
        WHERE spg.is_active = true 
          AND spg.member_count < COALESCE(spg.max_members, 20)
        ORDER BY spg.member_count DESC
        LIMIT 20
      `);

      availableGroups = groupsResult.rows.map((g, idx) => {
        const regionMatch = (g.region || '').toLowerCase().includes(memberProfile.region.toLowerCase());
        const purposeMatch = (g.purpose_category || '').toLowerCase() === memberProfile.purpose.toLowerCase();
        const avgContrib = parseFloat(g.contribution_amount) || 100;
        const contributionMatch = Math.abs(avgContrib - memberProfile.contributionAmount) < 50;
        const memberCount = parseInt(g.member_count) || 0;
        const maxMembers = parseInt(g.max_members) || 20;
        
        const purposeScore = purposeMatch ? 100 : 50;
        const regionScore = regionMatch ? 100 : 60;
        const contribDiff = Math.abs(avgContrib - memberProfile.contributionAmount);
        const contributionScore = Math.max(0, 100 - (contribDiff / (memberProfile.contributionAmount || 100) * 100));
        const activityScore = memberCount >= 3 ? (memberCount >= 5 ? 100 : 80) : 60;
        const availabilityScore = memberCount < maxMembers - 1 ? 100 : (memberCount < maxMembers ? 75 : 0);
        
        const matchScore = Math.round(
          purposeScore * 0.30 +
          regionScore * 0.25 +
          contributionScore * 0.20 +
          activityScore * 0.15 +
          availabilityScore * 0.10
        );
        
        const matchReasons: string[] = [];
        if (purposeMatch) matchReasons.push('Purpose aligned');
        if (regionMatch) matchReasons.push('Same region');
        if (contributionMatch) matchReasons.push('Similar contribution level');
        if (memberCount >= 3) matchReasons.push('Active community');
        if (memberCount < maxMembers - 2) matchReasons.push('Space available');

        const trustScore = Math.min(100, 70 + (memberCount * 2) + (g.is_active ? 10 : 0));

        return {
          groupId: g.id.toString(),
          groupName: g.display_name || `Purpose Group ${idx + 1}`,
          region: g.region || 'National',
          purpose: g.purpose_category || 'General',
          memberCount,
          maxMembers,
          avgContribution: avgContrib,
          trustScore,
          matchScore: Math.min(matchScore, 100),
          matchReasons
        };
      });

      availableGroups.sort((a, b) => b.matchScore - a.matchScore);
    } catch (dbError) {
      console.log('Using sample groups for matching:', dbError);
    }
    
    if (availableGroups.length === 0) {
      const sampleGroups = [
        { id: '1', name: 'Atlanta Emergency Fund Circle', region: 'southeast', purpose: 'emergency_fund', members: 0, max: 12, contrib: 50, trust: 70 },
        { id: '2', name: 'Atlanta Home Buyers Circle', region: 'southeast', purpose: 'home_ownership', members: 0, max: 10, contrib: 200, trust: 70 },
        { id: '3', name: 'Miami Business Builders', region: 'southeast', purpose: 'business', members: 0, max: 10, contrib: 150, trust: 70 },
        { id: '4', name: 'Chicago Education Fund', region: 'midwest', purpose: 'education', members: 0, max: 10, contrib: 100, trust: 70 },
        { id: '5', name: 'Dallas Emergency Savers', region: 'southwest', purpose: 'emergency_fund', members: 0, max: 12, contrib: 50, trust: 70 },
        { id: '6', name: 'Houston Vehicle Fund', region: 'southwest', purpose: 'vehicle_purchase', members: 0, max: 10, contrib: 125, trust: 70 }
      ];

      availableGroups = sampleGroups.map(g => {
        const regionMatch = g.region.includes(memberProfile.region.toLowerCase()) || g.region === 'national';
        const purposeMatch = g.purpose === memberProfile.purpose.toLowerCase();
        const contributionMatch = Math.abs(g.contrib - memberProfile.contributionAmount) < 50;

        let matchScore = 50;
        const matchReasons: string[] = [];

        if (regionMatch) { matchScore += 20; matchReasons.push('Same region'); }
        if (purposeMatch) { matchScore += 25; matchReasons.push('Aligned purpose'); }
        if (contributionMatch) { matchScore += 15; matchReasons.push('Similar contribution level'); }
        if (g.trust > 85) { matchScore += 10; matchReasons.push('High trust group'); }

        return {
          groupId: g.id,
          groupName: g.name,
          region: g.region,
          purpose: g.purpose,
          memberCount: g.members,
          maxMembers: g.max,
          avgContribution: g.contrib,
          trustScore: g.trust,
          matchScore: Math.min(matchScore, 100),
          matchReasons
        };
      }).sort((a, b) => b.matchScore - a.matchScore);
    }

    const topMatches = availableGroups.slice(0, 5);

    let aiRecommendation = '';
    if (topMatches.length > 0) {
      const prompt = `You are a community matching AI for Axiom's Wealth Practice. A member is looking for a SUSU savings group.

Member Profile:
- Region: ${memberProfile.region}
- Purpose: ${memberProfile.purpose}
- Monthly Contribution: $${memberProfile.contributionAmount}
- Commitment Level: ${memberProfile.commitmentLevel}

Top Match: ${topMatches[0].groupName}
- Match Score: ${topMatches[0].matchScore}%
- Match Reasons: ${topMatches[0].matchReasons.join(', ')}
- Current Members: ${topMatches[0].memberCount}/${topMatches[0].maxMembers}
- Trust Score: ${topMatches[0].trustScore}

Write a brief (2-3 sentences) personalized recommendation explaining why this group would be a great fit for this member. Be warm and encouraging.`;

      try {
        aiRecommendation = await generateText(prompt);
      } catch (aiError) {
        console.log('Using fallback recommendation:', aiError);
        aiRecommendation = `Based on your profile, ${topMatches[0].groupName} is an excellent match! They share your focus on ${memberProfile.purpose.replace(/_/g, ' ')} and have a strong trust score of ${topMatches[0].trustScore}. This group has room for new members and welcomes contributions at your level.`;
      }
    }

    return res.status(200).json({
      success: true,
      memberProfile: {
        region: memberProfile.region,
        purpose: memberProfile.purpose,
        contributionAmount: memberProfile.contributionAmount
      },
      matches: topMatches,
      totalAvailable: availableGroups.length,
      aiRecommendation,
      matchedAt: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Smart matching error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
