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

const PAGE_SEO = {
  '/': {
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
  },
  '/about': {
    title: 'About Axiom Protocol | Financial Operating System for Real-World Assets',
    description:
      'Learn how Axiom Protocol operates as a financial operating system for real-world assets through tokenized real estate, private credit infrastructure, settlement, governance, and disclosure.',
  },
  '/community': {
    title: 'Community Ownership and Coordination | Axiom Protocol',
    description:
      'Explore how Axiom Protocol coordinates community participation, ownership pathways, and disciplined capital formation around real-world assets.',
  },
  '/disclosure': {
    title: 'Disclosure and Reserve Transparency | Axiom Protocol',
    description:
      "Review Axiom Protocol's public disclosure, reserve posture, legal entity details, infrastructure stack, and transparency framework.",
  },
  '/contact': {
    title: 'Contact Axiom Protocol | Real-World Asset Infrastructure',
    description:
      'Contact Axiom Protocol for institutional inquiries, partnerships, compliance questions, community coordination, and real-world asset infrastructure discussions.',
  },
  '/partner': {
    title: 'Partner With Axiom Protocol | Real-World Asset Infrastructure',
    description:
      'Partner with Axiom Protocol on real-world asset infrastructure, private credit coordination, stablecoin settlement, reserve transparency, and compliance-first capital formation.',
  },
  '/axusd': {
    title: 'AXUSD | Stablecoin Infrastructure by Axiom Protocol',
    description:
      "AXUSD is Axiom Protocol's compliance-first stablecoin infrastructure for transparent settlement, reserve visibility, and real-world asset coordination.",
  },
  '/axusd-3643': {
    title: 'AXUSD ERC-3643 Compliance Infrastructure | Axiom Protocol',
    description:
      "Review Axiom Protocol's ERC-3643 AXUSD compliance infrastructure, identity-gated settlement rail, credential workflow, PSM controls, and on-chain verification.",
  },
  '/axau': {
    title: 'AXAU | Reserve Asset Infrastructure by Axiom Protocol',
    description:
      "AXAU is Axiom Protocol's reserve-linked digital asset infrastructure designed for disciplined capital systems and transparent asset coordination.",
  },
  '/lending-fund': {
    title: 'Private Credit Infrastructure | Axiom Protocol',
    description:
      'Axiom Protocol provides disciplined private credit and real estate capital infrastructure designed for transparent underwriting, reserve-aware operations, and real-world execution.',
  },
  '/institutional': {
    title: 'Institutional Overview | Axiom Protocol',
    description:
      'Axiom Protocol institutional documentation for real-world asset infrastructure, private credit coordination, stablecoin settlement, reserve transparency, and governance.',
  },
}

const SSR_PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/community',
  '/disclosure',
  '/contact',
  '/partner',
  '/institutional',
  '/lending-fund',
])

function WalletBoundary({ mounted, ssrPublic, children }) {
  if (ssrPublic && !mounted) {
    return children
  }

  return <ClientWalletProviders>{mounted ? children : null}</ClientWalletProviders>
}

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const canonicalPath = normalizePathForCanonical(router.asPath || '/')
  const seo = PAGE_SEO[canonicalPath] || PAGE_SEO[router.pathname] || {
    title: DEFAULT_SEO_TITLE,
    description: DEFAULT_SEO_DESCRIPTION,
  }
  const ssrPublic = SSR_PUBLIC_PATHS.has(router.pathname)

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
        title={seo.title}
        description={seo.description}
        path={canonicalPath}
      />
      {router.pathname === '/' && <JsonLd data={HOMEPAGE_STRUCTURED_DATA} />}
      <ErrorBoundary>
        <WalletBoundary mounted={mounted} ssrPublic={ssrPublic}>
          <OnboardingContext.Provider value={{ triggerOnboarding: () => {} }}>
            <Component {...pageProps} />
          </OnboardingContext.Provider>
        </WalletBoundary>
      </ErrorBoundary>
    </UserProvider>
  )
}
