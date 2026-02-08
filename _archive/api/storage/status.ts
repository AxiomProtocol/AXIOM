/**
 * Storage Health Status API
 * 
 * GET /api/storage/status
 * 
 * Returns the health status of all configured storage backends.
 * This is a READ-ONLY endpoint that exposes no secrets.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

interface StorageBackendStatus {
  name: string;
  type: 'primary' | 'redundant';
  configured: boolean;
  healthy: boolean;
  lastCheck: number;
}

interface StorageStatusResponse {
  success: boolean;
  timestamp: string;
  overallHealthy: boolean;
  backends: StorageBackendStatus[];
  summary: {
    totalBackends: number;
    configuredBackends: number;
    healthyBackends: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StorageStatusResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const backends: StorageBackendStatus[] = [];
    const now = Date.now();

    // Check Replit Object Storage
    const replitStorageConfigured = !!(
      process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ||
      process.env.PUBLIC_OBJECT_SEARCH_PATHS
    );
    
    backends.push({
      name: 'replit-object-storage',
      type: 'primary',
      configured: replitStorageConfigured,
      healthy: replitStorageConfigured, // Assume healthy if configured
      lastCheck: now,
    });

    // Check DeNet Storage
    const deNetConfigured = !!process.env.DENET_NODE_KEY;
    
    backends.push({
      name: 'denet-decentralized',
      type: 'redundant',
      configured: deNetConfigured,
      healthy: deNetConfigured, // Placeholder - would perform actual health check
      lastCheck: now,
    });

    // Check NFT Storage / IPFS
    const nftStorageConfigured = !!process.env.NFT_STORAGE_API_KEY;
    
    backends.push({
      name: 'nft-storage-ipfs',
      type: 'redundant',
      configured: nftStorageConfigured,
      healthy: nftStorageConfigured,
      lastCheck: now,
    });

    // Calculate summary
    const configuredBackends = backends.filter(b => b.configured).length;
    const healthyBackends = backends.filter(b => b.healthy).length;
    const primaryHealthy = backends.some(b => b.type === 'primary' && b.healthy);

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      overallHealthy: primaryHealthy,
      backends,
      summary: {
        totalBackends: backends.length,
        configuredBackends,
        healthyBackends,
      },
    });
  } catch (error) {
    console.error('Storage status check failed:', error);
    return res.status(500).json({
      error: 'Failed to check storage status',
    });
  }
}
