import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMessage } from '../../../server/services/discordBot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guildId, channelName, message } = req.body;

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  if (!channelName || !message) {
    return res.status(400).json({ error: 'channelName and message are required' });
  }

  try {
    const success = await sendMessage(guildId, channelName, message);

    res.status(success ? 200 : 400).json({ 
      success,
      message: success ? 'Message sent' : 'Failed to send message'
    });
  } catch (error: any) {
    console.error('Discord message error:', error);
    res.status(500).json({ error: error.message });
  }
}
