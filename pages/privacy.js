import Head from "next/head";
import SiteLayout from "../components/site/SiteLayout";

export default function PrivacyPage() {
  return (
    <SiteLayout>
      <Head>
        <title>Privacy Policy | Axiom Protocol</title>
        <meta name="description" content="Privacy policy for Axiom Protocol" />
      </Head>

      <div className="ax-page">
        <div className="ax-container">
          <h1 className="ax-h1">Privacy Policy</h1>
          <p className="ax-subhead">
            Your privacy is important to us. This policy explains how we handle your information.
          </p>
          
          <div style={{ marginTop: '32px' }}>
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Information Collection</h3>
              <p className="ax-sectionBody">
                Axiom Protocol is a decentralized application. We collect minimal information necessary to provide our services. Wallet addresses used for interactions are public on the blockchain by nature.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Blockchain Data</h3>
              <p className="ax-sectionBody">
                All blockchain transactions are public and immutable. When you interact with Axiom smart contracts, your wallet address and transaction details are recorded on the public blockchain.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Analytics</h3>
              <p className="ax-sectionBody">
                We may use analytics tools to understand how users interact with our website. This data is used to improve user experience and does not identify individual users.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Contact</h3>
              <p className="ax-sectionBody">
                For privacy-related inquiries, please contact us through our official channels.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
