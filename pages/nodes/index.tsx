import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function NodesRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/axiom-nodes');
  }, [router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#0f172a',
      color: '#f1f5f9'
    }}>
      <p>Redirecting to Axiom Nodes...</p>
    </div>
  );
}
