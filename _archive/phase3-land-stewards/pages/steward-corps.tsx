import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function StewardCorpsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/stewards');
  }, [router]);

  return null;
}
