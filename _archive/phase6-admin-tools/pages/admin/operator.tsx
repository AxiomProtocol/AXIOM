import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function OperatorRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/operators');
  }, [router]);

  return null;
}
