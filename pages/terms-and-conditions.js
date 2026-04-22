import Head from "next/head";
import { DesignLawLayout, SectionHeading } from "../components/design-law";

export default function TermsAndConditions() {
  return (
    <DesignLawLayout>
      <Head>
        <title>Terms & Conditions | Axiom Protocol</title>
      </Head>

      <div className="max-w-4xl mx-auto">
        <div className="mb-12">
          <h1 className="font-dl-serif text-3xl text-dl-navy mb-3">Terms & Conditions</h1>
          <p className="text-lg text-dl-gray">Please read these terms carefully before using Axiom Nexus LLC services.</p>
          <p className="text-sm text-dl-gray mt-2 font-dl-mono">Last updated: December 2025</p>
        </div>

        <div className="bg-dl-bg-alt border border-dl-border p-6 mb-8">
          <h3 className="font-dl-serif text-dl-navy mb-3">Business Entity Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-dl-gray">
            <div>
              <span className="font-medium text-dl-navy">Legal Entity:</span> Axiom Nexus LLC
            </div>
            <div>
              <span className="font-medium text-dl-navy">Manager:</span> Clarence Fuqua (Sole Member)
            </div>
            <div>
              <span className="font-medium text-dl-navy">State of Formation:</span> Mississippi
            </div>
            <div>
              <span className="font-medium text-dl-navy">Filing Number:</span> <span className="font-dl-mono">1522557</span>
            </div>
            <div>
              <span className="font-medium text-dl-navy">EIN:</span> <span className="font-dl-mono">41-3277381</span>
            </div>
            <div>
              <span className="font-medium text-dl-navy">Date Established:</span> December 26, 2025
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-dl-navy">Registered Agent:</span> Northwest Registered Agent, Inc.
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-dl-navy">Address:</span> 270 Trace Colony Park STE B, Ridgeland, MS 39157
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-dl-bg-alt border border-dl-border p-8">
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">1. Acceptance of Terms</h2>
            <p className="text-dl-gray">
              By accessing or using the Axiom Smart City platform, website, smart contracts, or any 
              related services, you agree to be bound by these Terms and Conditions. If you do not 
              agree to these terms, you may not use our services.
            </p>
          </div>

          <div className="bg-dl-bg-alt border border-dl-border p-8">
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">2. Eligibility</h2>
            <p className="text-dl-gray mb-4">
              By using our platform, you represent and warrant that:
            </p>
            <ul className="space-y-2 text-dl-gray">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-dl-navy mt-2 shrink-0"></span>
                <span>You are at least 18 years of age</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-dl-navy mt-2 shrink-0"></span>
                <span>You have the legal capacity to enter into binding agreements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-dl-navy mt-2 shrink-0"></span>
                <span>You are not located in a jurisdiction where use of our services is prohibited</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-dl-navy mt-2 shrink-0"></span>
                <span>You will comply with all applicable laws and regulations</span>
              </li>
            </ul>
          </div>

          <div className="bg-dl-bg-alt border border-dl-border p-8">
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">3. Risk Disclosure</h2>
            <div className="bg-dl-bg border border-dl-border p-4 mb-4">
              <p className="text-dl-navy font-medium">
                Important: Digital assets and blockchain technologies involve significant risks.
              </p>
            </div>
            <ul className="space-y-2 text-dl-gray">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-dl-navy mt-2 shrink-0"></span>
                <span>Digital assets are highly volatile and may lose value</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-dl-navy mt-2 shrink-0"></span>
                <span>Smart contract bugs or exploits may result in loss of funds</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-dl-navy mt-2 shrink-0"></span>
                <span>Regulatory changes may affect the legality or value of tokens</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-dl-navy mt-2 shrink-0"></span>
                <span>Past performance is not indicative of future results</span>
              </li>
            </ul>
          </div>

          <div className="bg-dl-bg-alt border border-dl-border p-8">
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">4. Limitation of Liability</h2>
            <p className="text-dl-gray">
              To the maximum extent permitted by law, Axiom Smart City and its affiliates shall not 
              be liable for any indirect, incidental, special, consequential, or punitive damages, 
              including but not limited to loss of profits, data, or other intangible losses, 
              resulting from your use of our services.
            </p>
          </div>

          <div className="bg-dl-bg-alt border border-dl-border p-8">
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">5. Intellectual Property</h2>
            <p className="text-dl-gray">
              All content, trademarks, and intellectual property on the Axiom platform are owned 
              by Axiom Smart City or its licensors. You may not copy, modify, distribute, or 
              create derivative works without our prior written consent.
            </p>
          </div>

          <div className="bg-dl-bg-alt border border-dl-border p-8">
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">6. Modifications</h2>
            <p className="text-dl-gray">
              We reserve the right to modify these Terms at any time. Changes will be effective 
              upon posting to our website. Your continued use of our services constitutes 
              acceptance of the modified Terms.
            </p>
          </div>

          <div className="border border-dl-border p-8">
            <h2 className="font-dl-serif text-2xl text-dl-navy mb-4">Contact</h2>
            <p className="text-dl-gray mb-4">
              For questions about these Terms, please contact us at{' '}
              <span className="text-dl-navy font-medium">legal@axiomcity.io</span>
            </p>
            <div className="text-sm text-dl-gray pt-4 border-t border-dl-border">
              <p className="font-medium text-dl-navy mb-1">Axiom Nexus LLC</p>
              <p>270 Trace Colony Park STE B</p>
              <p>Ridgeland, MS 39157</p>
            </div>
          </div>
        </div>
      </div>
    </DesignLawLayout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
