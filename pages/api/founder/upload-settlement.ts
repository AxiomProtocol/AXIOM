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
    type SettlementPayload = Record<string, unknown>;
    type ExtractionStatus = 'extracted' | 'low_confidence' | 'failed';
    interface ExtractionSummary {
      status: ExtractionStatus;
      confidence: number | null;
      field_count: number | null;
      processing_time_ms: number | null;
      payload: SettlementPayload | null;
      error: string | null;
    }

    let extraction: ExtractionSummary | null = null;
    try {
      const buf = await fs.promises.readFile(destPath);
      const result = await extractFromDocument(buf, mime, 'settlement_statement', originalName);

      // Required fields per the settlement_statement template — used to mark
      // an extraction as "low_confidence" (i.e. incomplete) when the model
      // returned a high-confidence result but is missing fields the operator
      // needs to act on the statement.
      const REQUIRED_FIELDS: readonly string[] = [
        'statement_date',
        'driver_name',
        'unit_number',
        'mileage_pay_current',
        'total_gross_pay_current',
        'total_deductions_current',
        'total_net_pay_current',
      ];
      // Normalize numeric-looking string fields before persistence so the
      // settlement-list endpoint can safely cast `payload->>'field'` to
      // numeric. Handles empty strings, thousands commas, parenthesized
      // negatives, currency symbols, and trailing-minus PDF semantics
      // (e.g. "1,014.74-" → "-1014.74"). Non-numeric strings (driver name,
      // dates, etc.) are left untouched. Nested arrays of row objects are
      // walked one level deep.
      const NUMERIC_KEY_RE = /(_current|_ytd|_ltd|_miles|_balance|_due|miles_per_gallon|_amount|_rate|amount|rate|loaded_miles|empty_miles|miles|ending_balance)$/i;
      const normalizeValue = (v: unknown): unknown => {
        if (typeof v !== 'string') return v;
        const trimmed = v.trim();
        if (trimmed === '') return null;
        // Strip $, commas, spaces; convert (123.45) → -123.45 and 123.45- → -123.45
        let s = trimmed.replace(/[$,\s]/g, '');
        if (/^\(.+\)$/.test(s)) s = '-' + s.slice(1, -1);
        if (/^[0-9]+(\.[0-9]+)?-$/.test(s)) s = '-' + s.slice(0, -1);
        return /^-?[0-9]+(\.[0-9]+)?$/.test(s) ? s : trimmed;
      };
      const normalizePayload = (raw: SettlementPayload): SettlementPayload => {
        const out: Record<string, unknown> = { ...raw };
        for (const [k, v] of Object.entries(out)) {
          if (Array.isArray(v)) {
            out[k] = v.map(item => {
              if (item && typeof item === 'object') {
                const row: Record<string, unknown> = { ...(item as Record<string, unknown>) };
                for (const [rk, rv] of Object.entries(row)) {
                  row[rk] = normalizeValue(rv);
                }
                return row;
              }
              return item;
            });
          } else if (NUMERIC_KEY_RE.test(k) || typeof v === 'string') {
            // Always run string scalars through normalizeValue — it leaves
            // non-numeric strings (driver names, dates) untouched.
            out[k] = normalizeValue(v);
          }
        }
        return out as SettlementPayload;
      };
      const extractedPayload: SettlementPayload | null = result.success
        ? normalizePayload(result.extractedData as SettlementPayload)
        : null;
      const missingRequired = extractedPayload
        ? REQUIRED_FIELDS.filter(k => {
            const v = extractedPayload[k];
            return v === null || v === undefined || v === '';
          })
        : REQUIRED_FIELDS.slice();

      const status: ExtractionStatus = !result.success
        ? 'failed'
        : (result.confidence < 0.6 || missingRequired.length > 0)
          ? 'low_confidence'
          : 'extracted';

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
        payload:           extractedPayload,
        error:             result.success ? null : (result.error ?? null),
      };
    } catch (extractErr) {
      const errMsg = extractErr instanceof Error ? extractErr.message : 'Extraction crashed';
      console.error('[upload-settlement] extraction error', errMsg);
      try {
        await extractionPool().query(
          `INSERT INTO pilot_settlement_extractions (document_id, status, error)
           VALUES ($1, 'failed', $2)
           ON CONFLICT (document_id) DO UPDATE SET status = 'failed', error = EXCLUDED.error, extracted_at = NOW()`,
          [doc.id, errMsg]
        );
      } catch { /* ignore secondary failure */ }
      extraction = {
        status: 'failed',
        confidence: null,
        field_count: null,
        processing_time_ms: null,
        payload: null,
        error: errMsg,
      };
    }

    return res.status(201).json({ success: true, data: { ...doc, extraction } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    console.error('[upload-settlement]', msg);
    return res.status(500).json({ success: false, error: msg });
  }
}
