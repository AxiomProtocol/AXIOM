import '../styles/globals.css'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { WalletProvider } from '../components/WalletConnect/WalletContext'
import ErrorBoundary from '../components/ErrorBoundary'

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
      <WalletProvider>
        <Component {...pageProps} />
      </WalletProvider>
    </ErrorBoundary>
  )
}
