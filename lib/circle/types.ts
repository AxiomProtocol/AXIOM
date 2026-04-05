export type ScreeningResult = 'APPROVED' | 'DENIED' | 'REVIEW';

export interface ScreeningResponse {
  result: ScreeningResult;
  riskScore: number;
  riskCategories: string[];
  source: 'circle' | 'cache' | 'fallback';
  screenedAt: string;
}

export interface ComplianceProvider {
  screen(address: string, chain?: string): Promise<ScreeningResponse>;
}

export interface CircleScreeningRecord {
  walletAddress: string;
  chain: string;
  result: ScreeningResult;
  riskScore: number;
  riskCategories: string[];
  screenedAt: Date;
  cachedUntil: Date;
}

export interface CircleWebhookPayload {
  clientId: string;
  notificationId: string;
  notificationType: string;
  version: number;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface PaymasterEstimate {
  baseGasEth: bigint;
  surchargeEth: bigint;
  totalEth: bigint;
  totalUsdc: string;
}
