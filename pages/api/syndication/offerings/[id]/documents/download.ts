import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../../server/db';
import fs from 'fs';
import path from 'path';

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

async function isInvestorForOffering(wallet: string, offeringId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT 1 FROM syn_investor_profiles ip
       JOIN syn_subscriptions s ON s.investor_profile_id = ip.id
       WHERE ip.wallet_address = $1 AND s.offering_id = $2 AND s.status IN ('approved', 'funded')
       LIMIT 1`,
      [wallet.toLowerCase(), offeringId]
    );
    return result.rows.length > 0;
  } catch {
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id, docId } = req.query;
  const documentId = Array.isArray(docId) ? docId[0] : docId;

  if (!documentId) {
    return res.status(400).json({ success: false, error: 'docId query parameter is required.' });
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(documentId)) {
    return res.status(400).json({ success: false, error: 'Invalid document ID.' });
  }

  const docResult = await pool.query(
    `SELECT * FROM syn_offering_documents WHERE id = $1 AND offering_id = $2`,
    [documentId, id]
  );

  if (docResult.rows.length === 0) {
    return res.status(404).json({ success: false, error: 'Document not found.' });
  }

  const doc = docResult.rows[0];

  if (doc.visibility === 'public') {
    return serveFile(res, doc);
  }

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }

  if (isOperator(wallet)) {
    return serveFile(res, doc);
  }

  if (doc.visibility === 'investor') {
    const hasAccess = await isInvestorForOffering(wallet, id as string);
    if (hasAccess) {
      return serveFile(res, doc);
    }
  }

  return res.status(403).json({ success: false, error: 'Access denied.' });
}

function serveFile(res: NextApiResponse, doc: any) {
  const storedFilename = doc.stored_filename;
  if (!storedFilename) {
    return res.status(404).json({ success: false, error: 'File not available.' });
  }

  // Vercel production: process.cwd() is /var/task (read-only). Only /tmp is writable.
  const storageRoot = process.env.NODE_ENV === 'production'
    ? '/tmp/syndication-docs'
    : path.join(process.cwd(), 'storage', 'syndication', 'docs');
  const filePath = path.join(storageRoot, storedFilename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'File not found on disk.' });
  }

  const mimeType = doc.mime_type || 'application/octet-stream';
  const originalName = doc.name || storedFilename;

  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
  res.setHeader('Content-Length', doc.file_size || fs.statSync(filePath).size);
  res.setHeader('Cache-Control', 'private, no-cache');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}
