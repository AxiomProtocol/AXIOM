import React, { useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { tokenomicsTable, tokenUtilityCopy } from '../lib/axiomContent';
import { TokenUtilityCallout } from '../components/axiomRebuild/TokenUtilityCallout';

const web3Theme = {
  colors: {
    primary: "#00D4AA",
    secondary: "#7B68EE"
  },
  radii: {
    md: "8px",
    lg: "12px",
    xl: "16px"
  },
  shadows: {
    card: "0 4px 24px rgba(0,0,0,0.08)"
  }
};

const allocationColors = [
  "#00D4AA",
  "#7B68EE",
  "#FFD700",
  "#FF6B6B",
  "#4ECDC4",
  "#95E1D3"
];

function trackSectionView(section: string) {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('[Analytics] tokenomics_section_view:', section);
    window.dispatchEvent(new CustomEvent('axiom_analytics', {
      detail: { event: 'tokenomics_section_view', section }
    }));
  }
}

export default function TokenomicsPage() {
  const tableRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const key = 'tokenomics_table_viewed';
    if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
      trackSectionView('allocation_table');
      sessionStorage.setItem(key, 'true');
    }
  }, []);

  return (
    <>
      <Head>
        <title>Tokenomics | Axiom</title>
        <meta name="description" content="AXM token allocation, utility, and vesting schedules for the Axiom land coordination protocol." />
      </Head>

      <div style={{ minHeight: "100vh", background: "#fff" }}>
        <div style={{ 
          background: "linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(123,104,238,0.05) 100%)",
          padding: "80px 20px 60px"
        }}>
          <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: web3Theme.colors.primary,
                textDecoration: "none",
                fontSize: 14,
                marginBottom: 24
              }}
            >
              ← Back to Home
            </Link>
            
            <h1
              style={{
                fontSize: 42,
                fontWeight: 700,
                color: "#1a1a2e",
                marginBottom: 16
              }}
            >
              Tokenomics
            </h1>
            <p
              style={{
                fontSize: 20,
                color: "rgba(26,26,46,0.7)",
                marginBottom: 16
              }}
            >
              AXM token allocation and utility for the Axiom land coordination protocol.
            </p>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 20px" }}>
          <div style={{ marginBottom: 60 }}>
            <TokenUtilityCallout page="tokenomics" />
          </div>

          <div ref={tableRef} style={{ marginBottom: 60 }}>
            <h2
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#1a1a2e",
                marginBottom: 16
              }}
            >
              {tokenomicsTable.title}
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "rgba(26,26,46,0.7)",
                marginBottom: 32
              }}
            >
              {tokenomicsTable.description}
            </p>

            <div
              style={{
                background: "rgba(255,255,255,0.95)",
                borderRadius: web3Theme.radii.xl,
                boxShadow: web3Theme.shadows.card,
                overflow: "hidden",
                border: "1px solid rgba(0,0,0,0.06)"
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 100px 1fr",
                  gap: 0,
                  background: "rgba(0,212,170,0.08)",
                  padding: "16px 24px",
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#1a1a2e"
                }}
              >
                <div>Category</div>
                <div style={{ textAlign: "center" }}>Allocation</div>
                <div>Vesting</div>
              </div>

              {tokenomicsTable.allocations.map((row, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 100px 1fr",
                    gap: 0,
                    padding: "16px 24px",
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                    alignItems: "center"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: "50%",
                        background: allocationColors[idx % allocationColors.length]
                      }}
                    />
                    <span style={{ fontSize: 15, color: "#1a1a2e" }}>{row.category}</span>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      fontWeight: 700,
                      fontSize: 16,
                      color: web3Theme.colors.primary
                    }}
                  >
                    {row.percentage}%
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(26,26,46,0.6)" }}>
                    {row.vesting}
                  </div>
                </div>
              ))}
            </div>

            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "rgba(26,26,46,0.5)",
                marginTop: 24,
                fontStyle: "italic"
              }}
            >
              {tokenomicsTable.footnote}
            </p>
          </div>

          <div
            style={{
              background: "linear-gradient(135deg, rgba(0,212,170,0.05) 0%, rgba(123,104,238,0.05) 100%)",
              borderRadius: web3Theme.radii.xl,
              padding: 40,
              textAlign: "center"
            }}
          >
            <h3 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>
              Participate in Land Coordination
            </h3>
            <p style={{ fontSize: 16, color: "rgba(26,26,46,0.7)", marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" }}>
              The AXM token enables participation in land acquisition, development, and stewardship through the Axiom protocol.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
              <Link
                href="/keygrow"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 28px",
                  background: web3Theme.colors.primary,
                  color: "#fff",
                  borderRadius: web3Theme.radii.lg,
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: "none",
                  boxShadow: web3Theme.shadows.card
                }}
              >
                🌱 Explore KeyGrow
              </Link>
              <Link
                href="/proof"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "14px 28px",
                  background: "rgba(255,255,255,0.9)",
                  color: "#1a1a2e",
                  border: `1px solid ${web3Theme.colors.primary}`,
                  borderRadius: web3Theme.radii.lg,
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: "none"
                }}
              >
                📋 View Proof
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
