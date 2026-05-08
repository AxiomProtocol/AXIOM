import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { getVerifiedUserFromToken, getClientIp } from '../../../server/auth';
import { pool } from '../../../server/db';

// Vercel production: process.cwd() is /var/task (read-only). Only /tmp is writable.
const UPLOAD_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/kyc'
  : path.join(process.cwd(), 'uploads', 'kyc');
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
];
const VALID_DOCUMENT_TYPES = ['identity_front', 'identity_back', 'proof_of_address', 'selfie_verification'];

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let user;
  try {
    user = await getVerifiedUserFromToken(req);
  } catch {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }

  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const documentType = Array.isArray(fields.documentType) ? fields.documentType[0] : fields.documentType;
    if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType)) {
      return res.status(400).json({ success: false, error: 'Invalid document type' });
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    if (!ALLOWED_MIME_TYPES.includes(uploadedFile.mimetype || '')) {
      return res.status(400).json({ success: false, error: 'File type not allowed. Please upload a JPEG, PNG, WebP, GIF, or PDF file.' });
    }

    let kycResult = await pool.query(
      `SELECT id FROM kyc_verifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [user.userId]
    );

    let kycId: number;
    if (kycResult.rows.length === 0) {
      const insertResult = await pool.query(
        `INSERT INTO kyc_verifications (user_id, first_name, last_name, date_of_birth, nationality, address, phone_number, verification_status)
         VALUES ($1, '', '', NOW(), '', '', '', 'pending') RETURNING id`,
        [user.userId]
      );
      kycId = insertResult.rows[0].id;
    } else {
      kycId = kycResult.rows[0].id;
    }

    const fileHash = crypto.createHash('sha256').update(fs.readFileSync(uploadedFile.filepath)).digest('hex');
    const ext = path.extname(uploadedFile.originalFilename || '.bin');
    const storedFileName = `${user.userId}_${documentType}_${Date.now()}${ext}`;

    let fileUrl = `/uploads/kyc/${storedFileName}`;
    try {
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      const destPath = path.join(UPLOAD_DIR, storedFileName);
      fs.copyFileSync(uploadedFile.filepath, destPath);
    } catch (fsError) {
      console.warn('[KYC Upload] Could not save file to disk, storing metadata only:', fsError);
      fileUrl = `/uploads/kyc/${storedFileName}`;
    }

    const clientIp = getClientIp(req);

    const docResult = await pool.query(
      `INSERT INTO kyc_documents (kyc_id, document_type, file_name, file_url, file_size, file_mime_type, file_hash, upload_ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        kycId,
        documentType,
        uploadedFile.originalFilename || storedFileName,
        fileUrl,
        uploadedFile.size,
        uploadedFile.mimetype,
        fileHash,
        clientIp,
      ]
    );

    const documentId = docResult.rows.length > 0 ? docResult.rows[0].id : null;

    try {
      fs.unlinkSync(uploadedFile.filepath);
    } catch {}

    return res.status(200).json({
      success: true,
      documentId,
      fileUrl,
    });
  } catch (error: any) {
    console.error('[KYC Upload] Error:', error);
    if (error.code === 1009 || error.message?.includes('maxFileSize')) {
      return res.status(413).json({ success: false, error: 'File too large. Maximum size is 10MB.' });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
}
