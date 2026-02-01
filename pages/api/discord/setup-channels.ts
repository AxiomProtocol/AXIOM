import type { NextApiRequest, NextApiResponse } from 'next';
import { createChannelStructure, getGuildList } from '../../../server/services/discordBot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guildId } = req.body;

  if (!guildId) {
    const guilds = await getGuildList();
    if (guilds.length === 0) {
      return res.status(400).json({ 
        error: 'No servers found. Make sure the bot is added to your Discord server.',
        invite_url: 'Add the bot to your server first using the OAuth2 URL from Discord Developer Portal'
      });
    }
    return res.status(400).json({ 
      error: 'guildId is required',
      available_servers: guilds
    });
  }

  try {
    const result = await createChannelStructure(guildId);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error: any) {
    console.error('Discord setup error:', error);
    res.status(500).json({ error: error.message });
  }
}
