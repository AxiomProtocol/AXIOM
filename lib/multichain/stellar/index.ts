/**
 * Axiom Protocol — Stellar Module
 *
 * Barrel export for all Stellar integration types, adapter, and services.
 *
 * Status: STUB — not yet live. Stellar SDK not installed.
 * Anchor partner not yet selected.
 *
 * Import from this barrel — do not import directly from sub-files.
 */

export * from './types';
export { StellarPaymentAdapter, getStellarPaymentAdapter } from './StellarPaymentAdapter';
export { StellarReadinessService } from './StellarReadinessService';
export type { StellarReadinessReport } from './StellarReadinessService';
