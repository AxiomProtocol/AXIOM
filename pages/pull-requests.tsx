import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface PullRequest {
  number: number;
  title: string;
  url: string;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  draft: boolean;
}

export default function PullRequestsPage() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/github/pull-requests')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPullRequests(data.pullRequests);
          setCount(data.count);
        } else {
          setError(data.error || 'Failed to load pull requests');
        }
      })
      .catch(() => setError('Failed to load pull requests'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DesignLawLayout>
      <Head>
        <title>Open Pull Requests | Axiom Protocol</title>
        <meta name="description" content="Check the number of open pull requests remaining to be closed in the Axiom Protocol repository" />
      </Head>

      <div className="mb-10">
        <SectionHeading>Open Pull Requests</SectionHeading>
        <p className="text-dl-gray text-sm mt-2">
          Pull requests in the Axiom Protocol repository that remain to be closed.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24">
          <p className="text-dl-gray font-dl-mono text-sm">Loading pull requests...</p>
        </div>
      )}

      {error && (
        <div className="border border-dl-error bg-dl-bg-alt p-4 text-dl-error text-sm font-dl-mono">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-8 border border-dl-border bg-dl-bg-alt p-6 inline-block">
            <p className="text-xs text-dl-gray font-dl-mono uppercase mb-1">Open PRs remaining</p>
            <p className="font-dl-serif text-4xl text-dl-navy">{count}</p>
          </div>

          {pullRequests.length === 0 ? (
            <p className="text-dl-gray text-sm font-dl-mono">No open pull requests found.</p>
          ) : (
            <div className="divide-y divide-dl-border border border-dl-border">
              {pullRequests.map((pr) => (
                <div key={pr.number} className="p-5 bg-dl-bg hover:bg-dl-bg-alt transition-colors">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-dl-mono text-dl-gray">#{pr.number}</span>
                        {pr.draft && (
                          <span className="px-1.5 py-0.5 text-xs font-dl-mono border border-dl-border text-dl-gray uppercase">
                            Draft
                          </span>
                        )}
                      </div>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-dl-serif text-base text-dl-navy hover:underline break-words"
                      >
                        {pr.title}
                      </a>
                      <p className="mt-1 text-xs text-dl-gray font-dl-mono">
                        {pr.author ? `by ${pr.author} · ` : ''}
                        opened {new Date(pr.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <a
                      href={pr.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 px-4 py-2 border border-dl-border text-xs font-dl-mono text-dl-navy hover:bg-dl-bg-alt transition-colors no-underline"
                    >
                      View PR →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </DesignLawLayout>
  );
}
