/**
 * Number of hours after which a pruning run is considered overdue.
 * Used by both the admin dashboard UI and the /api/admin/prune-health endpoint.
 */
export const PRUNE_STALE_HOURS = 48;

/**
 * Number of hours between consecutive prune runs above which a gap is
 * highlighted as abnormal in the Data Hygiene history table.
 * Set to 25h so a single missed daily run is immediately visible.
 */
export const PRUNE_GAP_WARN_HOURS = 25;

const DEFAULT_ADMIN_WALLETS = [
  '0xa6ed10e752d5facd989ee9ced113b3a064b47493',
];

export function getAdminWallets(): string[] {
  const envWallets = process.env.ADMIN_WALLETS;
  if (envWallets) {
    return envWallets.split(',').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
  }
  return DEFAULT_ADMIN_WALLETS.map(w => w.toLowerCase());
}

export function isAdminWallet(wallet: string | undefined | null): boolean {
  if (!wallet) return false;
  return getAdminWallets().includes(wallet.toLowerCase());
}
