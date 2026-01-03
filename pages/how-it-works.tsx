import React, { useCallback } from 'react';
import { pagesCopy } from '../components/axiomRebuild/copy/pagesCopy';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';
import { Web3Section } from '../components/axiomRebuild/Web3Section';
import { useScrollToSection } from '../components/axiomRebuild/useScrollToSection';

export default function HowItWorksPage() {
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);
  
  useScrollToSection(getSearch);

  const copy = pagesCopy['how-it-works'];

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      {copy.hero && (
        <Web3Hero
          kicker={copy.hero.kicker}
          headline={copy.hero.headline}
          secondary={copy.hero.secondary}
          subheadline={copy.hero.subheadline}
          primaryCta={copy.hero.primaryCta}
          secondaryCta={copy.hero.secondaryCta}
          microcopy={copy.hero.microcopy || ''}
        />
      )}

      {copy.sections.map((s, i) => (
        <Web3Section
          key={s.id}
          id={s.id}
          title={s.title}
          body={s.body}
          bullets={s.bullets}
          primaryCta={s.primaryCta}
          secondaryCta={s.secondaryCta}
          image={s.image}
          imageAlt={s.imageAlt}
          index={i}
          variant={s.id === "faq" ? "dark" : "default"}
        />
      ))}
    </div>
  );
}
