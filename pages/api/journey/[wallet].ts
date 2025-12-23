import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

const DEFAULT_MILESTONES = [
  { id: 'profile', title: 'Complete Your Profile', description: 'Add your photo, bio, and purpose statement', icon: '👤', completed: false, reward: '10 AXM' },
  { id: 'first_course', title: 'Complete Your First Course', description: 'Finish any course in Axiom Academy', icon: '📚', completed: false, reward: '25 AXM' },
  { id: 'join_hub', title: 'Join an Interest Hub', description: 'Connect with a regional community', icon: '🌍', completed: false, reward: '15 AXM' },
  { id: 'join_group', title: 'Join a Savings Group', description: 'Commit to your first SUSU circle', icon: '🤝', completed: false, reward: '50 AXM' },
  { id: 'first_save', title: 'Make Your First Contribution', description: 'Complete your first savings contribution', icon: '💰', completed: false, reward: '100 AXM' },
  { id: 'refer_friend', title: 'Invite a Friend', description: 'Share your referral link and get a signup', icon: '💌', completed: false, reward: '200 AXM' },
  { id: 'keygrow_enroll', title: 'Explore KeyGrow', description: 'Browse rent-to-own properties', icon: '🏠', completed: false },
  { id: 'week_streak', title: '7-Day Streak', description: 'Stay active for 7 consecutive days', icon: '🔥', completed: false, reward: '75 AXM' },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { wallet } = req.query;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const normalizedWallet = wallet.toLowerCase();

  if (req.method === 'GET') {
    try {
      const userResult = await pool.query(
        `SELECT id, first_name, last_name, username, profile_image_url, bio, purpose_statement,
                total_groups_joined, total_savings_contributions, courses_completed, referral_code,
                member_since, created_at
         FROM users WHERE LOWER(wallet_address) = $1 LIMIT 1`,
        [normalizedWallet]
      );

      if (userResult.rows.length === 0) {
        return res.status(200).json({
          success: true,
          profile: null,
          milestones: DEFAULT_MILESTONES,
          achievements: [],
          stats: {
            daysActive: 0,
            currentStreak: 0,
            longestStreak: 0,
            totalSavings: 0,
            groupsJoined: 0,
            coursesCompleted: 0,
            referralsCount: 0,
          }
        });
      }

      const user = userResult.rows[0];
      const userId = user.id;

      const [hubMembership, groupMembership, referrals, streakData] = await Promise.all([
        pool.query(`SELECT COUNT(*) FROM susu_hub_members WHERE user_id = $1`, [userId]),
        pool.query(`SELECT COUNT(*) FROM susu_group_members WHERE user_id = $1`, [userId]),
        pool.query(`SELECT COUNT(*) FROM users WHERE referred_by = $1`, [user.referral_code]),
        pool.query(
          `SELECT current_streak, longest_streak, last_active_date 
           FROM user_streaks WHERE user_id = $1 LIMIT 1`,
          [userId]
        ).catch(() => ({ rows: [] }))
      ]);

      const hubCount = parseInt(hubMembership.rows[0]?.count || '0');
      const groupCount = parseInt(groupMembership.rows[0]?.count || '0');
      const referralCount = parseInt(referrals.rows[0]?.count || '0');
      const streakInfo = streakData.rows[0] || { current_streak: 0, longest_streak: 0 };

      const daysActive = user.member_since 
        ? Math.floor((Date.now() - new Date(user.member_since).getTime()) / (1000 * 60 * 60 * 24))
        : Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24));

      const milestones = DEFAULT_MILESTONES.map(m => {
        let completed = false;
        switch (m.id) {
          case 'profile':
            completed = !!(user.bio && user.profile_image_url);
            break;
          case 'first_course':
            completed = (user.courses_completed || 0) > 0;
            break;
          case 'join_hub':
            completed = hubCount > 0;
            break;
          case 'join_group':
            completed = groupCount > 0;
            break;
          case 'first_save':
            completed = (user.total_savings_contributions || 0) > 0;
            break;
          case 'refer_friend':
            completed = referralCount > 0;
            break;
          case 'week_streak':
            completed = (streakInfo.longest_streak || 0) >= 7;
            break;
        }
        return { ...m, completed };
      });

      const achievements: any[] = [];
      if (hubCount >= 3) {
        achievements.push({ id: 'community_connector', title: 'Community Connector', description: 'Joined 3+ interest hubs', icon: '🌐', rarity: 'rare' });
      }
      if (groupCount >= 5) {
        achievements.push({ id: 'super_saver', title: 'Super Saver', description: 'Joined 5+ savings groups', icon: '💎', rarity: 'epic' });
      }
      if (referralCount >= 10) {
        achievements.push({ id: 'influencer', title: 'Axiom Influencer', description: 'Referred 10+ members', icon: '⭐', rarity: 'legendary' });
      }
      if ((streakInfo.longest_streak || 0) >= 30) {
        achievements.push({ id: 'dedicated', title: 'Dedicated Member', description: '30-day streak achieved', icon: '🏆', rarity: 'epic' });
      }

      res.status(200).json({
        success: true,
        profile: user,
        milestones,
        achievements,
        stats: {
          daysActive,
          currentStreak: streakInfo.current_streak || 0,
          longestStreak: streakInfo.longest_streak || 0,
          totalSavings: user.total_savings_contributions || 0,
          groupsJoined: user.total_groups_joined || groupCount,
          coursesCompleted: user.courses_completed || 0,
          referralsCount: referralCount,
        }
      });
    } catch (error: any) {
      console.error('Error fetching journey data:', error);
      res.status(500).json({ error: error.message || 'Failed to fetch journey data' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
