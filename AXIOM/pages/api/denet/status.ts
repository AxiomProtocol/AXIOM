import type { NextApiRequest, NextApiResponse } from 'next';
import { getDeNetClient } from '../../../packages/denet';
import { formatStorageSize } from '../../../packages/denet/denetTypes';

interface NodeStatusResponse {
  success: boolean;
  configured: boolean;
  status: 'online' | 'offline' | 'syncing' | 'error';
  node: {
    id: string;
    uptime: number;
    version: string;
    peerCount: number;
    replicationFactor: number;
  };
  storage: {
    used: string;
    available: string;
    total: string;
    usagePercent: number;
  };
  health: {
    healthy: boolean;
    lastSync: string;
    latencyMs: number;
  };
  deployment: {
    guide: string;
    hint: string;
  };
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NodeStatusResponse | { success: false; error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'no-cache');

  try {
    const client = getDeNetClient();
    const configured = client.isConfigured();

    if (!configured) {
      return res.status(200).json({
        success: true,
        configured: false,
        status: 'offline',
        node: {
          id: 'not-configured',
          uptime: 0,
          version: '1.2.0',
          peerCount: 0,
          replicationFactor: 0,
        },
        storage: {
          used: '0.00 B',
          available: '0.00 B',
          total: '0.00 B',
          usagePercent: 0,
        },
        health: {
          healthy: false,
          lastSync: new Date().toISOString(),
          latencyMs: 0,
        },
        deployment: {
          guide: 'https://docs.denet.pro/nodes/gcp-deployment',
          hint: 'Set DENET_NODE_KEY environment variable to enable DeNet integration',
        },
        timestamp: new Date().toISOString(),
      });
    }

    const healthCheck = await client.healthCheck();
    const nodeStatus = healthCheck.status;

    const storageUsed = Number(nodeStatus.storageUsed);
    const storageTotal = Number(nodeStatus.storageTotal);
    const usagePercent = storageTotal > 0 ? (storageUsed / storageTotal) * 100 : 0;

    return res.status(200).json({
      success: true,
      configured: true,
      status: nodeStatus.status,
      node: {
        id: nodeStatus.nodeId,
        uptime: nodeStatus.uptime,
        version: nodeStatus.version,
        peerCount: nodeStatus.peerCount,
        replicationFactor: nodeStatus.replicationFactor,
      },
      storage: {
        used: formatStorageSize(nodeStatus.storageUsed),
        available: formatStorageSize(nodeStatus.storageAvailable),
        total: formatStorageSize(nodeStatus.storageTotal),
        usagePercent: Math.round(usagePercent * 100) / 100,
      },
      health: {
        healthy: healthCheck.healthy,
        lastSync: nodeStatus.lastSync instanceof Date ? nodeStatus.lastSync.toISOString() : String(nodeStatus.lastSync),
        latencyMs: healthCheck.latency,
      },
      deployment: {
        guide: 'https://docs.denet.pro/nodes/gcp-deployment',
        hint: 'Node is configured and connected to DeNet network',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DeNet status error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get DeNet status',
    });
  }
}
