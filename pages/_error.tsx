import { NextPageContext } from 'next';
import Link from 'next/link';
import { useEffect } from 'react';

interface ErrorProps {
  statusCode: number;
  message?: string;
}

function Error({ statusCode, message }: ErrorProps) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.error(`[CLIENT ERROR] Status: ${statusCode}, Message: ${message || 'Unknown error'}, URL: ${window.location.href}`);
      
      fetch('/api/admin/log-client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          statusCode,
          message: message || 'Page error',
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {});
    }
  }, [statusCode, message]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <img
            src="/images/axiom-token.png"
            alt="Axiom"
            className="w-20 h-20 mx-auto rounded-full shadow-lg"
            onError={(e: any) => { e.target.style.display = 'none'; }}
          />
        </div>
        
        <h1 className="text-6xl font-bold text-amber-600 mb-4">{statusCode}</h1>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {statusCode === 404 
            ? 'Page Not Found' 
            : statusCode === 500 
              ? 'Server Error' 
              : 'Something Went Wrong'}
        </h2>
        
        <p className="text-gray-600 mb-8">
          {statusCode === 404 
            ? "The page you're looking for doesn't exist or has been moved."
            : statusCode === 500
              ? "We're experiencing technical difficulties. Our team has been notified."
              : message || "An unexpected error occurred."}
        </p>

        <div className="space-y-4">
          <Link 
            href="/"
            className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
          >
            Return Home
          </Link>
          
          <div className="text-sm text-gray-500">
            Error Code: {statusCode} | Time: {new Date().toISOString()}
          </div>
        </div>
      </div>
    </div>
  );
}

Error.getInitialProps = async ({ res, err }: NextPageContext): Promise<ErrorProps> => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  const message = err?.message;

  if (typeof window === 'undefined' && statusCode >= 500) {
    console.error('[SERVER ERROR]', {
      statusCode,
      message: message || 'Unknown server error',
      stack: err?.stack,
      timestamp: new Date().toISOString(),
    });
  }

  return { statusCode, message };
};

export default Error;
