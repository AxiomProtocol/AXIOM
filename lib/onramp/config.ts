/**
 * Axiom Onramp Center - Configuration Module
 * Multi-provider fiat-to-crypto onramp configuration
 * 
 * Server-only secrets are never exposed to client bundles.
 * Only NEXT_PUBLIC_ prefixed keys are client-safe.
 */

export type OnrampProvider = 'moonpay' | 'ramp' | 'transak';
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
  const callbackBaseUrl = process.env.ONRAMP_CALLBACK_BASE_URL || 
    process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000';

  const moonpayKey = process.env.NEXT_PUBLIC_MOONPAY_PUBLISHABLE_KEY || process.env.MOONPAY_PUBLISHABLE_KEY;
  const rampKey = process.env.NEXT_PUBLIC_RAMP_API_KEY || process.env.RAMP_API_KEY || process.env.RAMP_WIDGET_API_KEY;
  const transakKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY || process.env.TRANSAK_API_KEY;

  return {
    defaultChainId,
    supportedChainIds,
    defaultAsset,
    assetList,
    callbackBaseUrl,
    providers: {
      moonpay: {
        id: 'moonpay',
        name: 'MoonPay',
        enabled: !!moonpayKey,
        publishableKey: moonpayKey,
        supportedPayments: ['Credit/Debit Card', 'Apple Pay', 'Google Pay', 'Bank Transfer'],
        supportedRegions: 'US, EU, UK, CA, AU + 160 countries',
        fees: '~4.5% (varies by payment method)',
        widgetUrl: 'https://buy.moonpay.com'
      },
      ramp: {
        id: 'ramp',
        name: 'Ramp',
        enabled: !!rampKey,
        publishableKey: rampKey,
        supportedPayments: ['Credit/Debit Card', 'Apple Pay', 'Bank Transfer'],
        supportedRegions: 'EU, UK, US (limited states)',
        fees: '~2.9% (varies by payment method)',
        widgetUrl: 'https://buy.ramp.network'
      },
      transak: {
        id: 'transak',
        name: 'Transak',
        enabled: !!transakKey,
        publishableKey: transakKey,
        supportedPayments: ['Credit/Debit Card', 'Apple Pay', 'Bank Transfer'],
        supportedRegions: 'US, EU, UK + 100 countries',
        fees: '~5% (varies by payment method)',
        widgetUrl: process.env.TRANSAK_ENV === 'production' 
          ? 'https://global.transak.com'
          : 'https://global-stg.transak.com'
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

  switch (provider) {
    case 'moonpay': {
      const url = new URL(providerConfig.widgetUrl);
      url.searchParams.set('apiKey', providerConfig.publishableKey);
      url.searchParams.set('currencyCode', asset.toLowerCase());
      url.searchParams.set('baseCurrencyCode', fiatCurrency.toLowerCase());
      url.searchParams.set('walletAddress', walletAddress);
      if (fiatAmount) url.searchParams.set('baseCurrencyAmount', fiatAmount.toString());
      url.searchParams.set('colorCode', '%23d4af37');
      url.searchParams.set('redirectURL', `${config.callbackBaseUrl}/onramp?status=completed&provider=moonpay`);
      return url.toString();
    }
    
    case 'ramp': {
      const url = new URL(providerConfig.widgetUrl);
      url.searchParams.set('hostApiKey', providerConfig.publishableKey);
      const networkMap: Record<number, string> = { 42161: 'ARBITRUM', 1: 'ETHEREUM', 137: 'POLYGON' };
      const network = networkMap[chainId || config.defaultChainId] || 'ARBITRUM';
      url.searchParams.set('swapAsset', `${network}_${asset}`);
      url.searchParams.set('userAddress', walletAddress);
      if (fiatCurrency) url.searchParams.set('fiatCurrency', fiatCurrency);
      if (fiatAmount) url.searchParams.set('fiatValue', fiatAmount.toString());
      url.searchParams.set('finalUrl', `${config.callbackBaseUrl}/onramp?status=completed&provider=ramp`);
      return url.toString();
    }
    
    case 'transak': {
      const url = new URL(providerConfig.widgetUrl);
      url.searchParams.set('apiKey', providerConfig.publishableKey);
      url.searchParams.set('cryptoCurrencyCode', asset);
      url.searchParams.set('fiatCurrency', fiatCurrency);
      url.searchParams.set('walletAddress', walletAddress);
      const networkMap: Record<number, string> = { 42161: 'arbitrum', 1: 'ethereum', 137: 'polygon' };
      url.searchParams.set('network', networkMap[chainId || config.defaultChainId] || 'arbitrum');
      if (fiatAmount) url.searchParams.set('fiatAmount', fiatAmount.toString());
      url.searchParams.set('redirectURL', `${config.callbackBaseUrl}/onramp?status=completed&provider=transak`);
      url.searchParams.set('themeColor', 'd4af37');
      return url.toString();
    }
    
    default:
      return null;
  }
}
