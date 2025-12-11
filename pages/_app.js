import '../styles/globals.css'
import { WalletProvider } from '../components/WalletConnect/WalletContext'
import ErrorBoundary from '../components/ErrorBoundary'

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <WalletProvider>
        <Component {...pageProps} />
      </WalletProvider>
    </ErrorBoundary>
  )
}