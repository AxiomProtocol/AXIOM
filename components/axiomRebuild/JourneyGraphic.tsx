"use client";

import React, { useEffect, useRef } from "react";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce } from "./analytics";

interface JourneyGraphicProps {
  page?: 'home' | 'keygrow';
}

const journeySteps = [
  { label: "Proof", icon: "🏛️", description: "Real execution history" },
  { label: "Participation", icon: "🛤️", description: "Choose your path" },
  { label: "Land Projects", icon: "🌾", description: "Coordinate ownership" },
  { label: "Stewardship", icon: "🔒", description: "Maintain accountability" },
  { label: "Join", icon: "👥", description: "Build together" }
];

export function JourneyGraphic({ page = 'home' }: JourneyGraphicProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce(`${page}_module_view`, `journey_graphic_${page}`, { module: 'journey_graphic' });
          }
        });
      },
      { threshold: 0.3 }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [page]);
  
  return (
    <div
      ref={containerRef}
      style={{
        padding: "60px 20px",
        background: "linear-gradient(180deg, rgba(0,212,170,0.05) 0%, rgba(123,104,238,0.05) 100%)"
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h3
          style={{
            textAlign: "center",
            fontSize: 24,
            fontWeight: 700,
            color: "#1a1a2e",
            marginBottom: 40
          }}
        >
          The KeyGrow Journey
        </h3>
        
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            flexWrap: "wrap"
          }}
        >
          {journeySteps.map((step, idx) => (
            <React.Fragment key={idx}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "20px 24px",
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(10px)",
                  borderRadius: web3Theme.radii.xl,
                  boxShadow: web3Theme.shadows.card,
                  border: "1px solid rgba(0,212,170,0.15)",
                  minWidth: 140,
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = web3Theme.shadows.cardHover;
                  e.currentTarget.style.borderColor = web3Theme.colors.primary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = web3Theme.shadows.card;
                  e.currentTarget.style.borderColor = "rgba(0,212,170,0.15)";
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>{step.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 4 }}>
                  {step.label}
                </div>
                <div style={{ fontSize: 12, color: "rgba(26,26,46,0.6)", textAlign: "center" }}>
                  {step.description}
                </div>
              </div>
              
              {idx < journeySteps.length - 1 && (
                <div
                  style={{
                    fontSize: 24,
                    color: web3Theme.colors.primary,
                    fontWeight: 700
                  }}
                >
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
