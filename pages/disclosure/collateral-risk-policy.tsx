/**
 * /disclosure/collateral-risk-policy — Canonical collateral risk policy.
 *
 * Renders documents/policies/collateral-risk-policy.md verbatim at request
 * time so the published document and the public page can never drift.
 * No paraphrasing is permitted. To change the policy, edit the markdown file.
 */

import Head from 'next/head';
import Link from 'next/link';
import type { GetServerSideProps } from 'next';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';

interface PageProps {
  markdown: string;
  loadedAtIso: string;
}

const POLICY_PATH = path.join(
  process.cwd(),
  'documents',
  'policies',
  'collateral-risk-policy.md',
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

export default function CollateralRiskPolicyPage({ markdown, loadedAtIso }: PageProps) {
  return (
    <>
      <Head>
        <title>Collateral Risk Policy — Axiom Protocol</title>
        <meta
          name="description"
          content="Canonical Axiom Protocol collateral risk policy: classification matrix, control checklist, emergency triggers, and guardian disable path."
        />
      </Head>
      <DesignLawLayout>
        <div className="mb-6">
          <p className="font-dl-mono text-xs text-dl-gray uppercase tracking-wide">
            Disclosure / Collateral Risk Policy
          </p>
          <SectionHeading>Collateral Risk Policy</SectionHeading>
          <p className="font-dl-mono text-xs text-dl-gray mt-2">
            Source: documents/policies/collateral-risk-policy.md · Loaded {loadedAtIso}
          </p>
          <p className="text-sm text-dl-gray mt-1">
            <Link href="/disclosure" className="underline">← Back to Disclosure</Link>
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
                <p className="text-dl-charcoal text-base leading-relaxed my-3">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-6 space-y-1 text-dl-charcoal my-3">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 space-y-1 text-dl-charcoal my-3">{children}</ol>
              ),
              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
              code: ({ children }) => (
                <code className="font-dl-mono text-sm bg-dl-bg-alt px-1 py-0.5 text-dl-navy">
                  {children}
                </code>
              ),
              hr: () => <hr className="my-8 border-dl-border" />,
              strong: ({ children }) => (
                <strong className="font-dl-serif text-dl-navy">{children}</strong>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-4 border border-dl-border">
                  <table className="min-w-full text-sm border-collapse">{children}</table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-dl-bg-alt">{children}</thead>,
              th: ({ children }) => (
                <th className="font-dl-serif text-left px-4 py-2 border-b border-dl-border text-dl-navy">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-2 border-b border-dl-border text-dl-charcoal align-top">
                  {children}
                </td>
              ),
              em: ({ children }) => <em className="text-dl-gray">{children}</em>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-dl-navy pl-4 italic text-dl-charcoal my-4">
                  {children}
                </blockquote>
              ),
            }}
          >
            {markdown}
          </ReactMarkdown>
        </article>
      </DesignLawLayout>
    </>
  );
}
