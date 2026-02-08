import type { NextApiRequest, NextApiResponse } from 'next';
import { getBotStatus, getGuildList } from '../../../server/services/discordBot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const status = await getBotStatus();
    const guilds = await getGuildList();

    res.status(200).json({
      ...status,
      servers: guilds
    });
  } catch (error: any) {
    console.error('Discord status error:', error);
    res.status(500).json({ error: error.message });
  }
}
