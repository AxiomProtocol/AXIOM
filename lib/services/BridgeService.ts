/**
 * BridgeService — fiat ↔ crypto bridge layer
 *
 * Banking partner selection is in progress. All methods return a
 * "service pending" response so the API routes compile and respond
 * gracefully rather than throwing at runtime.
 */

const PENDING_MSG = 'Banking bridge is not yet active. Partner onboarding in progress.';

export interface BridgeQuoteParams {
  walletAddress: string;
  direction: 'fiat_to_crypto' | 'crypto_to_fiat';
  fiatAmountCents: number;
  cryptoAsset: string;
}

export interface BridgeTransferParams extends BridgeQuoteParams {
  unitAccountId: string;
  bitgoWalletId: string;
  quoteSnapshotId?: string;
}

export interface BridgeQuoteResult {
  success: boolean;
  quote?: {
    fiatAmountCents: number;
    cryptoAmount: string;
    cryptoAsset: string;
    exchangeRate: string;
    feeCents: number;
    expiresAt: string;
    snapshotId: string;
  };
  error?: string;
}

export interface BridgeTransferResult {
  success: boolean;
  transferId?: string;
  status?: string;
  error?: string;
}

class BridgeService {
  async getBridgeHistory(_walletAddress: string): Promise<unknown[]> {
    return [];
  }

  async getBridgeQuote(_params: BridgeQuoteParams): Promise<BridgeQuoteResult> {
    return { success: false, error: PENDING_MSG };
  }

  async fiatToCrypto(_params: BridgeTransferParams): Promise<BridgeTransferResult> {
    return { success: false, error: PENDING_MSG };
  }

  async cryptoToFiat(_params: BridgeTransferParams): Promise<BridgeTransferResult> {
    return { success: false, error: PENDING_MSG };
  }

  async getBridgeTransfer(_id: string, _walletAddress: string): Promise<null> {
    return null;
  }

  async syncBridgeStatus(_id: string): Promise<void> {
    return;
  }
}

export const bridgeService = new BridgeService();
