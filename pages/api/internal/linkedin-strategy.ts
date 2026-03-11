import type { NextApiRequest, NextApiResponse } from 'next';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const PROFILE_CONTEXT = `PROFILE:
- Name: Clarence Fuqua
- Current Headline: "Building Community Ownership Infrastructure for Real Assets | Founder, Axiom Protocol | Tokenized SPVs - Lending Fund - On-Chain Governance | Arbitrum"
- Company: Axiom Nexus LLC
- Location: Atlanta Metropolitan Area
- Current connections: 154
- Website: axiomprotocol.app
- Education: University of Phoenix
- Featured post: "Check out my new Social Media Platform, on Arbitrum"

ABOUT SECTION (current):
"Most people are locked out of institutional-grade real asset ownership. Not because they lack capital. Because they lack infrastructure. I am building that infrastructure. I am Clarence Fuqua, founder of Axiom Protocol, a governance-first platform that bridges real-world assets with compliant on-chain finance. Before Axiom existed as software, it existed as a community. Real people. Pooled funds. A USDA-supported farmland acquisition that actually worked. That experience proved one thing: shared ownership is not a financial problem, it is a coordination problem. Axiom is the solution. We are building a 1M dual-asset Capital Program through structured SPVs, stablecoin settlement infrastructure, SEC Reg D compliant lending, and 72 verified on-chain contracts, all with full public audit trails. No speculation. No hype. Just disciplined execution backed by real assets. My work sits at the intersection of real estate finance, decentralized systems, regulatory strategy, and community-scale economic development. I design end-to-end frameworks, not single transactions, that address acquisition, financing, ownership, compliance, and distribution as a unified system. I also write and teach on sovereignty, institutional literacy, and long-cycle thinking. Because the communities that will thrive long-term are the ones that control their own capital infrastructure. I operate by one principle: Systems that endure create freedom. Systems built for speed eventually collapse."

TARGET AUDIENCE: Black and Latino W-2 workers aged 25-40 in Atlanta, Houston, and Charlotte who want to build wealth through real asset ownership but feel locked out of traditional institutional finance. Earning 50K-120K, saving but not knowing where to deploy capital beyond 401(k)s and savings accounts. Skeptical of crypto hype but interested in real assets. Value community, discipline, and proof over promises.

CONTEXT: Axiom Protocol has 72 verified smart contracts on Arbitrum One, a live platform at axiomprotocol.app, a 1M capital program in progress, SEC Reg D compliant lending, USDA-supported farmland acquisition experience, and a community wealth practice system. This is real infrastructure with real execution, not a whitepaper project.

GOAL: Grow from 154 connections to 5,000 followers as fast as possible.`;

function getPrompt(section: string): string {
  const prompts: Record<string, string> = {
    part1: [
      'You are an elite LinkedIn growth strategist who has helped founders grow from under 500 to 10,000+ followers.',
      'Given this profile:',
      PROFILE_CONTEXT,
      'Provide ONLY these 4 sections in clean markdown. Be extremely specific, tactical, no fluff:',
      '## 1. PROFILE OPTIMIZATION',
      'Exact new headline (character-optimized for LinkedIn search), completely rewritten About section optimized for the algorithm, banner design recommendations, featured section strategy (what to pin and why), experience section guidance, top 10 skills to add, creator mode settings. Explain WHY each change matters for algorithmic reach.',
      '## 2. CONTENT PILLARS',
      '5-6 specific recurring content themes. For each pillar provide: theme name, why it resonates with the target audience, 5 specific post topic examples, and the emotional trigger it activates.',
      '## 3. POSTING STRATEGY',
      'Optimal posting frequency per week, best posting times for ATL/HOU/CLT (Eastern and Central timezones), how to structure the first 2 lines as hooks for maximum see-more clicks, optimal post length ranges, and how posting consistency affects algorithmic reach over time.',
      '## 4. LINKEDIN ALGORITHM MECHANICS (2025-2026)',
      'How the algorithm works: initial test pool size and scoring, dwell time measurement and its weight, the 60-minute velocity window, comments vs reactions vs shares (weighted scoring), how see-more clicks boost distribution, the penalty system for external links and engagement bait, creator mode implications for reach, and connection feed vs follower feed distribution differences.',
    ].join('\n\n'),

    part2: [
      'You are an elite LinkedIn growth strategist who has helped founders grow from under 500 to 10,000+ followers.',
      'Given this profile:',
      PROFILE_CONTEXT,
      'Provide ONLY these 4 sections in clean markdown. Be extremely specific, tactical, no fluff:',
      '## 5. ENGAGEMENT STRATEGY',
      'Detailed daily engagement routine with specific time allocations (morning, midday, evening), whose posts to comment on (specific account types, follower ranges, industries), how to write comments that drive profile visits (with 3 example comments), the engage-before-you-post technique explained step by step, and how to systematically build relationships with larger accounts in RWA, fintech, real estate, and community wealth spaces.',
      '## 6. CONNECTION/OUTREACH STRATEGY',
      'Who to target (specific job titles, industries, locations, company sizes), how many connection requests per day within LinkedIn limits, 3 different connection request message templates ready to copy-paste, 2 follow-up message templates for after connection is accepted, and how to use LinkedIn search filters effectively to find ideal connections.',
      '## 7. CONTENT FORMATS RANKED BY ALGORITHM PERFORMANCE',
      'Rank ALL LinkedIn content formats from highest to lowest algorithmic reach: text-only posts, image+text posts, carousel/document posts, native video, polls, newsletters, long-form articles, reposts with commentary. For each format explain why it performs the way it does, its average reach multiplier, and the best use case for this specific profile.',
      '## 8. 30-60-90 DAY MILESTONES',
      'Specific measurable milestones for Days 1-30, Days 31-60, and Days 61-90. Include: target follower count, target engagement rate, content output goals, connection request targets, profile view targets, and key behavioral milestones. Be realistic but aggressive given starting at 154 connections.',
    ].join('\n\n'),

    part3: [
      'You are an elite LinkedIn growth strategist who has helped founders grow from under 500 to 10,000+ followers.',
      'Given this profile:',
      PROFILE_CONTEXT,
      'Provide ONLY these 4 sections in clean markdown. Be extremely specific, tactical, no fluff:',
      '## 9. WEEKLY CONTENT CALENDAR TEMPLATE',
      'A complete Monday-through-Friday content calendar template. For each day specify: the content pillar to use, the format type, the tone/angle, and an example topic. Include optional weekend activities.',
      '## 10. FIVE HIGH-PERFORMING POST TEMPLATES',
      'Provide 5 complete, ready-to-customize post templates. Each must be a different format: (1) Personal story/origin, (2) Contrarian take, (3) Educational breakdown, (4) Community call/invitation, (5) Proof of execution/build-in-public. Each template must include: the hook (first 2 lines), the full body, and the CTA. Write them specifically for Clarence and Axiom Protocol, not generic templates.',
      '## 11. HASHTAG STRATEGY',
      'Provide specific hashtags in 3 tiers: Large (1M+ followers), Medium (100K-1M), and Niche (under 100K). List at least 5 hashtags per tier. Recommend how many hashtags per post (optimal number), where to place them in the post, and which combinations work best for each content pillar.',
      '## 12. COMMON MISTAKES TO AVOID',
      'List 12-15 specific mistakes that would hurt THIS profile growth. For each mistake: what it is, why it is damaging to reach and growth, and what to do instead. Make these specific to the RWA/DeFi/community ownership niche and the target audience of Black and Latino W-2 professionals. Not generic LinkedIn advice.',
    ].join('\n\n'),
  };
  return prompts[section] || prompts.part1;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { section = 'part1' } = req.body || {};

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{ role: "user", content: getPrompt(section) }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    res.status(200).json({ strategy: text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
