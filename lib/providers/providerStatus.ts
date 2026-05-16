export type ProviderName = 'circle' | 'bitgo' | 'paxos';

export type ProviderStatus =
  | 'live'
  | 'configured'
  | 'unavailable'
  | 'not_connected';

export interface ProviderStatusResult {
  status: ProviderStatus;
  reason?: string;
  environment?: string;
}

export function getProviderStatus(provider: ProviderName): ProviderStatusResult {
  switch (provider) {
    case 'circle': {
      const hasComplianceKey = !!process.env.CIRCLE_COMPLIANCE_API_KEY;
      const hasAppId = !!process.env.CIRCLE_APP_ID;
      if (!hasComplianceKey && !hasAppId) {
        return { status: 'not_connected', reason: 'No Circle credentials configured' };
      }
      const isLive = (process.env.CIRCLE_ENVIRONMENT ?? '') === 'production';
      return {
        status: isLive ? 'live' : 'configured',
        environment: process.env.CIRCLE_ENVIRONMENT ?? 'sandbox',
      };
    }

    case 'bitgo': {
      const hasToken = !!process.env.BITGO_ACCESS_TOKEN;
      const hasEnterprise = !!process.env.BITGO_ENTERPRISE_ID;
      if (!hasToken) {
        return { status: 'not_connected', reason: 'BITGO_ACCESS_TOKEN not set' };
      }
      if (!hasEnterprise) {
        return { status: 'configured', reason: 'BITGO_ENTERPRISE_ID not set — enterprise operations unavailable' };
      }
      const apiUrl = process.env.BITGO_API_URL ?? '';
      const isLive = !apiUrl.includes('bitgo-test.com') && !apiUrl.includes('test');
      return {
        status: isLive ? 'live' : 'configured',
        environment: isLive ? 'production' : 'testnet',
      };
    }

    case 'paxos': {
      if (!process.env.PAXOS_API_KEY) {
        return { status: 'not_connected', reason: 'PAXOS_API_KEY not set' };
      }
      return { status: 'configured', environment: 'unknown' };
    }

    default:
      return { status: 'not_connected', reason: 'Unknown provider' };
  }
}

export function isProviderLive(provider: ProviderName): boolean {
  return getProviderStatus(provider).status === 'live';
}

export function isProviderConnected(provider: ProviderName): boolean {
  const s = getProviderStatus(provider).status;
  return s === 'live' || s === 'configured';
}
