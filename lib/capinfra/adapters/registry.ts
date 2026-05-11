/**
 * Capital Infrastructure — Settlement Adapter Registry.
 *
 * The registry is the ONLY module that may import adapter
 * implementations. `lib/capinfra/settlement.ts` imports `getAdapter`
 * from here and never reaches into adapter internals — this enforces
 * the §0.1 isolation rule (settlement core knows nothing about EVM
 * vs Stellar vs INTERNAL beyond the dispatcher contract).
 *
 * In-memory registration is keyed on adapter `kind` (matching the
 * `cap_adapters.kind` column). The `cap_adapters` table itself is
 * the durable, operator-managed catalog of which adapters are
 * available to a given environment; the in-memory map is the
 * code-level dispatcher table.
 */

import { db } from '../../../server/db';
import { capAdapters, type CapAdapter, type NewCapAdapter } from '../../../shared/capInfraSchema';
import { eq } from 'drizzle-orm';
import { generateId } from '../ids';
import { ConflictError, NotFoundError } from '../errors';
import { emitAuditEvent } from '../audit';
import { internalAdapter } from './internal';
import { evmAdapter } from './evm';
import { stellarAdapter } from './stellar/index';
import { achAdapter } from './ach/index';
import { avalancheAdapter } from './avalanche/index';
import type { AdapterCreateInput } from '../types';
import type { SettlementAdapter } from './types';

const ADAPTERS_BY_KIND = new Map<string, SettlementAdapter>();

function register(adapter: SettlementAdapter) {
  ADAPTERS_BY_KIND.set(adapter.kind, adapter);
}

// Bootstrap the five canonical adapter kinds. INTERNAL is live; the
// others are stubs or DRY_RUN by default until LIVE env vars are set.
register(internalAdapter);
register(evmAdapter);
register(stellarAdapter);
register(achAdapter);
register(avalancheAdapter);

/**
 * Returns the adapter implementation for a given `kind`. Throws
 * NotFoundError when no adapter is registered for that kind so the
 * caller can map cleanly to a 404/422 response.
 */
export function getAdapter(kind: string): SettlementAdapter {
  const a = ADAPTERS_BY_KIND.get(kind);
  if (!a) throw new NotFoundError(`no settlement adapter registered for kind=${kind}`);
  return a;
}

export function listRegisteredKinds(): string[] {
  return Array.from(ADAPTERS_BY_KIND.keys());
}

// ── Durable adapter catalog (cap_adapters) ─────────────────────────

export async function listAdapters(): Promise<CapAdapter[]> {
  return db.select().from(capAdapters);
}

export async function getAdapterRow(id: string): Promise<CapAdapter | null> {
  const [row] = await db.select().from(capAdapters).where(eq(capAdapters.id, id)).limit(1);
  return row ?? null;
}

export async function getAdapterRowByName(name: string): Promise<CapAdapter | null> {
  const [row] = await db.select().from(capAdapters).where(eq(capAdapters.name, name)).limit(1);
  return row ?? null;
}

export async function createAdapter(
  input: AdapterCreateInput,
  actor: string,
  correlationId?: string,
): Promise<CapAdapter> {
  const existing = await getAdapterRowByName(input.name);
  if (existing) throw new ConflictError(`adapter name ${input.name} already exists`);
  if (!ADAPTERS_BY_KIND.has(input.kind)) {
    throw new NotFoundError(
      `cannot register adapter row for unknown kind=${input.kind}; registered kinds=${listRegisteredKinds().join(',')}`,
    );
  }
  const id = generateId('adp');
  const row: NewCapAdapter = {
    id,
    name: input.name,
    kind: input.kind,
    configJson: input.configJson,
    isActive: input.isActive ?? true,
  };
  const [inserted] = await db.insert(capAdapters).values(row).returning();
  await emitAuditEvent({
    eventType: 'adapter.created',
    aggregateType: 'adapter',
    aggregateId: id,
    actor,
    correlationId,
    payloadJson: { name: input.name, kind: input.kind },
  });
  return inserted;
}
