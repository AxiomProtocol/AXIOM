"use client";

import React, { useEffect, useRef } from "react";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce } from "./analytics";
import { tokenUtilityCopy } from "../../lib/axiomContent";

interface TokenUtilityCalloutProps {
  page?: 'home' | 'tokenomics';
}

export function TokenUtilityCallout({ page = 'home' }: TokenUtilityCalloutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce(`${page}_section_view`, `token_utility_${page}`, { section: 'token_utility' });
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
        background: "linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(123,104,238,0.05) 100%)",
        borderRadius: web3Theme.radii.xl,
        padding: "40px 32px",
        border: web3Theme.borders.subtle,
        boxShadow: web3Theme.shadows.card
      }}
    >
      <h4
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: "#1a1a2e",
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          gap: 12
        }}
      >
        <span style={{ fontSize: 28 }}>🪙</span>
        {tokenUtilityCopy.title}
      </h4>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p
          style={{
            fontSize: 16,
            color: "rgba(26,26,46,0.85)",
            lineHeight: 1.7,
            margin: 0
          }}
        >
          {tokenUtilityCopy.primary}
        </p>
        
        <p
          style={{
            fontSize: 16,
            color: "rgba(26,26,46,0.85)",
            lineHeight: 1.7,
            margin: 0
          }}
        >
          {tokenUtilityCopy.secondary}
        </p>
        
        <div
          style={{
            background: "rgba(255,193,7,0.1)",
            borderRadius: web3Theme.radii.md,
            padding: "12px 16px",
            borderLeft: "4px solid #FFC107",
            marginTop: 8
          }}
        >
          <p
            style={{
              fontSize: 14,
              color: "rgba(26,26,46,0.7)",
              margin: 0,
              fontStyle: "italic"
            }}
          >
            ⚠️ {tokenUtilityCopy.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}
