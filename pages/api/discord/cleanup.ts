import type { NextApiRequest, NextApiResponse } from 'next';
import { cleanupDuplicateCategories, deleteCategory } from '../../../server/services/discordBot';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { guildId, categoryName } = req.body;

  if (!guildId) {
    return res.status(400).json({ error: 'guildId is required' });
  }

  try {
    let result;
    
    if (categoryName) {
      result = await deleteCategory(guildId, categoryName);
    } else {
      result = await cleanupDuplicateCategories(guildId);
    }

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Discord cleanup error:', error);
    return res.status(500).json({ error: error.message });
  }
}
