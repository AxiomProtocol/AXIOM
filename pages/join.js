import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import GuidedOnboarding from '../components/GuidedOnboarding';

export default function JoinPage() {
  const router = useRouter();
  const { ref } = router.query;
  const [referralCode, setReferralCode] = useState('');

  useEffect(() => {
    if (ref) {
      setReferralCode(ref);
      if (typeof window !== 'undefined') {
        localStorage.setItem('axiom_referral_code', ref);
      }
    }
  }, [ref]);

  const handleComplete = (data) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('axiom_onboarding_complete', 'true');
    }
    router.push('/wealth-dashboard');
  };

  return (
    <Layout title="Join Axiom | Build Wealth Together">
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {referralCode && (
            <div className="mb-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
                <span className="text-green-400">🎁</span>
                <span className="text-green-400 text-sm font-medium">
                  You were invited! Complete signup to earn bonus rewards
                </span>
              </div>
            </div>
          )}

          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              <span className="bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                Join Axiom Protocol
              </span>
            </h1>
            <p className="text-gray-400">
              Start building wealth with your community in under 2 minutes
            </p>
          </div>

          <GuidedOnboarding 
            onComplete={handleComplete}
            initialReferralCode={referralCode}
          />

          <div className="mt-8 text-center">
            <p className="text-gray-500 text-sm">
              Already have an account?{' '}
              <a href="/wealth-dashboard" className="text-yellow-500 hover:text-yellow-400">
                Go to Dashboard
              </a>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
