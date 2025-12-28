import Layout from "../components/Layout";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-lg text-gray-600">How Axiom Nexus LLC collects, uses, and protects your data.</p>
          <p className="text-sm text-gray-500 mt-2">Last updated: December 2025</p>
        </div>

        <div className="bg-gray-100 rounded-2xl p-6 mb-8">
          <h3 className="font-bold text-gray-900 mb-3">Business Entity Information</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <span className="font-medium text-gray-700">Legal Entity:</span> Axiom Nexus LLC
            </div>
            <div>
              <span className="font-medium text-gray-700">Manager:</span> Clarence Fuqua (Sole Member)
            </div>
            <div>
              <span className="font-medium text-gray-700">State of Formation:</span> Mississippi
            </div>
            <div>
              <span className="font-medium text-gray-700">Date Established:</span> December 26, 2025
            </div>
            <div className="md:col-span-2">
              <span className="font-medium text-gray-700">Address:</span> 270 Trace Colony Park STE B, Ridgeland, MS 39157
            </div>
          </div>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-4">SMS & Text Message Communications</h2>
            <p className="text-gray-600 mb-4">
              When you opt-in to receive SMS alerts from Axiom Protocol:
            </p>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Phone Number:</strong> Your mobile phone number is collected to send text message alerts</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Message Types:</strong> Launchpad updates, property alerts, transaction confirmations, governance notifications, and general announcements</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Frequency:</strong> You will receive up to 5 SMS messages per month</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Opt-Out:</strong> Reply STOP to any message to unsubscribe at any time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Help:</strong> Reply HELP to any message for customer support assistance</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>Costs:</strong> Message and data rates may apply based on your mobile carrier plan</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2"></span>
                <span><strong>No Sharing:</strong> Your phone number will not be sold or shared with third parties for marketing purposes</span>
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
            <p className="text-gray-600 mb-4">
              For privacy-related inquiries, please contact our privacy team at{' '}
              <span className="text-amber-600 font-medium">privacy@axiomcity.io</span>
            </p>
            <div className="text-sm text-gray-500 pt-4 border-t border-amber-200">
              <p className="font-medium text-gray-700 mb-1">Axiom Nexus LLC</p>
              <p>270 Trace Colony Park STE B</p>
              <p>Ridgeland, MS 39157</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  return { props: {} };
}
