import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function GovernanceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/pma/governance');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to Governance...</p>
      </div>
    </div>
  );
}
