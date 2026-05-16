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
  // Derive driver identity from settlement extraction payload (driver_code is the
  // canonical identifier; driver_name is the human-readable fallback key).
  // Priority chain for wallet resolution:
  //   driver_wallets[driver_code]  — per-driver, keyed by driver's own code
  //   driver_wallets[driver_name]  — per-driver, keyed by name (legacy)
  //   driver_wallets['default']    — pilot single-driver fallback
  //   DRIVER_DEFAULT_WALLET env    — operator-level env override
  //   null                         — unresolved, blocks onramp execution
  try {
    // 1. Read driver identity from the settlement payload
    const payloadRow = await pool().query(
      `SELECT payload->>'driver_code' AS driver_code,
              payload->>'driver_name' AS driver_name
         FROM pilot_settlement_extractions
        WHERE document_id = $1`,
      [documentId],
    );
    const driverCode = payloadRow.rows[0]?.driver_code?.trim() || null;
    const driverName = payloadRow.rows[0]?.driver_name?.trim() || null;

    // 2. Per-driver wallet (driver_code key)
    if (driverCode) {
      const codeRow = await pool().query(
        `SELECT wallet_address, label FROM driver_wallets WHERE driver_key = $1 LIMIT 1`,
        [driverCode],
      );
      if (codeRow.rows[0]) {
        const { wallet_address, label } = codeRow.rows[0];
        return {
          address: wallet_address,
          source:  'driver_wallets_document',
          label:   label ?? `Driver wallet — code ${driverCode}`,
          description: `Driver wallet (driver_code=${driverCode}) — ${wallet_address}`,
        };
      }
    }

    // 3. Per-driver wallet (driver_name key fallback)
    if (driverName) {
      const nameRow = await pool().query(
        `SELECT wallet_address, label FROM driver_wallets WHERE driver_key = $1 LIMIT 1`,
        [driverName],
      );
      if (nameRow.rows[0]) {
        const { wallet_address, label } = nameRow.rows[0];
        return {
          address: wallet_address,
          source:  'driver_wallets_document',
          label:   label ?? `Driver wallet — ${driverName}`,
          description: `Driver wallet (driver_name=${driverName}) — ${wallet_address}`,
        };
      }
    }

    // 4. Default driver wallet
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
