import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function WealthPracticeRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    if (router.query.tab === 'training') {
      router.replace('/organizer-dashboard');
    } else {
      router.replace('/learn-wealth-practice');
    }
  }, [router, router.query.tab]);
  
  return null;
}
