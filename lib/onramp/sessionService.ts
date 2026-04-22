/**
 * Coinbase CDP Onramp Session Service
 *
 * Generates authenticated, single-use Onramp session URLs using the CDP v2 API.
 * Reference: https://docs.cdp.coinbase.com/api-reference/v2/rest-api/onramp/create-an-onramp-session
 *
 * Server-side only — never import in client bundles.
 */

import { generateJwt } from '@coinbase/cdp-sdk/auth';

const CDP_API_HOST = 'api.cdp.coinbase.com';
const SESSION_PATH = '/platform/v2/onramp/sessions';
const SESSION_URL = `https://${CDP_API_HOST}${SESSION_PATH}`;

const NETWORK_MAP: Record<number, string> = {
  1: 'ethereum',
  137: 'polygon',
  8453: 'base',
  42161: 'arbitrum',
  10: 'optimism',
};

export interface OnrampSessionParams {
  walletAddress: string;
  asset: string;
  chainId: number;
  paymentAmount?: number;
  paymentCurrency?: string;
}

export interface OnrampSessionResult {
  sessionUrl: string;
}

export async function createOnrampSession(
  params: OnrampSessionParams
): Promise<OnrampSessionResult> {
  const apiKeyId = process.env.COINBASE_API_KEY;
  const apiKeySecret = process.env.COINBASE_API_KEY2;

  if (!apiKeyId || !apiKeySecret) {
    throw new Error('CDP credentials not configured: COINBASE_API_KEY and COINBASE_API_KEY2 are required');
  }

  const jwt = await generateJwt({
    apiKeyId,
    apiKeySecret,
    requestMethod: 'POST',
    requestHost: CDP_API_HOST,
    requestPath: SESSION_PATH,
    expiresIn: 120,
  });

  const network = NETWORK_MAP[params.chainId] ?? 'arbitrum';

  const body: Record<string, unknown> = {
    destinationAddress: params.walletAddress,
    purchaseCurrency: params.asset,
    destinationNetwork: network,
  };

  if (params.paymentAmount && params.paymentCurrency) {
    body.paymentAmount = params.paymentAmount.toFixed(2);
    body.paymentCurrency = params.paymentCurrency;
  }

  const res = await fetch(SESSION_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CDP Onramp Session API error ${res.status}: ${text}`);
  }

  const data = await res.json() as Record<string, unknown>;

  const session = data?.session as Record<string, unknown> | undefined;
  const rawUrl =
    (session?.onrampUrl as string | undefined) ??
    (session?.url as string | undefined) ??
    (data?.url as string | undefined);

  if (!rawUrl) {
    console.error('[onramp/session] Unexpected CDP response:', JSON.stringify(data));
    throw new Error(`CDP Onramp Session API returned no URL`);
  }

  const sessionUrl = rawUrl.replace(/&amp;/g, '&');
  return { sessionUrl };
}

export function isCdpOnrampConfigured(): boolean {
  return !!(process.env.COINBASE_API_KEY && process.env.COINBASE_API_KEY2);
}
