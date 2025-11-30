import '../styles/globals.css'
import { WalletProvider } from '../components/WalletConnect/WalletContext'

export default function App({ Component, pageProps }) {
  return (
    <WalletProvider>
      <Component {...pageProps} />
    </WalletProvider>
  )
}