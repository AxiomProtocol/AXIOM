import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OnrampRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/buy-axm');
  }, [router]);
  
  return null;
}
