import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

// Vercel production: process.cwd() is /var/task (read-only). Only /tmp is writable.
const STORAGE_DIR = process.env.NODE_ENV === 'production'
  ? '/tmp/settlement-statements'
  : path.join(process.cwd(), 'storage', 'settlement-statements');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { f } = req.query;
  if (!f || typeof f !== 'string') {
    return res.status(400).json({ error: 'Missing file parameter' });
  }

  const safeFilename = path.basename(f);
  const filePath = path.join(STORAGE_DIR, safeFilename);

  if (!filePath.startsWith(STORAGE_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    await fs.promises.access(filePath, fs.constants.R_OK);
  } catch {
    return res.status(404).json({ error: 'File not found' });
  }

  const stat = await fs.promises.stat(filePath);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}
