import Head from "next/head";
import SiteLayout from "../components/site/SiteLayout";
import Section from "../components/site/Section";
import { useScrollToSection } from "../lib/site/useScrollToSection";
import { pagesCopy } from "../lib/site/copy/pagesCopy";

export default function KeyGrowPage() {
  useScrollToSection();
  const page = pagesCopy.keygrow;

  return (
    <SiteLayout>
      <Head>
        <title>KeyGrow | Axiom Protocol</title>
        <meta name="description" content="Shared farmland ownership through structured participation" />
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
