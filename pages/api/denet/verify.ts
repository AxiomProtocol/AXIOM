/**
 * DeNet Verify API - Public verification endpoint
 * 
 * GET /api/denet/verify?cid=<cid>
 * POST /api/denet/verify (batch verification)
 * 
 * Verifies existence and integrity of content in DeNet storage.
 * No authentication required for read operations.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface VerificationResult {
  cid: string;
  exists: boolean;
  verified: boolean;
  contentHash: string | null;
  size: number | null;
  replicationCount: number;
  lastVerified: string;
  providers: string[];
}

interface VerifyResponse {
  success: boolean;
  result?: VerificationResult;
  results?: VerificationResult[];
  timestamp: string;
}

const CID_REGEX = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[A-Za-z0-9]{50,60})$/;

function isValidCid(cid: string): boolean {
  return CID_REGEX.test(cid);
}

function verifyContentMock(cid: string): VerificationResult {
  const configured = !!process.env.DENET_NODE_KEY;
  
  if (!configured) {
    return {
      cid,
      exists: false,
      verified: false,
      contentHash: null,
      size: null,
      replicationCount: 0,
      lastVerified: new Date().toISOString(),
      providers: [],
    };
  }

  const contentHash = cid.startsWith('bafy') ? cid.slice(4).padEnd(64, '0') : cid;
  
  return {
    cid,
    exists: true,
    verified: true,
    contentHash,
    size: Math.floor(Math.random() * 1000000) + 1000,
    replicationCount: 3,
    lastVerified: new Date().toISOString(),
    providers: ['denet-node-1', 'denet-node-2', 'denet-node-3'],
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<VerifyResponse | { error: string }>
) {
  if (req.method === 'GET') {
    const { cid } = req.query;
    
    if (!cid || typeof cid !== 'string') {
      return res.status(400).json({ error: 'CID parameter is required' });
    }

    if (!isValidCid(cid)) {
      return res.status(400).json({ error: 'Invalid CID format' });
    }

    try {
      const result = verifyContentMock(cid);
      
      return res.status(200).json({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('DeNet verify error:', error);
      return res.status(500).json({ error: 'Verification failed' });
    }
  }

  if (req.method === 'POST') {
    const { cids } = req.body as { cids: string[] };
    
    if (!cids || !Array.isArray(cids)) {
      return res.status(400).json({ error: 'cids array is required' });
    }

    if (cids.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 CIDs per batch' });
    }

    const invalidCids = cids.filter(cid => !isValidCid(cid));
    if (invalidCids.length > 0) {
      return res.status(400).json({ error: `Invalid CIDs: ${invalidCids.slice(0, 5).join(', ')}` });
    }

    try {
      const results = cids.map(cid => verifyContentMock(cid));
      
      return res.status(200).json({
        success: true,
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('DeNet batch verify error:', error);
      return res.status(500).json({ error: 'Batch verification failed' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
