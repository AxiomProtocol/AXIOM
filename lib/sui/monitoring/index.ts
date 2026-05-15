export { pollClaimEvents, detectClaimAnomalies } from './claimEventPoller';
export type { ClaimEvent, ClaimPollResult, ClaimAnomalyAlert } from './claimEventPoller';

export { pollCampaignState, campaignHealthLabel } from './campaignStatePoller';
export type { CampaignOnChainState } from './campaignStatePoller';

export { checkRpcHealth, checkAllRpcHealth } from './rpcHealthCheck';
export type { RpcHealthResult, RpcHealth } from './rpcHealthCheck';

export { recordProofRequest, getProofRequestStats, detectProofAbuse, clearProofRecords } from './proofRequestMonitor';
export type { ProofRequestRecord, ProofRequestStats, ProofAbuseAlert } from './proofRequestMonitor';

export { runCampaignIntegrityCheck } from './campaignIntegrityMonitor';
export type { CampaignIntegrityReport, IntegrityCheck, IntegritySeverity } from './campaignIntegrityMonitor';

export { recordWalletActivity, evaluateWalletRisk, getWalletRiskSummary, getAllWalletProfiles } from './walletRiskMonitor';
export type { WalletActivity, WalletRiskProfile, WalletRiskSummary, RiskLevel } from './walletRiskMonitor';

export { getMonitoringSnapshot } from './monitoringRegistry';
export type { MonitoringSnapshot, SystemHealth } from './monitoringRegistry';
