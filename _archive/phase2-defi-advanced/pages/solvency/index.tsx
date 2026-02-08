import Head from "next/head";

export default function SolvencyPage() {
  return (
    <>
      <Head>
        <title>Axiom Protocol | Solvency & Capital Integrity</title>
        <meta
          name="description"
          content="Axiom Protocol Solvency Monitor providing transparency into capital structure, reserves, and risk posture."
        />
      </Head>

      <main style={styles.main}>
        <section style={styles.container}>
          <h1 style={styles.title}>Global Solvency Monitor</h1>

          <p style={styles.subtitle}>
            Capital preservation and institutional risk discipline.
          </p>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Protocol Status</h2>
            <ul style={styles.list}>
              <li>Operational Status: Active</li>
              <li>Capital Deployment: Controlled</li>
              <li>Liquidity Events: None pending</li>
              <li>Leverage Policy: Conservative</li>
            </ul>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Legal & Structural Framework</h2>
            <ul style={styles.list}>
              <li>Legal Structure: Delaware Statutory Trust</li>
              <li>Asset Segregation: Enforced</li>
              <li>Counterparty Exposure: Limited</li>
              <li>Custodial Separation: Maintained</li>
            </ul>
          </div>

          <div style={styles.card}>
            <h2 style={styles.sectionTitle}>Audit & Oversight</h2>
            <ul style={styles.list}>
              <li>Audit Tier: Tier-1 Independent Review</li>
              <li>Audit Firm: Deloitte</li>
              <li>Reporting Cadence: Periodic</li>
              <li>Public Disclosures: Selective & Verified</li>
            </ul>
          </div>

          <div style={styles.notice}>
            <p>
              This page is informational only. It does not constitute an offer,
              solicitation, or financial advice. Data is presented for
              transparency and risk awareness.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}

const styles = {
  main: {
    minHeight: "100vh",
    backgroundColor: "#0b0f14",
    color: "#e5e7eb",
    display: "flex",
    justifyContent: "center",
    padding: "60px 20px",
  },
  container: {
    maxWidth: "720px",
    width: "100%",
  },
  title: {
    fontSize: "32px",
    fontWeight: 600,
    marginBottom: "8px",
  },
  subtitle: {
    fontSize: "16px",
    opacity: 0.8,
    marginBottom: "32px",
  },
  card: {
    border: "1px solid #1f2933",
    borderRadius: "8px",
    padding: "20px",
    marginBottom: "20px",
    backgroundColor: "#0f1623",
  },
  sectionTitle: {
    fontSize: "18px",
    marginBottom: "12px",
  },
  list: {
    listStyleType: "none",
    padding: 0,
    lineHeight: "1.8",
  },
  notice: {
    marginTop: "40px",
    fontSize: "13px",
    opacity: 0.7,
  },
};