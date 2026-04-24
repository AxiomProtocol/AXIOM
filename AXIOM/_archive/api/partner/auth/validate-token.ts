import type { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../../server/db';
import { sql } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, email } = req.query;

  if (!token || !email) {
    return res.status(400).json({ valid: false, error: 'Missing token or email' });
  }

  try {
    const result = await db.execute(sql`
      SELECT id, password_reset_expires 
      FROM partner_auth 
      WHERE email = ${(email as string).toLowerCase()} 
        AND password_reset_token = ${token}
    `);

    if (result.rows.length === 0) {
      return res.status(200).json({ valid: false });
    }

    const auth = result.rows[0];
    const expires = new Date(auth.password_reset_expires as string);
    
    if (expires < new Date()) {
      return res.status(200).json({ valid: false, expired: true });
    }

    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({ valid: false, error: 'Validation failed' });
  }
}
