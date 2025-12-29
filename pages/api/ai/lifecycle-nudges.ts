import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

interface Nudge {
  id: string;
  type: 'action' | 'celebration' | 'reminder' | 'tip';
  title: string;
  message: string;
  cta?: string;
  ctaLink?: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  dismissable: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.query;

  try {
    const nudges: Nudge[] = [];
    
    if (!wallet) {
      nudges.push({
        id: 'connect_wallet',
        type: 'action',
        title: 'Connect Your Wallet',
        message: 'Connect your wallet to start earning rewards and tracking your progress.',
        cta: 'Connect Now',
        ctaLink: '/wealth-dashboard',
        priority: 'high',
        icon: '🔗',
        dismissable: false,
      });
      return res.status(200).json({ nudges });
    }

    const userResult = await pool.query(
      `SELECT id, created_at, onboarding_completed FROM users WHERE LOWER(wallet_address) = LOWER($1)`,
      [wallet]
    );

    if (userResult.rows.length === 0) {
      nudges.push({
        id: 'welcome_new',
        type: 'tip',
        title: 'Welcome to Axiom!',
        message: 'Start your wealth-building journey by completing the onboarding.',
        cta: 'Get Started',
        ctaLink: '/susu-start',
        priority: 'high',
        icon: '🌟',
        dismissable: true,
      });
      return res.status(200).json({ nudges });
    }

    const userId = userResult.rows[0].id;
    const onboardingComplete = userResult.rows[0].onboarding_completed;
    const accountAge = Math.floor((Date.now() - new Date(userResult.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24));

    const dismissedResult = await pool.query(
      `SELECT nudge_id FROM dismissed_nudges WHERE user_id = $1`,
      [userId]
    );
    const dismissedIds = new Set(dismissedResult.rows.map(r => r.nudge_id));

    if (!onboardingComplete && !dismissedIds.has('complete_onboarding')) {
      nudges.push({
        id: 'complete_onboarding',
        type: 'action',
        title: 'Complete Your Setup',
        message: 'Finish onboarding to unlock all features and earn 50 AXM!',
        cta: 'Continue Setup',
        ctaLink: '/susu-start',
        priority: 'high',
        icon: '🎯',
        dismissable: true,
      });
    }

    const questResult = await pool.query(
      `SELECT COUNT(*) as count FROM user_quest_progress WHERE user_id = $1 AND status = 'claimed'`,
      [userId]
    );
    const completedQuests = parseInt(questResult.rows[0]?.count || '0');

    if (completedQuests === 0 && !dismissedIds.has('first_quest')) {
      nudges.push({
        id: 'first_quest',
        type: 'tip',
        title: 'Start Your First Quest',
        message: 'Complete quests to earn XP, AXM tokens, and boost your credit score.',
        cta: 'View Quests',
        ctaLink: '/wealth-dashboard?tab=quests',
        priority: 'medium',
        icon: '🎮',
        dismissable: true,
      });
    } else if (completedQuests >= 5 && !dismissedIds.has('quest_milestone')) {
      nudges.push({
        id: 'quest_milestone',
        type: 'celebration',
        title: 'Quest Master!',
        message: `Amazing! You've completed ${completedQuests} quests. Keep going to unlock legendary rewards!`,
        priority: 'low',
        icon: '🏆',
        dismissable: true,
      });
    }

    let currentStreak = 0;
    try {
      const streakResult = await pool.query(
        `SELECT current_streak, last_activity FROM user_streaks WHERE user_id = $1`,
        [userId]
      );
      if (streakResult.rows[0]) {
        currentStreak = streakResult.rows[0].current_streak || 0;
        const lastActivity = new Date(streakResult.rows[0].last_activity);
        const hoursSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceActivity > 20 && hoursSinceActivity < 48 && currentStreak > 0 && !dismissedIds.has('streak_warning')) {
          nudges.push({
            id: 'streak_warning',
            type: 'reminder',
            title: 'Protect Your Streak!',
            message: `Your ${currentStreak}-day streak is about to expire! Complete any activity to keep it going.`,
            cta: 'Keep Streak',
            ctaLink: '/wealth-dashboard',
            priority: 'high',
            icon: '🔥',
            dismissable: true,
          });
        }
      }
    } catch (e) {
    }

    if (currentStreak >= 7 && !dismissedIds.has('streak_celebration')) {
      nudges.push({
        id: 'streak_celebration',
        type: 'celebration',
        title: `${currentStreak} Day Streak!`,
        message: 'You are building powerful financial habits. Keep the momentum going!',
        priority: 'low',
        icon: '🔥',
        dismissable: true,
      });
    }

    const referralResult = await pool.query(
      `SELECT COUNT(*) as count FROM users WHERE referred_by = $1`,
      [userId]
    );
    const referralCount = parseInt(referralResult.rows[0]?.count || '0');

    if (referralCount === 0 && !dismissedIds.has('invite_friends')) {
      nudges.push({
        id: 'invite_friends',
        type: 'tip',
        title: 'Invite Friends, Earn Together',
        message: 'Refer friends to earn bonus AXM. You both get rewarded!',
        cta: 'Share Link',
        ctaLink: '/referrals',
        priority: 'medium',
        icon: '👥',
        dismissable: true,
      });
    }

    if (accountAge === 7 && !dismissedIds.has('one_week')) {
      nudges.push({
        id: 'one_week',
        type: 'celebration',
        title: 'One Week Strong!',
        message: 'You have been building wealth for a week. Check your progress!',
        cta: 'View Progress',
        ctaLink: '/wealth-dashboard',
        priority: 'medium',
        icon: '🎉',
        dismissable: true,
      });
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    nudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return res.status(200).json({ nudges: nudges.slice(0, 5) });
  } catch (error) {
    console.error('Lifecycle nudges error:', error);
    return res.status(200).json({
      nudges: [{
        id: 'welcome',
        type: 'tip',
        title: 'Welcome to Your Wealth Journey!',
        message: 'Complete your first quest to earn 100 XP and 25 AXM tokens.',
        cta: 'View Quests',
        ctaLink: '/wealth-dashboard?tab=quests',
        priority: 'high',
        icon: '👋',
        dismissable: true,
      }],
    });
  }
}
