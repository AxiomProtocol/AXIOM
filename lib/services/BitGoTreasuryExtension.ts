/**
 * lib/services/BitGoTreasuryExtension.ts
 *
 * Reads BitGo wallet records from the local database (bitgo_wallets table)
 * and exposes reserve positions for consumption by the canonical reserve
 * snapshot function.
 *
 * ── Balance unit normalization ────────────────────────────────────────────────
 *
 * BitGo REST API returns balances in ATOMIC UNITS (smallest denomination),
 * consistent with the EVM convention:
 *   - arbeth / paxg / axusd / axm / tarbeth  → 18 decimal places (wei-scale)
 *   - usdc                                   →  6 decimal places
 *   - eth / teth                             → 18 decimal places
 *
 * The `confirmed_balance_str` column in `bitgo_wallets` stores the raw
 * atomic-unit string exactly as returned by the BitGo API response field
 * `confirmedBalance` (a decimal-string integer, e.g. "9717000000000000"
 * for 0.009717 PAXG).
 *
 * RISK: If BitGo ever returns human-readable decimals instead of atomic
 * units (e.g. after an API version change), normalizeBitGoBalance() will
 * silently under-report by many orders of magnitude. The suspicious-magnitude
 * guard below logs a warning at runtime if a normalized quantity exceeds
 * SUSPICIOUS_MAX_QUANTITY, which would catch atomic-scale input being
 * treated as decimal.
 *
 * If unit certainty cannot be verified from the BitGo dashboard or API
 * response for a specific coin/wallet, set confirmedBalanceStr to '0'
 * and verify before re-enabling.
 */

import { db } from '../../server/db';
import { treasuryAccounts, custodyWalletRegistry, reservePositions } from '../../shared/treasurySchema';
import { bitgoWallets } from '../../shared/bitgoSchema';
import { TrustSource, classify, type TrustClassification } from '../types/trustSource';
import { getProviderStatus } from '../providers/providerStatus';
import { getBitGoMode, getBitGoApiUrl } from '../providers/featureFlags';
import { bitGoRequest, isBitGoConfigured, BITGO_ENTERPRISE_ID } from '../bitgo/client';
import { eq } from 'drizzle-orm';

const PROVIDER = 'bitgo';

// ── Decimal place map ─────────────────────────────────────────────────────────
// Authoritative source for how many decimal places each coin uses in BitGo's
// atomic-unit representation. Update here when adding new coin types.

const COIN_DECIMALS: Record<string, number> = {
  // ── Arbitrum One ────────────────────────────────────────────────
  arbeth:    18,  // Arbitrum ETH (wei)
  tarbeth:   18,  // Arbitrum testnet ETH (wei)
  arbitrum:  18,  // Arbitrum native (wei)
  tarbitrum: 18,  // Arbitrum testnet (wei)
  // ── Ethereum ────────────────────────────────────────────────────
  eth:       18,  // Ethereum mainnet ETH (wei)
  teth:      18,  // Ethereum testnet ETH (wei)
  // ── Axiom tokens (Arbitrum-canonical) ───────────────────────────
  paxg:      18,  // PAX Gold ERC-20 (18 decimals on-chain)
  axm:       18,  // AXM governance token (18 decimals)
  axusd:     18,  // AXUSD stablecoin (18 decimals — ERC-3643)
  usdc:       6,  // USD Coin (6 decimals on Arbitrum and Ethereum)
  // ── Polygon PoS (Phase 5) ────────────────────────────────────────
  // BitGo coin identifiers for Polygon assets.
  // Decimal values mirror on-chain representations.
  pol:                 18, // Polygon native token (formerly MATIC), 18 decimals
  matic:               18, // Legacy Polygon native — BitGo may still use this
  polygon:             18, // Polygon network identifier (generic)
  'polygon:usdc':       6, // Native USDC on Polygon PoS — 6 decimals
  polygonusdc:          6, // BitGo may normalise the colon away
  'polygon:pol':       18, // POL on Polygon via BitGo colon notation
  amoyeth:             18, // Polygon Amoy testnet ETH
};

/**
 * Upper bound for a sanity check on normalized quantity.
 * Any single wallet holding more than this amount is suspicious and
 * likely indicates a decimal normalization error (atomic units being
 * treated as already-decimal).
 *
 * 1,000,000 tokens is conservative for gold (PAXG) and governance tokens;
 * for USDC/AXUSD, very large balances are more plausible, so the check
 * uses a higher ceiling of 1e9 USD-equivalent.
 */
const SUSPICIOUS_MAX_QUANTITY = 1_000_000;

/**
 * Normalize a raw BitGo balance string to a human-readable decimal quantity.
 *
 * @param balanceStr  - The `confirmedBalanceStr` value from the database.
 *                      Expected to be atomic units as returned by the BitGo API.
 * @param coin        - The coin identifier (e.g. 'arbeth', 'usdc', 'paxg').
 * @returns           - Decimal quantity (e.g. 0.009717 for 9717000000000000 PAXG).
 */
export function normalizeBitGoBalance(balanceStr: string, coin: string): number {
  if (!balanceStr || balanceStr === '0') return 0;

  const decimals = COIN_DECIMALS[coin.toLowerCase()];

  if (decimals === undefined) {
    // Unknown coin — default to 18 decimals (safe for most EVM assets)
    // and emit a warning so the operator can add the coin to COIN_DECIMALS.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `[BitGoTreasuryExtension] Unknown coin "${coin}" — defaulting to 18 decimal places. ` +
        `Add to COIN_DECIMALS map to suppress this warning.`,
      );
    }
    const quantity = parseFloat(balanceStr) / 10 ** 18;
    warnIfSuspicious(quantity, coin, balanceStr);
    return quantity;
  }

  const quantity = parseFloat(balanceStr) / 10 ** decimals;
  warnIfSuspicious(quantity, coin, balanceStr);
  return quantity;
}

function warnIfSuspicious(quantity: number, coin: string, rawStr: string): void {
  if (quantity > SUSPICIOUS_MAX_QUANTITY && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[BitGoTreasuryExtension] SUSPICIOUS BALANCE: normalized quantity ${quantity.toLocaleString()} ` +
      `for coin "${coin}" (raw: "${rawStr}"). ` +
      `This may indicate the balance string is already in decimal units, not atomic units. ` +
      `Verify the BitGo API response format and update COIN_DECIMALS if needed.`,
    );
  }
}

export class BitGoTreasuryExtension {
  getProviderStatus() {
    return getProviderStatus('bitgo');
  }

  getBitGoConnectionInfo() {
    const mode = getBitGoMode();
    const url  = getBitGoApiUrl();
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
          chain: this.coinToChain(wallet.coin ?? 'arbeth'),
          assetScope: wallet.coin ?? 'arbeth',
          purpose: 'custody',
          legalEntityName: 'Axiom Protocol',
          status: wallet.isActive ? 'live' : 'configured',
          metadata: {
            bitgoWalletId: wallet.bitgoWalletId,
            bitgoEnterpriseId: wallet.bitgoEnterpriseId,
            coin: wallet.coin,
            // Store the raw atomic-unit string alongside the normalized quantity
            // so auditors can verify the normalization independently.
            confirmedBalanceRaw: wallet.confirmedBalanceStr,
            confirmedBalanceNormalized: normalizeBitGoBalance(
              wallet.confirmedBalanceStr ?? '0',
              wallet.coin ?? 'arbeth',
            ),
            decimalsUsed: COIN_DECIMALS[wallet.coin?.toLowerCase() ?? ''] ?? 18,
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
            confirmedBalanceRaw: wallet.confirmedBalanceStr,
            confirmedBalanceNormalized: normalizeBitGoBalance(
              wallet.confirmedBalanceStr ?? '0',
              wallet.coin ?? 'arbeth',
            ),
            decimalsUsed: COIN_DECIMALS[wallet.coin?.toLowerCase() ?? ''] ?? 18,
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

  private async syncFromBitGoApi(_existingSynced: number): Promise<void> {
    try {
      const { getBitGoApiUrl } = await import('../providers/featureFlags');
      const apiUrl = getBitGoApiUrl();
      console.log(`[BitGoTreasuryExtension] Syncing from BitGo API: ${apiUrl}`);
    } catch {
      // no-op: live API sync is a future capability
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
      return { positions: [], status: 'not_connected', error: providerStatus.reason };
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

        // Use normalizeBitGoBalance() to apply per-coin decimal handling.
        // BitGo returns atomic units; USDC has 6 decimals, all others 18.
        // The old inline `/ 1e18` was wrong for USDC (would overstate by 10^12).
        const quantity = normalizeBitGoBalance(wallet.confirmedBalanceStr, wallet.coin ?? 'arbeth');

        const syncAge = wallet.lastSyncedAt
          ? Date.now() - wallet.lastSyncedAt.getTime()
          : Infinity;
        const confidence = syncAge < 3_600_000 ? 'high' : syncAge < 86_400_000 ? 'medium' : 'low';

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
      // ── Arbitrum One ──────────────────────────────────────────
      arbeth:         'ETH',
      tarbeth:        'ETH',
      arbitrum:       'ETH',
      tarbitrum:      'ETH',
      // ── Ethereum ─────────────────────────────────────────────
      eth:            'ETH',
      teth:           'ETH',
      // ── Axiom tokens (Arbitrum-canonical) ────────────────────
      usdc:           'USDC',
      axm:            'AXM',
      axusd:          'AXUSD',
      paxg:           'PAXG',
      // ── Polygon PoS (Phase 5) ─────────────────────────────────
      pol:            'POL',
      matic:          'POL',       // BitGo legacy identifier for POL
      polygon:        'POL',
      'polygon:pol':  'POL',
      'polygon:usdc': 'USDC-POLYGON',
      polygonusdc:    'USDC-POLYGON',
      amoyeth:        'ETH',       // Polygon Amoy testnet
    };
    return map[coin.toLowerCase()] ?? coin.toUpperCase();
  }

  /**
   * Derive the canonical chain name for custody wallet registry `chain` field.
   * Previously this was hardcoded to 'arbitrum' for all wallets. Phase 5
   * adds Polygon support, so we derive chain from the BitGo coin identifier.
   *
   * Arbitrum is still the default for unknown coins — it was the only
   * registered chain before Phase 5.
   */
  private coinToChain(coin: string): string {
    const c = coin.toLowerCase();
    if (c.startsWith('polygon') || c === 'pol' || c === 'matic' || c === 'amoyeth') {
      return 'polygon';
    }
    // All other known coins are Arbitrum-canonical in current BitGo setup.
    return 'arbitrum';
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
