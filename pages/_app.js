import '../styles/globals.css'
import { useEffect, createContext, useContext, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiAdapter, projectId, networks } from '../lib/web3/wagmiConfig'
import { WalletProvider } from '../components/WalletConnect/WalletContext'
import ErrorBoundary from '../components/ErrorBoundary'

const queryClient = new QueryClient()

const OnboardingContext = createContext({ triggerOnboarding: () => {} })
export const useOnboarding = () => useContext(OnboardingContext)

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const appKitInitialized = useRef(false)

  useEffect(() => {
    setMounted(true)

    if (!appKitInitialized.current && projectId) {
      appKitInitialized.current = true
      import('@reown/appkit/react').then(({ createAppKit }) => {
        import('@reown/appkit/networks').then(({ arbitrum }) => {
          createAppKit({
            adapters: [wagmiAdapter],
            projectId,
            networks,
            defaultNetwork: arbitrum,
            metadata: {
              name: 'Axiom Protocol',
              description: 'Sovereign Digital-Physical Economy',
              url: window.location.origin,
              icons: ['/favicon.ico'],
            },
            features: {
              analytics: false,
              swaps: false,
              onramp: false,
            },
            themeMode: 'light',
          })
        })
      }).catch((err) => {
        console.error('AppKit initialization failed:', err)
      })
    }
  }, [])

  useEffect(() => {
    if (!GA_ID) return

    const handleRouteChange = (url) => {
      window.gtag?.('config', GA_ID, {
        page_path: url,
      })
    }

    router.events.on('routeChangeComplete', handleRouteChange)
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events])

  return (
    <ErrorBoundary>
      <WagmiProvider config={wagmiAdapter.wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WalletProvider>
            <OnboardingContext.Provider value={{ triggerOnboarding: () => {} }}>
              {mounted ? <Component {...pageProps} /> : null}
            </OnboardingContext.Provider>
          </WalletProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  )
}
