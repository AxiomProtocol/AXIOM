import type { NextApiResponse } from 'next';
import { Pool } from '../../../../../lib/db';
import { withAdminAuth, AuthenticatedRequest } from '../../../../../lib/adminAuth';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const client = await pool.connect();
  
  try {
    const syncCheck = await client.query('SELECT * FROM depin_sync_state LIMIT 1');
    
    if (syncCheck.rows.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No listener running' 
      });
    }
    
    await client.query(`
      UPDATE depin_sync_state 
      SET is_listening = false, updated_at = NOW()
    `);

    res.json({ 
      success: true, 
      message: 'Event listener stopped' 
    });
  } catch (error: any) {
    console.error('Error stopping listener:', error);
    res.status(500).json({ message: 'Failed to stop listener', error: error.message });
  } finally {
    client.release();
  }
}

export default withAdminAuth(handler);
