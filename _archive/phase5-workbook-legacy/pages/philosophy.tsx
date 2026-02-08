import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const theme = {
  primary: "#00D4AA",
  secondary: "#7B68EE",
  dark: "#1a1a2e",
  muted: "#64748b",
  light: "#f8fafc",
  white: "#ffffff"
};

const PRINCIPLES = [
  {
    id: "responsibility",
    title: "Responsibility Before Ownership",
    explanation: "Ownership without responsibility becomes extraction. Axiom requires practice and consistency before access expands. This ensures that those who participate are prepared to steward resources responsibly.",
    implication: "Participation gates, completion requirements, and evidence tracking."
  },
  {
    id: "coordination",
    title: "Coordination Before Capitalization",
    explanation: "Capital does not fix misalignment. Structure and shared rules come first. Groups that pool resources without clear coordination tend to fail. Axiom builds the framework before the funding.",
    implication: "Groups form around rules, roles, and processes before pooling funds."
  },
  {
    id: "structure",
    title: "Structure Is Care Made Repeatable",
    explanation: "Structure reduces conflict and ambiguity by making expectations explicit. When everyone knows the rules, trust becomes less personal and more systemic. This protects all participants.",
    implication: "Templates, workflows, and audits exist to protect participants."
  },
  {
    id: "land",
    title: "Land Is a Responsibility Class",
    explanation: "Land is not treated as a quick trade. It is long-term stewardship tied to maintenance, planning, and continuity. Those who engage with land through Axiom commit to sustained care, not speculation.",
    implication: "Land workflows require documentation, timelines, and operational planning."
  },
  {
    id: "discipline",
    title: "Discipline Over Enthusiasm",
    explanation: "Enthusiasm is volatile. Discipline is reliable. Axiom systems are designed around consistent, measured actions rather than bursts of energy that fade. Progress comes from steady execution.",
    implication: "Measured onboarding, recurring tasks, and accountability loops."
  },
  {
    id: "durability",
    title: "Durability Over Growth",
    explanation: "Growth without durability creates failure. Axiom optimizes for systems that remain coherent over time rather than systems that expand quickly but collapse under pressure.",
    implication: "Slow expansion, strong governance, stable processes."
  },
  {
    id: "evidence",
    title: "Evidence Before Narrative",
    explanation: "Claims must be supported by primary records and corroboration whenever possible. Stories are powerful, but they must be grounded in verifiable facts to build lasting trust.",
    implication: "Evidence vault, citations, provenance requirements."
  },
  {
    id: "privacy",
    title: "Private by Default",
    explanation: "Sensitive research and coordination must remain private unless a user explicitly exports and shares. Privacy is not an afterthought. It is a foundational design principle.",
    implication: "Default access controls, export-based sharing."
  },
  {
    id: "education",
    title: "Education and Ordered Execution",
    explanation: "People succeed when guided by ordered steps and clear decision rules. Axiom provides structured pathways that reduce confusion and help participants make informed choices.",
    implication: "Checklists, task boards, and guided assistant prompts."
  }
];

export default function PhilosophyPage() {
  return (
    <>
      <Head>
        <title>Axiom Philosophy Primer | Axiom Protocol</title>
        <meta name="description" content="An educational overview of the principles Axiom uses to design systems of coordination and stewardship." />
      </Head>
      
      <div style={{ minHeight: '100vh', background: theme.white }}>
        <section style={{ 
          padding: '100px 20px 60px', 
          background: 'linear-gradient(180deg, rgba(123,104,238,0.08) 0%, rgba(255,255,255,1) 100%)' 
        }}>
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ 
              color: theme.secondary, 
              fontWeight: 600, 
              textTransform: 'uppercase', 
              letterSpacing: 1, 
              fontSize: 14 
            }}>
              Philosophy Primer
            </span>
            <h1 style={{ 
              fontSize: 48, 
              fontWeight: 700, 
              margin: '12px 0 24px', 
              color: theme.dark,
              lineHeight: 1.2
            }}>
              Axiom Philosophy Primer
            </h1>
            <p style={{ 
              fontSize: 18, 
              color: theme.muted, 
              lineHeight: 1.7,
              maxWidth: 700,
              margin: '0 auto'
            }}>
              This primer is an educational overview of the principles Axiom uses to design systems of coordination and stewardship. These principles guide how we build, what we prioritize, and how we expect participants to engage.
            </p>
          </div>
        </section>

        <nav style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #e2e8f0',
          padding: '16px 20px',
          zIndex: 100
        }}>
          <div style={{ 
            maxWidth: 900, 
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            justifyContent: 'center'
          }}>
            {PRINCIPLES.map((p, i) => (
              <a 
                key={p.id}
                href={`#${p.id}`}
                style={{
                  padding: '6px 12px',
                  fontSize: 13,
                  color: theme.dark,
                  textDecoration: 'none',
                  borderRadius: 6,
                  background: theme.light,
                  transition: 'background 0.2s'
                }}
              >
                {i + 1}. {p.title.split(' ')[0]}
              </a>
            ))}
          </div>
        </nav>

        <section style={{ padding: '60px 20px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            {PRINCIPLES.map((principle, index) => (
              <article 
                key={principle.id}
                id={principle.id}
                style={{
                  marginBottom: 48,
                  paddingBottom: 48,
                  borderBottom: index < PRINCIPLES.length - 1 ? '1px solid #e2e8f0' : 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 16,
                  marginBottom: 20
                }}>
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, ' + theme.primary + ' 0%, ' + theme.secondary + ' 100%)',
                    color: theme.white,
                    fontWeight: 700,
                    fontSize: 16,
                    flexShrink: 0
                  }}>
                    {index + 1}
                  </span>
                  <h2 style={{
                    fontSize: 26,
                    fontWeight: 600,
                    color: theme.dark,
                    margin: 0,
                    lineHeight: 1.3
                  }}>
                    {principle.title}
                  </h2>
                </div>
                
                <p style={{
                  fontSize: 17,
                  color: 'rgba(26,26,46,0.8)',
                  lineHeight: 1.8,
                  margin: '0 0 20px 56px'
                }}>
                  {principle.explanation}
                </p>
                
                <div style={{
                  marginLeft: 56,
                  padding: '16px 20px',
                  background: 'rgba(0,212,170,0.08)',
                  borderLeft: '3px solid ' + theme.primary,
                  borderRadius: '0 8px 8px 0'
                }}>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: theme.muted,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5
                  }}>
                    Practical Implication
                  </span>
                  <p style={{
                    fontSize: 15,
                    color: theme.dark,
                    margin: '6px 0 0',
                    lineHeight: 1.6
                  }}>
                    {principle.implication}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section style={{ 
          padding: '60px 20px', 
          background: theme.light,
          borderTop: '1px solid #e2e8f0'
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <h3 style={{ 
              fontSize: 24, 
              fontWeight: 600, 
              color: theme.dark,
              marginBottom: 16
            }}>
              Educational Disclaimer
            </h3>
            <p style={{ 
              fontSize: 15, 
              color: theme.muted, 
              lineHeight: 1.8,
              marginBottom: 24
            }}>
              This primer is provided for educational purposes only. Nothing in this document constitutes legal, financial, or investment advice. Axiom Protocol does not guarantee any outcomes. Users are responsible for their own decisions and should consult qualified professionals for specific guidance.
            </p>
            <p style={{ 
              fontSize: 15, 
              color: theme.muted, 
              lineHeight: 1.8,
              marginBottom: 32
            }}>
              Axiom is inspired by established principles of group economics and cooperative coordination. We do not claim endorsement by or affiliation with any authors, institutions, or organizations.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                href="/about-us"
                style={{
                  padding: '12px 24px',
                  background: theme.primary,
                  color: theme.white,
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14
                }}
              >
                About Axiom Protocol
              </Link>
              <Link
                href="/how-it-works"
                style={{
                  padding: '12px 24px',
                  background: theme.white,
                  color: theme.dark,
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontWeight: 600,
                  fontSize: 14,
                  border: '1px solid #e2e8f0'
                }}
              >
                How It Works
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
