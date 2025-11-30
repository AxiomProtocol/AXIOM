import Layout from "../components/Layout";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-lg text-gray-600">How Axiom Smart City collects, uses, and protects your data.</p>
          <p className="text-sm text-gray-500 mt-2">Last updated: November 2025</p>
        </div>

        <div className="prose prose-gray max-w-none">
          <div className="bg-gray-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data We Collect</h2>
            <p className="text-gray-600 mb-4">
              We collect information necessary to provide our services and comply with legal requirements:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Wallet Addresses:</strong> Public blockchain addresses used to interact with our platform</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>KYC Information:</strong> Identity documents and personal information for compliance purposes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Transaction Data:</strong> Records of your interactions with Axiom smart contracts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Usage Data:</strong> Information about how you use our website and services</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">How We Use Your Data</h2>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Providing and improving our platform services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>KYC/AML compliance and fraud prevention</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Communicating important updates and notifications</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Analytics and platform optimization</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Protection</h2>
            <p className="text-gray-600 mb-4">
              We implement industry-standard security measures to protect your personal information:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Encryption of sensitive data at rest and in transit</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Access controls and authentication mechanisms</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Regular security audits and assessments</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Rights</h2>
            <p className="text-gray-600 mb-4">
              Depending on your jurisdiction, you may have rights regarding your personal data:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Right to access your personal data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Right to request correction of inaccurate data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span>Right to request deletion (subject to legal requirements)</span>
              </li>
            </ul>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-gray-600">
              For privacy-related inquiries, please contact our privacy team at{' '}
              <span className="text-amber-600 font-medium">privacy@axiomcity.io</span>
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
