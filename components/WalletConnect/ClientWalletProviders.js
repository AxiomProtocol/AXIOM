/**
 * ClientWalletProviders
 *
 * Contains ALL wallet/Web3 provider imports in one place, loaded exclusively
 * on the client side via next/dynamic ssr:false in _app.js.
 *
 * This prevents @reown/appkit-wallet and @walletconnect/logger from ever
 * being loaded in Vercel serverless functions, which causes ESM named-export
 * crashes (FUNCTION_INVOCATION_FAILED) on all pages with getServerSideProps.
 *
 * In `NEXT_PUBLIC_E2E_WAGMI=1` mode (task #249), `wagmiConfig` is a stub
 * config wired to a single mock connector and we skip AppKit init so
 * Playwright tests don't need a real WalletConnect project id.
 */

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { WagmiProvider, useConnect, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig, isE2EWagmi } from '../../lib/web3/wagmiConfig';
import { WalletProvider } from './WalletContext';
import { CircleWalletProvider } from './CircleWalletProvider';

// AppKitInitializer pulls in @reown/appkit + lit, which need a real
// WagmiAdapter. In E2E mode (`NEXT_PUBLIC_E2E_WAGMI=1`) we use a raw
// wagmi `mock` config and `wagmiAdapter` is null — importing AppKit
// against a null adapter blows up at module init and leaves the React
// tree unmounted with no logged error. Loading it dynamically and only
// outside E2E mode keeps that code path completely off the test bundle.
const AppKitInitializer = dynamic(() => import('./AppKitInitializer'), {
  ssr: false,
  loading: () => null,
});

const queryClient = new QueryClient();

// In E2E mode, the mock connector's `defaultConnected` flag only marks the
// connector as "ready"; wagmi still needs an explicit `connect()` call before
// `useAccount().address` is populated. This invisible component fires that
// connect once on mount so playwright tests don't have to drive a wallet UI.
function E2EAutoConnect() {
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();
  useEffect(() => {
    if (isConnected) return;
    const mockConnector = connectors.find((c) => c.id === 'mock');
    if (mockConnector) connect({ connector: mockConnector });
  }, [connect, connectors, isConnected]);
  return null;
}

export default function ClientWalletProviders({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {!isE2EWagmi && <AppKitInitializer />}
        {isE2EWagmi && <E2EAutoConnect />}
        <WalletProvider>
          <CircleWalletProvider>
            {children}
          </CircleWalletProvider>
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
