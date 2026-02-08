import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { proofPageCopy } from "../lib/axiomContent";

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
    card: "0 4px 24px rgba(0,0,0,0.08)",
    cardHover: "0 8px 32px rgba(0,0,0,0.12)"
  },
  borders: {
    card: "1px solid rgba(0,0,0,0.06)"
  }
};

function ProofImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) {
    return (
      <div
        style={{
          width: "100%",
          height: 200,
          background: "linear-gradient(135deg, rgba(0,212,170,0.1) 0%, rgba(123,104,238,0.1) 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: web3Theme.radii.lg,
          border: "2px dashed rgba(0,212,170,0.3)"
        }}
      >
        <span style={{ fontSize: 48, marginBottom: 8 }}>🌾</span>
        <span style={{ fontSize: 12, color: "rgba(26,26,46,0.5)" }}>Image coming soon</span>
      </div>
    );
  }
  
  return (
    <img
      src={`/keygrow-proof/${src}`}
      alt={alt}
      onError={() => setHasError(true)}
      style={{
        width: "100%",
        height: 200,
        objectFit: "cover",
        borderRadius: web3Theme.radii.lg,
        boxShadow: web3Theme.shadows.card
      }}
    />
  );
}

export default function ProofPage() {
  return (
    <>
      <Head>
        <title>Proof of Execution | Axiom</title>
        <meta name="description" content="Real land. Real people. Verified outcomes. See the proof behind Axiom's land coordination model." />
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
              {proofPageCopy.hero.title}
            </h1>
            <p
              style={{
                fontSize: 20,
                color: "rgba(26,26,46,0.7)",
                marginBottom: 24
              }}
            >
              {proofPageCopy.hero.subtitle}
            </p>
            <div
              style={{
                background: "rgba(255,193,7,0.1)",
                borderRadius: web3Theme.radii.md,
                padding: "12px 20px",
                display: "inline-block"
              }}
            >
              <p style={{ fontSize: 14, color: "rgba(26,26,46,0.7)", margin: 0, fontStyle: "italic" }}>
                ⚠️ {proofPageCopy.hero.disclaimer}
              </p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 20px" }}>
          {proofPageCopy.sections.map((section, idx) => (
            <div
              key={section.id}
              id={section.id}
              style={{
                marginBottom: 60,
                paddingBottom: 60,
                borderBottom: idx < proofPageCopy.sections.length - 1 ? "1px solid rgba(0,0,0,0.08)" : "none"
              }}
            >
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#1a1a2e",
                  marginBottom: 16
                }}
              >
                {section.title}
              </h2>
              <p
                style={{
                  fontSize: 16,
                  color: "rgba(26,26,46,0.7)",
                  lineHeight: 1.7,
                  marginBottom: 24,
                  maxWidth: 700
                }}
              >
                {section.body}
              </p>
              
              {section.images.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 20
                  }}
                >
                  {section.images.map((img, imgIdx) => (
                    <ProofImage key={imgIdx} src={img} alt={`${section.title} - Image ${imgIdx + 1}`} />
                  ))}
                </div>
              )}
              
              {section.images.length === 0 && (
                <div
                  style={{
                    background: "rgba(0,212,170,0.05)",
                    borderRadius: web3Theme.radii.lg,
                    padding: 40,
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: 48 }}>📋</span>
                  <p style={{ fontSize: 14, color: "rgba(26,26,46,0.5)", marginTop: 12 }}>
                    Documentation and verification materials available upon request.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            background: "linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(123,104,238,0.05) 100%)",
            padding: "60px 20px",
            textAlign: "center"
          }}
        >
          <h3 style={{ fontSize: 24, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>
            Ready to Participate?
          </h3>
          <p style={{ fontSize: 16, color: "rgba(26,26,46,0.7)", marginBottom: 24, maxWidth: 500, margin: "0 auto 24px" }}>
            Join the community building structured paths to shared land ownership.
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
              href="/origin"
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
              🏛️ Read Origin Story
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
