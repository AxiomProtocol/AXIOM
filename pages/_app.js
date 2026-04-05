import '../styles/globals.css'
import { useEffect, createContext, useContext, useState } from 'react'
import { useRouter } from 'next/router'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import { wagmiAdapter, projectId, networks } from '../lib/web3/wagmiConfig'
import { WalletProvider } from '../components/WalletConnect/WalletContext'
import ErrorBoundary from '../components/ErrorBoundary'

const AppKitInitializer = dynamic(
  () => import('../components/WalletConnect/AppKitInitializer'),
  { ssr: false }
)

const CircleWalletProvider = dynamic(
  () => import('../components/WalletConnect/CircleWalletProvider').then(m => ({ default: m.CircleWalletProvider })),
  { ssr: false }
)

const queryClient = new QueryClient()

const OnboardingContext = createContext({ triggerOnboarding: () => {} })
export const useOnboarding = () => useContext(OnboardingContext)

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
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
    <UserProvider>
      <ErrorBoundary>
        <WagmiProvider config={wagmiAdapter.wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <AppKitInitializer />
            <WalletProvider>
              <CircleWalletProvider>
                <OnboardingContext.Provider value={{ triggerOnboarding: () => {} }}>
                  {mounted ? <Component {...pageProps} /> : null}
                </OnboardingContext.Provider>
              </CircleWalletProvider>
            </WalletProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ErrorBoundary>
    </UserProvider>
  )
}
