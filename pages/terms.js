import Head from "next/head";
import SiteLayout from "../components/site/SiteLayout";

export default function TermsPage() {
  return (
    <SiteLayout>
      <Head>
        <title>Terms of Service | Axiom Protocol</title>
        <meta name="description" content="Terms of service for Axiom Protocol" />
      </Head>

      <div className="ax-page">
        <div className="ax-container">
          <h1 className="ax-h1">Terms of Service</h1>
          <p className="ax-subhead">
            Please read these terms carefully before using Axiom Protocol.
          </p>
          
          <div style={{ marginTop: '32px' }}>
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Acceptance of Terms</h3>
              <p className="ax-sectionBody">
                By accessing or using Axiom Protocol, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the protocol.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Eligibility</h3>
              <p className="ax-sectionBody">
                You must be at least 18 years old and legally able to enter into contracts to use Axiom Protocol. You are responsible for ensuring your use complies with all applicable laws in your jurisdiction.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">No Warranty</h3>
              <p className="ax-sectionBody">
                Axiom Protocol is provided "as is" without warranty of any kind. We do not guarantee the protocol will be error-free, secure, or continuously available.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Limitation of Liability</h3>
              <p className="ax-sectionBody">
                To the maximum extent permitted by law, Axiom Protocol and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the protocol.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Changes to Terms</h3>
              <p className="ax-sectionBody">
                We reserve the right to modify these terms at any time. Continued use of the protocol after changes constitutes acceptance of the modified terms.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
