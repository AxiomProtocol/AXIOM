import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminIndex() {
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth/session');
        const data = await res.json();
        
        if (data.authenticated) {
          router.replace('/admin/treasury');
        } else {
          router.replace('/admin/login');
        }
      } catch (err) {
        router.replace('/admin/login');
      }
    };
    
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
