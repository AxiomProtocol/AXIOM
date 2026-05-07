import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { pilotService } from '../../../server/services/pilot/PilotService';
import { validateAdminKey } from '../../../src/config/adminRoles';

export const config = {
  api: { bodyParser: false },
};

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'settlement-statements');
const MAX_SIZE    = 20 * 1024 * 1024;

function parseForm(req: NextApiRequest): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({ maxFileSize: MAX_SIZE, keepExtensions: true, allowEmptyFiles: false });
  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err.message?.includes('maxFileSize') ? new Error('File too large. Maximum size is 20 MB.') : err);
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

  const adminKey = req.headers['x-admin-key'] as string | undefined;
  if (!adminKey || !validateAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Unauthorized — x-admin-key required' });
  }

  try {
    const { fields, files } = await parseForm(req);

    const fileArr = files.file;
    const uploaded = Array.isArray(fileArr) ? fileArr[0] : fileArr;
    if (!uploaded) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const mime = uploaded.mimetype ?? '';
    if (mime !== 'application/pdf') {
      return res.status(400).json({ success: false, error: 'Only PDF files are accepted.' });
    }

    const title = (Array.isArray(fields.title) ? fields.title[0] : fields.title) ?? 'Settlement Statement';
    const note  = (Array.isArray(fields.note)  ? fields.note[0]  : fields.note)  ?? '';

    await fs.promises.mkdir(STORAGE_DIR, { recursive: true });

    const originalName  = uploaded.originalFilename ?? 'statement.pdf';
    const safeName      = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedName    = `${Date.now()}_${safeName}`;
    const destPath      = path.join(STORAGE_DIR, storedName);

    await fs.promises.copyFile(uploaded.filepath, destPath);
    try { await fs.promises.unlink(uploaded.filepath); } catch {}

    const fileUrl = `/api/founder/settlement-file?f=${encodeURIComponent(storedName)}`;

    const doc = await pilotService.addDocument({
      title,
      category:    'settlement_statement',
      fileName:    originalName,
      fileUrl,
      fileSize:    uploaded.size,
      mimeType:    mime,
      uploadedBy:  'operator',
      description: note || undefined,
      isPublic:    false,
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err: any) {
    console.error('[upload-settlement]', err?.message);
    return res.status(500).json({ success: false, error: err?.message ?? 'Upload failed' });
  }
}
