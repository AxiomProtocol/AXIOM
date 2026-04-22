"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface Web3HeroProps {
  kicker: string;
  headline: string;
  secondary: string;
  subheadline: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  microcopy: string;
}

export function Web3Hero({
  kicker,
  headline,
  secondary,
  subheadline,
  primaryCta,
  secondaryCta,
  microcopy
}: Web3HeroProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{ 
      padding: "80px 0 60px 0",
      background: "#FFFFFF",
      position: "relative",
      overflow: "hidden"
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0, 212, 170, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 80% 60%, rgba(123, 104, 238, 0.05) 0%, transparent 50%),
          radial-gradient(ellipse 50% 30% at 20% 80%, rgba(255, 215, 0, 0.04) 0%, transparent 50%)
        `,
        pointerEvents: "none"
      }} />

      <div style={{ 
        position: "absolute",
        top: "50%",
        right: "-5%",
        width: "400px",
        height: "400px",
        opacity: mounted ? 0.6 : 0,
        transition: "opacity 1s ease",
        pointerEvents: "none"
      }}>
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(123, 104, 238, 0.1) 100%)",
          borderRadius: "50%",
          filter: "blur(60px)",
          animation: "float 6s ease-in-out infinite"
        }} />
        <div style={{
          position: "absolute",
          top: "20%",
          left: "20%",
          width: "60%",
          height: "60%",
          background: "linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(0, 212, 170, 0.15) 100%)",
          borderRadius: "50%",
          filter: "blur(40px)",
          animation: "float 4s ease-in-out infinite reverse"
        }} />
      </div>

      <div style={{ 
        position: "absolute",
        top: "20%",
        left: "-10%",
        width: "300px",
        height: "300px",
        opacity: mounted ? 0.4 : 0,
        transition: "opacity 1.2s ease 0.3s",
        pointerEvents: "none"
      }}>
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(123, 104, 238, 0.12) 0%, rgba(0, 212, 170, 0.08) 100%)",
          borderRadius: "50%",
          filter: "blur(50px)",
          animation: "float 8s ease-in-out infinite"
        }} />
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", position: "relative" }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "40px",
          alignItems: "center"
        }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            borderRadius: "24px",
            padding: "40px",
            boxShadow: "0 12px 40px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.04)",
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            opacity: mounted ? 1 : 0,
            transition: "all 0.8s ease"
          }}>
            <div style={{ 
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(123, 104, 238, 0.08) 100%)",
              padding: "8px 16px",
              borderRadius: "100px",
              marginBottom: "20px",
              border: "1px solid rgba(0, 212, 170, 0.2)"
            }}>
              <span style={{ 
                width: "8px", 
                height: "8px", 
                background: "linear-gradient(135deg, #00D4AA 0%, #00A389 100%)",
                borderRadius: "50%",
                animation: "pulse 2s ease-in-out infinite"
              }} />
              <span style={{ 
                fontSize: "13px", 
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background: "linear-gradient(135deg, #00A389 0%, #00D4AA 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
              }}>{kicker}</span>
            </div>

            <h1 style={{ 
              fontSize: "clamp(32px, 5vw, 52px)", 
              lineHeight: 1.1, 
              margin: "0 0 12px 0",
              fontWeight: 700,
              color: "#0A0F1C"
            }}>{headline}</h1>
            
            <h2 style={{ 
              fontSize: "clamp(18px, 3vw, 26px)", 
              lineHeight: 1.3, 
              margin: "0 0 16px 0",
              fontWeight: 500,
              color: "rgba(10, 15, 28, 0.75)"
            }}>{secondary}</h2>

            <p style={{ 
              margin: "0 0 24px 0", 
              fontSize: "17px", 
              lineHeight: 1.6,
              color: "rgba(10, 15, 28, 0.65)", 
              maxWidth: "680px" 
            }}>{subheadline}</p>

            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
              <Link
                href={primaryCta.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "linear-gradient(135deg, #00D4AA 0%, #00A389 100%)",
                  color: "white",
                  padding: "14px 24px",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 4px 20px rgba(0, 212, 170, 0.3), 0 2px 8px rgba(0, 212, 170, 0.2)",
                  transition: "all 0.3s ease"
                }}
              >
                <span>🌱</span> {primaryCta.label}
              </Link>
              <Link
                href={secondaryCta.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "rgba(255, 255, 255, 0.9)",
                  border: "1px solid rgba(0, 0, 0, 0.1)",
                  color: "#0A0F1C",
                  padding: "14px 24px",
                  borderRadius: "14px",
                  fontSize: "15px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.3s ease"
                }}
              >
                <span>📖</span> {secondaryCta.label}
              </Link>
            </div>

            <p style={{ 
              marginTop: "20px", 
              fontSize: "13px", 
              color: "rgba(10, 15, 28, 0.5)",
              lineHeight: 1.5
            }}>{microcopy}</p>
          </div>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginTop: "40px"
        }}>
          {[
            { icon: "🌾", label: "Land Framework", value: "6+ Acres", desc: "Farmland initiative" },
            { icon: "👥", label: "Community", value: "Active", desc: "Shared ownership" },
            { icon: "🪙", label: "AXM Token", value: "Live", desc: "Governance enabled" },
            { icon: "⛓️", label: "On-Chain", value: "Arbitrum", desc: "Transparent records" }
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(0, 0, 0, 0.06)",
                borderRadius: "16px",
                padding: "20px",
                textAlign: "center",
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                opacity: mounted ? 1 : 0,
                transition: `all 0.6s ease ${0.1 * i}s`
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>{stat.icon}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "#0A0F1C" }}>{stat.value}</div>
              <div style={{ fontSize: "14px", fontWeight: 500, color: "rgba(10, 15, 28, 0.7)" }}>{stat.label}</div>
              <div style={{ fontSize: "12px", color: "rgba(10, 15, 28, 0.5)", marginTop: "4px" }}>{stat.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-15px) scale(1.02); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}
