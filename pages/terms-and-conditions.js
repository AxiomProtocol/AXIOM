import Layout from "../components/Layout";

export default function TermsAndConditions() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms & Conditions</h1>
          <p className="text-lg text-gray-600">Please read these terms carefully before using Axiom Smart City services.</p>
          <p className="text-sm text-gray-500 mt-2">Last updated: November 2025</p>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing or using the Axiom Smart City platform, website, smart contracts, or any 
              related services, you agree to be bound by these Terms and Conditions. If you do not 
              agree to these terms, you may not use our services.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
            <p className="text-gray-600 mb-4">
              By using our platform, you represent and warrant that:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>You are at least 18 years of age</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>You have the legal capacity to enter into binding agreements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>You are not located in a jurisdiction where use of our services is prohibited</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>You will comply with all applicable laws and regulations</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Risk Disclosure</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <p className="text-amber-800 font-medium">
                ⚠️ Important: Digital assets and blockchain technologies involve significant risks.
              </p>
            </div>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Digital assets are highly volatile and may lose value</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Smart contract bugs or exploits may result in loss of funds</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Regulatory changes may affect the legality or value of tokens</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Past performance is not indicative of future results</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Limitation of Liability</h2>
            <p className="text-gray-600">
              To the maximum extent permitted by law, Axiom Smart City and its affiliates shall not 
              be liable for any indirect, incidental, special, consequential, or punitive damages, 
              including but not limited to loss of profits, data, or other intangible losses, 
              resulting from your use of our services.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Intellectual Property</h2>
            <p className="text-gray-600">
              All content, trademarks, and intellectual property on the Axiom platform are owned 
              by Axiom Smart City or its licensors. You may not copy, modify, distribute, or 
              create derivative works without our prior written consent.
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Modifications</h2>
            <p className="text-gray-600">
              We reserve the right to modify these Terms at any time. Changes will be effective 
              upon posting to our website. Your continued use of our services constitutes 
              acceptance of the modified Terms.
            </p>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
            <p className="text-gray-600">
              For questions about these Terms, please contact us at{' '}
              <span className="text-amber-600 font-medium">legal@axiomcity.io</span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
