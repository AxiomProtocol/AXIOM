/**
 * lib/vaults/earnAXUSD.ts
 *
 * Canonical configuration and metadata for the Axiom Earn AXUSD vault
 * (earnAXUSD, ERC-4626 Euler Earn wrapper, Arbitrum One).
 *
 * STATUS: Bootstrap / Pre-Live
 * This vault is deployed and perspective-recognized, but it is NOT
 * operating as a fully live public yield product. Do not present it
 * as live yield infrastructure in any user-facing copy.
 */

// ── Chain ────────────────────────────────────────────────────────────────────
export const ARBITRUM_ONE_CHAIN_ID = 42161;

// ── Vault identity ────────────────────────────────────────────────────────────
export const EARN_AXUSD_VAULT = {
  name:    'Axiom Earn AXUSD',
  symbol:  'earnAXUSD',
  address: '0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B' as `0x${string}`,
  chainId: ARBITRUM_ONE_CHAIN_ID,
  standard: 'ERC-4626 (Euler Earn wrapper)',

  /** Underlying ERC-3643 stablecoin */
  asset: {
    name:    'Axiom USD',
    symbol:  'AXUSD',
    address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7' as `0x${string}`,
  },

  /** Factory that produced this vault (Euler Earn) */
  factory: '0xB9B5d62B9fE9E1B505466e75817aB178A1D2ec9d' as `0x${string}`,

  /** Euler V2 UI deep link */
  eulerLink: 'https://app.euler.finance/vault/0x4359184cb90cDbaa1e1923d8A38Ff96Bb58cB45B?network=arbitrumone',

  // ── Deployment status ─────────────────────────────────────────────────────
  /**
   * "bootstrap" = deployed and recognized, but NOT live for public yield.
   * Flip to "live" only after all four launch conditions are met and
   * ENABLE_EARN_AXUSD_DEPOSITS=true is set in the environment.
   */
  status:            'bootstrap' as 'bootstrap' | 'live',
  liveYield:          false,
  publicLaunchReady:  false,
  borrowEnabled:      false,

  // ── Pre-launch checklist (update once each condition is met) ──────────────
  launchConditions: [
    {
      id:     'oracle-adapters',
      label:  'Oracle adapters registered by Euler governance',
      done:   false,
      detail: 'Both AXUSD/USD and USDC/USD adapters must be added to oracleAdapterRegistry (0x3942…cbf).',
    },
    {
      id:     'canonical-evk',
      label:  'Canonical EVK vault deployed and perspective-verified',
      done:   false,
      detail: 'Task #92: deploy-axusd-evk-vault-canonical.js with Ungoverned-0x preconditions satisfied.',
    },
    {
      id:     'queue-switch',
      label:  'Earn vault supply queue switched to the canonical EVK strategy',
      done:   false,
      detail: 'switch-axusd-earn-strategy.js — replaces legacy eAXUSD-6 strategy with canonical vault.',
    },
    {
      id:     'governance-transfer',
      label:  'Ownership and curator controls transferred to the AXIOM Risk Council Safe',
      done:   false,
      detail: 'euler-axusd-risk-council-safe.md runbook: transferOwnership + acceptOwnership + setCurator.',
    },
  ],

  // ── Current limitations ───────────────────────────────────────────────────
  limitations: [
    'No active yield is being generated',
    'Borrow-side functionality is not live',
    'Strategy verification is still pending',
    'Oracle adapter registration with Euler governance is still outstanding',
    'Operational ownership transfer to the AXIOM Risk Council Safe is still pending',
  ],
} as const;

// ── Minimal ERC-4626 ABI (read-only) ─────────────────────────────────────────
export const ERC4626_ABI = [
  // ERC-20 surface (shares)
  { name: 'name',        type: 'function', stateMutability: 'view', inputs: [],                                      outputs: [{ type: 'string'  }] },
  { name: 'symbol',      type: 'function', stateMutability: 'view', inputs: [],                                      outputs: [{ type: 'string'  }] },
  { name: 'decimals',    type: 'function', stateMutability: 'view', inputs: [],                                      outputs: [{ type: 'uint8'   }] },
  { name: 'totalSupply', type: 'function', stateMutability: 'view', inputs: [],                                      outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf',   type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },

  // ERC-4626 surface
  { name: 'asset',           type: 'function', stateMutability: 'view', inputs: [],                                   outputs: [{ type: 'address' }] },
  { name: 'totalAssets',     type: 'function', stateMutability: 'view', inputs: [],                                   outputs: [{ type: 'uint256' }] },
  { name: 'convertToAssets', type: 'function', stateMutability: 'view', inputs: [{ name: 'shares', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'convertToShares', type: 'function', stateMutability: 'view', inputs: [{ name: 'assets', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { name: 'maxDeposit',      type: 'function', stateMutability: 'view', inputs: [{ name: 'receiver', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'previewDeposit',  type: 'function', stateMutability: 'view', inputs: [{ name: 'assets', type: 'uint256' }],   outputs: [{ type: 'uint256' }] },

  // Euler Earn extensions (read-only governance roles)
  { name: 'curator',     type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { name: 'owner',       type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
] as const;

// ── Deposit feature flag ──────────────────────────────────────────────────────
/**
 * Deposits are off by default. Set NEXT_PUBLIC_ENABLE_EARN_AXUSD_DEPOSITS=true
 * in the environment to enable the deposit UI for internal testing only.
 * Never enable in production until all launchConditions are met.
 */
export const EARN_AXUSD_DEPOSITS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_EARN_AXUSD_DEPOSITS === 'true';

// ── Formatting helpers ────────────────────────────────────────────────────────
/** Format a raw uint256 as a human-readable token amount (18 decimals). */
export function formatUnits18(raw: bigint | undefined, decimals = 4): string {
  if (raw === undefined) return '—';
  if (raw === 0n) return '0';
  const whole = raw / BigInt(10 ** 18);
  const frac  = raw % BigInt(10 ** 18);
  if (frac === 0n) return whole.toLocaleString();
  const fracStr = frac.toString().padStart(18, '0').slice(0, decimals);
  return `${whole.toLocaleString()}.${fracStr}`;
}

/** Shorten an address to the standard 0x1234…abcd form. */
export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
