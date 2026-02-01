import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';

const systemImage = "/images/coordination_system_diagram_illustration.png";

const sections = [
  {
    id: 'coordination',
    icon: '🔄',
    title: 'Coordination System',
    content: `Axiom Protocol is a coordination system, not an investment platform. It provides the infrastructure for members to pool resources, make collective decisions, and execute on shared goals through transparent governance.

The system enables community coordination without centralized control. Members propose, vote, and execute decisions together, with all actions logged for accountability.`,
  },
  {
    id: 'pma',
    icon: '🏛️',
    title: 'PMA Membership',
    content: `Participation in Axiom requires membership in the Private Membership Association (PMA) Trust. This legal structure protects member privacy and enables private contractual arrangements between consenting adults.

Membership is the gate to participation. Only members can commit resources to pools, vote on proposals, apply for steward roles, or access sensitive documents. This creates accountability and alignment within the community.`,
  },
  {
    id: 'axusd',
    icon: '💵',
    title: 'AXUSD Settlement Layer',
    content: `AXUSD is the settlement and accounting token for the Axiom ecosystem. It provides a stable unit of account for commitments, disbursements, and treasury accounting.

AXUSD is not an investment vehicle. It is a functional tool for coordinating resources within the community. Balances represent claims on community resources, governed by the rules of each purpose pool and treasury.`,
  },
  {
    id: 'pools',
    icon: '🎯',
    title: 'Purpose Pools',
    content: `Purpose pools are the primary mechanism for coordinating resources toward specific goals. Each pool has a defined purpose, rules for participation, and governance parameters.

Members commit AXUSD to pools that align with their interests. Pool resources are allocated through governance proposals, ensuring community oversight of all spending decisions.`,
  },
  {
    id: 'governance',
    icon: '⚖️',
    title: 'Governance Process',
    content: `All significant decisions flow through governance. Proposals specify what resources will be allocated, to whom, and for what purpose. Members vote on proposals, and only approved proposals are executed.

Governance parameters (quorum requirements, approval thresholds, voting periods) are defined at the pool level, allowing different pools to have appropriate decision-making processes.`,
  },
  {
    id: 'stewardship',
    icon: '🌱',
    title: 'Land Stewardship',
    content: `Land acquisition is an outcome of coordination, not a product offering. Properties enter the pipeline as candidates and proceed through due diligence review before any acquisition is considered.

Stewards are members who take on operational responsibility for specific properties or programs. Stewardship is service to the community, not a passive arrangement. It requires active participation and accountability.`,
  },
  {
    id: 'diligence',
    icon: '🔍',
    title: 'Due Diligence Gates',
    content: `Before any land acquisition, candidates must pass through verification gates: access confirmation, title review, mineral rights assessment, survey verification, and environmental screening.

These gates protect the community from acquiring problematic properties. Progress is tracked publicly, and final acquisition requires a governance vote after all gates are complete.`,
  },
  {
    id: 'transparency',
    icon: '👁️',
    title: 'Radical Transparency',
    content: `All treasury transactions, proposal outcomes, and governance decisions are visible to members. On-chain transactions can be independently verified on the blockchain.

Transparency creates accountability. Members can see exactly how resources are being allocated and hold decision-makers responsible for their actions.`,
  },
];

export default function SystemPage() {
  return (
    <SiteLayout>
      <Head>
        <title>How It Works | Axiom Protocol</title>
        <meta name="description" content="Understand how Axiom Protocol works as a coordination system. Learn about PMA membership, AXUSD settlement, purpose pools, and governance." />
      </Head>

      <div style={{ background: "#FFFFFF", minHeight: "100vh" }}>
        <div style={{
          position: "relative",
          padding: "80px 0 60px 0",
          overflow: "hidden"
        }}>
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 170, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse 60% 40% at 80% 60%, rgba(123, 104, 238, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse 50% 30% at 20% 80%, rgba(255, 215, 0, 0.04) 0%, transparent 50%)
            `,
            pointerEvents: "none"
          }} />

          <div className="max-w-6xl mx-auto px-4" style={{ position: "relative" }}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div style={{ 
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(123, 104, 238, 0.08) 100%)",
                  padding: "8px 16px",
                  borderRadius: "100px",
                  marginBottom: "20px",
                  border: "1px solid rgba(0, 212, 170, 0.2)"
                }}>
                  <span style={{ 
                    width: "8px", 
                    height: "8px", 
                    background: "linear-gradient(135deg, #00D4AA 0%, #00A389 100%)",
                    borderRadius: "50%"
                  }} />
                  <span style={{ 
                    fontSize: "13px", 
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: "#00A389"
                  }}>Understanding the System</span>
                </div>
                
                <h1 style={{ 
                  fontSize: "clamp(32px, 5vw, 48px)", 
                  lineHeight: 1.1, 
                  margin: "0 0 16px 0",
                  fontWeight: 700,
                  color: "#0A0F1C"
                }}>How Axiom Works</h1>
                
                <p style={{ 
                  fontSize: "18px", 
                  lineHeight: 1.6,
                  color: "rgba(10, 15, 28, 0.65)", 
                  maxWidth: "500px",
                  margin: 0
                }}>
                  Axiom is a coordination system for community resource allocation and land stewardship. 
                  This page explains the core concepts and how they work together.
                </p>
              </div>
              
              <div className="hidden lg:block">
                <img 
                  src={systemImage} 
                  alt="Coordination system diagram illustration"
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderRadius: "24px",
                    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div style={{
            background: "rgba(255, 215, 0, 0.08)",
            border: "1px solid rgba(255, 215, 0, 0.3)",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "48px"
          }}>
            <h2 className="text-lg font-bold text-amber-900 mb-2">Important Context</h2>
            <p className="text-amber-800">
              Axiom Protocol is not an investment platform. Participation is for coordination and stewardship practice. 
              There are no guaranteed outcomes, and tokens do not convey equity or profit rights unless explicitly structured for a specific purpose after governance approval.
            </p>
          </div>

          <div className="space-y-12">
            {sections.map((section, index) => (
              <div key={section.id} id={section.id} className="scroll-mt-24">
                <div className="flex items-start gap-4">
                  <div style={{
                    width: "48px",
                    height: "48px",
                    background: "linear-gradient(135deg, rgba(0, 212, 170, 0.08) 0%, rgba(123, 104, 238, 0.06) 100%)",
                    borderRadius: "16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "24px",
                    flexShrink: 0
                  }}>
                    {section.icon}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                    <div className="prose max-w-none">
                      {section.content.split('\n\n').map((paragraph, i) => (
                        <p key={i} className="text-gray-700 mb-4 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                {index < sections.length - 1 && (
                  <div style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.06)", marginTop: "48px" }} />
                )}
              </div>
            ))}
          </div>

          <div style={{
            marginTop: "64px",
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            borderRadius: "24px",
            padding: "40px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06)"
          }}>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">System Flow</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
              {[
                { title: "Join PMA", subtitle: "Become a member" },
                { title: "Hold AXUSD", subtitle: "Settlement layer" },
                { title: "Commit to Pools", subtitle: "Allocate resources" },
                { title: "Vote on Proposals", subtitle: "Governance" },
                { title: "Execute", subtitle: "After approval" }
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <div style={{
                    background: "rgba(255, 255, 255, 0.95)",
                    borderRadius: "12px",
                    padding: "16px",
                    border: "1px solid rgba(0, 0, 0, 0.06)",
                    minWidth: "120px"
                  }}>
                    <p className="font-semibold text-gray-900">{step.title}</p>
                    <p className="text-sm text-gray-500">{step.subtitle}</p>
                  </div>
                  {i < 4 && (
                    <svg className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/join"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)",
                color: "white",
                fontWeight: 600,
                padding: "14px 28px",
                borderRadius: "12px",
                textDecoration: "none"
              }}
            >
              Become a Member
            </Link>
            <Link
              href="/philosophy"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                border: "1px solid #D1D5DB",
                color: "#374151",
                fontWeight: 600,
                padding: "14px 28px",
                borderRadius: "12px",
                textDecoration: "none"
              }}
            >
              Read Our Philosophy
            </Link>
            <Link
              href="/participate"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                border: "1px solid rgba(0, 163, 137, 0.5)",
                color: "#00A389",
                fontWeight: 600,
                padding: "14px 28px",
                borderRadius: "12px",
                textDecoration: "none"
              }}
            >
              View Participation Dashboard
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
