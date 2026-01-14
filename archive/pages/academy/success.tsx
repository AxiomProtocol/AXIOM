import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function AcademySuccess() {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);
  const [membershipSaved, setMembershipSaved] = useState(false);

  useEffect(() => {
    const verifyAndSaveMembership = async () => {
      if (!session_id) return;

      try {
        const response = await fetch('/api/academy/check-membership', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: session_id })
        });
        const data = await response.json();

        if (data.hasMembership) {
          localStorage.setItem('axiom_academy_membership', JSON.stringify({
            tier: data.tier,
            expiresAt: data.expiresAt,
            status: data.status
          }));
          setMembershipSaved(true);
        }
      } catch (error) {
        console.error('Error verifying membership:', error);
      }

      setLoading(false);
    };

    if (session_id) {
      verifyAndSaveMembership();
    }
  }, [session_id]);

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-gray-100 via-white to-gray-100 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-white border border-gray-200 rounded-2xl p-12 shadow-lg">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Axiom Academy Pro!
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Your membership is now active. You have full access to all courses, 
              certificates, and exclusive member benefits.
            </p>

            {loading ? (
              <div className="flex items-center justify-center gap-3 mb-8 text-gray-600">
                <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Activating your membership...</span>
              </div>
            ) : membershipSaved ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 flex items-center justify-center gap-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-green-700 font-medium">Membership activated successfully!</span>
              </div>
            ) : null}

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">What's Next?</h2>
              <ul className="text-left text-gray-700 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Access all 9 premium courses including DePIN, SUSU, and Real Estate</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Complete courses to earn certificates</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Join exclusive member community channels</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span>Attend weekly live workshops with experts</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/academy"
                className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-8 rounded-lg transition-all"
              >
                Start Learning
              </Link>
              <Link
                href="/"
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-lg transition-all"
              >
                Return Home
              </Link>
            </div>
          </div>

          <p className="text-gray-500 text-sm mt-8">
            A confirmation email has been sent to your inbox. 
            If you have any questions, contact support@axiomprotocol.io
          </p>
        </div>
      </div>
    </Layout>
  );
}
