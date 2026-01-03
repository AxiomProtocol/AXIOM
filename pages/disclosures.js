import Head from "next/head";
import SiteLayout from "../components/site/SiteLayout";

export default function DisclosuresPage() {
  return (
    <SiteLayout>
      <Head>
        <title>Disclosures | Axiom Protocol</title>
        <meta name="description" content="Important disclosures and risk information" />
      </Head>

      <div className="ax-page">
        <div className="ax-container">
          <h1 className="ax-h1">Disclosures</h1>
          <p className="ax-subhead">
            Please read these disclosures carefully before participating in the Axiom ecosystem.
          </p>
          
          <div style={{ marginTop: '32px' }}>
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Not Financial Advice</h3>
              <p className="ax-sectionBody">
                Nothing on this website constitutes financial, investment, legal, or tax advice. All information is provided for educational purposes only. Consult with qualified professionals before making any financial decisions.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Risk Disclosure</h3>
              <p className="ax-sectionBody">
                Participation in DeFi protocols and cryptocurrency involves significant risk, including the potential loss of all invested capital. Past performance is not indicative of future results. Only participate with funds you can afford to lose.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Self-Custody Model</h3>
              <p className="ax-sectionBody">
                Axiom is a non-custodial DeFi protocol. All funds are held in your own wallet or in smart contracts you interact with directly. Axiom does not hold, custody, or control your assets. This is not a bank. There is no FDIC insurance or equivalent protection.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Smart Contract Risk</h3>
              <p className="ax-sectionBody">
                Smart contracts may contain bugs or vulnerabilities despite auditing. Protocol upgrades, exploits, or unforeseen circumstances could result in loss of funds. Users should review all smart contracts and understand the risks before participating.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">No Guarantees</h3>
              <p className="ax-sectionBody">
                Axiom makes no guarantees about returns, rewards, or outcomes. Variable protocol rewards depend on many factors including market conditions, participation levels, and protocol performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
