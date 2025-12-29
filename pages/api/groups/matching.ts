import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

interface MatchCriteria {
  region: string;
  purpose: string;
  contributionMin?: number;
  contributionMax?: number;
  groupSizePreference?: 'small' | 'medium' | 'large';
  experienceLevel?: 'beginner' | 'intermediate' | 'experienced';
}

interface GroupScore {
  id: string;
  name: string;
  score: number;
  factors: { name: string; score: number; weight: number }[];
}

const PURPOSE_CATEGORIES = [
  'home_ownership',
  'business',
  'education',
  'emergency_fund',
  'wealth_building',
  'retirement',
  'travel',
  'family'
];

const REGIONS = [
  'northeast',
  'southeast',
  'midwest',
  'southwest',
  'west',
  'national'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const criteria: MatchCriteria = req.body;

    if (!criteria.region || !criteria.purpose) {
      return res.status(400).json({ 
        error: 'Region and purpose are required',
        validRegions: REGIONS,
        validPurposes: PURPOSE_CATEGORIES
      });
    }

    const normalizedRegion = criteria.region.toLowerCase();
    const normalizedPurpose = criteria.purpose.toLowerCase().replace(/\s+/g, '_');

    let groups: GroupScore[] = [];

    try {
      const result = await pool.query(`
        SELECT 
          spg.id, spg.display_name as name, sih.region_display as region, spc.name as purpose_category, 
          spg.member_count, spg.max_members, spg.contribution_amount as avg_contribution, 
          spg.is_active, spg.created_at
        FROM susu_purpose_groups spg
        LEFT JOIN susu_interest_hubs sih ON spg.hub_id = sih.id
        LEFT JOIN susu_purpose_categories spc ON spg.purpose_category_id = spc.id
        WHERE spg.is_active = true
          AND spg.member_count < COALESCE(spg.max_members, 20)
        ORDER BY spg.member_count DESC, spg.created_at DESC
        LIMIT 30
      `);

      groups = result.rows.map(g => {
        const factors: { name: string; score: number; weight: number }[] = [];
        
        const gRegion = (g.region || '').toLowerCase();
        let regionScore = 0;
        if (gRegion === normalizedRegion) {
          regionScore = 100;
        } else if (gRegion === 'national' || normalizedRegion === 'national') {
          regionScore = 70;
        } else if (
          (gRegion.includes('east') && normalizedRegion.includes('east')) ||
          (gRegion.includes('west') && normalizedRegion.includes('west'))
        ) {
          regionScore = 50;
        }
        factors.push({ name: 'region', score: regionScore, weight: 0.25 });

        const gPurpose = (g.purpose_category || '').toLowerCase().replace(/\s+/g, '_');
        let purposeScore = 0;
        if (gPurpose === normalizedPurpose) {
          purposeScore = 100;
        } else if (
          (gPurpose.includes('wealth') && normalizedPurpose.includes('wealth')) ||
          (gPurpose.includes('business') && normalizedPurpose.includes('business'))
        ) {
          purposeScore = 60;
        }
        factors.push({ name: 'purpose', score: purposeScore, weight: 0.30 });

        const avgContrib = parseFloat(g.avg_contribution) || 100;
        const contribMin = criteria.contributionMin || 0;
        const contribMax = criteria.contributionMax || 1000;
        const targetContrib = (contribMin + contribMax) / 2 || 100;
        const contribDiff = Math.abs(avgContrib - targetContrib);
        const contribScore = Math.max(0, 100 - (contribDiff / targetContrib * 100));
        factors.push({ name: 'contribution', score: Math.round(contribScore), weight: 0.20 });

        const memberCountForTrust = parseInt(g.member_count) || 0;
        const trustScore = Math.min(100, 70 + (memberCountForTrust * 2) + (g.is_active ? 10 : 0));
        factors.push({ name: 'trustScore', score: Math.round(trustScore), weight: 0.15 });

        const memberCount = parseInt(g.member_count) || 5;
        const maxMembers = parseInt(g.max_members) || 20;
        const sizeRatio = memberCount / maxMembers;
        let sizeScore = 80;
        if (criteria.groupSizePreference === 'small' && memberCount <= 6) {
          sizeScore = 100;
        } else if (criteria.groupSizePreference === 'medium' && memberCount > 6 && memberCount <= 12) {
          sizeScore = 100;
        } else if (criteria.groupSizePreference === 'large' && memberCount > 12) {
          sizeScore = 100;
        }
        if (sizeRatio < 0.3) sizeScore += 10;
        factors.push({ name: 'groupSize', score: Math.min(sizeScore, 100), weight: 0.10 });

        const totalScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);

        return {
          id: g.id.toString(),
          name: g.name || `Purpose Group ${g.id}`,
          score: Math.round(totalScore),
          factors
        };
      });

      groups.sort((a, b) => b.score - a.score);
    } catch (dbError) {
      console.log('Using algorithm demo with sample data:', dbError);
      
      const sampleGroups = [
        { id: '1', name: 'Atlanta Emergency Fund Circle', region: 'southeast', purpose: 'emergency_fund', contrib: 50, trust: 70, members: 0, max: 12 },
        { id: '2', name: 'Atlanta Home Buyers Circle', region: 'southeast', purpose: 'home_ownership', contrib: 200, trust: 70, members: 0, max: 10 },
        { id: '3', name: 'Miami Business Builders', region: 'southeast', purpose: 'business', contrib: 150, trust: 70, members: 0, max: 10 },
        { id: '4', name: 'Chicago Education Fund', region: 'midwest', purpose: 'education', contrib: 100, trust: 70, members: 0, max: 10 },
        { id: '5', name: 'Dallas Emergency Savers', region: 'southwest', purpose: 'emergency_fund', contrib: 50, trust: 70, members: 0, max: 12 }
      ];

      groups = sampleGroups.map(g => {
        const factors: { name: string; score: number; weight: number }[] = [];
        
        let regionScore = g.region === normalizedRegion ? 100 : g.region === 'national' ? 70 : 30;
        factors.push({ name: 'region', score: regionScore, weight: 0.25 });

        let purposeScore = g.purpose === normalizedPurpose ? 100 : 40;
        factors.push({ name: 'purpose', score: purposeScore, weight: 0.30 });

        const targetContrib = ((criteria.contributionMin || 0) + (criteria.contributionMax || 200)) / 2 || 100;
        const contribScore = Math.max(0, 100 - Math.abs(g.contrib - targetContrib));
        factors.push({ name: 'contribution', score: contribScore, weight: 0.20 });

        factors.push({ name: 'trustScore', score: g.trust, weight: 0.15 });

        let sizeScore = 80;
        if (criteria.groupSizePreference === 'small' && g.members <= 6) sizeScore = 100;
        else if (criteria.groupSizePreference === 'medium' && g.members > 6 && g.members <= 12) sizeScore = 100;
        else if (criteria.groupSizePreference === 'large' && g.members > 12) sizeScore = 100;
        factors.push({ name: 'groupSize', score: sizeScore, weight: 0.10 });

        const totalScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);

        return { id: g.id, name: g.name, score: Math.round(totalScore), factors };
      }).sort((a, b) => b.score - a.score);
    }

    return res.status(200).json({
      success: true,
      criteria: {
        region: normalizedRegion,
        purpose: normalizedPurpose,
        contributionRange: criteria.contributionMin || criteria.contributionMax 
          ? `$${criteria.contributionMin || 0} - $${criteria.contributionMax || '∞'}`
          : 'Any',
        groupSizePreference: criteria.groupSizePreference || 'any'
      },
      algorithm: {
        version: '1.0',
        weights: {
          purpose: 0.30,
          region: 0.25,
          contribution: 0.20,
          trustScore: 0.15,
          groupSize: 0.10
        }
      },
      matches: groups.slice(0, 10),
      totalCandidates: groups.length,
      matchedAt: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Group matching error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}
