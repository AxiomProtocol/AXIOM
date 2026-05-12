import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SITE_URL = 'https://axiomprotocol.app';

function projectPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

function routeExists(pathname: string): boolean {
  if (pathname === '/') {
    return existsSync(projectPath('pages', 'index.js')) ||
      existsSync(projectPath('pages', 'index.tsx')) ||
      existsSync(projectPath('app', 'page.tsx'));
  }

  const route = pathname.replace(/^\/+/, '');
  const candidates = [
    projectPath('pages', `${route}.js`),
    projectPath('pages', `${route}.jsx`),
    projectPath('pages', `${route}.ts`),
    projectPath('pages', `${route}.tsx`),
    projectPath('pages', route, 'index.js'),
    projectPath('pages', route, 'index.jsx'),
    projectPath('pages', route, 'index.ts'),
    projectPath('pages', route, 'index.tsx'),
    projectPath('app', route, 'page.tsx'),
    projectPath('app', route, 'page.ts'),
    projectPath('public', route),
  ];

  return candidates.some(existsSync);
}

describe('SEO indexing artifacts', () => {
  it('keeps sitemap URLs canonical, crawlable, unique, and backed by routes', () => {
    const sitemap = readFileSync(projectPath('public', 'sitemap.xml'), 'utf8');
    const urls = Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), match => match[1]);

    expect(urls.length).toBeGreaterThan(0);
    expect(new Set(urls).size).toBe(urls.length);

    for (const loc of urls) {
      expect(loc.startsWith(`${SITE_URL}/`)).toBe(true);

      const { pathname } = new URL(loc);
      expect(pathname).not.toMatch(/^\/(?:api|admin|_next|dashboard|profile)(?:\/|$)/);
      expect(routeExists(pathname)).toBe(true);
    }
  });

  it('exposes indexable homepage metadata and structured data', () => {
    const app = readFileSync(projectPath('pages', '_app.js'), 'utf8');

    expect(app).toContain('<link rel="canonical" href={HOME_SEO.url} />');
    expect(app).toContain('name="robots"');
    expect(app).toContain('application/ld+json');
    expect(app).toContain("'@type': 'Organization'");
    expect(app).toContain("'@type': 'WebSite'");
    expect(app).toContain("router.pathname === '/'");
  });
});
