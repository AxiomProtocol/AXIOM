import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { DesignLawLayout, SectionHeading } from '../components/design-law';

const OBSERVATION_WINDOW = {
  active: true,
  startDate: '2026-01-26',
  minEndDate: '2026-03-26',
  maxEndDate: '2026-07-26',
};

const FAQItem = ({ question, answer }: { question: string; answer: React.ReactNode }) => (
  <div className="border-b border-dl-border py-6">
    <h3 className="font-dl-serif text-lg text-dl-navy mb-3">{question}</h3>
    <div className="text-dl-gray space-y-2">{answer}</div>
  </div>
);

export default function FAQPage() {
  return (
    <DesignLawLayout>
      <Head>
        <title>FAQ - Axiom Protocol | Observation Window</title>
        <meta name="description" content="Frequently asked questions about the Axiom Protocol observation window. Learn about our governance process and no-investment posture." />
      </Head>

      {OBSERVATION_WINDOW.active && (
        <div className="bg-dl-bg-alt border-b border-dl-border mb-6">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-center">
            <svg className="w-5 h-5 text-dl-navy mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-dl-navy font-medium text-sm">
              Observation Window Active: No investments accepted at this time
            </span>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="font-dl-serif text-3xl text-dl-navy mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-dl-gray">
            Learn about the Axiom Protocol observation window and our commitment to transparency
          </p>
        </div>

        <div className="bg-dl-bg-alt border border-dl-border p-6 mb-10">
          <div className="flex items-start">
            <div className="p-2 bg-dl-bg border border-dl-border mr-4">
              <svg className="w-6 h-6 text-dl-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="font-dl-serif text-lg text-dl-navy mb-2">
                Observation Window: Internal Testing Only
              </h2>
              <p className="text-dl-gray">
                Axiom Protocol is currently in an observation window (started {OBSERVATION_WINDOW.startDate}). 
                During this period, we are testing internal systems and governance mechanisms. 
                <strong> No external capital is being accepted. No investments are being solicited.</strong>
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <FAQItem
            question="Can I invest in Axiom Protocol?"
            answer={
              <>
                <p>
                  <strong>No.</strong> Axiom Protocol is not accepting any form of external investment, 
                  deposits, or contributions during the observation window.
                </p>
                <p>
                  This includes:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>No token purchases</li>
                  <li>No fund deposits</li>
                  <li>No subscription agreements</li>
                  <li>No accredited investor onboarding</li>
                  <li>No Reg CF crowdfunding</li>
                </ul>
                <p className="mt-2">
                  All investment-related features are disabled and will remain so until the observation 
                  window concludes and proper compliance pathways are finalized.
                </p>
              </>
            }
          />

          <FAQItem
            question="What is the Observation Window?"
            answer={
              <>
                <p>
                  The observation window is a 1-6 month period during which Axiom Protocol focuses on:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Governance Hardening:</strong> Testing and validating our on-chain governance mechanisms</li>
                  <li><strong>Internal Systems Testing:</strong> Operating treasury and credit modules with internal funds only</li>
                  <li><strong>Risk Assessment:</strong> Identifying and mitigating potential vulnerabilities</li>
                  <li><strong>Compliance Preparation:</strong> Ensuring proper regulatory framework before external participation</li>
                </ul>
                <p className="mt-2">
                  Window Duration: {OBSERVATION_WINDOW.startDate} to {OBSERVATION_WINDOW.minEndDate} (minimum) or {OBSERVATION_WINDOW.maxEndDate} (maximum)
                </p>
                <p className="mt-2">
                  See the{' '}
                  <Link href="/governance/observation-window" className="text-dl-navy underline">
                    Observation Window Rationale
                  </Link>
                  {' '}for the full governance memorandum.
                </p>
              </>
            }
          />

          <FAQItem
            question="Are investments accepted during the observation window?"
            answer={
              <>
                <p>
                  <strong>No.</strong> Axiom Protocol does not accept external capital during observation mode.
                </p>
                <p className="mt-2">
                  See the{' '}
                  <Link href="/governance/observation-window" className="text-dl-navy underline">
                    Observation Window Rationale
                  </Link>
                  {' '}for details on why external capital intake is disabled and the criteria for exiting observation mode.
                </p>
              </>
            }
          />

          <FAQItem
            question="How can I follow progress during the Observation Window?"
            answer={
              <>
                <p>
                  You can follow Axiom Protocol progress through these channels:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>
                    <strong>Observer Dashboard:</strong>{' '}
                    <Link href="/observer" className="text-dl-navy underline">
                      View read-only transparency dashboard
                    </Link>
                  </li>
                  <li><strong>LinkedIn:</strong> Follow @AxiomProtocol for official updates</li>
                  <li><strong>TikTok:</strong> Follow @AxiomProtocol for community content</li>
                </ul>
                <p className="mt-2 text-dl-gray">
                  Note: We do not maintain an email newsletter signup at this time to avoid any appearance 
                  of solicitation during the observation window.
                </p>
              </>
            }
          />

          <FAQItem
            question="When will external participation open?"
            answer={
              <>
                <p>
                  External participation will only be considered <strong>after</strong> all of the following criteria are met:
                </p>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Governance hardening checklist is complete</li>
                  <li>All internal testing objectives are achieved</li>
                  <li>Compliance and regulatory pathways are finalized</li>
                  <li>Lock Forever governance commitment is evaluated</li>
                  <li>External legal and security audits are complete</li>
                </ol>
                <p className="mt-2">
                  There is no guaranteed timeline. The observation window may be extended if any criteria 
                  are not met to satisfaction.
                </p>
              </>
            }
          />

          <FAQItem
            question="What will be required when participation opens?"
            answer={
              <>
                <p>
                  When (and if) external participation opens, requirements will include:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>KYC/AML Verification:</strong> Identity verification per regulatory requirements</li>
                  <li><strong>Accreditation Verification:</strong> For Reg D offerings (where applicable)</li>
                  <li><strong>Risk Disclosure Acknowledgment:</strong> Understanding of all material risks</li>
                  <li><strong>Eligibility Checks:</strong> Jurisdictional and regulatory compliance</li>
                </ul>
                <p className="mt-2">
                  Specific requirements will be published when external participation is announced. 
                  Do not send funds or make any financial commitments until official announcement.
                </p>
              </>
            }
          />

          <FAQItem
            question="Is this an offer to sell securities?"
            answer={
              <p>
                <strong>No.</strong> Nothing on this website or in the Axiom Protocol materials constitutes 
                an offer to sell, or a solicitation of an offer to buy, any securities. All information is 
                provided for informational purposes only. Any future offerings will be made only through 
                appropriate legal channels with proper documentation and disclosures.
              </p>
            }
          />

          <FAQItem
            question="What is the Observer Dashboard?"
            answer={
              <>
                <p>
                  The Observer Dashboard is a read-only transparency tool that allows anyone to view:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Treasury balances and allocations</li>
                  <li>Governance role assignments</li>
                  <li>Risk metrics and parameters</li>
                  <li>Protocol health indicators</li>
                </ul>
                <p className="mt-2">
                  The dashboard does not allow any transactions or modifications. It is purely for transparency 
                  and educational purposes.
                </p>
                <div className="mt-3">
                  <Link href="/observer" className="inline-flex items-center text-dl-navy font-medium underline">
                    View Observer Dashboard
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </>
            }
          />
        </div>

        <div className="mt-12 bg-dl-bg-alt border border-dl-border p-6">
          <h3 className="font-dl-serif text-lg text-dl-navy mb-3">Legal Disclaimer</h3>
          <p className="text-sm text-dl-gray">
            The information provided on this website is for general informational purposes only and does 
            not constitute legal, financial, investment, or other professional advice. Nothing on this 
            website should be construed as an offer to sell, or a solicitation of an offer to buy, any 
            securities or other financial instruments. Axiom Protocol makes no representations or 
            warranties regarding the accuracy or completeness of any information provided. Past 
            performance is not indicative of future results. You should consult with qualified 
            professionals before making any financial decisions.
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-dl-navy font-medium underline">
            Return to Home
          </Link>
        </div>
      </div>
    </DesignLawLayout>
  );
}
