import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { arbitrum } from 'wagmi/chains';

export const wagmiConfig = createConfig({
  chains: [arbitrum],
  transports: {
    [arbitrum.id]: http(),
  },
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : cookieStorage,
  }),
  ssr: true,
});

export { arbitrum };
