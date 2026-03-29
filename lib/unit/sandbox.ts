/**
 * Unit Finance sandbox client — REMOVED.
 * The Unit Finance banking integration was removed in favour of the Bridge Service.
 * This stub exists only to prevent stale Vercel build-cache references from
 * causing "Attempted import error" failures.  All methods throw so that any
 * accidental runtime call is immediately visible.
 */

const removed = () => {
  throw new Error("Unit Finance integration has been removed. Use BridgeService instead.");
};

export const unitSandbox = {
  accounts: { list: removed, get: removed, create: removed },
  customers: { list: removed, get: removed, create: removed },
  payments: { list: removed, get: removed, create: removed },
  transactions: { list: removed, get: removed },
  cards: { list: removed, get: removed },
  counterparties: { list: removed, get: removed, create: removed },
  webhooks: { list: removed, get: removed },
} as const;

export default unitSandbox;
