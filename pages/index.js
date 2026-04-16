import { DesignLawHome } from '../components/design-law/DesignLawHome';
import { homepageTruthService } from '../lib/services/HomepageTruthService';

export default function Home({ initialTruth }) {
  return <DesignLawHome initialTruth={initialTruth} />;
}

export async function getServerSideProps(ctx) {
  // SSR the canonical truth payload so the verified hero text appears
  // on first paint instead of after hydration. Falls back to null if
  // the resolver fails — the component handles that case.
  const ctaQuery = typeof ctx?.query?.cta === 'string' ? ctx.query.cta : undefined;
  const validCta = ['start_here', 'open_account', 'begin_verification'];
  const ctaOverride = validCta.includes(ctaQuery) ? ctaQuery : undefined;

  let initialTruth = null;
  try {
    initialTruth = await homepageTruthService.resolve(
      ctaOverride ? { ctaOverride } : {}
    );
  } catch (err) {
    console.error('[pages/index] truth resolve failed:', err?.message ?? err);
  }

  // Brief edge cache; CTA override skips cache.
  if (ctx?.res) {
    ctx.res.setHeader(
      'Cache-Control',
      ctaOverride ? 'no-store' : 'public, max-age=15, s-maxage=30, stale-while-revalidate=60',
    );
  }

  return { props: { initialTruth } };
}
