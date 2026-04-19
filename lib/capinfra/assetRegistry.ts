/**
 * Capital Infrastructure — Asset Registry service.
 *
 * Manages the canonical asset list (AXAU, AXUSD-TREASURY, PAXG, future
 * products). Every mutation emits a `cap_audit_events` row.
 */

import { db } from '../../server/db';
import { capAssets, type CapAsset, type NewCapAsset } from '../../shared/capInfraSchema';
import { and, eq, ilike, SQL } from 'drizzle-orm';
import {
  ZAssetCreate,
  ZAssetUpdate,
  ZAssetType,
  ZRecordStatus,
  type AssetCreateInput,
  type AssetUpdateInput,
} from './types';
import type { z } from 'zod';

type AssetTypeValue = z.infer<typeof ZAssetType>;
type RecordStatusValue = z.infer<typeof ZRecordStatus>;
type JsonObject = Record<string, unknown>;
import { generateId } from './ids';
import { ConflictError, NotFoundError, ValidationError } from './errors';
import { emitAuditEventStrict } from './audit';

export interface AssetListFilters {
  type?: AssetTypeValue;
  status?: RecordStatusValue;
  symbol?: string;
}

export async function listAssets(filters: AssetListFilters = {}): Promise<CapAsset[]> {
  const conditions: SQL[] = [];
  if (filters.type) conditions.push(eq(capAssets.assetType, filters.type));
  if (filters.status) conditions.push(eq(capAssets.status, filters.status));
  if (filters.symbol) conditions.push(ilike(capAssets.symbol, `%${filters.symbol}%`));
  const baseQuery = db.select().from(capAssets).orderBy(capAssets.symbol);
  return conditions.length > 0 ? await baseQuery.where(and(...conditions)) : await baseQuery;
}

export async function getAssetById(id: string): Promise<CapAsset | null> {
  const rows = await db.select().from(capAssets).where(eq(capAssets.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getAssetBySymbol(symbol: string): Promise<CapAsset | null> {
  const rows = await db.select().from(capAssets).where(eq(capAssets.symbol, symbol)).limit(1);
  return rows[0] ?? null;
}

export async function createAsset(
  input: AssetCreateInput,
  actor: string,
  correlationId?: string,
): Promise<CapAsset> {
  const parsed = ZAssetCreate.parse(input);
  const existing = await getAssetBySymbol(parsed.symbol);
  if (existing) throw new ConflictError(`asset with symbol ${parsed.symbol} already exists`);

  const id = generateId('ast');
  const row: NewCapAsset = {
    id,
    symbol: parsed.symbol,
    displayName: parsed.displayName,
    assetType: parsed.assetType,
    assetSubtype: parsed.assetSubtype ?? 'NONE',
    custodyModel: parsed.custodyModel,
    redemptionType: parsed.redemptionType ?? 'NONE',
    settlementType: parsed.settlementType,
    chain: parsed.chain ?? null,
    chainId: parsed.chainId ?? null,
    contractAddress: parsed.contractAddress ?? null,
    decimals: parsed.decimals ?? 18,
    issuer: parsed.issuer ?? null,
    basePolicyJson: (parsed.basePolicyJson ?? null) as JsonObject | null,
    exposureClass: parsed.exposureClass ?? 'RESTRICTED',
    status: parsed.status ?? 'ACTIVE',
    metadataJson: (parsed.metadataJson ?? null) as JsonObject | null,
  };
  try {
    return await db.transaction(async (tx) => {
      const [created] = await tx.insert(capAssets).values(row).returning();
      await emitAuditEventStrict(
        {
          eventType: 'asset.created',
          aggregateType: 'asset',
          aggregateId: id,
          assetId: id,
          actor,
          correlationId,
          payloadJson: { symbol: parsed.symbol, assetType: parsed.assetType },
        },
        tx,
      );
      return created;
    });
  } catch (err) {
    // Map unique-constraint races to 409 Conflict.
    const pgCode =
      err && typeof err === 'object' && 'code' in err
        ? (err as { code?: unknown }).code
        : undefined;
    if (pgCode === '23505') {
      throw new ConflictError(`asset with symbol ${parsed.symbol} already exists`);
    }
    throw err;
  }
}

export async function updateAsset(
  id: string,
  input: AssetUpdateInput,
  actor: string,
  correlationId?: string,
): Promise<CapAsset> {
  const parsed = ZAssetUpdate.parse(input);
  const existing = await getAssetById(id);
  if (!existing) throw new NotFoundError(`asset ${id} not found`);

  const patch: Partial<NewCapAsset> = { updatedAt: new Date() };
  if (parsed.symbol !== undefined && parsed.symbol !== existing.symbol) {
    const dupe = await getAssetBySymbol(parsed.symbol);
    if (dupe && dupe.id !== id) throw new ConflictError(`asset with symbol ${parsed.symbol} already exists`);
    patch.symbol = parsed.symbol;
  }
  if (parsed.displayName !== undefined) patch.displayName = parsed.displayName;
  if (parsed.assetType !== undefined) patch.assetType = parsed.assetType;
  if (parsed.assetSubtype !== undefined) patch.assetSubtype = parsed.assetSubtype;
  if (parsed.custodyModel !== undefined) patch.custodyModel = parsed.custodyModel;
  if (parsed.redemptionType !== undefined) patch.redemptionType = parsed.redemptionType;
  if (parsed.settlementType !== undefined) patch.settlementType = parsed.settlementType;
  if (parsed.chain !== undefined) patch.chain = parsed.chain;
  if (parsed.chainId !== undefined) patch.chainId = parsed.chainId;
  if (parsed.contractAddress !== undefined) patch.contractAddress = parsed.contractAddress;
  if (parsed.decimals !== undefined) patch.decimals = parsed.decimals;
  if (parsed.issuer !== undefined) patch.issuer = parsed.issuer;
  if (parsed.basePolicyJson !== undefined) patch.basePolicyJson = parsed.basePolicyJson as JsonObject;
  if (parsed.exposureClass !== undefined) patch.exposureClass = parsed.exposureClass;
  if (parsed.status !== undefined) patch.status = parsed.status;
  if (parsed.metadataJson !== undefined) patch.metadataJson = parsed.metadataJson as JsonObject;

  return db.transaction(async (tx) => {
    const [updated] = await tx.update(capAssets).set(patch).where(eq(capAssets.id, id)).returning();
    await emitAuditEventStrict(
      {
        eventType: 'asset.updated',
        aggregateType: 'asset',
        aggregateId: id,
        assetId: id,
        actor,
        correlationId,
        payloadJson: { changedKeys: Object.keys(patch).filter((k) => k !== 'updatedAt') },
      },
      tx,
    );
    return updated;
  });
}

export async function archiveAsset(id: string, actor: string, correlationId?: string): Promise<CapAsset> {
  const existing = await getAssetById(id);
  if (!existing) throw new NotFoundError(`asset ${id} not found`);
  if (existing.status === 'ARCHIVED') throw new ValidationError(`asset ${id} already archived`);
  return db.transaction(async (tx) => {
    const [updated] = await tx
      .update(capAssets)
      .set({ status: 'ARCHIVED', updatedAt: new Date() })
      .where(eq(capAssets.id, id))
      .returning();
    await emitAuditEventStrict(
      {
        eventType: 'asset.archived',
        aggregateType: 'asset',
        aggregateId: id,
        assetId: id,
        actor,
        correlationId,
      },
      tx,
    );
    return updated;
  });
}
