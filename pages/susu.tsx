import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function SusuRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/wealth-practice');
  }, [router]);
  return null;
}
