import type { NextApiRequest, NextApiResponse } from 'next';
import { getDeNetClient } from '../../../packages/denet';
import { formatStorageSize } from '../../../packages/denet/denetTypes';

interface DeNetMetricsResponse {
  success: boolean;
  configured: boolean;
  metrics: {
    totalFiles: number;
    totalStorageBytes: number;
    totalStorageFormatted: string;
    uploadCount24h: number;
    verificationRate: number;
    averageLatencyMs: number;
    replicationHealth: number;
    failedUploads24h: number;
    successfulVerifications24h: number;
  };
  nodeHealth: {
    status: 'healthy' | 'degraded' | 'offline';
    uptime: number;
    peerCount: number;
    lastSync: string;
  };
  storageDistribution: {
    propertyResearch: number;
    dueDiligence: number;
    attestations: number;
    underwriting: number;
    legal: number;
    other: number;
  };
  activity24h: {
    uploads: number;
    verifications: number;
    failures: number;
  };
  timestamp: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeNetMetricsResponse | { success: false; error: string }>
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
        metrics: {
          totalFiles: 0,
          totalStorageBytes: 0,
          totalStorageFormatted: '0.00 B',
          uploadCount24h: 0,
          verificationRate: 0,
          averageLatencyMs: 0,
          replicationHealth: 0,
          failedUploads24h: 0,
          successfulVerifications24h: 0,
        },
        nodeHealth: {
          status: 'offline',
          uptime: 0,
          peerCount: 0,
          lastSync: new Date().toISOString(),
        },
        storageDistribution: {
          propertyResearch: 0,
          dueDiligence: 0,
          attestations: 0,
          underwriting: 0,
          legal: 0,
          other: 0,
        },
        activity24h: {
          uploads: 0,
          verifications: 0,
          failures: 0,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const [metrics, healthCheck] = await Promise.all([
      client.getMetrics(),
      client.healthCheck(),
    ]);

    const nodeStatus = healthCheck.status;
    const totalStorageBytes = Number(metrics.totalStorage);

    let healthStatus: 'healthy' | 'degraded' | 'offline' = 'offline';
    if (healthCheck.healthy) {
      healthStatus = metrics.replicationHealth >= 95 ? 'healthy' : 'degraded';
    }

    return res.status(200).json({
      success: true,
      configured: true,
      metrics: {
        totalFiles: metrics.totalFiles,
        totalStorageBytes,
        totalStorageFormatted: formatStorageSize(metrics.totalStorage),
        uploadCount24h: metrics.uploadCount24h,
        verificationRate: metrics.verificationRate,
        averageLatencyMs: metrics.averageLatencyMs,
        replicationHealth: metrics.replicationHealth,
        failedUploads24h: metrics.failedUploads24h,
        successfulVerifications24h: metrics.successfulVerifications24h,
      },
      nodeHealth: {
        status: healthStatus,
        uptime: nodeStatus.uptime,
        peerCount: nodeStatus.peerCount,
        lastSync: nodeStatus.lastSync instanceof Date ? nodeStatus.lastSync.toISOString() : String(nodeStatus.lastSync),
      },
      storageDistribution: {
        propertyResearch: 0,
        dueDiligence: 0,
        attestations: 0,
        underwriting: 0,
        legal: 0,
        other: metrics.totalFiles,
      },
      activity24h: {
        uploads: metrics.uploadCount24h,
        verifications: metrics.successfulVerifications24h,
        failures: metrics.failedUploads24h,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DeNet metrics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get DeNet metrics',
    });
  }
}
