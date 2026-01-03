import Head from "next/head";
import SiteLayout from "../components/site/SiteLayout";

export default function DocsPage() {
  return (
    <SiteLayout>
      <Head>
        <title>Documentation | Axiom Protocol</title>
        <meta name="description" content="Technical documentation and implementation notes" />
      </Head>

      <div className="ax-page">
        <div className="ax-container">
          <h1 className="ax-h1">Documentation</h1>
          <p className="ax-subhead">
            Technical documentation and implementation notes for developers and partners.
          </p>
          
          <div style={{ marginTop: '32px' }}>
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Smart Contracts</h3>
              <p className="ax-sectionBody">
                Axiom Protocol operates on Arbitrum One with 29 verified smart contracts covering identity, treasury, staking, emissions, and asset registry.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">API Reference</h3>
              <p className="ax-sectionBody">
                RESTful APIs for wallet integration, balance queries, governance participation, and protocol analytics.
              </p>
            </div>
            
            <div className="ax-section">
              <h3 className="ax-sectionTitle">Integration Guides</h3>
              <p className="ax-sectionBody">
                Step-by-step guides for integrating with Axiom Protocol, including wallet connection, token interactions, and governance participation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
