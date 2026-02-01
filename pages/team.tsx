import React from 'react';
import Head from 'next/head';
import { Web3Hero } from '../components/axiomRebuild/Web3Hero';
import { Web3Section } from '../components/axiomRebuild/Web3Section';

const LEADERSHIP = [
  {
    name: "Clarence Fuqua Bey",
    role: "Founder & Managing Member",
    description: "Leading the vision for America's first on-chain smart city economy. Clarence brings years of experience in community development, real estate, and blockchain technology.",
    icon: "👤"
  },
];

const ADVISORY = [
  {
    name: "Blockchain Advisory",
    focus: "Smart Contract Architecture",
    description: "Experts in Solidity development, DeFi protocols, and multi-chain deployment strategies.",
    icon: "⛓️"
  },
  {
    name: "Real Estate Advisory",
    focus: "Property Tokenization",
    description: "Specialists in real estate law, fractional ownership structures, and regulatory compliance.",
    icon: "🏠"
  },
  {
    name: "Financial Advisory",
    focus: "DeFi Treasury Design",
    description: "Professionals in treasury management, yield optimization, and sustainable tokenomics.",
    icon: "💰"
  },
  {
    name: "Regulatory Advisory",
    focus: "Compliance & Governance",
    description: "Legal experts ensuring all operations meet state and federal requirements.",
    icon: "⚖️"
  },
];

export default function TeamPage() {
  return (
    <>
      <Head>
        <title>Team | Axiom</title>
        <meta name="description" content="Meet the team building Axiom - America's first on-chain smart city economy." />
      </Head>
      <div style={{ minHeight: '100vh', background: 'white' }}>
        <Web3Hero
          kicker="OUR TEAM"
          headline="Building the Future"
          secondary="Leadership & Advisors"
          subheadline="Axiom is led by experienced professionals committed to creating transparent, community-governed financial infrastructure."
          primaryCta={{ label: "Join Our Community", href: "/community" }}
          secondaryCta={{ label: "About Axiom", href: "/about-us" }}
          microcopy="Axiom Nexus, LLC - Building America's first on-chain smart city."
        />

        <Web3Section
          id="leadership"
          title="Leadership"
          body="Axiom Nexus, LLC is led by visionary entrepreneurs committed to transforming how communities build wealth together through blockchain technology and shared ownership models."
          bullets={[
            "Community-first approach to wealth building",
            "Proven track record in real estate development",
            "Deep expertise in blockchain and DeFi protocols"
          ]}
          image="/generated/community_collaboration_around_data.png"
          imageAlt="Team collaboration and leadership"
          index={0}
          variant="default"
        />

        <section style={{ padding: '80px 20px', background: 'linear-gradient(180deg, rgba(0,212,170,0.05) 0%, rgba(255,255,255,1) 100%)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ color: '#00D4AA', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Founding Team</span>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: '#1a1a2e' }}>Leadership</h2>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {LEADERSHIP.map((member, i) => (
                <div 
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 24,
                    padding: 40,
                    border: '1px solid rgba(0,212,170,0.3)',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
                    textAlign: 'center',
                    maxWidth: 400,
                    transform: 'translateY(0)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-8px)';
                    e.currentTarget.style.boxShadow = '0 30px 80px rgba(0,212,170,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0,0,0,0.1)';
                  }}
                >
                  <div style={{ 
                    fontSize: 64, 
                    marginBottom: 20,
                    background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>{member.icon}</div>
                  <h3 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px 0', color: '#1a1a2e' }}>{member.name}</h3>
                  <p style={{ 
                    fontSize: 16, 
                    fontWeight: 600, 
                    margin: '0 0 16px 0',
                    background: 'linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>{member.role}</p>
                  <p style={{ fontSize: 15, color: 'rgba(26,26,46,0.7)', margin: 0, lineHeight: 1.7 }}>{member.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '80px 20px', background: 'white' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <span style={{ color: '#7B68EE', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Expert Guidance</span>
              <h2 style={{ fontSize: 40, fontWeight: 700, margin: '8px 0 0 0', color: '#1a1a2e' }}>Advisory Council</h2>
              <p style={{ fontSize: 18, color: 'rgba(26,26,46,0.7)', marginTop: 16, maxWidth: 600, margin: '16px auto 0' }}>
                Axiom is supported by a diverse group of advisors with deep expertise across blockchain, real estate, finance, and regulatory compliance.
              </p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
              {ADVISORY.map((advisor, i) => (
                <div 
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 16,
                    padding: 28,
                    border: '1px solid rgba(123,104,238,0.2)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 48px rgba(123,104,238,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)';
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 16 }}>{advisor.icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 4px 0', color: '#1a1a2e' }}>{advisor.name}</h3>
                  <p style={{ fontSize: 14, fontWeight: 500, color: '#7B68EE', margin: '0 0 12px 0' }}>{advisor.focus}</p>
                  <p style={{ fontSize: 14, color: 'rgba(26,26,46,0.7)', margin: 0, lineHeight: 1.6 }}>{advisor.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: '80px 20px', background: '#1a1a2e' }}>
          <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
            <span style={{ color: '#FFD700', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, fontSize: 14 }}>Business Entity</span>
            <h2 style={{ fontSize: 36, fontWeight: 700, margin: '8px 0 24px 0', color: 'white' }}>Axiom Nexus, LLC</h2>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, marginBottom: 32 }}>
              Axiom operates as Axiom Nexus, LLC - a manager-managed limited liability company organized in accordance with applicable state law. 
              The company is committed to transparency, community governance, and building the infrastructure for America's first on-chain smart city economy.
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: 24,
              marginTop: 40 
            }}>
              <div style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: 12, 
                padding: 24,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ color: '#00D4AA', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Entity Type</div>
                <div style={{ color: 'white', fontSize: 16 }}>Manager-Managed LLC</div>
              </div>
              <div style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: 12, 
                padding: 24,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ color: '#00D4AA', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Managing Member</div>
                <div style={{ color: 'white', fontSize: 16 }}>Clarence Fuqua Bey</div>
              </div>
              <div style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderRadius: 12, 
                padding: 24,
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <div style={{ color: '#00D4AA', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Focus Areas</div>
                <div style={{ color: 'white', fontSize: 16 }}>DeFi, Real Estate, DePIN</div>
              </div>
            </div>
          </div>
        </section>

        <section style={{ 
          padding: '80px 20px', 
          background: 'linear-gradient(135deg, rgba(0,212,170,0.1) 0%, rgba(123,104,238,0.1) 100%)',
          textAlign: 'center'
        }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, color: '#1a1a2e', marginBottom: 16 }}>Join Our Team</h2>
            <p style={{ fontSize: 18, color: 'rgba(26,26,46,0.7)', lineHeight: 1.7, marginBottom: 32 }}>
              We're always looking for talented individuals passionate about blockchain, smart cities, and financial innovation.
            </p>
            <a 
              href="/contact"
              style={{
                display: 'inline-block',
                padding: '16px 32px',
                background: 'linear-gradient(135deg, #00D4AA 0%, #00B894 100%)',
                color: 'white',
                fontWeight: 600,
                fontSize: 16,
                borderRadius: 12,
                textDecoration: 'none',
                boxShadow: '0 8px 24px rgba(0,212,170,0.3)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,212,170,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,212,170,0.3)';
              }}
            >
              Get in Touch
            </a>
          </div>
        </section>
      </div>
    </>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
