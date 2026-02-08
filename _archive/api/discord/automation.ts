import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  postDailyTip, 
  postWeeklyChallenge, 
  postWorkbookPreview,
  postMemberSpotlight,
  WEEKLY_CHALLENGES,
  WORKBOOK_PREVIEWS,
  createChannelStructure
} from '../../../server/services/discordBot';

const GUILD_ID = '1462325620322336852';
const ADMIN_SECRET = process.env.ADMIN_SETUP_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const providedSecret = authHeader?.replace('Bearer ', '') || req.body.adminSecret;
  
  if (!ADMIN_SECRET || providedSecret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized - admin secret required' });
  }

  const { action, data } = req.body;

  try {
    switch (action) {
      case 'daily-tip':
        const tipResult = await postDailyTip(GUILD_ID);
        return res.json({ success: tipResult, message: tipResult ? 'Daily tip posted' : 'Failed to post tip' });

      case 'weekly-challenge':
        const challengeIndex = data?.challengeIndex ?? Math.floor(Math.random() * WEEKLY_CHALLENGES.length);
        const challenge = WEEKLY_CHALLENGES[challengeIndex];
        const challengeResult = await postWeeklyChallenge(GUILD_ID, challenge);
        return res.json({ success: challengeResult, challenge, message: challengeResult ? 'Weekly challenge posted' : 'Failed to post challenge' });

      case 'workbook-preview':
        const previewIndex = data?.previewIndex ?? Math.floor(Math.random() * WORKBOOK_PREVIEWS.length);
        const preview = WORKBOOK_PREVIEWS[previewIndex];
        const previewResult = await postWorkbookPreview(GUILD_ID, preview);
        return res.json({ success: previewResult, preview, message: previewResult ? 'Workbook preview posted' : 'Failed to post preview' });

      case 'member-spotlight':
        if (!data?.username || !data?.story || !data?.achievement) {
          return res.status(400).json({ error: 'Missing required fields: username, story, achievement' });
        }
        const spotlightResult = await postMemberSpotlight(GUILD_ID, data);
        return res.json({ success: spotlightResult, message: spotlightResult ? 'Member spotlight posted' : 'Failed to post spotlight' });

      case 'setup-channels':
        const channelResult = await createChannelStructure(GUILD_ID);
        return res.json(channelResult);

      case 'list-challenges':
        return res.json({ challenges: WEEKLY_CHALLENGES });

      case 'list-previews':
        return res.json({ previews: WORKBOOK_PREVIEWS });

      default:
        return res.status(400).json({ 
          error: 'Invalid action',
          validActions: ['daily-tip', 'weekly-challenge', 'workbook-preview', 'member-spotlight', 'setup-channels', 'list-challenges', 'list-previews']
        });
    }
  } catch (error: any) {
    console.error('Discord automation error:', error);
    return res.status(500).json({ error: error.message });
  }
}
