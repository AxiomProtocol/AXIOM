import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../../components/design-law';
import { PageVisualSuite } from '../../components/visual';
import {
  AssetClassificationSection,
  AssetRelationshipTable,
  AssetStateSummaryStrip,
  AssetStatusBadge,
  TruthDisclosureCallout,
} from '../../components/assets/AssetsHubComponents';
import {
  AXIOM_ASSET_SYSTEM_MAP,
  AXIOM_ASSETS_HUB_DISCLOSURES,
  getAxiomAssetsHubSections,
  listActiveStartingAssets,
  listAxiomAssets,
} from '../../lib/assets/hub';

const sections = getAxiomAssetsHubSections();
const allAssets = listAxiomAssets();
const activeStartingAssets = listActiveStartingAssets();
const internalLiveAssets = sections.find((section) => section.id === 'INTERNAL_LIVE_CORE')?.entries ?? [];
const externalSupportedAssets =
  sections.find((section) => section.id === 'EXTERNAL_SUPPORTED_LAYER')?.entries ?? [];
const inactiveAssets = sections.find((section) => section.id === 'PAUSED_INACTIVE_DRAFT')?.entries ?? [];
const investigatoryAssets = sections.find((section) => section.id === 'INVESTIGATE_LATER')?.entries ?? [];

export default function AssetsIndex() {
  return (
    <DesignLawLayout>
      <PageVisualSuite preset="assets-index" />
      <Head>
        <title>Axiom Assets Hub - Axiom Protocol</title>
        <meta
          name="description"
          content="Master public entry point for the Axiom asset layer: internal live assets, external supported assets, inactive reserve expansion, and investigatory assets."
        />
      </Head>

      <section className="relative overflow-hidden border border-dl-border bg-white">
        <div className="absolute right-0 top-0 h-full w-1/3 border-l border-dl-border bg-dl-bg-alt opacity-70" />
        <div className="relative p-6 md:p-8">
          <div className="font-dl-mono text-[11px] uppercase tracking-[0.2em] text-dl-gold">
            Active integration layer
          </div>
          <h1 className="mt-3 max-w-4xl font-dl-serif text-4xl text-dl-navy md:text-5xl">
            Axiom Assets Hub
          </h1>
          <p className="mt-5 max-w-4xl text-base leading-relaxed text-dl-ink">
            The Axiom asset layer is the protocol entry point for asset discovery,
            classification, status, disclosures, navigation, and portfolio/intelligence
            linkage. It separates internal live assets, external supported assets,
            paused or inactive reserve expansion, and contract names that still need
            review.
          </p>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-dl-muted">
            This hub reflects actual protocol status, not aspirational roadmap claims.
            Not every discovered asset is live. Inactive, draft, and investigatory rows
            are shown to prevent ambiguity, not to promote activation.
          </p>
          <div className="mt-6">
            <AssetStateSummaryStrip
              activeCount={internalLiveAssets.length}
              externalCount={externalSupportedAssets.length}
              inactiveCount={inactiveAssets.length}
              reviewCount={investigatoryAssets.length}
            />
          </div>
        </div>
      </section>

      <div className="my-8">
        <TruthDisclosureCallout
          title="Truth rules preserved by this hub"
          notes={AXIOM_ASSETS_HUB_DISCLOSURES}
        />
      </div>

      <section className="mb-10">
        <SectionHeading
          title="Official Starting Set"
          subtitle="The active starting asset universe is intentionally small: internal live core assets plus KAG as the external supported silver layer."
        />
        <div className="overflow-x-auto border border-dl-border">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-dl-bg-alt">
              <tr>
                {[
                  'Symbol',
                  'Name',
                  'Category',
                  'Issuer / source',
                  'Status',
                  'Description',
                  'Links',
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left font-dl-mono text-[11px] uppercase tracking-[0.16em] text-dl-navy"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeStartingAssets.map((asset) => (
                <tr key={asset.symbol} className="border-t border-dl-border align-top">
                  <td className="px-4 py-3 font-dl-mono font-bold text-dl-navy">
                    {asset.symbol}
                  </td>
                  <td className="px-4 py-3 text-dl-ink">{asset.name}</td>
                  <td className="px-4 py-3 font-dl-mono text-xs text-dl-muted">
                    {asset.category}
                  </td>
                  <td className="px-4 py-3 text-dl-ink">{asset.issuer}</td>
                  <td className="px-4 py-3">
                    <AssetStatusBadge status={asset.productStatus} />
                  </td>
                  <td className="px-4 py-3 text-dl-ink">{asset.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {asset.links.slice(0, 2).map((link) => (
                        <Link
                          key={`${asset.symbol}-${link.href}`}
                          href={link.href}
                          className="font-dl-mono text-xs text-dl-navy underline"
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-12">
        <AssetClassificationSection section={sections[0]} detailMode />
        <AssetClassificationSection section={sections[1]} detailMode />
        <AssetClassificationSection section={sections[2]} detailMode />
        <AssetClassificationSection section={sections[3]} detailMode />
      </div>

      <section className="my-12">
        <SectionHeading
          title="Asset System Map"
          subtitle="How the starting assets fit together inside the protocol layer."
        />
        <AssetRelationshipTable rows={AXIOM_ASSET_SYSTEM_MAP} />
      </section>

      <section className="my-12">
        <SectionHeading
          title="Related Tools / Surfaces"
          subtitle="Public read-only routes connected to the asset layer."
        />
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[
            ['/portfolio/real-assets', 'Real-assets portfolio'],
            ['/commodities', 'Commodities hub'],
            ['/commodities/insights', 'Commodity insights'],
            ['/commodities/kag', 'KAG detail page'],
            ['/axau', 'AXAU reserve surface'],
            ['/axau-disclosure', 'AXAU disclosure'],
            ['/axusd', 'AXUSD overview'],
            ['/axusd-3643', 'AXUSD settlement rail'],
            ['/dex', 'Protocol exchange'],
          ].map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="border border-dl-border bg-white p-4 font-dl-mono text-xs uppercase tracking-[0.12em] text-dl-navy hover:bg-dl-bg-alt"
            >
              {label}
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-dl-muted">
          Operator-only asset pages are intentionally not exposed as public navigation.
          The hub architecture remains compatible with /operator/assets/internal,
          /operator/assets/admissions, and /operator/commodities/admissions.
        </p>
      </section>

      <section className="mb-8">
        <SectionHeading
          title="Disclosures / Truth Rules"
          subtitle="Canonical language used by the public hub."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <TruthDisclosureCallout title="Canonical asset disclosures" notes={AXIOM_ASSETS_HUB_DISCLOSURES} />
          <div className="border border-dl-border bg-white p-5">
            <h3 className="font-dl-serif text-lg text-dl-navy">Registry boundary</h3>
            <p className="mt-3 text-sm leading-relaxed text-dl-ink">
              This hub is a read-only aggregation layer over existing source truth. It
              does not rewrite the commodity registry, supported-assets admissions
              framework, real-assets portfolio composer, internal cap-infra asset
              registry, or contract configuration. It gives the public a coherent map
              of what is active, what is read-only external support, what is inactive,
              and what still needs review.
            </p>
            <p className="mt-3 font-dl-mono text-xs text-dl-muted">
              Schema: axiom-assets-hub-v1. Entries: {allAssets.length}.
            </p>
          </div>
        </div>
      </section>

      <p className="border-t border-dl-border pt-4 font-dl-mono text-xs text-dl-muted">
        Axiom Assets Hub - read-only public navigation and disclosure surface. No
        write paths, no contract writes, no banking rails, no AXAG issuance, no LAND
        activation.
      </p>
    </DesignLawLayout>
  );
}
