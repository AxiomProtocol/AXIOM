import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../../../server/db';
import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: {
    bodyParser: false,
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

function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    maxFields: 10,
    allowEmptyFiles: false,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        if (err.code === 1009 || err.message?.includes('maxFileSize')) {
          reject(new Error(`File too large. Maximum size is 20MB.`));
        } else {
          reject(err);
        }
      } else {
        resolve({ fields, files });
      }
    });
  });
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
    const { fields, files } = await parseForm(req);

    const fileArr = files.file;
    const uploadedFile = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    const docType = Array.isArray(fields.docType) ? fields.docType[0] : fields.docType;
    const visibility = Array.isArray(fields.visibility) ? fields.visibility[0] : fields.visibility;

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

    const mimeType = uploadedFile.mimetype || '';
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported file type. Accepted: PDF, DOCX, XLSX, PNG, JPG.',
      });
    }

    const originalName = uploadedFile.originalFilename || 'file';
    const ext = path.extname(originalName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file extension: ${ext}. Accepted: ${ALLOWED_EXTENSIONS.join(', ')}`,
      });
    }

    const fileSizeBytes = uploadedFile.size;
    if (fileSizeBytes > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        error: `File too large (${(fileSizeBytes / 1024 / 1024).toFixed(1)}MB). Maximum size is 20MB.`,
      });
    }

    // Vercel production: process.cwd() is /var/task (read-only). Only /tmp is writable.
    const storageDir = process.env.NODE_ENV === 'production'
      ? '/tmp/syndication-docs'
      : path.join(process.cwd(), 'storage', 'syndication', 'docs');
    await fs.promises.mkdir(storageDir, { recursive: true });

    const timestamp = Date.now();
    const safeFilename = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFilename = `${timestamp}_${safeFilename}`;
    const destPath = path.join(storageDir, storedFilename);

    await fs.promises.copyFile(uploadedFile.filepath, destPath);

    try {
      await fs.promises.unlink(uploadedFile.filepath);
    } catch {}

    const result = await pool.query(
      `INSERT INTO syn_offering_documents
         (offering_id, name, doc_type, stored_filename, file_size, mime_type, visibility, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        id,
        name,
        docType,
        storedFilename,
        fileSizeBytes,
        mimeType,
        visibility || 'private',
        wallet.toLowerCase(),
      ]
    );

    const docId = result.rows[0].id;
    const downloadUrl = `/api/syndication/offerings/${id}/documents/download?docId=${docId}`;

    await pool.query(
      `UPDATE syn_offering_documents SET url = $1 WHERE id = $2`,
      [downloadUrl, docId]
    );

    const finalResult = await pool.query(
      `SELECT id, name, doc_type, url, file_size, mime_type, visibility, uploaded_by, created_at
       FROM syn_offering_documents WHERE id = $1`,
      [docId]
    );

    return res.status(201).json({
      success: true,
      document: finalResult.rows[0],
    });
  } catch (error: any) {
    console.error('[DocumentUpload] Error:', error);
    const errorMsg = error.message || 'Upload failed.';
    if (errorMsg.includes('maxFileSize') || errorMsg.includes('File too large')) {
      return res.status(400).json({ success: false, error: 'File too large. Maximum size is 20MB.' });
    }
    return res.status(500).json({ success: false, error: errorMsg });
  }
}
