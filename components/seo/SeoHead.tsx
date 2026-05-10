import Head from 'next/head';
import type { ReactNode } from 'react';
import {
  DEFAULT_ROBOTS,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  OG_IMAGE_PATH,
  SITE_NAME,
  canonicalUrl,
} from '../../lib/seo/site';

interface SeoHeadProps {
  title?: string;
  description?: string;
  path?: string;
  imagePath?: string;
  robots?: string;
  type?: 'website' | 'article';
  children?: ReactNode;
}

export function SeoHead({
  title = DEFAULT_SEO_TITLE,
  description = DEFAULT_SEO_DESCRIPTION,
  path = '/',
  imagePath = OG_IMAGE_PATH,
  robots = DEFAULT_ROBOTS,
  type = 'website',
  children,
}: SeoHeadProps) {
  const url = canonicalUrl(path);
  const imageUrl = canonicalUrl(imagePath);

  return (
    <Head>
      <title>{title}</title>
      <meta key="description" name="description" content={description} />
      <meta key="robots" name="robots" content={robots} />
      <link key="canonical" rel="canonical" href={url} />
      <meta key="og:type" property="og:type" content={type} />
      <meta key="og:site_name" property="og:site_name" content={SITE_NAME} />
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:image" property="og:image" content={imageUrl} />
      <meta key="twitter:card" name="twitter:card" content="summary" />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta key="twitter:description" name="twitter:description" content={description} />
      <meta key="twitter:image" name="twitter:image" content={imageUrl} />
      {children}
    </Head>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return (
    <Head>
      <script
        key="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      />
    </Head>
  );
}
