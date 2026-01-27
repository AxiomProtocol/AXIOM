import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const OBSERVATION_WINDOW = {
  active: true,
  startDate: '2026-01-26',
  minEndDate: '2026-03-26',
  maxEndDate: '2026-07-26',
};

export default function ObservationWindowRationale() {
  return (
    <>
      <Head>
        <title>Observation Window Rationale - Axiom Protocol</title>
        <meta 
          name="description" 
          content="Governance memorandum explaining why external capital intake is disabled during the observation window." 
        />
      </Head>

      <div className="min-h-screen bg-white">
        {OBSERVATION_WINDOW.active && (
          <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-amber-800 font-medium text-center">
                Observation Mode Active: No external capital is accepted during the observation window.
              </span>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="mb-6">
            <Link href="/governance" className="text-amber-600 hover:text-amber-700 text-sm font-medium">
              &larr; Back to Governance
            </Link>
          </div>

          <article className="prose prose-lg max-w-none">
            <header className="mb-10 pb-8 border-b border-gray-200">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Observation Window Rationale
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Axiom Protocol Governance Memorandum
              </p>
              
              <div className="bg-gray-50 rounded-lg p-6 not-prose">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-gray-500 font-medium">Document ID</dt>
                    <dd className="text-gray-900 font-mono">AXM-GOV-001</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Status</dt>
                    <dd className="text-gray-900">Authoritative</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Version</dt>
                    <dd className="text-gray-900">1.0</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Effective Date</dt>
                    <dd className="text-gray-900">2026-01-26</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Observation Window</dt>
                    <dd className="text-gray-900">2026-01-26 through minimum 2026-03-26</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 font-medium">Optional Extension</dt>
                    <dd className="text-gray-900">up to 2026-07-26</dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-gray-500 font-medium">Owner</dt>
                    <dd className="text-gray-900">Axiom Protocol Governance</dd>
                  </div>
                </dl>
              </div>
            </header>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Purpose</h2>
              <p className="text-gray-700">
                This memorandum explains why Axiom Protocol has established a defined observation window during which external capital intake is not permitted. The intent is to demonstrate institutional-grade governance, reduce execution risk, and protect users, operators, and the project during early operational maturity.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Plain-English Summary</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Tokenization moves assets on-chain. Institutions stay when operations are predictable under stress.</li>
                <li>An observation window is a controlled period where the system runs in real conditions, but without external capital flowing in.</li>
                <li>During this window, Axiom Protocol focuses on safety, controls, reporting, and reliability.</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Scope</h2>
              <p className="text-gray-700 mb-4">
                This policy governs the Axiom Protocol web application, associated modules, and any user-facing flows related to:
              </p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>Deposits, subscriptions, investments, or contributions from external participants</li>
                <li>Public fundraising workflows</li>
                <li>Any language or interface that could be interpreted as a solicitation of capital</li>
              </ol>
              <p className="text-gray-700 mt-4">
                This policy does not prohibit internal testing or internal ledger activity when performed under admin-only access and with no external capital intake.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What This Policy Means</h2>
              <p className="text-gray-700 mb-4">During the observation window:</p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>No external capital can be accepted through the platform.</li>
                <li>Public-facing calls-to-action for investing are disabled or blocked.</li>
                <li>Any routes that could initiate capital intake are protected by runtime guards.</li>
                <li>The platform may still run in observation mode for:
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>User onboarding and profile creation</li>
                    <li>Non-financial product exploration</li>
                    <li>Admin-only internal settlement ledger workflows</li>
                    <li>Admin-only test note creation that is self-funded and not publicly offered</li>
                  </ul>
                </li>
              </ol>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">What This Policy Does Not Mean</h2>
              <p className="text-gray-700 mb-4">This observation window is not:</p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-2">
                <li>A token sale</li>
                <li>A public offering</li>
                <li>A solicitation of funds</li>
                <li>An invitation to invest</li>
                <li>A commitment that any investment product will be launched on a specific date</li>
              </ol>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Definitions</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Observation Window</h3>
              <p className="text-gray-700">
                A defined period where production systems operate with real monitoring, logging, and controls, while external capital intake is prohibited.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">External Capital</h3>
              <p className="text-gray-700">
                Any funds, stablecoins, fiat, or other value transferred from the public or any outside participant into Axiom-controlled flows for the purpose of investment, subscription, contribution, or capital allocation.
              </p>
              
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">Admin-Only</h3>
              <p className="text-gray-700">
                Restricted access features available only to authorized operators for internal testing, reporting, and system hardening.
              </p>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Rationale</h2>
              <p className="text-gray-700 mb-4">
                Axiom Protocol is intentionally aligning with how serious financial infrastructure is rolled out. Institutional capital requires more than token mechanics. It requires predictable behavior, clear controls, and defensible governance.
              </p>
              <p className="text-gray-700 mb-6">The observation window exists to achieve four outcomes:</p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">1. Safety Before Scale</h3>
              <p className="text-gray-700 mb-2">Axiom Protocol will not accept external capital until:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Key controls are proven under real traffic and real operational constraints</li>
                <li>Runtime guards and feature flags are validated in production</li>
                <li>Error handling and rollback paths are tested and documented</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">2. Governance That Institutions Can Defend Internally</h3>
              <p className="text-gray-700 mb-2">Institutions optimize for control after arrival. This window is designed to produce evidence that:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Privileged actions are controlled</li>
                <li>Financial actions have clear authorization boundaries</li>
                <li>Risk limits and kill-switches are present and tested</li>
                <li>System state transitions are documented</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">3. Operational Readiness Under Stress</h3>
              <p className="text-gray-700 mb-2">Trust is created by rules, not demos. This window validates:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Stress behavior, including traffic spikes and degraded dependencies</li>
                <li>Incident response procedures</li>
                <li>Monitoring coverage</li>
                <li>Logging and audit trail completeness</li>
                <li>Data integrity in ledger and reporting pathways</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">4. Regulatory Posture Without Unnecessary Cost</h3>
              <p className="text-gray-700 mb-2">Axiom Protocol is deliberately limiting risk and cost exposure while it matures. By prohibiting external capital intake during this period, Axiom reduces:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Licensing pressure</li>
                <li>Compliance scope creep</li>
                <li>Legal ambiguity around solicitation</li>
                <li>Operational risk from handling third-party funds prematurely</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Controls Implemented</h2>
              <p className="text-gray-700 mb-4">Axiom Protocol enforces observation mode using layered controls:</p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">1. Master Gate</h3>
              <p className="text-gray-700">A single authoritative control that disables external capital intake at runtime.</p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">2. Route Guards</h3>
              <p className="text-gray-700">Capital-related endpoints are wrapped with observation blockers that prevent execution.</p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">3. Feature Flags</h3>
              <p className="text-gray-700">Environment flags disable external modules and ensure the UI reflects observation mode.</p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">4. User-Facing Transparency</h3>
              <p className="text-gray-700">The platform clearly states that no investments are accepted during the observation window and disables or blocks any related CTAs.</p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">5. Reporting and Audit Readiness</h3>
              <p className="text-gray-700 mb-2">Observation reports are generated and retained for governance records, including:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Routes blocked</li>
                <li>UI CTAs disabled</li>
                <li>Findings from safety scans</li>
                <li>Incident logs and remediation actions</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Success Criteria for Exiting Observation Mode</h2>
              <p className="text-gray-700 mb-4">Observation mode may be lifted only when all criteria below are satisfied and documented:</p>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">1. Technical Controls</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>All external-capital routes remain fully blocked during the window</li>
                <li>Monitoring is active and alerting is functional</li>
                <li>Incident playbooks exist and have been tested at least once</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">2. Governance Controls</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>Privileged access paths are defined and restricted</li>
                <li>Change management is in place for risk-related parameters</li>
                <li>Pause and rollback procedures are defined and tested</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">3. Documentation and Evidence</h3>
              <ul className="list-disc pl-6 text-gray-700 space-y-1">
                <li>An observation report exists with findings and remediations</li>
                <li>A public statement of readiness is drafted for transparency</li>
                <li>Internal approval is recorded</li>
              </ul>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Timeline and Review</h2>
              <p className="text-gray-700 mb-4">This policy is effective starting 2026-01-26.</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                <li><strong>Minimum observation period ends:</strong> 2026-03-26</li>
                <li><strong>Optional extension through:</strong> 2026-07-26 (depending on findings)</li>
              </ul>
              <p className="text-gray-700 mb-2">Reviews occur:</p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-1">
                <li>Weekly internal governance review during the observation window</li>
                <li>Immediately following any incident or high-severity finding</li>
                <li>At the end of the minimum period to determine whether to lift or extend</li>
              </ol>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Communications Policy</h2>
              <p className="text-gray-700 mb-2">Public communications during observation mode must:</p>
              <ol className="list-decimal pl-6 text-gray-700 space-y-1">
                <li>Avoid language that could be interpreted as an invitation to invest</li>
                <li>Direct users to this memorandum for clarity</li>
                <li>Focus on governance, safety, and readiness, not returns or fundraising</li>
              </ol>
            </section>

            <section className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
              <ul className="list-none text-gray-700 space-y-2">
                <li><strong>Governance inquiries:</strong> governance@axiomprotocol.app</li>
                <li><strong>Security reports:</strong> security@axiomprotocol.app</li>
              </ul>
            </section>

            <section className="mb-10 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Change Log</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Version 1.0</h3>
              <p className="text-gray-700">Initial publication of Observation Window Rationale and controls.</p>
            </section>
          </article>
        </div>

        <footer className="bg-gray-50 border-t border-gray-200 py-8 mt-12">
          <div className="max-w-4xl mx-auto px-4 text-center text-gray-600 text-sm">
            <p>Axiom Protocol Governance | Document ID: AXM-GOV-001 | Version 1.0</p>
            <p className="mt-2">
              <Link href="/faq" className="text-amber-600 hover:text-amber-700">FAQ</Link>
              {' | '}
              <Link href="/governance" className="text-amber-600 hover:text-amber-700">Governance</Link>
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
