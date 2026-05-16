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
  status:            'configured' as 'bootstrap' | 'live' | 'configured',
  liveYield:          false,
  publicLaunchReady:  false,
  borrowEnabled:      false,

  // ── Activation checklist (Axiom-native replacement path) ─────────────────
  launchConditions: [
    {
      id:     'euler-withdrawal-confirmed',
      label:  'Euler Earn integration withdrawn — legacy strategy archived',
      done:   true,
      detail: 'Task #510: Euler V2 integration decommissioned. earnAXUSD vault retains on-chain deployment for reference reads only.',
    },
    {
      id:     'axiom-native-architecture',
      label:  'Axiom-native earn architecture designed and approved',
      done:   false,
      detail: 'Replacement earn infrastructure spec pending governance approval.',
    },
    {
      id:     'axiom-earn-deployment',
      label:  'Axiom-native earn vault deployed and verified on Arbitrum One',
      done:   false,
      detail: 'New vault deployment pending architecture finalization.',
    },
    {
      id:     'deposit-activation',
      label:  'Deposits opened to credentialed participants',
      done:   false,
      detail: 'Set NEXT_PUBLIC_ENABLE_EARN_AXUSD_DEPOSITS=true only after all above conditions are met.',
    },
  ],

  // ── Current limitations ───────────────────────────────────────────────────
  limitations: [
    'Euler Earn integration has been withdrawn — no active strategy yield',
    'Deposits are disabled pending Axiom-native earn architecture deployment',
    'Borrow-side functionality is not available',
    'The earnAXUSD vault remains deployed on-chain for reference reads only',
    'Axiom-native replacement infrastructure is in formation',
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
