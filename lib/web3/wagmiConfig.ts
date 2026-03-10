import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrum } from 'wagmi/chains';
import { http } from 'wagmi';

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || process.env.ALCHEMY_API_KEY || '';

const alchemyTransport = alchemyKey
  ? http(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`)
  : http();

export const wagmiConfig = getDefaultConfig({
  appName: 'Axiom Protocol',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'axiom-protocol-placeholder',
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: alchemyTransport,
  },
  ssr: true,
});
