import Head from "next/head";
import SiteLayout from "../components/site/SiteLayout";
import Section from "../components/site/Section";
import { useScrollToSection } from "../lib/site/useScrollToSection";
import { pagesCopy } from "../lib/site/copy/pagesCopy";

export default function AxmPage() {
  useScrollToSection();
  const page = pagesCopy.axm;

  return (
    <SiteLayout>
      <Head>
        <title>AXM Token | Axiom Protocol</title>
        <meta name="description" content="AXM - the participation and governance mechanism within Axiom" />
      </Head>

      <div className="ax-page">
        <div className="ax-container">
          <h1 className="ax-h1">{page.title}</h1>
          <p className="ax-subhead">{page.intro}</p>
        </div>

        {page.sections.map((s) => (
          <Section key={s.id} id={s.id} title={s.title} body={s.body} bullets={s.bullets} />
        ))}
      </div>
    </SiteLayout>
  );
}
