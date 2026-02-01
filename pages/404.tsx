import Link from 'next/link';

export default function Custom404() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: 20,
      textAlign: 'center'
    }}>
      <div style={{ fontSize: 80, marginBottom: 20 }}>🌾</div>
      <h1 style={{ fontSize: 48, fontWeight: 700, color: '#1a1a2e', margin: '0 0 16px 0' }}>
        404
      </h1>
      <p style={{ fontSize: 18, color: 'rgba(26,26,46,0.7)', marginBottom: 32, maxWidth: 400 }}>
        This page could not be found. It may have been moved or no longer exists.
      </p>
      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '14px 28px',
          background: '#00D4AA',
          color: '#fff',
          borderRadius: 12,
          fontWeight: 600,
          fontSize: 16,
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(0, 212, 170, 0.3)'
        }}
      >
        Return to Home
      </Link>
    </div>
  );
}
