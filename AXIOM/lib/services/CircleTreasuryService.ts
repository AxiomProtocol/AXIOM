import { db } from '../../server/db';
import { treasuryAccounts, custodyWalletRegistry } from '../../shared/treasurySchema';
import { TrustSource, classify, type TrustClassification } from '../types/trustSource';
import { getProviderStatus } from '../providers/providerStatus';
import { eq } from 'drizzle-orm';

const PROVIDER = 'circle';

export interface CircleWalletBalance {
  walletId: string;
  currency: string;
  amount: string;
  usdValue: number | null;
  trustSource: TrustClassification;
}

export class CircleTreasuryService {
  getProviderStatus() {
    return getProviderStatus('circle');
  }

  async getWalletRegistry(): Promise<{
    wallets: Array<{
      id: string;
      walletName: string | null;
      walletAddress: string | null;
      chain: string | null;
      assetScope: string | null;
      status: string;
    }>;
    trustSource: TrustClassification;
  }> {
    const rows = await db
      .select()
      .from(custodyWalletRegistry)
      .where(eq(custodyWalletRegistry.provider, PROVIDER));

    const trustSource = this.getProviderStatus().status === 'live'
      ? classify(TrustSource.PROVIDER_API_REPORTED, new Date().toISOString())
      : classify(TrustSource.FOUNDER_ATTESTED, null, 'Circle credentials not configured — using manually registered wallets');

    return {
      wallets: rows.map((r) => ({
        id: r.id,
        walletName: r.walletName,
        walletAddress: r.walletAddress,
        chain: r.chain,
        assetScope: r.assetScope,
        status: r.status,
      })),
      trustSource,
    };
  }

  async syncBalances(): Promise<{
    success: boolean;
    balances: CircleWalletBalance[];
    status: string;
    error?: string;
  }> {
    const providerStatus = this.getProviderStatus();

    if (providerStatus.status === 'not_connected') {
      return {
        success: false,
        balances: [],
        status: 'not_connected',
        error: providerStatus.reason,
      };
    }

    if (providerStatus.status === 'configured') {
      return await this.syncFromRegistry();
    }

    try {
      return await this.syncFromCircleApi();
    } catch (err: any) {
      console.error('[CircleTreasuryService.syncBalances]', err?.message);
      return await this.syncFromRegistry();
    }
  }

  private async syncFromRegistry(): Promise<{
    success: boolean;
    balances: CircleWalletBalance[];
    status: string;
  }> {
    const { wallets } = await this.getWalletRegistry();
    const balances: CircleWalletBalance[] = wallets
      .filter((w) => w.assetScope?.includes('USDC'))
      .map((w) => ({
        walletId: w.id,
        currency: 'USDC',
        amount: '0',
        usdValue: null,
        trustSource: classify(TrustSource.FOUNDER_ATTESTED, null, 'Balance not synced — Circle API not live'),
      }));

    return { success: true, balances, status: 'configured' };
  }

  private async syncFromCircleApi(): Promise<{
    success: boolean;
    balances: CircleWalletBalance[];
    status: string;
  }> {
    const apiKey = process.env.CIRCLE_COMPLIANCE_API_KEY ?? '';
    const baseUrl = (process.env.CIRCLE_ENVIRONMENT ?? '') === 'production'
      ? 'https://api.circle.com'
      : 'https://api-sandbox.circle.com';

    const res = await fetch(`${baseUrl}/v1/wallets`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });

    if (!res.ok) throw new Error(`Circle API error ${res.status}`);
    const data = await res.json() as { data: any[] };

    const wallets = data.data ?? [];
    const balances: CircleWalletBalance[] = [];

    for (const wallet of wallets) {
      for (const bal of (wallet.balances ?? [])) {
        const usdValue = bal.currency === 'USD' ? parseFloat(bal.amount) : null;

        await db.insert(treasuryAccounts).values({
          provider: PROVIDER,
          accountType: 'usdc_treasury',
          displayName: `Circle Wallet — ${wallet.walletId}`,
          legalEntityName: 'Axiom Protocol',
          externalAccountId: wallet.walletId,
          assetSymbol: bal.currency,
          custodyModel: 'custodian',
          status: 'live',
          metadata: { walletType: wallet.type, lastSync: new Date().toISOString() },
        }).onConflictDoNothing();

        balances.push({
          walletId: wallet.walletId,
          currency: bal.currency,
          amount: bal.amount,
          usdValue,
          trustSource: classify(TrustSource.PROVIDER_API_REPORTED, new Date().toISOString()),
        });
      }
    }

    return { success: true, balances, status: 'live' };
  }

  getCCTPStatus(): { status: 'not_connected'; note: string } {
    return {
      status: 'not_connected',
      note: 'Circle CCTP integration planned — Arbitrum One supported',
    };
  }

  async sync(): Promise<{ wallets: any; balances: any }> {
    const [wallets, balances] = await Promise.all([
      this.getWalletRegistry(),
      this.syncBalances(),
    ]);
    return { wallets, balances };
  }
}

export const circleTreasuryService = new CircleTreasuryService();
