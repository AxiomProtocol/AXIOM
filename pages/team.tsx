import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

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
    <DesignLawLayout>
      <Head>
        <title>Team | Axiom</title>
        <meta name="description" content="Meet the team building Axiom - America's first on-chain smart city economy." />
      </Head>

      <div className="mb-8 text-center">
        <p className="text-xs text-dl-gray uppercase tracking-widest mb-2">OUR TEAM</p>
        <h1 className="font-dl-serif text-3xl text-dl-navy mb-2">Building the Future</h1>
        <p className="text-dl-gray max-w-xl mx-auto">
          Axiom is led by experienced professionals committed to creating transparent, community-governed financial infrastructure.
        </p>
      </div>

      <section className="mb-12">
        <SectionHeading>Leadership</SectionHeading>
        <p className="text-dl-gray mb-6">
          Axiom Nexus, LLC is led by visionary entrepreneurs committed to transforming how communities build wealth together through blockchain technology and shared ownership models.
        </p>

        <div className="flex justify-center">
          {LEADERSHIP.map((member, i) => (
            <div 
              key={i}
              className="border border-dl-border p-8 text-center max-w-md"
            >
              <div className="text-5xl mb-4">{member.icon}</div>
              <h3 className="font-dl-serif text-2xl text-dl-navy mb-2">{member.name}</h3>
              <p className="text-sm text-dl-navy font-medium mb-4">{member.role}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{member.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12">
        <SectionHeading>Advisory Council</SectionHeading>
        <p className="text-dl-gray mb-6 max-w-2xl">
          Axiom is supported by a diverse group of advisors with deep expertise across blockchain, real estate, finance, and regulatory compliance.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ADVISORY.map((advisor, i) => (
            <div 
              key={i}
              className="border border-dl-border p-6"
            >
              <div className="text-3xl mb-3">{advisor.icon}</div>
              <h3 className="font-dl-serif text-lg text-dl-navy mb-1">{advisor.name}</h3>
              <p className="text-xs text-dl-navy font-medium mb-3">{advisor.focus}</p>
              <p className="text-sm text-dl-gray leading-relaxed">{advisor.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-12 bg-dl-navy p-8">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs text-white uppercase tracking-widest mb-2">Business Entity</p>
          <h2 className="font-dl-serif text-2xl text-white mb-4">Axiom Nexus, LLC</h2>
          <p className="text-white/80 leading-relaxed mb-8">
            Axiom operates as Axiom Nexus, LLC - a manager-managed limited liability company organized in accordance with applicable state law. 
            The company is committed to transparency, community governance, and building the infrastructure for America's first on-chain smart city economy.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-white/20 p-4">
              <div className="text-xs text-white/60 mb-1">Entity Type</div>
              <div className="text-white text-sm font-dl-mono">Manager-Managed LLC</div>
            </div>
            <div className="border border-white/20 p-4">
              <div className="text-xs text-white/60 mb-1">Managing Member</div>
              <div className="text-white text-sm font-dl-mono">Clarence Fuqua Bey</div>
            </div>
            <div className="border border-white/20 p-4">
              <div className="text-xs text-white/60 mb-1">Focus Areas</div>
              <div className="text-white text-sm font-dl-mono">DeFi, Real Estate, DePIN</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12 bg-dl-bg-alt border border-dl-border p-8 text-center">
        <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">Join Our Team</h2>
        <p className="text-dl-gray mb-6 max-w-lg mx-auto">
          We're always looking for talented individuals passionate about blockchain, smart cities, and financial innovation.
        </p>
        <Link 
          href="/join"
          className="inline-block px-8 py-3 bg-dl-navy text-white text-sm font-medium"
        >
          Get in Touch
        </Link>
      </section>
    </DesignLawLayout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
