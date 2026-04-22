/**
 * ClientWalletProviders
 *
 * Contains ALL wallet/Web3 provider imports in one place, loaded exclusively
 * on the client side via next/dynamic ssr:false in _app.js.
 *
 * This prevents @reown/appkit-wallet and @walletconnect/logger from ever
 * being loaded in Vercel serverless functions, which causes ESM named-export
 * crashes (FUNCTION_INVOCATION_FAILED) on all pages with getServerSideProps.
 */

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiAdapter } from '../../lib/web3/wagmiConfig';
import { WalletProvider } from './WalletContext';
import AppKitInitializer from './AppKitInitializer';
import { CircleWalletProvider } from './CircleWalletProvider';

const queryClient = new QueryClient();

export default function ClientWalletProviders({ children }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AppKitInitializer />
        <WalletProvider>
          <CircleWalletProvider>
            {children}
          </CircleWalletProvider>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
