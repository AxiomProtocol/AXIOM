import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * NOTE: This middleware runs on the Edge runtime, which cannot import server-
 * only Node modules. The launch-mode helpers below are inlined here (instead
 * of imported from lib/config/launchMode) to avoid any accidental Node-API
 * pull-in via transitive imports. Keep this file self-contained.
 *
 * Source of truth for the gated lists is lib/config/launchMode.ts — this
 * middleware mirrors that list. If you add to one, add to the other.
 */

const WALLET_ONLY_GATED_PAGE_PREFIXES: readonly string[] = [
  '/axiom-payment-rails',
  '/banking',
  '/credit',
  '/dao-payroll',
  '/direct-deposit',
  '/my-card',
  '/rent-collection',
];

const WALLET_ONLY_GATED_API_PREFIXES: readonly string[] = [
  '/api/plaid',
  '/api/webhooks/unit',
  '/api/capinfra/webhooks/stellar',
  '/api/capinfra/webhooks/increase',
];

const WALLET_ONLY_REASON =
  'This surface is temporarily withdrawn for the wallet-only launch. Bank-rail features will return when the replacement banking provider is integrated.';

function isPrefixMatch(pathname: string, prefixes: readonly string[]): boolean {
  for (const prefix of prefixes) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) return true;
  }
  return false;
}

/**
 * Next.js client-side navigation fetches page props from
 *   /_next/data/<buildId>/<page-path>.json
 * (and the same for index pages: /_next/data/<buildId>/<page-path>/index.json
 * or just /_next/data/<buildId>/<page-path>.json with the leading slash
 * folded in). If we only gate the human-facing /<page-path> URL, a client
 * navigating in the browser could still hydrate the gated page from the
 * data route. Map the data URL back to its underlying page path so the
 * same gate applies.
 *
 * Returns the underlying page path (always starts with '/') or null if the
 * URL is not a /_next/data route.
 */
function dataRouteToPagePath(pathname: string): string | null {
  if (!pathname.startsWith('/_next/data/')) return null;
  const rest = pathname.slice('/_next/data/'.length);
  const slash = rest.indexOf('/');
  if (slash === -1) return null;
  let pagePath = rest.slice(slash); // includes leading '/'
  if (pagePath.endsWith('.json')) pagePath = pagePath.slice(0, -5);
  if (pagePath.endsWith('/index')) pagePath = pagePath.slice(0, -'/index'.length);
  if (pagePath === '') pagePath = '/';
  return pagePath;
}

export function middleware(req: NextRequest) {
  if (process.env.LAUNCH_MODE !== 'wallet_only') {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  if (isPrefixMatch(pathname, WALLET_ONLY_GATED_API_PREFIXES)) {
    return new NextResponse(
      JSON.stringify({
        error: 'WALLET_ONLY_LAUNCH',
        reason: WALLET_ONLY_REASON,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '604800',
          'Cache-Control': 'no-store',
        },
      },
    );
  }

  if (isPrefixMatch(pathname, WALLET_ONLY_GATED_PAGE_PREFIXES)) {
    return NextResponse.rewrite(new URL('/404', req.url));
  }

  // Block client-side navigation data fetches for gated pages.
  const underlyingPagePath = dataRouteToPagePath(pathname);
  if (
    underlyingPagePath &&
    isPrefixMatch(underlyingPagePath, WALLET_ONLY_GATED_PAGE_PREFIXES)
  ) {
    return new NextResponse(
      JSON.stringify({ notFound: true }),
      {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          'x-wallet-only-gated': '1',
        },
      },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|api/auth/siwe/.*).*)',
  ],
};
