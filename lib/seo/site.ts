export const CANONICAL_HOST = 'axiomprotocol.app';
export const SITE_URL = `https://${CANONICAL_HOST}`;
export const SITE_NAME = 'Axiom Protocol';
export const LEGAL_ENTITY_NAME = 'Axiom Nexus LLC';

export const DEFAULT_SEO_TITLE =
  'Axiom Protocol | Financial Operating System for Real-World Assets';

export const DEFAULT_SEO_DESCRIPTION =
  'Axiom Protocol is a financial operating system for real-world assets, combining tokenized real estate, private credit infrastructure, stablecoin settlement, and reserve transparency.';

export const DEFAULT_ROBOTS =
  'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1';

export const LOGO_PATH = '/images/axiom-token-fallback.svg';
export const OG_IMAGE_PATH = '/images/axiom-token-fallback.svg';

export function canonicalUrl(path = '/'): string {
  if (/^https?:\/\//i.test(path)) {
    return path.replace('https://www.axiomprotocol.app', SITE_URL);
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function normalizePathForCanonical(path = '/'): string {
  const [pathname] = path.split(/[?#]/);
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export const HOMEPAGE_STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: LEGAL_ENTITY_NAME,
      alternateName: 'AXIOM',
      url: SITE_URL,
      logo: canonicalUrl(LOGO_PATH),
      description: DEFAULT_SEO_DESCRIPTION,
      sameAs: [
        'https://x.com/axiaboreal',
        'https://www.linkedin.com/in/akiligroup',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US',
    },
    {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/#webpage`,
      name: DEFAULT_SEO_TITLE,
      url: SITE_URL,
      description: DEFAULT_SEO_DESCRIPTION,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en-US',
    },
  ],
};
