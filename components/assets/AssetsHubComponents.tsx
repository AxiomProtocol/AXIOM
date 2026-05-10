import Link from 'next/link';
import type {
  AssetHubEntry,
  AssetHubLink,
  AssetHubSection,
  AssetHubProductStatus,
} from '../../lib/assets/hub';

const STATUS_STYLES: Record<AssetHubProductStatus, string> = {
  LIVE: 'border-dl-forest text-dl-forest bg-white',
  EXTERNAL_SUPPORTED: 'border-dl-gold text-dl-gold bg-white',
  DEPLOYED_INACTIVE: 'border-dl-gray text-dl-gray bg-white',
  NOT_LIVE_NOT_ISSUED: 'border-red-700 text-red-700 bg-white',
  NEEDS_REVIEW: 'border-dl-border text-dl-muted bg-white',
};

export function AssetStatusBadge({ status }: { status: AssetHubProductStatus }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-1 font-dl-mono text-[11px] uppercase tracking-[0.14em] ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function LinkPill({ link }: { link: AssetHubLink }) {
  const kindClass =
    link.kind === 'primary'
      ? 'border-dl-navy text-dl-navy'
      : link.kind === 'tool'
      ? 'border-dl-gold text-dl-gold'
      : 'border-dl-border text-dl-muted';

  return (
    <Link
      href={link.href}
      className={`inline-flex border px-3 py-1.5 font-dl-mono text-[11px] uppercase tracking-[0.12em] hover:bg-dl-bg-alt ${kindClass}`}
    >
      {link.label}
    </Link>
  );
}

export function AssetStateSummaryStrip({
  activeCount,
  externalCount,
  inactiveCount,
  reviewCount,
}: {
  activeCount: number;
  externalCount: number;
  inactiveCount: number;
  reviewCount: number;
}) {
  const items = [
    { label: 'Internal live core', value: activeCount },
    { label: 'External supported', value: externalCount },
    { label: 'Inactive / draft', value: inactiveCount },
    { label: 'Investigate later', value: reviewCount },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="border border-dl-border bg-white p-4">
          <div className="font-dl-mono text-[10px] uppercase tracking-[0.18em] text-dl-muted">
            {item.label}
          </div>
          <div className="mt-2 font-dl-serif text-3xl text-dl-navy">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function TruthDisclosureCallout({
  title,
  notes,
}: {
  title: string;
  notes: string[];
}) {
  return (
    <div className="border border-dl-gold bg-dl-bg-alt p-5">
      <h3 className="font-dl-serif text-lg text-dl-navy">{title}</h3>
      <ul className="mt-3 space-y-2 pl-5 text-sm leading-relaxed text-dl-ink list-disc">
        {notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
}

export function AssetCard({ asset, detailMode = false }: { asset: AssetHubEntry; detailMode?: boolean }) {
  return (
    <article className="flex h-full flex-col border border-dl-border bg-white">
      <div className="border-b border-dl-border bg-dl-bg-alt p-4">
        <div className="flex flex-wrap items-start gap-3">
          <div>
            <div className="font-dl-mono text-[11px] uppercase tracking-[0.18em] text-dl-muted">
              {asset.category}
            </div>
            <h3 className="mt-1 font-dl-serif text-xl text-dl-navy">
              {asset.symbol} <span className="font-normal text-dl-ink">/ {asset.name}</span>
            </h3>
          </div>
          <div className="ml-auto">
            <AssetStatusBadge status={asset.productStatus} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-sm leading-relaxed text-dl-ink">{asset.description}</p>

        <dl className="mt-4 grid gap-3 text-xs md:grid-cols-2">
          <div>
            <dt className="font-dl-mono uppercase tracking-[0.12em] text-dl-muted">Issuer / source</dt>
            <dd className="mt-1 text-dl-ink">{asset.issuer}</dd>
          </div>
          <div>
            <dt className="font-dl-mono uppercase tracking-[0.12em] text-dl-muted">Chain</dt>
            <dd className="mt-1 text-dl-ink">{asset.chain}</dd>
          </div>
          <div>
            <dt className="font-dl-mono uppercase tracking-[0.12em] text-dl-muted">Axiom issued</dt>
            <dd className="mt-1 font-dl-mono text-dl-ink">{asset.axiomIssued ? 'YES' : 'NO'}</dd>
          </div>
          <div>
            <dt className="font-dl-mono uppercase tracking-[0.12em] text-dl-muted">Axiom custodies</dt>
            <dd className="mt-1 font-dl-mono text-dl-ink">{asset.axiomCustodies ? 'YES' : 'NO'}</dd>
          </div>
        </dl>

        <div className="mt-4 border-l-2 border-dl-gold pl-3 text-xs leading-relaxed text-dl-ink">
          <span className="font-dl-mono uppercase tracking-[0.12em] text-dl-muted">Truth: </span>
          {asset.productTruthStatement}
        </div>

        {detailMode && (
          <div className="mt-4">
            <div className="font-dl-mono text-[10px] uppercase tracking-[0.16em] text-dl-muted">
              Disclosure notes
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-dl-ink">
              {asset.disclosureNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          {asset.links.map((link) => (
            <LinkPill key={`${asset.symbol}-${link.href}-${link.label}`} link={link} />
          ))}
        </div>
      </div>
    </article>
  );
}

export function AssetClassificationSection({
  section,
  detailMode = false,
}: {
  section: AssetHubSection;
  detailMode?: boolean;
}) {
  return (
    <section id={section.id.toLowerCase()} className="scroll-mt-20">
      <div className="mb-4 border-b border-dl-border pb-3">
        <h2 className="font-dl-serif text-2xl text-dl-navy">{section.title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-dl-muted">
          {section.description}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {section.entries.map((asset) => (
          <AssetCard key={asset.symbol} asset={asset} detailMode={detailMode} />
        ))}
      </div>
    </section>
  );
}

export function AssetRelationshipTable({
  rows,
}: {
  rows: readonly { layer: string; assets: string; description: string }[];
}) {
  return (
    <div className="overflow-x-auto border border-dl-border">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="bg-dl-bg-alt">
          <tr>
            {['Layer', 'Assets', 'Function'].map((heading) => (
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
          {rows.map((row) => (
            <tr key={row.layer} className="border-t border-dl-border">
              <td className="px-4 py-3 font-dl-serif text-dl-navy">{row.layer}</td>
              <td className="px-4 py-3 font-dl-mono text-xs text-dl-ink">{row.assets}</td>
              <td className="px-4 py-3 text-dl-ink">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
