import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { pilotService } from '../../../server/services/pilot/PilotService';
import { validateAdminKey } from '../../../src/config/adminRoles';
import { extractFromDocument } from '../../../lib/doc-extraction/engine';
import { Pool } from 'pg';

let _extractionPool: Pool | null = null;
function extractionPool(): Pool {
  if (!_extractionPool) _extractionPool = new Pool({ connectionString: process.env.DATABASE_URL });
  return _extractionPool;
}

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

  if (!validateAdminKey(req)) {
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

    // Run extraction. Persist results (success or failure) but never fail the upload.
    let extraction: any = null;
    try {
      const buf = await fs.promises.readFile(destPath);
      const result = await extractFromDocument(buf, mime, 'settlement_statement', originalName);

      const status = result.success ? (result.confidence >= 0.6 ? 'extracted' : 'low_confidence') : 'failed';

      await extractionPool().query(
        `INSERT INTO pilot_settlement_extractions
           (document_id, status, confidence, field_count, processing_time_ms, payload, error)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (document_id) DO UPDATE SET
           status              = EXCLUDED.status,
           confidence          = EXCLUDED.confidence,
           field_count         = EXCLUDED.field_count,
           processing_time_ms  = EXCLUDED.processing_time_ms,
           payload             = EXCLUDED.payload,
           error               = EXCLUDED.error,
           extracted_at        = NOW()`,
        [
          doc.id,
          status,
          result.confidence,
          result.fieldCount,
          result.processingTimeMs,
          result.success ? JSON.stringify(result.extractedData) : null,
          result.success ? null : (result.error ?? 'Unknown extraction error'),
        ]
      );

      extraction = {
        status,
        confidence:        result.confidence,
        field_count:       result.fieldCount,
        processing_time_ms: result.processingTimeMs,
        payload:           result.success ? result.extractedData : null,
        error:             result.success ? null : result.error,
      };
    } catch (extractErr: any) {
      console.error('[upload-settlement] extraction error', extractErr?.message);
      try {
        await extractionPool().query(
          `INSERT INTO pilot_settlement_extractions (document_id, status, error)
           VALUES ($1, 'failed', $2)
           ON CONFLICT (document_id) DO UPDATE SET status = 'failed', error = EXCLUDED.error, extracted_at = NOW()`,
          [doc.id, extractErr?.message ?? 'Extraction crashed']
        );
      } catch {}
      extraction = { status: 'failed', error: extractErr?.message ?? 'Extraction crashed' };
    }

    return res.status(201).json({ success: true, data: { ...doc, extraction } });
  } catch (err: any) {
    console.error('[upload-settlement]', err?.message);
    return res.status(500).json({ success: false, error: err?.message ?? 'Upload failed' });
  }
}
