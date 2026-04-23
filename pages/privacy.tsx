/**
 * /privacy — Canonical Axiom Protocol privacy policy.
 *
 * Renders documents/policies/privacy-policy.md verbatim at request time so the
 * published document and the public page can never drift. No paraphrasing is
 * permitted. To change the policy, edit the markdown file.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

interface PageProps {
  markdown: string;
  loadedAtIso: string;
}

const POLICY_PATH = path.join(
  process.cwd(),
  'documents',
  'policies',
  'privacy-policy.md',
);

export const getServerSideProps: GetServerSideProps<PageProps> = async (ctx) => {
  if (ctx.res) {
    ctx.res.setHeader('Cache-Control', 'no-store, max-age=0');
  }
  const markdown = await fs.readFile(POLICY_PATH, 'utf8');
  return {
    props: {
      markdown,
      loadedAtIso: new Date().toISOString(),
    },
  };
};

export default function PrivacyPolicyPage({ markdown, loadedAtIso }: PageProps) {
  return (
    <>
      <Head>
        <title>Privacy Policy — Axiom Protocol</title>
        <meta
          name="description"
          content="Axiom Protocol privacy policy: what we collect, how we use it, third-party processors including Plaid, retention, and your rights."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Legal / Privacy Policy
          </p>
          <SectionHeading>Privacy Policy</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Source: documents/policies/privacy-policy.md · Loaded {loadedAtIso}
          </p>
          <p className="text-sm text-dl-gray mt-1">
            See also:{' '}
            <Link href="/disclosure/information-security-policy" className="underline">
              Information Security Policy
            </Link>
            {' · '}
            <Link href="/disclosure" className="underline">Disclosure</Link>
          </p>
        </div>

        <article className="dl-prose max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="font-dl-serif text-3xl text-dl-navy mt-10 mb-4 border-b border-dl-border pb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="font-dl-serif text-2xl text-dl-navy mt-8 mb-3">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="font-dl-serif text-xl text-dl-navy mt-6 mb-2">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="text-sm text-dl-navy leading-relaxed mb-3">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 text-sm text-dl-navy mb-3 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 text-sm text-dl-navy mb-3 space-y-1">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ children }) => (
                <code className="font-dl-mono text-xs bg-dl-bg-alt px-1 py-0.5 border border-dl-border">
                  {children}
                </code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-dl-border pl-4 my-3 text-sm text-dl-gray italic">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-dl-navy underline"
                  target={href?.startsWith('http') ? '_blank' : undefined}
                  rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              ),
              hr: () => <hr className="my-8 border-dl-border" />,
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </DesignLawLayout>
    </>
  );
}
