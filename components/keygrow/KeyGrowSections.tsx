import React from 'react';
import Link from 'next/link';
import { keygrowCopy, landProjects } from './keygrowCopy';
import { ProjectCard } from './ProjectCard';
import { ProofStrip } from './ProofStrip';
import { useSectionAnalytics, trackCtaClick } from './useSectionAnalytics';

const sectionStyle: React.CSSProperties = {
  padding: '48px 0',
  borderBottom: '1px solid rgba(0,0,0,0.06)'
};

const headlineStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  marginBottom: 20,
  color: 'rgba(0,0,0,0.9)'
};

const bodyStyle: React.CSSProperties = {
  fontSize: 16,
  lineHeight: 1.7,
  color: 'rgba(0,0,0,0.75)',
  whiteSpace: 'pre-line',
  maxWidth: 720
};

const ctaButtonStyle: React.CSSProperties = {
  display: 'inline-block',
  background: 'rgba(18,18,18,0.92)',
  color: 'white',
  padding: '12px 24px',
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 500,
  textDecoration: 'none',
  marginRight: 12,
  marginTop: 8
};

const ctaSecondaryStyle: React.CSSProperties = {
  ...ctaButtonStyle,
  background: 'white',
  color: 'rgba(18,18,18,0.92)',
  border: '1px solid rgba(0,0,0,0.15)'
};

export function OverviewSection() {
  const sectionRef = useSectionAnalytics('overview');
  const { overview } = keygrowCopy;

  return (
    <section ref={sectionRef} id="overview" style={sectionStyle}>
      <h2 style={headlineStyle}>{overview.headline}</h2>
      <p style={bodyStyle}>{overview.body}</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 32 }}>
        <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: 12, padding: 20 }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#166534' }}>What This Is</h4>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(0,0,0,0.7)', lineHeight: 1.8 }}>
            {overview.whatThisIs.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
        <div style={{ background: 'rgba(239,68,68,0.08)', borderRadius: 12, padding: 20 }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600, color: '#991b1b' }}>What This Is Not</h4>
          <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(0,0,0,0.7)', lineHeight: 1.8 }}>
            {overview.whatThisIsNot.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>
      </div>

      <ProofStrip />

      <div style={{ marginTop: 24 }}>
        <Link
          href={overview.primaryCta.href}
          onClick={() => trackCtaClick('overview', overview.primaryCta.label)}
          style={ctaButtonStyle}
        >
          {overview.primaryCta.label}
        </Link>
        <Link
          href={overview.secondaryCta.href}
          onClick={() => trackCtaClick('overview', overview.secondaryCta.label)}
          style={ctaSecondaryStyle}
        >
          {overview.secondaryCta.label}
        </Link>
      </div>
    </section>
  );
}

export function PathsSection() {
  const sectionRef = useSectionAnalytics('paths');
  const { paths } = keygrowCopy;

  return (
    <section ref={sectionRef} id="paths" style={sectionStyle}>
      <h2 style={headlineStyle}>{paths.headline}</h2>
      <p style={bodyStyle}>{paths.body}</p>

      <div style={{ marginTop: 32 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Participation Roles</h4>
        <div style={{ display: 'grid', gap: 12 }}>
          {paths.roles.map((role, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              padding: '12px 16px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 10
            }}>
              <span style={{ fontWeight: 600, minWidth: 140 }}>{role.name}:</span>
              <span style={{ color: 'rgba(0,0,0,0.7)' }}>{role.description}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ ...bodyStyle, marginTop: 24 }}>{paths.supportingCopy}</p>

      <div style={{ marginTop: 24 }}>
        <Link
          href={paths.primaryCta.href}
          onClick={() => trackCtaClick('paths', paths.primaryCta.label)}
          style={ctaButtonStyle}
        >
          {paths.primaryCta.label}
        </Link>
      </div>
    </section>
  );
}

export function ProjectsSection() {
  const sectionRef = useSectionAnalytics('projects');
  const { projects } = keygrowCopy;

  return (
    <section ref={sectionRef} id="projects" style={sectionStyle}>
      <h2 style={headlineStyle}>{projects.headline}</h2>
      <p style={bodyStyle}>{projects.body}</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 24,
        marginTop: 32
      }}>
        {landProjects.map((project, i) => (
          <ProjectCard
            key={i}
            {...project}
            onCtaClick={() => trackCtaClick('projects', project.ctaLabel)}
          />
        ))}
      </div>

      <ProofStrip />
    </section>
  );
}

export function StewardshipSection() {
  const sectionRef = useSectionAnalytics('stewardship');
  const { stewardship } = keygrowCopy;

  return (
    <section ref={sectionRef} id="stewardship" style={sectionStyle}>
      <h2 style={headlineStyle}>{stewardship.headline}</h2>
      <p style={bodyStyle}>{stewardship.body}</p>

      <div style={{ marginTop: 32 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Core Principles</h4>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(0,0,0,0.7)', lineHeight: 1.8 }}>
          {stewardship.corePrinciples.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>

      <div style={{ marginTop: 24 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Decision Framework</h4>
        <div style={{ display: 'grid', gap: 8 }}>
          {stewardship.decisionFramework.map((d, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 8
            }}>
              <span style={{ fontWeight: 500 }}>{d.type}:</span>
              <span style={{ color: 'rgba(0,0,0,0.7)' }}>{d.handler}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#991b1b' }}>Red Lines</h4>
        <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(0,0,0,0.7)', lineHeight: 1.8 }}>
          {stewardship.redLines.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      </div>
    </section>
  );
}

export function GetStartedSection() {
  const sectionRef = useSectionAnalytics('get-started');
  const { getStarted } = keygrowCopy;

  return (
    <section ref={sectionRef} id="get-started" style={{ ...sectionStyle, borderBottom: 'none' }}>
      <h2 style={headlineStyle}>{getStarted.headline}</h2>
      <p style={bodyStyle}>{getStarted.body}</p>

      <div style={{ marginTop: 32 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Onboarding Steps</h4>
        <ol style={{ margin: 0, paddingLeft: 24, color: 'rgba(0,0,0,0.7)', lineHeight: 2 }}>
          {getStarted.onboardingSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div style={{ marginTop: 32 }}>
        <Link
          href={getStarted.primaryCta.href}
          onClick={() => trackCtaClick('get-started', getStarted.primaryCta.label)}
          style={ctaButtonStyle}
        >
          {getStarted.primaryCta.label}
        </Link>
        <Link
          href={getStarted.secondaryCta.href}
          onClick={() => trackCtaClick('get-started', getStarted.secondaryCta.label)}
          style={ctaSecondaryStyle}
        >
          {getStarted.secondaryCta.label}
        </Link>
      </div>
    </section>
  );
}

export function KeyGrowSections() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 20px' }}>
      <OverviewSection />
      <PathsSection />
      <ProjectsSection />
      <StewardshipSection />
      <GetStartedSection />
    </div>
  );
}
