/**
 * Axiom Protocol — Polygon Identity Adapter (lib/polygon re-export)
 *
 * Convenience re-export of the concrete PolygonIdentityAdapter from the
 * multichain adapter layer. Keeps the lib/polygon/* import surface consistent
 * for new code that wants to import from the polygon-specific namespace.
 *
 * The canonical implementation lives in:
 *   lib/multichain/adapters/PolygonIdentityAdapter.ts
 *
 * Bridge design: onchainid_mirror
 *   Arbitrum ERC-3643 identity state is the source of truth.
 *   Polygon receives a lightweight allowlist mirror — no ZK proof required.
 */

export {
  PolygonIdentityAdapter,
  polygonIdentityAdapter,
} from '../../multichain/adapters/PolygonIdentityAdapter';

export type {
  PolygonIdentityAdapterInterface,
  PolygonCredential,
  CredentialBridgeState,
  CredentialBridgeResult,
  RevocationSyncResult,
  PolygonIssuerNodeStatus,
  BridgeDesignMode,
} from '../../multichain/adapters/PolygonIdentityAdapterInterface';
