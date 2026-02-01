import type { NextApiRequest, NextApiResponse } from 'next';
import { sendMessage, postFundingUpdate, postNewMemberAnnouncement } from '../../../server/services/discordBot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guildId, channelName, message, type, data } = req.body;

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  try {
    let success = false;

    if (type === 'funding_update' && data) {
      success = await postFundingUpdate(guildId, data.parcelName, data.fundingPercent, data.totalRaised);
    } else if (type === 'new_member' && data) {
      success = await postNewMemberAnnouncement(guildId, data.memberCount, data.foundingSpotsRemaining);
    } else if (channelName && message) {
      success = await sendMessage(guildId, channelName, message);
    } else {
      return res.status(400).json({ error: 'Either (channelName + message) or (type + data) is required' });
    }

    res.status(success ? 200 : 400).json({ 
      success,
      message: success ? 'Message sent' : 'Failed to send message'
    });
  } catch (error: any) {
    console.error('Discord message error:', error);
    res.status(500).json({ error: error.message });
  }
}
