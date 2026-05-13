import '../styles/globals.css'
import { useEffect, createContext, useContext, useState } from 'react'
import { useRouter } from 'next/router'
import dynamic from 'next/dynamic'
import Head from 'next/head'
import { UserProvider } from '@auth0/nextjs-auth0/client'
import ErrorBoundary from '../components/ErrorBoundary'

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

const HOME_SEO = {
  url: 'https://axiomprotocol.app/',
  title: 'Axiom Protocol — Sovereign Digital-Physical Economy',
  description: 'Governance-first wealth infrastructure. On-chain settlement, real asset onboarding, and community capital through the Axiom Protocol.',
}

const LD_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Axiom Protocol',
  url: HOME_SEO.url,
}

const LD_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Axiom Protocol',
  url: HOME_SEO.url,
}

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
        <ClientWalletProviders>
          <OnboardingContext.Provider value={{ triggerOnboarding: () => {} }}>
            <Head>
              {router.pathname === '/' && (
                <>
                  <link rel="canonical" href={HOME_SEO.url} />
                  <meta name="robots" content="index, follow" />
                  <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                      __html: JSON.stringify([LD_ORGANIZATION, LD_WEBSITE]),
                    }}
                  />
                </>
              )}
            </Head>
            {mounted ? <Component {...pageProps} /> : null}
          </OnboardingContext.Provider>
        </ClientWalletProviders>
      </ErrorBoundary>
    </UserProvider>
  )
}
