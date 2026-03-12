import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../../server/db';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

const OPERATOR_WALLETS = [
  '0xb0cefc7e3f1c7de3b98e8c39384e9e084c9eb75c',
];

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg'];

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const VALID_DOC_TYPES = [
  'ppm', 'subscription_agreement', 'operating_agreement', 'k1',
  'capital_call_notice', 'distribution_notice', 'other',
];

const VALID_VISIBILITIES = ['private', 'investor', 'public'];

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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const wallet = await getAuthenticatedWallet(req);
  if (!wallet) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  if (!isOperator(wallet)) {
    return res.status(403).json({ success: false, error: 'Operator access required.' });
  }

  const { id } = req.query;

  try {
    const { file, filename, mimeType, name, docType, visibility } = req.body;

    if (!file || !filename || !mimeType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: file (base64), filename, mimeType',
      });
    }

    if (!name) {
      return res.status(400).json({ success: false, error: 'Document name is required.' });
    }

    if (!docType || !VALID_DOC_TYPES.includes(docType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid document type. Must be one of: ${VALID_DOC_TYPES.join(', ')}`,
      });
    }

    if (visibility && !VALID_VISIBILITIES.includes(visibility)) {
      return res.status(400).json({
        success: false,
        error: `Invalid visibility. Must be one of: ${VALID_VISIBILITIES.join(', ')}`,
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file type. Accepted: PDF, DOCX, XLSX, PNG, JPG.',
      });
    }

    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file extension: ${ext}. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`,
      });
    }

    const base64Data = file.replace(/^data:[^;]+;base64,/, '');
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const fileSizeBytes = fileBuffer.length;

    if (fileSizeBytes > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `File too large (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.`,
      });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'syndication', 'docs');
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${timestamp}_${safeFilename}`;
    const filePath = path.join(uploadsDir, storedFilename);

    await fs.promises.writeFile(filePath, fileBuffer);

    const fileUrl = `/uploads/syndication/docs/${storedFilename}`;

    const result = await pool.query(
      `INSERT INTO syn_offering_documents
         (offering_id, name, doc_type, url, file_size, mime_type, visibility, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, doc_type, url, file_size, mime_type, visibility, uploaded_by, created_at`,
      [
        id,
        name,
        docType,
        fileUrl,
        fileSizeBytes,
        mimeType,
        visibility || 'private',
        wallet.toLowerCase(),
      ]
    );

    return res.status(201).json({
      success: true,
      document: result.rows[0],
    });
  } catch (error: any) {
    console.error('[DocumentUpload] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
