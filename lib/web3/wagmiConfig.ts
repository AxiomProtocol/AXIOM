import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
  metaMaskWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { arbitrum } from 'viem/chains';
import { http } from 'wagmi';

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

if (!alchemyKey) {
  console.warn('NEXT_PUBLIC_ALCHEMY_API_KEY is not set. RPC calls will use default public transport.');
}

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. WalletConnect will not be available.');
}

(coinbaseWallet as any).preference = 'all';

export const wagmiConfig = getDefaultConfig({
  appName: 'Axiom Protocol',
  projectId: walletConnectProjectId || '',
  chains: [arbitrum],
  wallets: [
    {
      groupName: 'Connect',
      wallets: [
        walletConnectWallet,
        metaMaskWallet,
        coinbaseWallet,
        rainbowWallet,
      ],
    },
  ],
  transports: {
    [arbitrum.id]: alchemyKey
      ? http(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`)
      : http(),
  },
  ssr: true,
});
