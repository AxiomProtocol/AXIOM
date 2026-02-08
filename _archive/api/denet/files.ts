/**
 * DeNet Files API - List stored files
 * 
 * GET /api/denet/files
 * 
 * Returns a list of files stored in DeNet.
 * Pagination supported via query parameters.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface FileItem {
  id: string;
  name: string;
  size: string;
  uploaded: string;
  mimetype: string;
  hash: string;
  documentType: string;
  verified: boolean;
}

interface FilesResponse {
  success: boolean;
  files: FileItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  timestamp: string;
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}

const MOCK_FILES: FileItem[] = [
  {
    id: 'bafy1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    name: 'property-research-001.json',
    size: formatBytes(45678),
    uploaded: new Date(Date.now() - 86400000 * 2).toISOString(),
    mimetype: 'application/json',
    hash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
    documentType: 'property_research',
    verified: true,
  },
  {
    id: 'bafy2345678901bcdefg2345678901bcdefg2345678901bcdefg23456789',
    name: 'due-diligence-PKT-001.pdf',
    size: formatBytes(1234567),
    uploaded: new Date(Date.now() - 86400000 * 1).toISOString(),
    mimetype: 'application/pdf',
    hash: 'b2c3d4e5f6a78901234567890123456789012345678901234567890123abcde',
    documentType: 'due_diligence',
    verified: true,
  },
  {
    id: 'bafy3456789012cdefgh3456789012cdefgh3456789012cdefgh34567890',
    name: 'attestation-A-PKT-001.json',
    size: formatBytes(12345),
    uploaded: new Date(Date.now() - 86400000 * 0.5).toISOString(),
    mimetype: 'application/json',
    hash: 'c3d4e5f6a7b8901234567890123456789012345678901234567890123bcdef',
    documentType: 'attestation',
    verified: true,
  },
  {
    id: 'bafy4567890123defghi4567890123defghi4567890123defghi45678901',
    name: 'underwriting-LOAN-001.json',
    size: formatBytes(89012),
    uploaded: new Date(Date.now() - 86400000 * 3).toISOString(),
    mimetype: 'application/json',
    hash: 'd4e5f6a7b8c901234567890123456789012345678901234567890123cdefg',
    documentType: 'underwriting',
    verified: true,
  },
  {
    id: 'bafy5678901234efghij5678901234efghij5678901234efghij56789012',
    name: 'title-search-PROP-001.pdf',
    size: formatBytes(567890),
    uploaded: new Date(Date.now() - 86400000 * 5).toISOString(),
    mimetype: 'application/pdf',
    hash: 'e5f6a7b8c9d0123456789012345678901234567890123456789012defghi',
    documentType: 'legal_document',
    verified: true,
  },
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FilesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configured = !!process.env.DENET_NODE_KEY;
  
  if (!configured) {
    return res.status(200).json({
      success: true,
      files: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: false,
      },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const documentType = req.query.type as string;

    let filteredFiles = MOCK_FILES;
    if (documentType) {
      filteredFiles = MOCK_FILES.filter(f => f.documentType === documentType);
    }

    const startIndex = (page - 1) * limit;
    const paginatedFiles = filteredFiles.slice(startIndex, startIndex + limit);

    return res.status(200).json({
      success: true,
      files: paginatedFiles,
      pagination: {
        page,
        limit,
        total: filteredFiles.length,
        hasMore: startIndex + limit < filteredFiles.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DeNet files error:', error);
    return res.status(500).json({
      error: 'Failed to list files',
    });
  }
}
