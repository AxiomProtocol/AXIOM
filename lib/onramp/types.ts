/**
 * Axiom Onramp Center - Type Definitions
 */

export type OnrampProvider = 'moonpay' | 'ramp' | 'transak';
export type OnrampStatus = 'created' | 'pending' | 'completed' | 'failed';

export interface OnrampIntent {
  id: string;
  userId?: string | null;
  walletAddress: string;
  provider: OnrampProvider;
  chainId: number;
  asset: string;
  fiatCurrency: string;
  fiatAmount: number;
  cryptoAmountEstimate?: number | null;
  status: OnrampStatus;
  providerReference?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntentRequest {
  walletAddress: string;
  provider: OnrampProvider;
  chainId: number;
  asset: string;
  fiatCurrency: string;
  fiatAmount: number;
  userId?: string;
}

export interface CreateIntentResponse {
  intentId: string;
  widgetUrl: string | null;
}

export interface UpdateStatusRequest {
  intentId: string;
  status: OnrampStatus;
  providerReference?: string;
}

export interface ProviderCardData {
  id: OnrampProvider;
  name: string;
  enabled: boolean;
  supportedPayments: string[];
  supportedRegions: string;
  fees: string;
  logo?: string;
}

export interface AssetOption {
  symbol: string;
  name: string;
  chainId: number;
}

export interface ChainOption {
  id: number;
  name: string;
  icon?: string;
}

export const CHAIN_INFO: Record<number, ChainOption> = {
  42161: { id: 42161, name: 'Arbitrum One' },
  1: { id: 1, name: 'Ethereum Mainnet' },
  137: { id: 137, name: 'Polygon' },
  10: { id: 10, name: 'Optimism' },
  8453: { id: 8453, name: 'Base' }
};

export const FIAT_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }
];
