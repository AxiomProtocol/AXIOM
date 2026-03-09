import { ai } from '../server/gemini';
import { getTemplate, type DocType } from './templates';

const DIRECT_API_MODEL_MAP: Record<string, string> = {
  "gemini-3-flash": "gemini-2.5-flash",
  "gemini-3-pro-preview": "gemini-2.5-pro",
};

const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;
const useDirectApi = !baseUrl;

function resolveModel(model: string): string {
  if (useDirectApi && DIRECT_API_MODEL_MAP[model]) {
    return DIRECT_API_MODEL_MAP[model];
  }
  return model;
}

export interface ExtractionResult {
  success: boolean;
  docType: DocType;
  extractedData: Record<string, any>;
  rawText: string;
  confidence: number;
  fieldCount: number;
  processingTimeMs: number;
  error?: string;
}

export async function extractFromDocument(
  fileBuffer: Buffer,
  mimeType: string,
  docType: DocType,
  filename: string
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const template = getTemplate(docType);

  const fieldSpec = template.fields.map(f =>
    `- "${f.name}" (${f.type}${f.required ? ', REQUIRED' : ''}): ${f.description}`
  ).join('\n');

  const extractionPrompt = `Analyze this document and extract structured data.

Document filename: ${filename}
Document type: ${template.label} - ${template.description}

Extract the following fields:
${fieldSpec}

CRITICAL INSTRUCTIONS:
1. Return ONLY valid JSON. No markdown, no explanation, no code fences.
2. The response must be a single JSON object.
3. For currency values, return as plain numbers (no $ signs, no commas).
4. For percentages, return as plain numbers (8 means 8%, not 0.08).
5. For dates, use ISO format YYYY-MM-DD.
6. For arrays, return as JSON arrays of objects.
7. If a field cannot be determined, set it to null.
8. Include a "_confidence" field from 0.0 to 1.0 indicating overall extraction confidence.
9. Include a "_document_summary" field with a 1-2 sentence summary of the document.
10. Include a "_warnings" array listing any data quality concerns.

Return the JSON object now:`;

  try {
    const base64Data = fileBuffer.toString('base64');

    const isPdf = mimeType === 'application/pdf';
    const isImage = mimeType.startsWith('image/');
    const isText = mimeType === 'text/plain' || mimeType === 'text/csv';

    let parts: any[];

    if (isPdf || isImage) {
      parts = [
        { text: template.systemPrompt },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
        { text: extractionPrompt },
      ];
    } else if (isText) {
      const textContent = fileBuffer.toString('utf-8');
      parts = [
        { text: template.systemPrompt },
        { text: `Document content:\n\n${textContent}` },
        { text: extractionPrompt },
      ];
    } else {
      return {
        success: false,
        docType,
        extractedData: {},
        rawText: '',
        confidence: 0,
        fieldCount: 0,
        processingTimeMs: Date.now() - startTime,
        error: `Unsupported file type: ${mimeType}`,
      };
    }

    const response = await ai.models.generateContent({
      model: resolveModel('gemini-3-flash'),
      contents: [{ role: 'user', parts }],
      config: {
        thinkingConfig: { thinkingBudget: 4096 },
      },
    });

    const rawText = response.text || '';

    let cleanedJson = rawText.trim();
    if (cleanedJson.startsWith('```json')) {
      cleanedJson = cleanedJson.slice(7);
    } else if (cleanedJson.startsWith('```')) {
      cleanedJson = cleanedJson.slice(3);
    }
    if (cleanedJson.endsWith('```')) {
      cleanedJson = cleanedJson.slice(0, -3);
    }
    cleanedJson = cleanedJson.trim();

    let extractedData: Record<string, any>;
    try {
      extractedData = JSON.parse(cleanedJson);
    } catch (parseErr) {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          extractedData = JSON.parse(jsonMatch[0]);
        } catch {
          return {
            success: false,
            docType,
            extractedData: {},
            rawText,
            confidence: 0,
            fieldCount: 0,
            processingTimeMs: Date.now() - startTime,
            error: 'Failed to parse extraction response as JSON',
          };
        }
      } else {
        return {
          success: false,
          docType,
          extractedData: {},
          rawText,
          confidence: 0,
          fieldCount: 0,
          processingTimeMs: Date.now() - startTime,
          error: 'No JSON found in extraction response',
        };
      }
    }

    const confidence = extractedData._confidence ?? estimateConfidence(extractedData, template.fields);
    delete extractedData._confidence;

    const fieldCount = Object.keys(extractedData).filter(
      k => !k.startsWith('_') && extractedData[k] !== null && extractedData[k] !== undefined
    ).length;

    return {
      success: true,
      docType,
      extractedData,
      rawText: cleanedJson,
      confidence: Math.round(confidence * 10000) / 10000,
      fieldCount,
      processingTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      docType,
      extractedData: {},
      rawText: '',
      confidence: 0,
      fieldCount: 0,
      processingTimeMs: Date.now() - startTime,
      error: error.message || 'Extraction failed',
    };
  }
}

function estimateConfidence(data: Record<string, any>, fields: any[]): number {
  const requiredFields = fields.filter(f => f.required);
  if (requiredFields.length === 0) return 0.5;

  let found = 0;
  for (const field of requiredFields) {
    if (data[field.name] !== null && data[field.name] !== undefined) {
      found++;
    }
  }
  return found / requiredFields.length;
}

export function mapExtractedToAssumptions(
  extractedData: Record<string, any>,
  docType: DocType
): Record<string, string> {
  const template = getTemplate(docType);
  const mapped: Record<string, string> = {};

  for (const field of template.fields) {
    if (field.mappedTo && extractedData[field.name] !== null && extractedData[field.name] !== undefined) {
      const value = extractedData[field.name];
      mapped[field.mappedTo] = String(value);
    }
  }

  return mapped;
}

export function detectDocType(filename: string, textSnippet?: string): DocType {
  const lower = filename.toLowerCase();

  if (lower.includes('rent roll') || lower.includes('rentroll') || lower.includes('rent_roll')) return 'rent_roll';
  if (lower.includes('om ') || lower.includes('offering memo') || lower.includes('offering_memo')) return 'offering_memorandum';
  if (lower.includes('appraisal')) return 'appraisal';
  if (lower.includes('inspection')) return 'property_report';
  if (lower.includes('t-12') || lower.includes('t12') || lower.includes('operating') || lower.includes('income') || lower.includes('p&l')) return 'operating_statement';
  if (lower.includes('insurance') || lower.includes('declaration') || lower.includes('dec page')) return 'insurance_declaration';
  if (lower.includes('lease')) return 'lease_abstract';
  if (lower.includes('title')) return 'title_report';
  if (lower.includes('environmental') || lower.includes('phase')) return 'environmental_report';
  if (lower.includes('property') || lower.includes('report') || lower.includes('bpo')) return 'property_report';

  if (textSnippet) {
    const snippet = textSnippet.toLowerCase();
    if (snippet.includes('rent roll') || snippet.includes('tenant') && snippet.includes('unit')) return 'rent_roll';
    if (snippet.includes('offering memorandum') || snippet.includes('investment summary')) return 'offering_memorandum';
    if (snippet.includes('appraisal') || snippet.includes('appraised value')) return 'appraisal';
    if (snippet.includes('operating statement') || snippet.includes('net operating income')) return 'operating_statement';
  }

  return 'other';
}
