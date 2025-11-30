import Layout from "../components/Layout";

export default function Compliance() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Compliance</h1>
          <p className="text-lg text-gray-600">Our commitment to legal and regulatory compliance.</p>
        </div>

        <div className="space-y-8">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🔍 KYC & AML</h2>
            <p className="text-gray-600 mb-4">
              Axiom Smart City follows strict Know Your Customer (KYC) and Anti-Money 
              Laundering (AML) procedures to ensure compliance with applicable regulations.
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                Identity verification for all investors and high-value transactions
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                Ongoing monitoring for suspicious activity
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                Compliance with FATF guidelines and local regulations
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📜 Regulatory Framework</h2>
            <p className="text-gray-600 mb-4">
              We work with legal advisors to ensure our operations comply with applicable 
              securities laws and regulations in all jurisdictions where we operate.
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                Token classification and securities compliance
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                Cross-border transaction compliance
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                Regular legal and compliance audits
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🌍 Jurisdictional Considerations</h2>
            <p className="text-gray-600 mb-4">
              Access to certain Axiom services may be restricted based on your jurisdiction. 
              Users are responsible for ensuring their participation complies with local laws.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 text-sm">
                <strong>Note:</strong> Residents of certain jurisdictions may be restricted from 
                participating in token sales or certain platform features.
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">📧 Compliance Inquiries</h2>
            <p className="text-gray-600">
              For compliance-related questions or to request documentation, please contact 
              our compliance team at <span className="text-amber-600 font-medium">compliance@axiomcity.io</span>
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
