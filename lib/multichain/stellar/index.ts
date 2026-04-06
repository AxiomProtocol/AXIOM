/**
 * Axiom Protocol — Stellar Module
 *
 * Barrel export for all Stellar integration types, adapter, and services.
 *
 * Status: CONFIGURED — Circle (USDC on Stellar) is the selected anchor.
 * @stellar/stellar-sdk is installed. SEP-0010 + SEP-0024 implemented.
 * Anchor partner: Circle. Feature flag: ENABLE_STELLAR_PAYMENTS_RAIL.
 */

export * from './types';
export { StellarPaymentAdapter, getStellarPaymentAdapter, fetchAnchorToml } from './StellarPaymentAdapter';
export { getActiveAnchorEntry, getActiveAnchorId, getActiveAnchorHomeDomain } from './anchorUtils';
export { StellarReadinessService } from './StellarReadinessService';
export type { StellarReadinessReport } from './StellarReadinessService';
