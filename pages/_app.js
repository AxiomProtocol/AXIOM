import '../styles/globals.css'
import { useEffect, createContext, useContext, useState } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import ErrorBoundary from '../components/ErrorBoundary'
import { SeoHead, JsonLd } from '../components/seo/SeoHead'
import {
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  HOMEPAGE_STRUCTURED_DATA,
  normalizePathForCanonical,
} from '../lib/seo/site'

// ClientWalletProviders bundles ALL wagmi / Reown AppKit / WalletConnect imports.
// Loaded with ssr:false so those packages never enter the serverless function
// bundle — they were causing FUNCTION_INVOCATION_FAILED via an ESM named-export
// incompatibility in @reown/appkit-wallet -> @walletconnect/logger.
const ClientWalletProviders = dynamic(
  () => import('../components/WalletConnect/ClientWalletProviders'),
  { ssr: false, loading: () => null }
)

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
      <SeoHead
        title={DEFAULT_SEO_TITLE}
        description={DEFAULT_SEO_DESCRIPTION}
        path={normalizePathForCanonical(router.asPath || '/')}
      />
      {router.pathname === '/' && <JsonLd data={HOMEPAGE_STRUCTURED_DATA} />}
      <ErrorBoundary>
        <ClientWalletProviders>
          <OnboardingContext.Provider value={{ triggerOnboarding: () => {} }}>
            {mounted ? <Component {...pageProps} /> : null}
          </OnboardingContext.Provider>
        </ClientWalletProviders>
      </ErrorBoundary>
    </UserProvider>
  )
}
