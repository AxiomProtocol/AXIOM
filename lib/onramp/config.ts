/**
 * Axiom Onramp Center - Configuration Module
 * Multi-provider fiat-to-crypto onramp configuration
 * 
 * Server-only secrets are never exposed to client bundles.
 * Only NEXT_PUBLIC_ prefixed keys are client-safe.
 */

export type OnrampProvider = 'coinbase';
export type OnrampStatus = 'created' | 'pending' | 'completed' | 'failed';

export interface ProviderConfig {
  id: OnrampProvider;
  name: string;
  enabled: boolean;
  publishableKey?: string;
  supportedPayments: string[];
  supportedRegions: string;
  fees: string;
  widgetUrl: string;
}

export interface OnrampConfig {
  defaultChainId: number;
  supportedChainIds: number[];
  defaultAsset: string;
  assetList: { symbol: string; name: string; chainId: number }[];
  callbackBaseUrl: string;
  providers: Record<OnrampProvider, ProviderConfig>;
}

const parseChainIds = (envValue: string | undefined): number[] => {
  if (!envValue) return [42161];
  return envValue.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
};

const parseAssetList = (envValue: string | undefined): { symbol: string; name: string; chainId: number }[] => {
  if (!envValue) {
    return [
      { symbol: 'AXM', name: 'Axiom Token', chainId: 42161 },
      { symbol: 'ETH', name: 'Ethereum', chainId: 42161 },
      { symbol: 'USDC', name: 'USD Coin', chainId: 42161 },
      { symbol: 'USDT', name: 'Tether', chainId: 42161 }
    ];
  }
  try {
    return JSON.parse(envValue);
  } catch {
    return [
      { symbol: 'ETH', name: 'Ethereum', chainId: 42161 },
      { symbol: 'USDC', name: 'USD Coin', chainId: 42161 }
    ];
  }
};

export function getOnrampConfig(): OnrampConfig {
  const defaultChainId = parseInt(process.env.ONRAMP_DEFAULT_CHAIN_ID || '42161', 10);
  const supportedChainIds = parseChainIds(process.env.ONRAMP_SUPPORTED_CHAIN_IDS);
  const defaultAsset = process.env.ONRAMP_DEFAULT_ASSET || 'ETH';
  const assetList = parseAssetList(process.env.ONRAMP_ASSET_LIST);
  const explicitCallbackBaseUrl = process.env.ONRAMP_CALLBACK_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL;

  if (!explicitCallbackBaseUrl && process.env.NODE_ENV === 'production') {
    console.warn('[onramp/config] No explicit callback base URL configured; falling back to https://axiomprotocol.app');
  }

  const callbackBaseUrl = (
    explicitCallbackBaseUrl ||
    (process.env.NODE_ENV === 'production' ? 'https://axiomprotocol.app' : 'http://localhost:5000')
  ).replace(/\/+$/, '');

  const coinbaseKey = process.env.COINBASE_PROJECT_ID || process.env.CDP_PROJECT_ID || process.env.NEXT_PUBLIC_CDP_PROJECT_ID;

  return {
    defaultChainId,
    supportedChainIds,
    defaultAsset,
    assetList,
    callbackBaseUrl,
    providers: {
      coinbase: {
        id: 'coinbase',
        name: 'Coinbase',
        enabled: !!coinbaseKey,
        publishableKey: coinbaseKey,
        supportedPayments: ['Credit/Debit Card', 'Apple Pay', 'ACH Bank Transfer'],
        supportedRegions: 'US, EU (Strong US coverage)',
        fees: '~1-2.5% (Free for USDC on Base)',
        widgetUrl: 'https://pay.coinbase.com'
      }
    }
  };
}

export function getClientSafeConfig(): Omit<OnrampConfig, 'callbackBaseUrl'> & { hasAnyProvider: boolean } {
  const config = getOnrampConfig();
  
  const providers = Object.fromEntries(
    Object.entries(config.providers).map(([key, provider]) => [
      key,
      {
        ...provider,
        publishableKey: provider.enabled ? '[CONFIGURED]' : undefined
      }
    ])
  ) as Record<OnrampProvider, ProviderConfig>;

  return {
    defaultChainId: config.defaultChainId,
    supportedChainIds: config.supportedChainIds,
    defaultAsset: config.defaultAsset,
    assetList: config.assetList,
    providers,
    hasAnyProvider: Object.values(config.providers).some(p => p.enabled)
  };
}

export function getProviderWidgetUrl(
  provider: OnrampProvider, 
  params: {
    walletAddress: string;
    asset: string;
    fiatCurrency: string;
    fiatAmount?: number;
    chainId?: number;
  }
): string | null {
  const config = getOnrampConfig();
  const providerConfig = config.providers[provider];
  
  if (!providerConfig.enabled || !providerConfig.publishableKey) {
    return null;
  }

  const { walletAddress, asset, fiatCurrency, fiatAmount, chainId } = params;

  if (provider === 'coinbase') {
    const url = new URL('https://pay.coinbase.com/buy/select-asset');
    url.searchParams.set('appId', providerConfig.publishableKey);
    const cbNetworkMap: Record<number, string> = { 42161: 'arbitrum', 1: 'ethereum', 137: 'polygon', 8453: 'base' };
    const network = cbNetworkMap[chainId || config.defaultChainId] || 'arbitrum';
    url.searchParams.set('addresses', JSON.stringify({ [walletAddress]: [network] }));
    url.searchParams.set('defaultAsset', asset);
    url.searchParams.set('fiatCurrency', fiatCurrency);
    if (fiatAmount) url.searchParams.set('presetFiatAmount', fiatAmount.toString());
    url.searchParams.set('defaultPaymentMethod', 'CARD');
    return url.toString();
  }
  
  return null;
}
