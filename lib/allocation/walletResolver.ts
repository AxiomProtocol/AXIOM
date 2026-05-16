/**
 * walletResolver — resolves the on-chain destination address for an allocation
 * execution row based on scope (driver vs treasury).
 *
 * Scope routing rules:
 *   treasury → TREASURY_DESTINATION env var (fallback: hardcoded deployer EOA)
 *   driver   → driver_wallets table row where driver_key = documentId
 *              → fallback: driver_wallets where driver_key = 'default'
 *              → fallback: DRIVER_DEFAULT_WALLET env var
 *              → if nothing found: returns null (execution is blocked)
 *
 * The source string tells the caller (and the audit log) exactly which
 * lookup path produced the address so operators can verify routing.
 */

import { Pool } from 'pg';

let _pool: Pool | null = null;
const pool = () => (_pool ??= new Pool({ connectionString: process.env.DATABASE_URL }));

/** Canonical treasury destination — the protocol deployer EOA. */
export const TREASURY_DESTINATION =
  process.env.TREASURY_DESTINATION_ADDRESS ??
  '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';

export type WalletSource =
  | 'treasury_constant'
  | 'driver_wallets_document'
  | 'driver_wallets_default'
  | 'env_driver_default'
  | 'unresolved';

export interface ResolvedWallet {
  address: string | null;
  source: WalletSource;
  label: string | null;
  /** Human-readable description for the operator modal / audit note */
  description: string;
}

/**
 * Resolve the destination wallet for a given scope + document.
 * Never throws — returns { address: null, source: 'unresolved' } on DB error.
 */
export async function resolveDestinationWallet(
  scope: 'driver' | 'treasury',
  documentId: string,
): Promise<ResolvedWallet> {
  if (scope === 'treasury') {
    return {
      address: TREASURY_DESTINATION,
      source:  'treasury_constant',
      label:   'Protocol Treasury',
      description: `Treasury wallet (deployer EOA) — ${TREASURY_DESTINATION}`,
    };
  }

  // scope === 'driver'
  try {
    // 1. Per-document driver wallet (document-scoped key)
    const docRow = await pool().query(
      `SELECT wallet_address, label FROM driver_wallets WHERE driver_key = $1 LIMIT 1`,
      [documentId],
    );
    if (docRow.rows[0]) {
      const { wallet_address, label } = docRow.rows[0];
      return {
        address: wallet_address,
        source:  'driver_wallets_document',
        label:   label ?? 'Driver wallet (document-scoped)',
        description: `Driver wallet (document-scoped) — ${wallet_address}`,
      };
    }

    // 2. Default driver wallet
    const defRow = await pool().query(
      `SELECT wallet_address, label FROM driver_wallets WHERE driver_key = 'default' LIMIT 1`,
    );
    if (defRow.rows[0]) {
      const { wallet_address, label } = defRow.rows[0];
      return {
        address: wallet_address,
        source:  'driver_wallets_default',
        label:   label ?? 'Driver wallet (default)',
        description: `Driver wallet (default) — ${wallet_address}`,
      };
    }
  } catch {
    // Fall through to env var
  }

  // 3. Environment variable fallback
  const envAddr = process.env.DRIVER_DEFAULT_WALLET?.trim();
  if (envAddr && /^0x[0-9a-fA-F]{40}$/.test(envAddr)) {
    return {
      address: envAddr,
      source:  'env_driver_default',
      label:   'Driver wallet (env)',
      description: `Driver wallet (DRIVER_DEFAULT_WALLET env) — ${envAddr}`,
    };
  }

  // 4. Nothing found — block execution
  return {
    address: null,
    source:  'unresolved',
    label:   null,
    description:
      'No driver wallet configured — add a row to driver_wallets (driver_key=\'default\') or set DRIVER_DEFAULT_WALLET env var',
  };
}
