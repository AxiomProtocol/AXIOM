/**
 * Capital Infrastructure — canonical zod schemas for every Phase 1
 * request and response shape from the spec.
 */

import { z } from 'zod';
import { usdDecimalString, type UsdDecimalString } from './money';

// ─── Enum mirrors (as zod) ──────────────────────────────────────────

export const ZEntityType = z.enum(['NATURAL_PERSON', 'LEGAL_ENTITY', 'INSTITUTION', 'INTERNAL_TREASURY']);
export const ZRecordStatus = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED', 'PENDING']);
export const ZClaimType = z.enum([
  'KYC_VERIFIED',
  'ACCREDITED_INVESTOR',
  'JURISDICTION_ALLOWED',
  'AML_CLEARED',
  'SANCTIONS_CLEARED',
  'INSTITUTIONAL',
  'PROFESSIONAL_INVESTOR',
]);
export const ZClaimStatus = z.enum(['VALID', 'EXPIRED', 'REVOKED', 'PENDING']);
export const ZAssetType = z.enum([
  'STABLE_ASSET',
  'PHYSICAL_METAL',
  'REAL_ESTATE',
  'CREDIT',
  'CARBON',
  'EQUITY',
  'TREASURY_BILL',
  'OTHER',
]);
export const ZAssetSubtype = z.enum([
  'GOLD',
  'SILVER',
  'PLATINUM',
  'PALLADIUM',
  'TREASURY_BILL',
  'MONEY_MARKET',
  'REIT',
  'COMMERCIAL',
  'RESIDENTIAL',
  'NONE',
]);
export const ZCustodyModel = z.enum([
  'ALLOCATED_PHYSICAL',
  'ISSUER_CUSTODY',
  'SEGREGATED_CUSTODY',
  'OMNIBUS_CUSTODY',
  'ON_CHAIN_NATIVE',
]);
export const ZRedemptionType = z.enum(['PHYSICAL_DELIVERY', 'CASH', 'IN_KIND', 'NONE']);
export const ZSettlementType = z.enum(['INTERNAL', 'EVM', 'STELLAR', 'ACH', 'WIRE', 'SWIFT']);
export const ZPriceType = z.enum(['SPOT', 'NAV', 'INDICATIVE', 'MARK_TO_MODEL', 'MID', 'BID', 'ASK']);
export const ZActionType = z.enum([
  'MINT',
  'REDEEM',
  'TRANSFER',
  'BUY',
  'SELL',
  'STAKE',
  'UNSTAKE',
  'CUSTODY_MOVE',
  'BORROW',
]);

export const ZCollateralClass = z.enum(['GREEN', 'YELLOW', 'RED']);
export const ZRouteType = z.enum(['DIRECT', 'INTERMEDIATED', 'ATOMIC_SWAP', 'CCTP']);
export const ZSettlementStatus = z.enum([
  'PENDING',
  'AUTHORIZED',
  'EXECUTING',
  'SETTLED',
  'FAILED',
  'CANCELLED',
]);
export const ZExposureClass = z.enum(['UNRESTRICTED', 'RESTRICTED', 'ACCREDITED', 'INSTITUTIONAL']);
export const ZSeverityLevel = z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// ─── Decimal-as-string at the API boundary ──────────────────────────
const decimalString = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'must be a numeric string');
export const ZDecimalString = decimalString;

/**
 * USD amount as a fixed-point decimal string at the API boundary, with
 * a brand attached so any value parsed through this schema satisfies
 * `UsdDecimalString` from `./money` and is accepted by settlement-layer
 * consumers (`createInstruction`, `externallySettleInstruction`, drift
 * rows). Plain `string` values cannot be passed to those consumers
 * without going through `centsToDecimalString` or `usdDecimalString`.
 */
export const ZUsdDecimalString: z.ZodType<UsdDecimalString, z.ZodTypeDef, unknown> = z
  .string()
  .regex(/^-?\d+(\.\d+)?$/, 'must be a numeric decimal string')
  .transform((s) => usdDecimalString(s));

// ─── Asset registry ────────────────────────────────────────────────

export const ZAssetCreate = z.object({
  symbol: z.string().min(1).max(32),
  displayName: z.string().min(1).max(200),
  assetType: ZAssetType,
  assetSubtype: ZAssetSubtype.optional(),
  custodyModel: ZCustodyModel,
  redemptionType: ZRedemptionType.optional(),
  settlementType: ZSettlementType,
  chain: z.string().max(32).optional(),
  chainId: z.number().int().positive().optional(),
  contractAddress: z.string().max(80).optional(),
  decimals: z.number().int().min(0).max(36).optional(),
  issuer: z.string().max(200).optional(),
  basePolicyJson: z.record(z.any()).optional(),
  exposureClass: ZExposureClass.optional(),
  status: ZRecordStatus.optional(),
  collateralClass: ZCollateralClass.optional(),
  collateralClassificationRationale: z.string().max(2000).optional(),
  metadataJson: z.record(z.any()).optional(),
});
export type AssetCreateInput = z.infer<typeof ZAssetCreate>;

export const ZAssetUpdate = ZAssetCreate.partial();
export type AssetUpdateInput = z.infer<typeof ZAssetUpdate>;

export const ZAssetListQuery = z.object({
  type: ZAssetType.optional(),
  status: ZRecordStatus.optional(),
  symbol: z.string().optional(),
});

// ─── Identity ──────────────────────────────────────────────────────

export const ZWalletLink = z.object({
  userId: z.string().min(3).max(40),
  chain: z.string().min(1).max(32),
  chainId: z.number().int().positive().optional(),
  address: z.string().min(3).max(80),
  label: z.string().max(120).optional(),
  isPrimary: z.boolean().optional(),
  metadataJson: z.record(z.any()).optional(),
});

// ─── Market data ───────────────────────────────────────────────────

export const ZMarketIngest = z.object({
  assetId: z.string().min(3).max(40),
  priceType: ZPriceType,
  source: z.string().min(1).max(100),
  quoteCurrency: z.string().max(16).optional(),
  price: ZDecimalString,
  observedAt: z.string().datetime(),
  payloadJson: z.record(z.any()).optional(),
});

export const ZMarketHistoryQuery = z.object({
  priceType: ZPriceType.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

// ─── Policy ────────────────────────────────────────────────────────

export const ZPolicyEvaluate = z.object({
  userId: z.string().min(3).max(40),
  assetId: z.string().min(3).max(40),
  actionType: ZActionType,
  amount: ZDecimalString.optional(),
  jurisdiction: z.string().max(8).optional(),
  productContext: z.string().max(100).optional(),
  correlationId: z.string().max(80).optional(),
});
export type PolicyEvaluateInput = z.infer<typeof ZPolicyEvaluate>;

// ─── Operator console ──────────────────────────────────────────────

export const ZEligibilityInspect = z.object({
  userId: z.string().min(3).max(40),
  assetId: z.string().min(3).max(40),
  actionType: ZActionType,
  amount: ZDecimalString.optional(),
  jurisdiction: z.string().max(8).optional(),
});

// ─── Phase 2 — Settlement / Portfolio / Notifications ──────────────

export const ZSettlementCreate = z.object({
  userId: z.string().min(3).max(40),
  assetId: z.string().min(3).max(40),
  actionType: ZActionType,
  routeType: ZRouteType.optional(),
  settlementType: ZSettlementType,
  amount: ZUsdDecimalString,
  quoteCurrency: z.string().max(16).optional(),
  counterpartyId: z.string().max(40).optional(),
  adapterId: z.string().max(40).optional(),
  externalRef: z.string().max(200).optional(),
  walletId: z.string().max(40).optional(),
  idempotencyKey: z.string().min(8).max(200),
  payloadJson: z.record(z.any()).optional(),
  correlationId: z.string().max(80).optional(),
});
export type SettlementCreateInput = z.infer<typeof ZSettlementCreate>;

export const ZSettlementListQuery = z.object({
  userId: z.string().optional(),
  assetId: z.string().optional(),
  status: ZSettlementStatus.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const ZAdapterCreate = z.object({
  name: z.string().min(1).max(100),
  kind: z.string().min(1).max(60),
  configJson: z.record(z.any()),
  isActive: z.boolean().optional(),
});
export type AdapterCreateInput = z.infer<typeof ZAdapterCreate>;

export const ZSnapshotCreate = z.object({
  asOf: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export const ZPortfolioPositionsQuery = z.object({
  userId: z.string().optional(),
  assetId: z.string().optional(),
  status: ZRecordStatus.optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const ZLedgerQuery = z.object({
  txGroupId: z.string().uuid().optional(),
  externalId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const ZNotificationsListQuery = z.object({
  userId: z.string().optional(),
  topic: z.string().optional(),
  unreadOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const ZAuditQuery = z.object({
  aggregateType: z.string().optional(),
  aggregateId: z.string().optional(),
  eventType: z.string().optional(),
  userId: z.string().optional(),
  assetId: z.string().optional(),
  instructionId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  cursor: z.string().optional(),
});
