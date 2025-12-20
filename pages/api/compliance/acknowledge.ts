import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { wallet, disclosureIds } = req.query;
      
      if (!wallet || typeof wallet !== 'string') {
        return res.status(400).json({ error: 'Wallet address required' });
      }
      
      let query = `
        SELECT disclosure_id FROM compliance_acknowledgements
        WHERE user_wallet = $1
      `;
      const params: any[] = [wallet.toLowerCase()];
      
      if (disclosureIds && typeof disclosureIds === 'string') {
        const ids = disclosureIds.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
        if (ids.length > 0) {
          query += ` AND disclosure_id = ANY($2)`;
          params.push(ids);
        }
      }
      
      const result = await pool.query(query, params);
      const acknowledgedIds = result.rows.map(row => row.disclosure_id);
      
      return res.status(200).json({ acknowledgedIds });
    } catch (error) {
      console.error('Error checking acknowledgements:', error);
      return res.status(500).json({ error: 'Failed to check acknowledgements' });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const { disclosureId, userWallet, userEmail } = req.body;
      
      if (!disclosureId || !userWallet) {
        return res.status(400).json({ error: 'Disclosure ID and wallet address required' });
      }
      
      const walletLower = userWallet.toLowerCase();
      
      const existingCheck = await pool.query(
        `SELECT id FROM compliance_acknowledgements 
         WHERE disclosure_id = $1 AND user_wallet = $2`,
        [disclosureId, walletLower]
      );
      
      if (existingCheck.rows.length > 0) {
        return res.status(200).json({ 
          success: true, 
          message: 'Already acknowledged',
          acknowledgementId: existingCheck.rows[0].id
        });
      }
      
      const forwarded = req.headers['x-forwarded-for'];
      const ipAddress = typeof forwarded === 'string' 
        ? forwarded.split(',')[0] 
        : req.socket.remoteAddress || 'unknown';
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      const result = await pool.query(
        `INSERT INTO compliance_acknowledgements 
         (disclosure_id, user_wallet, user_email, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [disclosureId, walletLower, userEmail || null, ipAddress, userAgent]
      );
      
      await pool.query(
        `INSERT INTO compliance_events 
         (event_type, entity_type, entity_id, wallet_address, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'disclosure_acknowledged',
          'disclosure',
          disclosureId.toString(),
          walletLower,
          JSON.stringify({ acknowledgementId: result.rows[0].id })
        ]
      );
      
      return res.status(201).json({ 
        success: true, 
        acknowledgementId: result.rows[0].id 
      });
    } catch (error) {
      console.error('Error recording acknowledgement:', error);
      return res.status(500).json({ error: 'Failed to record acknowledgement' });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
