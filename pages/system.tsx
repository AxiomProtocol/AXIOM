import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { SiteLayout } from '../components/navigation';

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

      <div className="min-h-screen bg-white">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <span className="inline-block bg-amber-500/20 text-amber-300 px-4 py-1 rounded-full text-sm font-medium mb-6">
              Understanding the System
            </span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              How Axiom Works
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Axiom is a coordination system for community resource allocation and land stewardship. 
              This page explains the core concepts and how they work together.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-12">
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
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
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
                  <div className="border-b border-gray-100 mt-12" />
                )}
              </div>
            ))}
          </div>

          <div className="mt-16 bg-gray-50 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">System Flow</h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-center">
              <div className="bg-white rounded-lg p-4 border border-gray-200 w-full md:w-auto">
                <p className="font-semibold text-gray-900">Join PMA</p>
                <p className="text-sm text-gray-500">Become a member</p>
              </div>
              <svg className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="bg-white rounded-lg p-4 border border-gray-200 w-full md:w-auto">
                <p className="font-semibold text-gray-900">Hold AXUSD</p>
                <p className="text-sm text-gray-500">Settlement layer</p>
              </div>
              <svg className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="bg-white rounded-lg p-4 border border-gray-200 w-full md:w-auto">
                <p className="font-semibold text-gray-900">Commit to Pools</p>
                <p className="text-sm text-gray-500">Allocate resources</p>
              </div>
              <svg className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="bg-white rounded-lg p-4 border border-gray-200 w-full md:w-auto">
                <p className="font-semibold text-gray-900">Vote on Proposals</p>
                <p className="text-sm text-gray-500">Governance</p>
              </div>
              <svg className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="bg-white rounded-lg p-4 border border-gray-200 w-full md:w-auto">
                <p className="font-semibold text-gray-900">Execute</p>
                <p className="text-sm text-gray-500">After approval</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/join"
              className="inline-flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Become a Member
            </Link>
            <Link
              href="/philosophy"
              className="inline-flex items-center justify-center gap-2 border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Read Our Philosophy
            </Link>
            <Link
              href="/participate"
              className="inline-flex items-center justify-center gap-2 border border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              View Participation Dashboard
            </Link>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
