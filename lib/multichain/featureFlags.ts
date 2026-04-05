/**
 * Axiom Protocol — Multi-Chain Expansion Feature Flags
 *
 * All expansion chain integrations are gated behind explicit environment
 * flags that default to false. No public page or API will indicate that
 * a planned chain is live unless the flag is explicitly set to 'true'.
 *
 * Flag naming convention: ENABLE_<CHAIN>_<ROLE>
 *
 * To activate a flag in a specific environment:
 *   ENABLE_POLYGON_IDENTITY_BRIDGE=true
 *
 * Flags will remain false until:
 *   1. Source files and SDK are reviewed
 *   2. Integration is built and tested
 *   3. Ops team explicitly enables for that environment
 */

export type ExpansionFlag =
  | 'POLYGON_IDENTITY_BRIDGE'
  | 'AVALANCHE_CAPITAL_ENV'
  | 'STELLAR_PAYMENTS_RAIL'
  | 'CANTON_INSTITUTIONAL_BRIDGE'
  | 'COSMOS_SOVEREIGN_PREP';

const FLAG_DEFAULTS: Record<ExpansionFlag, false> = {
  POLYGON_IDENTITY_BRIDGE: false,
  AVALANCHE_CAPITAL_ENV: false,
  STELLAR_PAYMENTS_RAIL: false,
  CANTON_INSTITUTIONAL_BRIDGE: false,
  COSMOS_SOVEREIGN_PREP: false,
};

/**
 * Returns true only if the flag is explicitly set to 'true' in the
 * environment. All flags default to false.
 */
export function isExpansionEnabled(flag: ExpansionFlag): boolean {
  const envKey = `ENABLE_${flag}`;
  return process.env[envKey] === 'true';
}

/**
 * Returns the enabled state of all expansion flags.
 * Useful for admin dashboards and system map APIs.
 */
export function getAllExpansionFlags(): Record<ExpansionFlag, boolean> {
  return Object.keys(FLAG_DEFAULTS).reduce(
    (acc, key) => {
      acc[key as ExpansionFlag] = isExpansionEnabled(key as ExpansionFlag);
      return acc;
    },
    {} as Record<ExpansionFlag, boolean>
  );
}

/**
 * Maps chain slug to its feature flag.
 * Returns null for chains that are always available (Arbitrum, Ethereum).
 */
export const CHAIN_SLUG_TO_FLAG: Record<string, ExpansionFlag | null> = {
  arbitrum: null,
  ethereum: null,
  polygon: 'POLYGON_IDENTITY_BRIDGE',
  avalanche: 'AVALANCHE_CAPITAL_ENV',
  stellar: 'STELLAR_PAYMENTS_RAIL',
  canton: 'CANTON_INSTITUTIONAL_BRIDGE',
  cosmos: 'COSMOS_SOVEREIGN_PREP',
};

export function isChainEnabled(slug: string): boolean {
  const flag = CHAIN_SLUG_TO_FLAG[slug];
  if (flag === null) return true;
  if (flag === undefined) return false;
  return isExpansionEnabled(flag);
}
