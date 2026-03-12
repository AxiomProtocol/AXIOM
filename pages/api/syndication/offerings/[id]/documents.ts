import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../server/db';

const OPERATOR_WALLETS = [
  '0xb0cefc7e3f1c7de3b98e8c39384e9e084c9eb75c',
];

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(';')
      .map(cookie => {
        const [key, ...val] = cookie.trim().split('=');
        const sanitizedKey = key.replace(/[^\w\-_.]/g, '');
        const sanitizedVal = val.join('=').replace(/[^\w\-_.=]/g, '');
        return [sanitizedKey, sanitizedVal];
      })
      .filter(([key]) => key.length > 0)
  );
}

async function getAuthenticatedWallet(req: NextApiRequest): Promise<string | null> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionToken = cookies['siwe_session'];
  if (!sessionToken) return null;
  try {
    const result = await pool.query(
      `SELECT wallet_address FROM wallet_sessions WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken]
    );
    return result.rows.length > 0 ? result.rows[0].wallet_address : null;
  } catch {
    return null;
  }
}

function isOperator(wallet: string): boolean {
  return OPERATOR_WALLETS.includes(wallet.toLowerCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM syn_offering_documents WHERE offering_id = $1 ORDER BY created_at DESC`,
        [id]
      );
      return res.status(200).json({ success: true, documents: result.rows });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!isOperator(wallet)) {
    return res.status(403).json({ success: false, error: 'Operator access required.' });
  }

  if (req.method === 'POST') {
    try {
      const { name, docType, url, visibility } = req.body;
      if (!name || !docType) {
        return res.status(400).json({ success: false, error: 'name and docType are required' });
      }

      const result = await pool.query(
        `INSERT INTO syn_offering_documents (offering_id, name, doc_type, url, visibility, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [id, name, docType, url || null, visibility || 'private', wallet.toLowerCase()]
      );

      return res.status(201).json({ success: true, documentId: result.rows[0].id });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { documentId } = req.body;
      if (!documentId) {
        return res.status(400).json({ success: false, error: 'documentId is required' });
      }

      await pool.query(
        `DELETE FROM syn_offering_documents WHERE id = $1 AND offering_id = $2`,
        [documentId, id]
      );

      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
