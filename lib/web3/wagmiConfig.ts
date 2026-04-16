import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { arbitrum, base } from '@reown/appkit/networks';
import { http } from 'wagmi';

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '';

export { projectId };

export const networks = [arbitrum, base];

export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks,
  transports: {
    [arbitrum.id]: alchemyKey
      ? http(`https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`)
      : http(),
    [base.id]: http(),
  },
  ssr: true,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;
