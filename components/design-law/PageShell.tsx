import Head from 'next/head';
import { ReactNode } from 'react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  timestamp?: string;
  timestampLabel?: string;
  children: ReactNode;
  disclosure?: string;
}

export function PageShell({
  title,
  subtitle,
  timestamp,
  timestampLabel = 'Last updated',
  children,
  disclosure,
}: PageShellProps) {
  return (
    <>
      <Head>
        <title>{title} | Axiom Protocol</title>
      </Head>
      <div className="design-law-root min-h-screen bg-dl-bg">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between border-b border-dl-border pb-6 mb-6">
            <div>
              <h1 className="font-dl-serif text-2xl text-dl-navy">{title}</h1>
              {subtitle && (
                <p className="text-sm text-dl-gray mt-2 max-w-2xl">{subtitle}</p>
              )}
            </div>
            {timestamp && (
              <div className="mt-4 md:mt-0 text-right">
                <p className="text-xs text-dl-gray">{timestampLabel}:</p>
                <p className="font-dl-mono text-xs text-dl-gray">{timestamp}</p>
              </div>
            )}
          </div>

          {children}

          {disclosure && (
            <div className="mt-12 pt-6 border-t border-dl-border">
              <p className="text-xs text-dl-gray leading-relaxed">{disclosure}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
