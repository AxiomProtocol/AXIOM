import { db } from '../../server/db';
import { partnerIntegrations } from '../../shared/treasurySchema';
import { getProviderStatus, type ProviderName } from '../providers/providerStatus';
import { increaseTreasuryService } from './IncreaseTreasuryService';
import { circleTreasuryService } from './CircleTreasuryService';
import { bitGoTreasuryExtension } from './BitGoTreasuryExtension';
import { reserveAccountingService } from './ReserveAccountingService';
import { disclosureSnapshotService } from './DisclosureSnapshotService';
import { allocationPolicyService } from './AllocationPolicyService';
import { TrustSource, classify } from '../types/trustSource';
import { eq } from 'drizzle-orm';

export interface IntegrationStatus {
  provider: string;
  status: string;
  environment?: string;
  reason?: string;
}

export interface SystemState {
  banking: {
    status: string;
    provider: string;
    balanceUsd: number | null;
    trustSource: string;
    lastSync: string | null;
  };
  settlement: {
    status: string;
    provider: string;
    usdcBalanceUsd: number | null;
    trustSource: string;
    lastSync: string | null;
  };
  reserve: {
    status: string;
    paxgUsd: number;
    fiatUsd: number;
    usdcUsd: number;
    totalUsd: number;
    reserveRatio: number | null;
    trustSource: string;
  };
  custody: {
    status: string;
    provider: string;
    walletCount: number;
    trustSource: string;
  };
  disclosure: {
    lastSnapshotAt: string | null;
    snapshotId: string | null;
    status: string;
  };
  integrations: {
    increase: IntegrationStatus;
    circle: IntegrationStatus;
    bitgo: IntegrationStatus;
    paxos: IntegrationStatus;
  };
  generatedAt: string;
}

export class SystemStateService {
  async getSystemState(): Promise<SystemState> {
    const providers: ProviderName[] = ['increase', 'circle', 'bitgo', 'paxos'];
    const [increaseStatus, circleStatus, bitgoStatus, paxosStatus] = providers.map(getProviderStatus);

    const [fiatBalance, circleWallets, bitgoPositions, composition, latestSnapshot] =
      await Promise.allSettled([
        increaseTreasuryService.getCurrentBalance(),
        circleTreasuryService.getWalletRegistry(),
        bitGoTreasuryExtension.getReserveAssetBalances(),
        reserveAccountingService.getComposition(),
        disclosureSnapshotService.getLatestSnapshot(),
      ]);

    const fiat = fiatBalance.status === 'fulfilled' ? fiatBalance.value : null;
    const circle = circleWallets.status === 'fulfilled' ? circleWallets.value : null;
    const bitgo = bitgoPositions.status === 'fulfilled' ? bitgoPositions.value : null;
    const comp = composition.status === 'fulfilled' ? composition.value : null;
    const snapshot = latestSnapshot.status === 'fulfilled' ? latestSnapshot.value : null;

    return {
      banking: {
        status: increaseStatus.status,
        provider: 'increase',
        balanceUsd: fiat?.balanceUsd ?? null,
        trustSource: fiat?.trustSource.source ?? TrustSource.UNAVAILABLE,
        lastSync: null,
      },
      settlement: {
        status: circleStatus.status,
        provider: 'circle',
        usdcBalanceUsd: comp?.totalUsdcUsd ?? null,
        trustSource: circle?.trustSource.source ?? TrustSource.UNAVAILABLE,
        lastSync: null,
      },
      reserve: {
        status: bitgoStatus.status,
        paxgUsd: comp?.totalPaxgUsd ?? 0,
        fiatUsd: comp?.totalFiatUsd ?? 0,
        usdcUsd: comp?.totalUsdcUsd ?? 0,
        totalUsd: comp?.totalUsd ?? 0,
        reserveRatio: comp?.reserveRatio ?? null,
        trustSource: TrustSource.CUSTODIAN_REPORTED,
      },
      custody: {
        status: bitgoStatus.status,
        provider: 'bitgo',
        walletCount: bitgo?.positions.length ?? 0,
        trustSource: TrustSource.CUSTODIAN_REPORTED,
      },
      disclosure: {
        lastSnapshotAt: snapshot?.createdAt ?? null,
        snapshotId: snapshot?.id ?? null,
        status: snapshot ? 'current' : 'no_snapshot',
      },
      integrations: {
        increase: { provider: 'increase', ...increaseStatus },
        circle: { provider: 'circle', ...circleStatus },
        bitgo: { provider: 'bitgo', ...bitgoStatus },
        paxos: { provider: 'paxos', ...paxosStatus },
      },
      generatedAt: new Date().toISOString(),
    };
  }

  async refreshAll(): Promise<{
    increase: { status: string; detail?: string };
    circle: { status: string; detail?: string };
    bitgo: { status: string; detail?: string };
    reserve: { status: string; positions?: number };
    snapshot: { status: string; id?: string };
    policies: { status: string; seeded?: number };
    completedAt: string;
  }> {
    const results = {
      increase: { status: 'skipped', detail: undefined as string | undefined },
      circle: { status: 'skipped', detail: undefined as string | undefined },
      bitgo: { status: 'skipped', detail: undefined as string | undefined },
      reserve: { status: 'skipped', positions: undefined as number | undefined },
      snapshot: { status: 'skipped', id: undefined as string | undefined },
      policies: { status: 'skipped', seeded: undefined as number | undefined },
      completedAt: new Date().toISOString(),
    };

    await Promise.allSettled([
      (async () => {
        try {
          const r = await increaseTreasuryService.sync();
          results.increase = {
            status: r.accounts.success ? 'ok' : 'error',
            detail: r.accounts.error,
          };
        } catch (e: any) {
          results.increase = { status: 'error', detail: e?.message };
        }
      })(),
      (async () => {
        try {
          const r = await circleTreasuryService.sync();
          results.circle = {
            status: r.balances.success ? 'ok' : r.balances.status,
            detail: r.balances.error,
          };
        } catch (e: any) {
          results.circle = { status: 'error', detail: e?.message };
        }
      })(),
      (async () => {
        try {
          const r = await bitGoTreasuryExtension.sync();
          results.bitgo = {
            status: r.wallets.success ? 'ok' : 'error',
            detail: r.wallets.error,
          };
        } catch (e: any) {
          results.bitgo = { status: 'error', detail: e?.message };
        }
      })(),
    ]);

    try {
      const r = await reserveAccountingService.refreshPositions();
      results.reserve = { status: r.success ? 'ok' : 'error', positions: r.positions };
    } catch (e: any) {
      results.reserve = { status: 'error' };
    }

    try {
      const r = await disclosureSnapshotService.createSnapshot();
      results.snapshot = { status: r.success ? 'ok' : 'error', id: r.snapshot?.id };
    } catch (e: any) {
      results.snapshot = { status: 'error' };
    }

    try {
      const r = await allocationPolicyService.seedDefaultPolicies();
      results.policies = { status: 'ok', seeded: r.seeded };
    } catch (e: any) {
      results.policies = { status: 'error' };
    }

    results.completedAt = new Date().toISOString();
    return results;
  }

  async seedPartnerIntegrations(): Promise<void> {
    const providers: ProviderName[] = ['increase', 'circle', 'bitgo', 'paxos'];
    const integrationTypes: Record<ProviderName, string> = {
      increase: 'banking',
      circle: 'stablecoin',
      bitgo: 'custody',
      paxos: 'reserve_asset',
    };

    for (const provider of providers) {
      const status = getProviderStatus(provider);
      const existing = await db
        .select()
        .from(partnerIntegrations)
        .where(eq(partnerIntegrations.partnerName, provider))
        .limit(1);

      const record = {
        partnerName: provider,
        integrationType: integrationTypes[provider],
        status: status.status === 'not_connected' ? 'inactive' : status.status,
        productionEnabled: status.status === 'live',
        sandboxEnabled: status.status === 'configured',
        metadata: { reason: status.reason, environment: status.environment },
      };

      if (existing.length > 0) {
        await db
          .update(partnerIntegrations)
          .set({ ...record, updatedAt: new Date() })
          .where(eq(partnerIntegrations.partnerName, provider));
      } else {
        await db.insert(partnerIntegrations).values(record);
      }
    }
  }
}

export const systemStateService = new SystemStateService();
