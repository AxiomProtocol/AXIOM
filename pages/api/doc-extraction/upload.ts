import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { extractFromDocument, mapExtractedToAssumptions, detectDocType } from '../../../lib/doc-extraction/engine';
import type { DocType } from '../../../lib/doc-extraction/templates';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/tiff',
  'text/plain',
  'text/csv',
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { file, filename, mimeType, docType, dealId, propertyId, walletAddress } = req.body;

    if (!file || !filename || !mimeType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: file (base64), filename, mimeType',
      });
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported file type: ${mimeType}. Supported: PDF, JPEG, PNG, WebP, TIFF, TXT, CSV`,
      });
    }

    const base64Data = file.replace(/^data:[^;]+;base64,/, '');
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const fileSizeBytes = fileBuffer.length;

    if (fileSizeBytes > 20 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'File too large. Maximum size is 20MB.',
      });
    }

    const resolvedDocType: DocType = docType || detectDocType(filename);

    const insertResult = await pool.query(
      `INSERT INTO doc_extractions (
        deal_id, property_id, wallet_address, doc_type, status,
        original_filename, mime_type, file_size_bytes
      ) VALUES ($1, $2, $3, $4, 'processing', $5, $6, $7)
      RETURNING id`,
      [dealId || null, propertyId || null, walletAddress || null, resolvedDocType, filename, mimeType, fileSizeBytes]
    );

    const extractionId = insertResult.rows[0].id;

    const result = await extractFromDocument(fileBuffer, mimeType, resolvedDocType, filename);

    if (result.success) {
      await pool.query(
        `UPDATE doc_extractions SET
          status = 'extracted',
          extracted_data = $1,
          raw_text = $2,
          confidence = $3,
          field_count = $4,
          processing_time_ms = $5,
          updated_at = now()
        WHERE id = $6`,
        [
          JSON.stringify(result.extractedData),
          result.rawText,
          result.confidence,
          result.fieldCount,
          result.processingTimeMs,
          extractionId,
        ]
      );

      if (result.extractedData) {
        const fields = Object.entries(result.extractedData)
          .filter(([key]) => !key.startsWith('_'))
          .filter(([, value]) => value !== null && value !== undefined);

        for (const [fieldName, fieldValue] of fields) {
          const fieldType = typeof fieldValue === 'number' ? 'number' :
            typeof fieldValue === 'boolean' ? 'boolean' :
            Array.isArray(fieldValue) ? 'array' : 'string';

          await pool.query(
            `INSERT INTO doc_extraction_fields (
              extraction_id, field_name, field_value, field_type
            ) VALUES ($1, $2, $3, $4)`,
            [extractionId, fieldName, JSON.stringify(fieldValue), fieldType]
          );
        }
      }

      const assumptionMapping = mapExtractedToAssumptions(result.extractedData, resolvedDocType);

      return res.status(200).json({
        success: true,
        extraction: {
          id: extractionId,
          docType: resolvedDocType,
          status: 'extracted',
          confidence: result.confidence,
          fieldCount: result.fieldCount,
          processingTimeMs: result.processingTimeMs,
          extractedData: result.extractedData,
          assumptionMapping,
          warnings: result.extractedData._warnings || [],
          summary: result.extractedData._document_summary || null,
        },
      });
    } else {
      await pool.query(
        `UPDATE doc_extractions SET
          status = 'failed',
          error_message = $1,
          processing_time_ms = $2,
          updated_at = now()
        WHERE id = $3`,
        [result.error, result.processingTimeMs, extractionId]
      );

      return res.status(422).json({
        success: false,
        extraction: {
          id: extractionId,
          status: 'failed',
          error: result.error,
          processingTimeMs: result.processingTimeMs,
        },
      });
    }
  } catch (error: any) {
    console.error('[doc-extraction] Upload error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Document extraction failed',
    });
  }
}
