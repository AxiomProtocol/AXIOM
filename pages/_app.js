import '../styles/globals.css'
import { useEffect, createContext, useContext, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import dynamic from 'next/dynamic'
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
const SITE_URL = 'https://axiomprotocol.app'

const HOME_SEO = {
  title: 'Axiom Protocol | Verified Financial Infrastructure',
  description:
    'Axiom Protocol connects on-chain settlement, digital dollar systems, reserve access, capital intelligence, property analysis, and public proof tools in one reviewable operating framework.',
  url: SITE_URL,
}

const HOMEPAGE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'Axiom Protocol',
      alternateName: 'AXIOM',
      url: SITE_URL,
      logo: `${SITE_URL}/images/axiom-token-fallback.svg`,
      description: HOME_SEO.description,
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: 'Axiom Protocol',
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      name: HOME_SEO.title,
      url: SITE_URL,
      description: HOME_SEO.description,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'ItemList',
      '@id': `${SITE_URL}/#primary-navigation`,
      name: 'Primary Axiom Protocol entry points',
      itemListElement: [
        { '@type': 'SiteNavigationElement', position: 1, name: 'Infrastructure', url: `${SITE_URL}/infrastructure` },
        { '@type': 'SiteNavigationElement', position: 2, name: 'Proof of Execution', url: `${SITE_URL}/proof-of-execution` },
        { '@type': 'SiteNavigationElement', position: 3, name: 'Solvency Console', url: `${SITE_URL}/solvency` },
        { '@type': 'SiteNavigationElement', position: 4, name: 'AXUSD', url: `${SITE_URL}/axusd-3643` },
        { '@type': 'SiteNavigationElement', position: 5, name: 'Reserve Access', url: `${SITE_URL}/axau-early-access` },
        { '@type': 'SiteNavigationElement', position: 6, name: 'Capital Intelligence', url: `${SITE_URL}/mirdt` },
        { '@type': 'SiteNavigationElement', position: 7, name: 'Property Analysis', url: `${SITE_URL}/property` },
        { '@type': 'SiteNavigationElement', position: 8, name: 'Institutional Disclosure', url: `${SITE_URL}/disclosure` },
      ],
    },
  ],
}

function HomepageSeoHead() {
  return (
    <Head>
      <title>{HOME_SEO.title}</title>
      <meta name="description" content={HOME_SEO.description} />
      <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
      <link rel="canonical" href={HOME_SEO.url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Axiom Protocol" />
      <meta property="og:title" content={HOME_SEO.title} />
      <meta property="og:description" content={HOME_SEO.description} />
      <meta property="og:url" content={HOME_SEO.url} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={HOME_SEO.title} />
      <meta name="twitter:description" content={HOME_SEO.description} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(HOMEPAGE_STRUCTURED_DATA) }}
      />
    </Head>
  )
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
      {router.pathname === '/' && <HomepageSeoHead />}
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
