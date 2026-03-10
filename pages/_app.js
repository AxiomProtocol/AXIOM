import '../styles/globals.css'
import '@rainbow-me/rainbowkit/styles.css'
import { useEffect, createContext, useContext } from 'react'
import { useRouter } from 'next/router'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { wagmiConfig } from '../lib/web3/wagmiConfig'
import { WalletProvider } from '../components/WalletConnect/WalletContext'
import ErrorBoundary from '../components/ErrorBoundary'

const queryClient = new QueryClient()

const OnboardingContext = createContext({ triggerOnboarding: () => {} })
export const useOnboarding = () => useContext(OnboardingContext)

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

export default function App({ Component, pageProps }) {
  const router = useRouter()

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
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider
            locale="en"
            theme={darkTheme({
              accentColor: '#1a2332',
              accentColorForeground: 'white',
              borderRadius: 'none',
              fontStack: 'system',
            })}
          >
            <WalletProvider>
              <OnboardingContext.Provider value={{ triggerOnboarding: () => {} }}>
                <Component {...pageProps} />
              </OnboardingContext.Provider>
            </WalletProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  )
}
