/**
 * Axiom Protocol — Multi-Chain Layer
 * Barrel export for all multi-chain expansion services and registry.
 *
 * ─── Live (Arbitrum) ─────────────────────────────────────────────────────────
 * chainRegistry, featureFlags, MultiChainRegistryService
 *
 * ─── Planned Expansion ───────────────────────────────────────────────────────
 * CorridorRoutingService, SettlementRailService, InstitutionalBridgeService,
 * SovereignChainService, CrossChainIdentityService, IntegrationReadinessModel
 *
 * ─── Stellar (Priority 1 — Stub + Readiness) ─────────────────────────────────
 * lib/multichain/stellar/ — types, StellarPaymentAdapter (stub), StellarReadinessService
 *
 * ─── Adapter Interfaces ──────────────────────────────────────────────────────
 * lib/multichain/adapters/ — typed contracts for all expansion rail adapters
 *
 * Import adapters from 'lib/multichain/adapters' directly for interface types.
 * Import Stellar module from 'lib/multichain/stellar' directly for Stellar types.
 */

export * from './chainRegistry';
export * from './featureFlags';
export * from './MultiChainRegistryService';
export * from './CorridorRoutingService';
export * from './SettlementRailService';
export * from './InstitutionalBridgeService';
export * from './SovereignChainService';
export * from './CrossChainIdentityService';
export * from './IntegrationReadinessModel';
