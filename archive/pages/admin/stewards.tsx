import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function StewardsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/steward-recruitment');
  }, [router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#1a1a2e', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      color: '#fff'
    }}>
      <div>Redirecting to Steward Recruitment...</div>
    </div>
  );
}
