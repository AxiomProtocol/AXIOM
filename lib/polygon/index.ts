/**
 * Axiom Protocol — Polygon Integration Library
 *
 * Entry point for all Polygon PoS integrations.
 *
 * Exports:
 *   chainHealth   — RPC connectivity and contract deployment status
 *   proofs        — Merkle tree builder and proof verifier for campaigns
 *   identity      — Polygon identity adapter (credential bridge)
 */

export * from './chainHealth';
export * from './proofs/buildMerkleTree';
export * from './proofs/verifyProof';
