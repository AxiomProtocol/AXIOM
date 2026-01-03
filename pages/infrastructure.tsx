import React, { useCallback } from 'react';
import { pagesCopy } from '../components/axiomRebuild/copy/pagesCopy';
import { RebuildSection } from '../components/axiomRebuild/RebuildSection';
import { useScrollToSection } from '../components/axiomRebuild/useScrollToSection';

export default function InfrastructurePage() {
  const getSearch = useCallback(() => {
    if (typeof window === 'undefined') return '';
    return window.location.search;
  }, []);
  
  useScrollToSection(getSearch);

  const copy = pagesCopy.infrastructure;

  return (
    <div style={{ minHeight: '100vh', background: 'white' }}>
      <div style={{ padding: '56px 0 28px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px' }}>
          <h1 style={{ fontSize: 40, lineHeight: 1.12, margin: 0 }}>{copy.title}</h1>
          <p style={{ margin: '14px 0 0 0', fontSize: 16, color: 'rgba(18,18,18,0.74)', maxWidth: 760 }}>
            {copy.intro}
          </p>
        </div>
      </div>

      {copy.sections.map((s) => (
        <RebuildSection
          key={s.id}
          id={s.id}
          title={s.title}
          body={s.body}
          bullets={s.bullets}
        />
      ))}
    </div>
  );
}
