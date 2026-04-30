import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { arbitrum, mainnet } from '@reown/appkit/networks';
import { createConfig, http } from 'wagmi';
import { mock } from 'wagmi/connectors';

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export { projectId };

// SIWE verifier (pages/api/auth/siwe/verify.ts) hard-gates chain id 42161.
// Arbitrum One remains the only supported sign-in network. Mainnet is included
// here ONLY so the in-app PAXG acquisition widget can switchChain to mainnet
// for the Uniswap V3 swap + L1->L2 bridge round-trip; the user is always
// switched back to Arbitrum before any further AXIOM action. Cold-connecting
// on mainnet will still fail SIWE — that is intentional.
export const networks = [arbitrum, mainnet];

/**
 * Task #249 — opt-in mock-wagmi mode for end-to-end browser tests.
 *
 * When `NEXT_PUBLIC_E2E_WAGMI=1` is set in a non-production build, we bypass
 * Reown / WalletConnect entirely and ship a single deterministic `mock`
 * connector. Playwright can then drive the AXUSD payment modal without a real
 * wallet, a WalletConnect project id, or a live Arbitrum RPC.
 *
 * The flag is hard-gated to non-production so a misconfigured deploy can't
 * accidentally swap real wallets for a stub.
 */
const E2E_WAGMI =
  process.env.NEXT_PUBLIC_E2E_WAGMI === '1' &&
  process.env.NODE_ENV !== 'production';

export const isE2EWagmi = E2E_WAGMI;

// Stable buyer address used by the e2e payment-modal test. Exported so the
// spec and the runtime config agree on the same checksummed value.
export const E2E_WAGMI_MOCK_ACCOUNT =
  '0xE2E1234567890123456789012345678901234567' as `0x${string}`;

let _wagmiAdapter: WagmiAdapter | null = null;
let _wagmiConfig: ReturnType<typeof createConfig> | WagmiAdapter['wagmiConfig'];

if (E2E_WAGMI) {
  // Critical: do not enable `ssr: true` here. The mock connector combined
  // with wagmi's SSR cookie-storage hydration causes a silent suspense
  // that leaves the React tree unmounted on the client (the page renders
  // as a blank `<div id="__next" />`). For e2e we don't need cross-render
  // state; the connector auto-connects on mount via `defaultConnected`.
  _wagmiConfig = createConfig({
    chains: [arbitrum],
    transports: {
      [arbitrum.id]: http('https://arb1.arbitrum.io/rpc'),
    },
    connectors: [
      mock({
        accounts: [E2E_WAGMI_MOCK_ACCOUNT],
        features: { defaultConnected: true },
      }),
    ],
  });
} else {
  _wagmiAdapter = new WagmiAdapter({
    projectId,
    networks,
    transports: {
      [arbitrum.id]: alchemyKey
        ? http(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`)
        : http(),
      [mainnet.id]: alchemyKey
        ? http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)
        : http(),
    },
    ssr: true,
  });
  _wagmiConfig = _wagmiAdapter.wagmiConfig;
}

export const wagmiAdapter = _wagmiAdapter;
export const wagmiConfig = _wagmiConfig;
