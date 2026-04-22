import { db } from '../../server/db';
import { treasuryAccounts, custodyWalletRegistry, reservePositions } from '../../shared/treasurySchema';
import { bitgoWallets } from '../../shared/bitgoSchema';
import { TrustSource, classify, type TrustClassification } from '../types/trustSource';
import { getProviderStatus } from '../providers/providerStatus';
import { getBitGoMode, getBitGoApiUrl } from '../providers/featureFlags';
import { bitGoRequest, isBitGoConfigured, BITGO_ENTERPRISE_ID } from '../bitgo/client';
import { eq } from 'drizzle-orm';

const PROVIDER = 'bitgo';

export class BitGoTreasuryExtension {
  getProviderStatus() {
    return getProviderStatus('bitgo');
  }

  getBitGoConnectionInfo() {
    const mode = getBitGoMode();
    const url = getBitGoApiUrl();
    console.log(`[BitGoTreasuryExtension] Mode: ${mode} → ${url}`);
    return { mode, url };
  }

  async syncCustodyWallets(): Promise<{
    success: boolean;
    walletsSynced: number;
    error?: string;
  }> {
    const providerStatus = this.getProviderStatus();
    if (providerStatus.status === 'not_connected') {
      return { success: false, walletsSynced: 0, error: providerStatus.reason };
    }

    try {
      const existing = await db.select().from(bitgoWallets).limit(100);
      let synced = 0;

      for (const wallet of existing) {
        const registryCheck = await db
          .select()
          .from(custodyWalletRegistry)
          .where(eq(custodyWalletRegistry.walletAddress, wallet.walletAddress))
          .limit(1);

        const registryRecord = {
          provider: PROVIDER,
          walletName: wallet.label ?? `BitGo — ${wallet.walletAddress.slice(0, 10)}`,
          walletAddress: wallet.walletAddress,
          chain: 'arbitrum',
          assetScope: wallet.coin ?? 'arbeth',
          purpose: 'custody',
          legalEntityName: 'Axiom Protocol',
          status: wallet.isActive ? 'live' : 'configured',
          metadata: {
            bitgoWalletId: wallet.bitgoWalletId,
            bitgoEnterpriseId: wallet.bitgoEnterpriseId,
            coin: wallet.coin,
            confirmedBalance: wallet.confirmedBalanceStr,
            lastSynced: wallet.lastSyncedAt?.toISOString() ?? null,
          },
        };

        if (registryCheck.length > 0) {
          await db.update(custodyWalletRegistry)
            .set({ ...registryRecord, updatedAt: new Date() })
            .where(eq(custodyWalletRegistry.id, registryCheck[0].id));
        } else {
          await db.insert(custodyWalletRegistry).values(registryRecord);
        }

        const accountCheck = await db
          .select()
          .from(treasuryAccounts)
          .where(eq(treasuryAccounts.externalAccountId, wallet.bitgoWalletId))
          .limit(1);

        const accountRecord = {
          provider: PROVIDER,
          accountType: 'paxg_reserve',
          displayName: wallet.label ?? `BitGo Custody — ${wallet.coin}`,
          legalEntityName: 'Axiom Protocol',
          externalAccountId: wallet.bitgoWalletId,
          assetSymbol: this.coinToAsset(wallet.coin ?? 'arbeth'),
          custodyModel: 'custodian',
          status: wallet.isActive ? 'live' : 'configured',
          metadata: {
            walletAddress: wallet.walletAddress,
            confirmedBalance: wallet.confirmedBalanceStr,
            lastSynced: wallet.lastSyncedAt?.toISOString() ?? null,
          },
        };

        if (accountCheck.length > 0) {
          await db.update(treasuryAccounts)
            .set({ ...accountRecord, updatedAt: new Date() })
            .where(eq(treasuryAccounts.id, accountCheck[0].id));
        } else {
          await db.insert(treasuryAccounts).values(accountRecord);
        }

        synced++;
      }

      if (isBitGoConfigured() && BITGO_ENTERPRISE_ID) {
        await this.syncFromBitGoApi(synced);
      }

      return { success: true, walletsSynced: synced };
    } catch (err: any) {
      console.error('[BitGoTreasuryExtension.syncCustodyWallets]', err?.message);
      return { success: false, walletsSynced: 0, error: err?.message };
    }
  }

  private async syncFromBitGoApi(existingSynced: number): Promise<void> {
    try {
      const { getBitGoApiUrl } = await import('../providers/featureFlags');
      const apiUrl = getBitGoApiUrl();
      console.log(`[BitGoTreasuryExtension] Syncing from BitGo API: ${apiUrl}`);
    } catch {
    }
  }

  async getReserveAssetBalances(): Promise<{
    positions: Array<{
      assetSymbol: string;
      quantity: number;
      markPrice: number | null;
      usdValue: number | null;
      trustSource: TrustClassification;
      positionType: string;
    }>;
    status: string;
    error?: string;
  }> {
    const providerStatus = this.getProviderStatus();

    if (providerStatus.status === 'not_connected') {
      return {
        positions: [],
        status: 'not_connected',
        error: providerStatus.reason,
      };
    }

    try {
      const wallets = await db.select().from(bitgoWallets).limit(50);
      const positions: Array<{
        assetSymbol: string;
        quantity: number;
        markPrice: number | null;
        usdValue: number | null;
        trustSource: TrustClassification;
        positionType: string;
      }> = [];

      for (const wallet of wallets) {
        if (!wallet.confirmedBalanceStr || wallet.confirmedBalanceStr === '0') continue;

        const asset = this.coinToAsset(wallet.coin ?? '');
        const quantity = parseFloat(wallet.confirmedBalanceStr) / 1e18;
        const syncAge = wallet.lastSyncedAt
          ? Date.now() - wallet.lastSyncedAt.getTime()
          : Infinity;
        const confidence = syncAge < 3600_000 ? 'high' : syncAge < 86400_000 ? 'medium' : 'low';

        positions.push({
          assetSymbol: asset,
          quantity,
          markPrice: null,
          usdValue: null,
          trustSource: {
            source: TrustSource.CUSTODIAN_REPORTED,
            confidence,
            lastVerifiedAt: wallet.lastSyncedAt?.toISOString() ?? null,
            note: `BitGo custody — ${wallet.label ?? wallet.walletAddress}`,
          },
          positionType: asset === 'PAXG' ? 'gold_reserve' : 'stablecoin_reserve',
        });
      }

      return { positions, status: providerStatus.status };
    } catch (err: any) {
      console.error('[BitGoTreasuryExtension.getReserveAssetBalances]', err?.message);
      return { positions: [], status: 'error', error: err?.message };
    }
  }

  private coinToAsset(coin: string): string {
    const map: Record<string, string> = {
      arbeth: 'ETH',
      tarbeth: 'ETH',
      usdc: 'USDC',
      axm: 'AXM',
      axusd: 'AXUSD',
      paxg: 'PAXG',
    };
    return map[coin.toLowerCase()] ?? coin.toUpperCase();
  }

  async sync(): Promise<{ wallets: any; balances: any }> {
    const [wallets, balances] = await Promise.all([
      this.syncCustodyWallets(),
      this.getReserveAssetBalances(),
    ]);
    return { wallets, balances };
  }
}

export const bitGoTreasuryExtension = new BitGoTreasuryExtension();
