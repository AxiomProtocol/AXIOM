import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import Link from 'next/link';

export default function AcademySuccess() {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session_id) {
      setLoading(false);
    }
  }, [session_id]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-950 py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30 rounded-2xl p-12">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to Axiom Academy!
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Your membership is now active. You have full access to all courses, 
              certificates, and exclusive member benefits.
            </p>

            <div className="bg-gray-900/50 rounded-xl p-6 mb-8">
              <h2 className="text-lg font-semibold text-white mb-4">What's Next?</h2>
              <ul className="text-left text-gray-300 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Browse our course library and start learning</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Complete courses to earn certificates</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Join our community Discord for support</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-400">✓</span>
                  <span>Attend monthly live sessions with experts</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/academy"
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-3 px-8 rounded-lg transition-all"
              >
                Start Learning
              </Link>
              <Link
                href="/"
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-lg transition-all"
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
