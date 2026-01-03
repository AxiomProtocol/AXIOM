"use client";

import React, { useEffect, useRef } from "react";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce } from "./analytics";
import { futureLandPipelineCopy } from "../../lib/axiomContent";

interface FutureLandPipelineProps {
  page?: 'home' | 'keygrow';
}

export function FutureLandPipeline({ page = 'home' }: FutureLandPipelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce(`${page}_module_view`, `future_pipeline_${page}`, { module: 'future_land_pipeline' });
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
        background: "linear-gradient(135deg, rgba(0,212,170,0.03) 0%, rgba(123,104,238,0.03) 100%)"
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h3
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#1a1a2e",
              marginBottom: 16
            }}
          >
            {futureLandPipelineCopy.title}
          </h3>
          <p
            style={{
              fontSize: 16,
              color: "rgba(26,26,46,0.7)",
              maxWidth: 700,
              margin: "0 auto",
              lineHeight: 1.6
            }}
          >
            {futureLandPipelineCopy.body}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24
          }}
        >
          {futureLandPipelineCopy.stages.map((stage, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255,255,255,0.9)",
                backdropFilter: "blur(20px)",
                borderRadius: web3Theme.radii.lg,
                padding: 24,
                border: web3Theme.borders.subtle,
                boxShadow: web3Theme.shadows.card,
                textAlign: "center",
                transition: "transform 0.2s ease, box-shadow 0.2s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = web3Theme.shadows.cardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = web3Theme.shadows.card;
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: web3Theme.colors.primary,
                  marginBottom: 8
                }}
              >
                {stage.size}
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(26,26,46,0.7)",
                  lineHeight: 1.5
                }}
              >
                {stage.note}
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
          {futureLandPipelineCopy.footnote}
        </p>
      </div>
    </div>
  );
}
