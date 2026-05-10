import Link from 'next/link';
import { DesignLawLayout, SectionHeading, SolidButton } from '../components/design-law';
import { SeoHead } from '../components/seo/SeoHead';

const PARTNER_AREAS = [
  {
    title: 'Real-world asset operators',
    body: 'Real estate, lending, and asset operators that need disciplined capital coordination, reporting, and settlement infrastructure.',
  },
  {
    title: 'Private credit and capital partners',
    body: 'Allocators and capital partners evaluating transparent underwriting, reserve-aware operations, and institutional reporting paths.',
  },
  {
    title: 'Compliance and infrastructure providers',
    body: 'Identity, custody, banking, oracle, audit, and reporting providers that support compliance-first capital formation.',
  },
];

export default function PartnerPage() {
  return (
    <DesignLawLayout>
      <SeoHead
        title="Partner With Axiom Protocol | Real-World Asset Infrastructure"
        description="Partner with Axiom Protocol on real-world asset infrastructure, private credit coordination, stablecoin settlement, reserve transparency, and compliance-first capital formation."
        path="/partner"
      />

      <div className="border-b border-dl-border pb-8 mb-10">
        <p className="text-xs text-dl-forest uppercase tracking-widest mb-4 font-dl-mono">Partnerships</p>
        <h1 className="font-dl-serif text-2xl sm:text-3xl md:text-4xl text-dl-navy leading-tight mb-4">
          Partner with Axiom Protocol
        </h1>
        <p className="text-sm text-dl-gray max-w-3xl leading-relaxed">
          Axiom Protocol is a financial operating system for real-world assets. Partnership discussions should relate to
          tokenized real estate, private credit infrastructure, stablecoin settlement, reserve transparency, compliance,
          reporting, or institutional operations.
        </p>
      </div>

      <section className="mb-10">
        <SectionHeading>Partnership Fit</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-dl-border">
          {PARTNER_AREAS.map((area, index) => (
            <div
              key={area.title}
              className={`px-6 py-5 border-l-4 border-l-dl-navy ${
                index < PARTNER_AREAS.length - 1 ? 'border-b md:border-b-0 md:border-r border-dl-border' : ''
              } ${index % 2 === 0 ? 'bg-dl-bg' : 'bg-dl-bg-alt'}`}
            >
              <h2 className="font-dl-serif text-base text-dl-navy font-medium mb-2">{area.title}</h2>
              <p className="text-sm text-dl-gray leading-relaxed">{area.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeading>Review Before Contact</SectionHeading>
        <div className="border border-dl-border bg-dl-bg-alt p-6">
          <p className="text-sm text-dl-gray leading-relaxed mb-4">
            The public disclosure, reserve visibility, and product pages provide the baseline context for partnership diligence.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/disclosure" className="text-sm text-dl-navy underline">Disclosure and reserve transparency</Link>
            <Link href="/axusd" className="text-sm text-dl-navy underline">AXUSD settlement infrastructure</Link>
            <Link href="/axau" className="text-sm text-dl-navy underline">AXAU reserve infrastructure</Link>
            <Link href="/lending-fund" className="text-sm text-dl-navy underline">Private credit infrastructure</Link>
          </div>
        </div>
      </section>

      <div className="border border-dl-border border-l-4 border-l-dl-gold bg-dl-bg-alt p-6">
        <h2 className="font-dl-serif text-xl text-dl-navy mb-2">Start a partnership inquiry</h2>
        <p className="text-sm text-dl-gray leading-relaxed mb-5">
          Use the contact page for institutional, operational, compliance, or infrastructure partnership requests.
        </p>
        <Link href="/contact">
          <SolidButton>Contact Axiom Protocol</SolidButton>
        </Link>
      </div>
    </DesignLawLayout>
  );
}
