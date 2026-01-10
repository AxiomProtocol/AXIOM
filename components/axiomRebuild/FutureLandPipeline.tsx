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
    <>
      <style jsx>{`
        .pipeline-section {
          padding: 32px 16px;
        }
        @media (min-width: 768px) {
          .pipeline-section {
            padding: 60px 20px;
          }
        }
        .pipeline-title {
          font-size: 22px;
        }
        @media (min-width: 768px) {
          .pipeline-title {
            font-size: 28px;
          }
        }
        .pipeline-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 768px) {
          .pipeline-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 24px;
          }
        }
        .pipeline-card {
          padding: 16px;
        }
        @media (min-width: 768px) {
          .pipeline-card {
            padding: 24px;
          }
        }
      `}</style>
      <div
        ref={containerRef}
        className="pipeline-section"
        style={{
          background: "linear-gradient(135deg, rgba(0,212,170,0.03) 0%, rgba(123,104,238,0.03) 100%)"
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <h3
              className="pipeline-title"
              style={{
                fontWeight: 700,
                color: "#1a1a2e",
                marginBottom: 12
              }}
            >
              {futureLandPipelineCopy.title}
            </h3>
            <p
              style={{
                fontSize: 14,
                color: "rgba(26,26,46,0.7)",
                maxWidth: 700,
                margin: "0 auto",
                lineHeight: 1.5
              }}
            >
              {futureLandPipelineCopy.body}
            </p>
          </div>

          <div className="pipeline-grid">
            {futureLandPipelineCopy.stages.map((stage, idx) => (
              <div
                key={idx}
                className="pipeline-card"
                style={{
                  background: "rgba(255,255,255,0.9)",
                  backdropFilter: "blur(20px)",
                  borderRadius: web3Theme.radii.lg,
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
                    fontSize: 20,
                    fontWeight: 700,
                    color: web3Theme.colors.primary,
                    marginBottom: 6
                  }}
                >
                  {stage.size}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(26,26,46,0.7)",
                    lineHeight: 1.4
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
              fontSize: 12,
              color: "rgba(26,26,46,0.5)",
              marginTop: 20,
              fontStyle: "italic"
            }}
          >
            {futureLandPipelineCopy.footnote}
          </p>
        </div>
      </div>
    </>
  );
}
