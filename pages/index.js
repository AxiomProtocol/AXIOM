import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { RebuildHome } from '../components/axiomRebuild';

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem('axiom_onboarding_completed');
    if (!completed) {
      router.replace('/purpose-group-onboarding');
    } else {
      setHasCompletedOnboarding(true);
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading && !hasCompletedOnboarding) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <RebuildHome />;
}
