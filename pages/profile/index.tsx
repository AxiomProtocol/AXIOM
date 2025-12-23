import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { useWallet } from '../../components/WalletConnect/WalletContext';

export default function ProfileRedirect() {
  const router = useRouter();
  const { walletState, connectMetaMask } = useWallet();

  useEffect(() => {
    if (walletState?.address) {
      router.replace(`/profile/${walletState.address}`);
    }
  }, [walletState?.address, router]);

  return (
    <Layout>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center max-w-md px-6">
          <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Your Member Profile</h1>
          <p className="text-gray-600 mb-8">
            Connect your wallet to view and edit your personal profile. Your profile can be shared across social media.
          </p>
          
          {!walletState?.address ? (
            <button
              onClick={() => connectMetaMask()}
              className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg flex items-center gap-3 mx-auto"
            >
              <span className="text-2xl">🦊</span>
              Connect Wallet to View Profile
            </button>
          ) : (
            <div className="text-amber-600">
              <svg className="w-8 h-8 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="mt-4">Loading your profile...</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
