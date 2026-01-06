import '../styles/globals.css'
import '../styles/web3-theme.css'
import '../styles/flash-web3.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { WalletProvider } from '../components/WalletConnect/WalletContext'
import ErrorBoundary from '../components/ErrorBoundary'
import { RebuildNav, RebuildFooter } from '../components/axiomRebuild'

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
      <WalletProvider>
        {showRebuildNav && <RebuildNav />}
        <Component {...pageProps} />
        {showRebuildNav && <RebuildFooter />}
      </WalletProvider>
    </ErrorBoundary>
  )
}
