/**
 * Axiom Protocol — Stellar Payment Adapter (Circle USDC)
 *
 * Real implementation of StellarPaymentAdapterInterface using @stellar/stellar-sdk.
 * Connects to the Stellar Horizon API and Circle's SEP-24 anchor on Stellar.
 *
 * Architecture:
 *   AXUSD (Arbitrum) → user swaps to USDC → Circle SEP-24 anchor on Stellar
 *   → recipient receives USD/USDC via Circle's interactive withdrawal flow
 *
 * SEP protocols implemented:
 *   SEP-0010: Stellar Web Authentication (server-side challenge/sign/verify)
 *   SEP-0024: Interactive anchor withdrawal flow (generates URL for user)
 *
 * Circle anchor discovery:
 *   USDC issuer: GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
 *   Home domain fetched live from Horizon → stellar.toml parsed for endpoints
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import type {
  StellarPaymentAdapterInterface,
  StellarAsset,
  StellarAccount,
  StellarAnchorStatus,
  PaymentCorridorStatus,
  StellarTransferState,
  StellarPaymentResult,
  StellarNetworkHealth,
  InitiatePaymentOptions,
} from '../adapters/StellarPaymentAdapterInterface';
import {
  STELLAR_PLANNED_CORRIDORS,
  STELLAR_NETWORK_CONFIGS,
  STELLAR_ANCHOR_REGISTRY,
  ANCHOR_CANDIDATES,
  STELLAR_KNOWN_ASSETS,
  type StellarNetworkId,
} from './types';
import { isExpansionEnabled } from '../featureFlags';
import { db } from '../../../server/db';
import { stellarPaymentTransfers, type StellarPaymentTransfer } from '../../../shared/stellarSchema';
import { eq } from 'drizzle-orm';

// ─── Constants ────────────────────────────────────────────────────────────────

const CIRCLE_USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';

/** Returns the anchor registry entry for the currently active anchor. */
function getActiveAnchorEntry() {
  const key = (process.env.STELLAR_ACTIVE_ANCHOR ?? 'moneygram').toLowerCase().trim();
  return STELLAR_ANCHOR_REGISTRY[key] ?? STELLAR_ANCHOR_REGISTRY['moneygram'];
}

function getActiveAnchorId(): string {
  return getActiveAnchorEntry().anchorId;
}

function getActiveAnchorHomeDomain(): string {
  return getActiveAnchorEntry().homeDomain;
}

// ─── Stellar TOML cache ───────────────────────────────────────────────────────

interface ParsedStellarToml {
  TRANSFER_SERVER_SEP0024?: string;
  WEB_AUTH_ENDPOINT?: string;
  SIGNING_KEY?: string;
  VERSION?: string;
  NETWORK_PASSPHRASE?: string;
  raw?: string;
}

let _tomlCache: { data: ParsedStellarToml; fetchedAt: number } | null = null;
let _tomlCachedDomain: string | null = null;
const TOML_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchCircleToml(): Promise<ParsedStellarToml> {
  const homeDomain = getActiveAnchorHomeDomain();
  if (
    _tomlCache &&
    _tomlCachedDomain === homeDomain &&
    Date.now() - _tomlCache.fetchedAt < TOML_CACHE_TTL_MS
  ) {
    return _tomlCache.data;
  }

  const tomlUrl = `https://${homeDomain}/.well-known/stellar.toml`;
  try {
    const res = await fetch(tomlUrl, {
      headers: { 'Accept': 'text/plain' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[StellarAdapter] stellar.toml fetch failed: ${res.status}`);
      return {};
    }

    const text = await res.text();
    const parsed: ParsedStellarToml = { raw: text };

    // Parse key = "value" and key = 'value' patterns from TOML
    const parseField = (key: string): string | undefined => {
      const match = text.match(new RegExp(`^${key}\\s*=\\s*["']([^"']+)["']`, 'm'));
      return match ? match[1] : undefined;
    };

    parsed.TRANSFER_SERVER_SEP0024 = parseField('TRANSFER_SERVER_SEP0024');
    parsed.WEB_AUTH_ENDPOINT = parseField('WEB_AUTH_ENDPOINT');
    parsed.SIGNING_KEY = parseField('SIGNING_KEY');
    parsed.VERSION = parseField('VERSION');
    parsed.NETWORK_PASSPHRASE = parseField('NETWORK_PASSPHRASE');

    _tomlCache = { data: parsed, fetchedAt: Date.now() };
    _tomlCachedDomain = homeDomain;
    return parsed;
  } catch (err) {
    console.warn(`[StellarAdapter] stellar.toml fetch error (${homeDomain}):`, err);
    return {};
  }
}

// ─── SEP-10 Authentication ────────────────────────────────────────────────────

interface Sep10Result {
  jwt: string | null;
  error: string | null;
}

async function performSep10Auth(
  webAuthEndpoint: string,
  stellarPublicKey: string,
  stellarSecretKey: string,
  networkPassphrase: string
): Promise<Sep10Result> {
  try {
    // Step 1: Get challenge transaction from anchor
    const challengeUrl = `${webAuthEndpoint}?account=${stellarPublicKey}`;
    const challengeRes = await fetch(challengeUrl, {
      signal: AbortSignal.timeout(8000),
    });

    if (!challengeRes.ok) {
      return { jwt: null, error: `SEP-10 challenge fetch failed: ${challengeRes.status}` };
    }

    const challengeData = await challengeRes.json() as { transaction?: string; network_passphrase?: string };

    if (!challengeData.transaction) {
      return { jwt: null, error: 'SEP-10 challenge response missing transaction field' };
    }

    // Step 2: Sign the challenge with the provided keypair
    const keypair = StellarSdk.Keypair.fromSecret(stellarSecretKey);
    const transaction = new StellarSdk.Transaction(
      challengeData.transaction,
      networkPassphrase
    );
    transaction.sign(keypair);
    const signedXdr = transaction.toXDR();

    // Step 3: Submit signed challenge to get JWT
    const jwtRes = await fetch(webAuthEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: signedXdr }),
      signal: AbortSignal.timeout(8000),
    });

    if (!jwtRes.ok) {
      return { jwt: null, error: `SEP-10 JWT request failed: ${jwtRes.status}` };
    }

    const jwtData = await jwtRes.json() as { token?: string };
    if (!jwtData.token) {
      return { jwt: null, error: 'SEP-10 JWT response missing token field' };
    }

    return { jwt: jwtData.token, error: null };
  } catch (err: any) {
    return { jwt: null, error: `SEP-10 auth error: ${err.message}` };
  }
}

// ─── Adapter Implementation ───────────────────────────────────────────────────

export class StellarPaymentAdapter implements StellarPaymentAdapterInterface {
  readonly isLive: boolean;
  private readonly networkId: StellarNetworkId;
  private readonly server: StellarSdk.Horizon.Server;
  private readonly networkPassphrase: string;
  private readonly horizonUrl: string;

  constructor(networkId: StellarNetworkId = 'mainnet') {
    this.networkId = networkId;
    this.isLive = isExpansionEnabled('STELLAR_PAYMENTS_RAIL');

    const config = STELLAR_NETWORK_CONFIGS[networkId];
    this.horizonUrl = config.horizonUrl;
    this.networkPassphrase = config.networkPassphrase;
    this.server = new StellarSdk.Horizon.Server(config.horizonUrl);
  }

  // ─── Network health ────────────────────────────────────────────────────────

  async getNetworkHealth(): Promise<StellarNetworkHealth> {
    const start = Date.now();
    try {
      const ledgers = await this.server
        .ledgers()
        .order('desc')
        .limit(1)
        .call();

      const latencyMs = Date.now() - start;
      const ledger = ledgers.records[0];

      return {
        networkId: this.networkId,
        horizonReachable: true,
        latencyMs,
        currentLedger: ledger ? ledger.sequence : null,
        currentFeeStroops: ledger ? parseInt(ledger.base_fee_in_stroops?.toString() ?? '100', 10) : null,
        asOf: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        networkId: this.networkId,
        horizonReachable: false,
        latencyMs: Date.now() - start,
        currentLedger: null,
        currentFeeStroops: null,
        asOf: new Date().toISOString(),
      };
    }
  }

  // ─── Corridors ─────────────────────────────────────────────────────────────

  async getAllCorridors(): Promise<PaymentCorridorStatus[]> {
    return STELLAR_PLANNED_CORRIDORS.map(c => ({
      corridorId: c.corridorId,
      sourceNetwork: c.sourceNetwork,
      destinationCurrency: c.destinationCurrency,
      destinationCountry: c.destinationCountry,
      anchorId: c.anchorId ?? 'not_selected',
      status: c.status === 'configured' ? 'available' : c.status === 'anchor_pending' ? 'pending_anchor' : 'unavailable',
      estimatedSettlementMinutes: c.estimatedSettlementMinutes,
      minAmountUsd: c.minAmountUsd,
      maxAmountUsd: c.maxAmountUsd,
      feeEstimatePercent: c.anchorId === 'moneygram-stellar' ? 0.1 : null,
      notes: c.blockers.length > 0 ? `Blockers: ${c.blockers.join('; ')}` : 'USDC on Stellar via active SEP-24 anchor. Interactive withdrawal flow.',
    }));
  }

  async getCorridorStatus(corridorId: string): Promise<PaymentCorridorStatus> {
    const all = await this.getAllCorridors();
    return all.find(c => c.corridorId === corridorId) ?? {
      corridorId,
      sourceNetwork: 'unknown',
      destinationCurrency: 'unknown',
      destinationCountry: 'unknown',
      anchorId: 'not_found',
      status: 'unknown',
      estimatedSettlementMinutes: null,
      minAmountUsd: null,
      maxAmountUsd: null,
      feeEstimatePercent: null,
      notes: 'Corridor not found.',
    };
  }

  // ─── Anchor status ─────────────────────────────────────────────────────────

  async getAnchorStatus(anchorId: string): Promise<StellarAnchorStatus> {
    const candidate = ANCHOR_CANDIDATES.find(a => a.anchorId === anchorId);

    // Determine if this anchor ID belongs to any registered anchor
    const registryEntry = Object.values(STELLAR_ANCHOR_REGISTRY).find(e => e.anchorId === anchorId);
    const isRegisteredAnchor = !!registryEntry || anchorId === getActiveAnchorId();

    if (isRegisteredAnchor) {
      try {
        // If the requested anchor is the active one, use the cached toml fetch.
        // Otherwise fall back to the candidate's known data.
        const isActiveAnchor = anchorId === getActiveAnchorId();
        const toml = isActiveAnchor ? await fetchCircleToml() : {};
        const hasSep24 = !!(toml as ParsedStellarToml).TRANSFER_SERVER_SEP0024 || !!registryEntry?.transferServerSep24;
        const hasWebAuth = !!(toml as ParsedStellarToml).WEB_AUTH_ENDPOINT || !!registryEntry?.webAuthEndpoint;
        const isReachable = hasSep24 || hasWebAuth;

        const resolvedSep24 = (toml as ParsedStellarToml).TRANSFER_SERVER_SEP0024 ?? registryEntry?.transferServerSep24;

        // Fetch SEP-24 /info if we have the endpoint
        let supportedAssets: StellarAsset[] = [];
        if (resolvedSep24) {
          try {
            const infoRes = await fetch(`${resolvedSep24}/info`, {
              signal: AbortSignal.timeout(8000),
            });
            if (infoRes.ok) {
              const infoData = await infoRes.json() as { withdraw?: Record<string, unknown>; deposit?: Record<string, unknown> };
              const assetCodes = Object.keys(infoData.withdraw ?? infoData.deposit ?? {});
              const usdcIssuer = registryEntry?.usdcIssuer ?? CIRCLE_USDC_ISSUER;
              supportedAssets = assetCodes.map(code => ({
                code,
                issuer: code === 'USDC' ? usdcIssuer : null,
                isNative: false,
              }));
            }
          } catch {
            supportedAssets = STELLAR_KNOWN_ASSETS
              .filter(a => !a.isNative)
              .map(a => ({ code: a.code, issuer: a.issuer, isNative: a.isNative }));
          }
        }

        if (supportedAssets.length === 0) {
          supportedAssets = [{ code: 'USDC', issuer: registryEntry?.usdcIssuer ?? CIRCLE_USDC_ISSUER, isNative: false }];
        }

        const anchorName = candidate?.anchorName ?? registryEntry?.anchorName ?? anchorId;

        return {
          anchorId,
          anchorName,
          isReachable,
          sep24Supported: hasSep24,
          sep31Supported: candidate?.sep31Support ?? false,
          supportedAssets,
          corridors: [
            { from: 'USDC', to: 'USD', currency: 'USD' },
            { from: 'USDC', to: 'USDC', currency: 'USDC' },
          ],
          lastCheckedAt: new Date().toISOString(),
        };
      } catch (err) {
        console.error('[StellarAdapter] getAnchorStatus error:', err);
      }
    }

    // Fallback for unrecognized anchor
    return {
      anchorId,
      anchorName: candidate?.anchorName ?? anchorId,
      isReachable: false,
      sep24Supported: candidate?.sep24Support ?? false,
      sep31Supported: candidate?.sep31Support ?? false,
      supportedAssets: [],
      corridors: [],
      lastCheckedAt: new Date().toISOString(),
    };
  }

  // ─── Account info ──────────────────────────────────────────────────────────

  async getAccountInfo(publicKey: string): Promise<StellarAccount> {
    try {
      const account = await this.server.loadAccount(publicKey);
      return {
        publicKey,
        exists: true,
        balances: account.balances.map((b: StellarSdk.Horizon.HorizonApi.BalanceLine) => {
          if (b.asset_type === 'native') {
            return { asset: { code: 'XLM', issuer: null, isNative: true }, balance: b.balance };
          }
          const nativeB = b as StellarSdk.Horizon.HorizonApi.BalanceLineAsset;
          return {
            asset: { code: nativeB.asset_code, issuer: nativeB.asset_issuer, isNative: false },
            balance: nativeB.balance,
          };
        }),
        sequenceNumber: account.sequenceNumber(),
      };
    } catch (err: any) {
      if (err?.response?.status === 404) {
        return { publicKey, exists: false, balances: [], sequenceNumber: null };
      }
      console.error('[StellarAdapter] getAccountInfo error:', err);
      return { publicKey, exists: false, balances: [], sequenceNumber: null };
    }
  }

  // ─── Payment initiation ────────────────────────────────────────────────────

  async initiatePayment(options: InitiatePaymentOptions): Promise<StellarPaymentResult> {
    if (options.dryRun) {
      return {
        success: false,
        transferId: null,
        stellarTransactionHash: null,
        error: 'Dry run mode — no payment initiated.',
        state: null,
      };
    }

    try {
      // 1. Fetch active anchor's stellar.toml to get SEP endpoints
      const toml = await fetchCircleToml();
      const anchorEntry = getActiveAnchorEntry();

      if (!toml.TRANSFER_SERVER_SEP0024) {
        return {
          success: false,
          transferId: null,
          stellarTransactionHash: null,
          error: `Active anchor (${anchorEntry.homeDomain}) SEP-24 endpoint not found in stellar.toml. Toml may be unreachable.`,
          state: null,
        };
      }

      if (!toml.WEB_AUTH_ENDPOINT) {
        return {
          success: false,
          transferId: null,
          stellarTransactionHash: null,
          error: `Active anchor (${anchorEntry.homeDomain}) WEB_AUTH_ENDPOINT not found in stellar.toml.`,
          state: null,
        };
      }

      // 2. Generate ephemeral Stellar keypair for this payment session
      //    (Used only for SEP-10 auth — does not hold funds)
      const ephemeralKeypair = StellarSdk.Keypair.random();
      const stellarPublicKey = ephemeralKeypair.publicKey();

      // 3. SEP-10 authentication with the ephemeral keypair
      const authResult = await performSep10Auth(
        toml.WEB_AUTH_ENDPOINT,
        stellarPublicKey,
        ephemeralKeypair.secret(),
        this.networkPassphrase
      );

      if (!authResult.jwt) {
        return {
          success: false,
          transferId: null,
          stellarTransactionHash: null,
          error: `SEP-10 authentication failed: ${authResult.error}`,
          state: null,
        };
      }

      // 4. Initiate SEP-24 interactive withdrawal
      const sep24Url = `${toml.TRANSFER_SERVER_SEP0024}/transactions/withdraw/interactive`;
      const sep24Body = new URLSearchParams({
        asset_code: 'USDC',
        asset_issuer: CIRCLE_USDC_ISSUER,
        amount: options.sourceAxusdAmount,
        lang: 'en',
      });

      const sep24Res = await fetch(sep24Url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authResult.jwt}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: sep24Body.toString(),
        signal: AbortSignal.timeout(10000),
      });

      if (!sep24Res.ok) {
        const errorText = await sep24Res.text().catch(() => 'unknown');
        return {
          success: false,
          transferId: null,
          stellarTransactionHash: null,
          error: `SEP-24 interactive request failed: ${sep24Res.status} — ${errorText}`,
          state: null,
        };
      }

      const sep24Data = await sep24Res.json() as { id?: string; url?: string; type?: string };

      if (!sep24Data.id || !sep24Data.url) {
        return {
          success: false,
          transferId: null,
          stellarTransactionHash: null,
          error: 'SEP-24 response missing id or url field.',
          state: null,
        };
      }

      // 5. Store the transfer in the DB
      const now = new Date();
      const [record] = await db.insert(stellarPaymentTransfers).values({
        axiomWalletAddress: options.senderWalletAddress,
        stellarPublicKey,
        anchorId: getActiveAnchorId(),
        corridorId: options.corridorId,
        anchorTransferId: sep24Data.id,
        sourceAmountAxusd: options.sourceAxusdAmount,
        destinationCurrency: options.destinationCurrency,
        destinationAccount: options.destinationAccount,
        status: 'pending_user_transfer_start',
        sep24InteractiveUrl: sep24Data.url,
        sep10JwtIssued: true,
        anchorRawResponse: sep24Data as Record<string, unknown>,
        initiatedAt: now,
        updatedAt: now,
      }).returning();

      const state: StellarTransferState = {
        transferId: record.id,
        externalId: sep24Data.id,
        status: 'pending_user_transfer_start',
        stellarTransactionId: null,
        amount: options.sourceAxusdAmount,
        asset: { code: 'USDC', issuer: CIRCLE_USDC_ISSUER, isNative: false },
        destinationCurrency: options.destinationCurrency,
        destinationAmount: null,
        fee: null,
        completedAt: null,
        errorMessage: null,
        updatedAt: now.toISOString(),
      };

      return {
        success: true,
        transferId: record.id,
        stellarTransactionHash: null,
        error: null,
        state,
      };
    } catch (err: any) {
      console.error('[StellarAdapter] initiatePayment error:', err);
      return {
        success: false,
        transferId: null,
        stellarTransactionHash: null,
        error: `Payment initiation error: ${err.message}`,
        state: null,
      };
    }
  }

  // ─── Transfer state ────────────────────────────────────────────────────────

  async getTransferState(transferId: string): Promise<StellarTransferState | null> {
    try {
      // Load from DB first
      const records = await db
        .select()
        .from(stellarPaymentTransfers)
        .where(eq(stellarPaymentTransfers.id, transferId))
        .limit(1);

      if (records.length === 0) return null;
      const record = records[0];

      // If transfer has an anchor transfer ID and is not in a terminal state, poll the anchor
      if (
        record.anchorTransferId &&
        record.status !== 'completed' &&
        record.status !== 'error' &&
        record.status !== 'refunded'
      ) {
        const toml = await fetchCircleToml().catch((): ParsedStellarToml => ({}));

        if (toml.TRANSFER_SERVER_SEP0024) {
          try {
            const pollUrl = `${toml.TRANSFER_SERVER_SEP0024}/transaction?id=${record.anchorTransferId}`;
            const pollRes = await fetch(pollUrl, { signal: AbortSignal.timeout(8000) });

            if (pollRes.ok) {
              const pollData = await pollRes.json() as {
                transaction?: {
                  status?: string;
                  stellar_transaction_id?: string;
                  amount_in?: string;
                  amount_out?: string;
                  fee_fixed?: string;
                  completed_at?: string;
                  message?: string;
                };
              };

              const tx = pollData.transaction;
              if (tx) {
                // Map anchor status to our internal status
                const statusMap: Record<string, StellarPaymentTransfer['status']> = {
                  'pending_user_transfer_start': 'pending_user_transfer_start',
                  'pending_external': 'pending_external',
                  'pending_anchor': 'pending_anchor',
                  'pending_stellar': 'pending_stellar',
                  'pending_trust': 'pending_trust',
                  'completed': 'completed',
                  'error': 'error',
                  'refunded': 'refunded',
                };

                const newStatus = statusMap[tx.status ?? ''] ?? record.status;
                const now = new Date();

                // Update DB with latest anchor status
                await db.update(stellarPaymentTransfers)
                  .set({
                    status: newStatus,
                    stellarTransactionHash: tx.stellar_transaction_id ?? record.stellarTransactionHash,
                    destinationAmount: tx.amount_out ?? record.destinationAmount,
                    feeEstimate: tx.fee_fixed ?? record.feeEstimate,
                    completedAt: newStatus === 'completed' ? now : record.completedAt,
                    errorMessage: tx.message ?? record.errorMessage,
                    lastPolledAt: now,
                    updatedAt: now,
                  })
                  .where(eq(stellarPaymentTransfers.id, transferId));

                return {
                  transferId,
                  externalId: record.anchorTransferId,
                  status: newStatus as StellarTransferState['status'],
                  stellarTransactionId: tx.stellar_transaction_id ?? null,
                  amount: record.sourceAmountAxusd,
                  asset: { code: 'USDC', issuer: CIRCLE_USDC_ISSUER, isNative: false },
                  destinationCurrency: record.destinationCurrency,
                  destinationAmount: tx.amount_out ?? null,
                  fee: tx.fee_fixed ?? null,
                  completedAt: tx.completed_at ?? null,
                  errorMessage: tx.message ?? null,
                  updatedAt: now.toISOString(),
                };
              }
            }
          } catch {
            // Anchor poll failed — return DB state
          }
        }
      }

      // Return DB state
      return {
        transferId: record.id,
        externalId: record.anchorTransferId,
        status: record.status as StellarTransferState['status'],
        stellarTransactionId: record.stellarTransactionHash,
        amount: record.sourceAmountAxusd,
        asset: { code: 'USDC', issuer: CIRCLE_USDC_ISSUER, isNative: false },
        destinationCurrency: record.destinationCurrency,
        destinationAmount: record.destinationAmount,
        fee: record.feeEstimate,
        completedAt: record.completedAt?.toISOString() ?? null,
        errorMessage: record.errorMessage,
        updatedAt: record.updatedAt.toISOString(),
      };
    } catch (err) {
      console.error('[StellarAdapter] getTransferState error:', err);
      return null;
    }
  }

  // ─── Cancel payment ────────────────────────────────────────────────────────

  async cancelPayment(transferId: string): Promise<boolean> {
    // Circle's SEP-24 does not support server-initiated cancellation.
    // Transfers in 'pending_user_transfer_start' can be abandoned (no action needed).
    try {
      const records = await db
        .select()
        .from(stellarPaymentTransfers)
        .where(eq(stellarPaymentTransfers.id, transferId))
        .limit(1);

      if (records.length === 0) return false;
      const record = records[0];

      if (record.status === 'pending_user_transfer_start') {
        await db.update(stellarPaymentTransfers)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(stellarPaymentTransfers.id, transferId));
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // ─── Supported assets ──────────────────────────────────────────────────────

  async getSupportedAssets(): Promise<StellarAsset[]> {
    return STELLAR_KNOWN_ASSETS.map(a => ({
      code: a.code,
      issuer: a.issuer,
      isNative: a.isNative,
    }));
  }
}

// ─── Singleton factory ─────────────────────────────────────────────────────────

let _instance: StellarPaymentAdapter | null = null;

export function getStellarPaymentAdapter(networkId: StellarNetworkId = 'mainnet'): StellarPaymentAdapter {
  if (!_instance) {
    _instance = new StellarPaymentAdapter(networkId);
  }
  return _instance;
}

// Export the toml fetcher so API routes can use it directly
export { fetchCircleToml };
