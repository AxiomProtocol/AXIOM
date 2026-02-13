import type { NextApiRequest, NextApiResponse } from 'next';
import { postChannelContent } from '../../../server/services/discordBot';

const GUILD_ID = '1462325620322336852';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const guildId = req.body?.guildId || GUILD_ID;
    const result = await postChannelContent(guildId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('Discord post-content error:', error);
    res.status(500).json({ error: error.message });
  }
}
