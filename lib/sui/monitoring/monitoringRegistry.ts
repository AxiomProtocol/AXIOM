import 'server-only';
import { checkAllRpcHealth } from './rpcHealthCheck';
import { pollCampaignState, campaignHealthLabel } from './campaignStatePoller';
import { pollClaimEvents, detectClaimAnomalies } from './claimEventPoller';
import { getProofRequestStats, detectProofAbuse } from './proofRequestMonitor';
import { runCampaignIntegrityCheck } from './campaignIntegrityMonitor';
import { getWalletRiskSummary } from './walletRiskMonitor';

// =============================================================================
// Monitoring Registry — Phase 10
//
// Aggregate health and telemetry across all Phase 10 monitoring modules.
// Single entry point for operator dashboard and health endpoints.
// =============================================================================

const MAINNET_CAMPAIGN_ID = '0xa6dea4cc02df669d45744be5ca3a1a740417b63a2f79838e7f01f5e2828b0982';
const MAINNET_PACKAGE_ID  = '0xc330a912193feaa7fe545405810732e494b57ece7bc7ecf0e4412e834c33a487';

export type SystemHealth = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';

export interface MonitoringSnapshot {
  systemHealth: SystemHealth;
  rpc: {
    mainnet: { status: string; latencyMs: number | null };
    testnet: { status: string; latencyMs: number | null };
  };
  campaign: {
    label: string;
    isActive: boolean | null;
    isClosed: boolean | null;
    poolValueRaw: string | null;
    healthLabel: string;
  };
  integrity: {
    overallStatus: string;
    passedChecks: number;
    totalChecks: number;
  };
  claims: {
    recentCount: number;
    hasMore: boolean;
    anomalyCount: number;
    highSeverityAnomalies: number;
  };
  proofRequests: {
    totalRequests: number;
    successRate: number;
    abuseAlerts: number;
  };
  walletRisk: {
    totalTracked: number;
    highRisk: number;
    blocked: number;
  };
  generatedAt: string;
  errors: string[];
}

export async function getMonitoringSnapshot(): Promise<MonitoringSnapshot> {
  const generatedAt = new Date().toISOString();
  const errors: string[] = [];

  const [rpcResult, campaignState, integrity, claimPoll] = await Promise.allSettled([
    checkAllRpcHealth(),
    pollCampaignState(MAINNET_CAMPAIGN_ID),
    runCampaignIntegrityCheck(MAINNET_CAMPAIGN_ID, MAINNET_PACKAGE_ID),
    pollClaimEvents({ packageId: MAINNET_PACKAGE_ID, limit: 50 }),
  ]);

  const rpc = rpcResult.status === 'fulfilled'
    ? {
        mainnet: { status: rpcResult.value.mainnet.status, latencyMs: rpcResult.value.mainnet.latencyMs },
        testnet: { status: rpcResult.value.testnet.status, latencyMs: rpcResult.value.testnet.latencyMs },
      }
    : { mainnet: { status: 'UNKNOWN', latencyMs: null }, testnet: { status: 'UNKNOWN', latencyMs: null } };

  if (rpcResult.status === 'rejected') errors.push(`RPC check failed: ${rpcResult.reason}`);

  const cs = campaignState.status === 'fulfilled' ? campaignState.value : null;
  if (campaignState.status === 'rejected') errors.push(`Campaign state failed: ${campaignState.reason}`);

  const ig = integrity.status === 'fulfilled' ? integrity.value : null;
  if (integrity.status === 'rejected') errors.push(`Integrity check failed: ${integrity.reason}`);

  const cp = claimPoll.status === 'fulfilled' ? claimPoll.value : null;
  if (claimPoll.status === 'rejected') errors.push(`Claim poll failed: ${claimPoll.reason}`);

  const anomalies = cp ? detectClaimAnomalies(cp.events) : [];
  const proofStats = getProofRequestStats(3600);
  const abuseAlerts = detectProofAbuse(300);
  const walletRisk = getWalletRiskSummary();

  const rpcDown = rpc.mainnet.status === 'DOWN';
  const campaignNotActive = cs?.isActive === false || cs?.isClosed === true;
  const integrityBad = ig?.overallStatus === 'CRITICAL';
  const rpcDegraded = rpc.mainnet.status === 'DEGRADED';
  const hasHighAnomalies = anomalies.some((a) => a.severity === 'HIGH');

  let systemHealth: SystemHealth = 'HEALTHY';
  if (rpcDown || campaignNotActive || integrityBad) systemHealth = 'CRITICAL';
  else if (rpcDegraded || hasHighAnomalies || errors.length > 0) systemHealth = 'DEGRADED';
  else if (!cs) systemHealth = 'UNKNOWN';

  return {
    systemHealth,
    rpc,
    campaign: {
      label: 'Phase 9 — Axiom Community Distribution (Mainnet)',
      isActive: cs?.isActive ?? null,
      isClosed: cs?.isClosed ?? null,
      poolValueRaw: cs?.poolValueRaw ?? null,
      healthLabel: cs ? campaignHealthLabel(cs) : 'UNKNOWN',
    },
    integrity: {
      overallStatus: ig?.overallStatus ?? 'UNKNOWN',
      passedChecks: ig ? ig.checks.filter((c) => c.passed).length : 0,
      totalChecks: ig ? ig.checks.length : 0,
    },
    claims: {
      recentCount: cp?.events.length ?? 0,
      hasMore: cp?.hasMore ?? false,
      anomalyCount: anomalies.length,
      highSeverityAnomalies: anomalies.filter((a) => a.severity === 'HIGH').length,
    },
    proofRequests: {
      totalRequests: proofStats.totalRequests,
      successRate: proofStats.successRate,
      abuseAlerts: abuseAlerts.length,
    },
    walletRisk: {
      totalTracked: walletRisk.totalTracked,
      highRisk: walletRisk.byRiskLevel.HIGH,
      blocked: walletRisk.byRiskLevel.BLOCKED,
    },
    generatedAt,
    errors,
  };
}
