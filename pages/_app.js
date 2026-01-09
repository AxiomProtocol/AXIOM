import '../styles/globals.css'
import '../styles/web3-theme.css'
import '../styles/flash-web3.css'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { WalletProvider } from '../components/WalletConnect/WalletContext'
import ErrorBoundary from '../components/ErrorBoundary'
import { RebuildNav, RebuildFooter } from '../components/axiomRebuild'
import { ThemeProvider } from '../lib/theme'
import { EnhancedOnboarding } from '../components/EnhancedOnboarding'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID

const REBUILD_NAV_PAGES = [
  '/',
  '/origin',
  '/how-it-works',
  '/infrastructure',
  '/learn',
  '/about-us',
  '/community',
  '/impact',
  '/transparency',
  '/team',
  '/land-acquisition',
  '/axusd',
  '/workbook'
]

function matchesRebuildNavPages(pathname) {
  if (REBUILD_NAV_PAGES.includes(pathname)) return true;
  if (pathname.startsWith('/workbook/')) return true;
  return false;
}

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const showRebuildNav = matchesRebuildNavPages(router.pathname)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

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

  useEffect(() => {
    if (typeof window !== 'undefined' && !onboardingChecked) {
      const completed = localStorage.getItem('axiom_onboarding_complete')
      const isPublicPage = ['/', '/origin', '/how-it-works', '/about-us', '/team'].includes(router.pathname)
      if (!completed && !isPublicPage && router.pathname !== '/admin') {
        setShowOnboarding(false)
      }
      setOnboardingChecked(true)
    }
  }, [router.pathname, onboardingChecked])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    localStorage.setItem('axiom_onboarding_complete', 'true')
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WalletProvider>
          {showRebuildNav && <RebuildNav />}
          <Component {...pageProps} />
          {showRebuildNav && <RebuildFooter />}
          {showOnboarding && (
            <EnhancedOnboarding
              onComplete={handleOnboardingComplete}
              onDismiss={() => setShowOnboarding(false)}
            />
          )}
        </WalletProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
