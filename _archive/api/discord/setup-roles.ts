import type { NextApiRequest, NextApiResponse } from 'next';
import { setupRoles, postRoleSelectionMessage } from '../../../server/services/discordBot';

const GUILD_ID = '1462325620322336852';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rolesResult = await setupRoles(GUILD_ID);
    
    if (!rolesResult.success) {
      return res.status(500).json({ error: rolesResult.message });
    }

    const messagePosted = await postRoleSelectionMessage(GUILD_ID);

    return res.status(200).json({
      success: true,
      roles: rolesResult.roles,
      roleMessagePosted: messagePosted
    });
  } catch (error: any) {
    console.error('Setup roles error:', error);
    return res.status(500).json({ error: error.message });
  }
}
