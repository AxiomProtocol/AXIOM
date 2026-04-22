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
    <>
      <style jsx>{`
        .journey-section {
          padding: 32px 16px;
        }
        @media (min-width: 768px) {
          .journey-section {
            padding: 60px 20px;
          }
        }
        .journey-title {
          font-size: 20px;
          margin-bottom: 24px;
        }
        @media (min-width: 768px) {
          .journey-title {
            font-size: 24px;
            margin-bottom: 40px;
          }
        }
        .journey-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .journey-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        @media (min-width: 900px) {
          .journey-grid {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
        }
        .journey-step {
          padding: 14px 12px;
          min-width: auto;
        }
        @media (min-width: 768px) {
          .journey-step {
            padding: 20px 24px;
            min-width: 140px;
          }
        }
        .journey-arrow {
          display: none;
        }
        @media (min-width: 900px) {
          .journey-arrow {
            display: block;
          }
        }
      `}</style>
      <div
        ref={containerRef}
        className="journey-section"
        style={{
          background: "linear-gradient(180deg, rgba(0,212,170,0.05) 0%, rgba(123,104,238,0.05) 100%)"
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h3
            className="journey-title"
            style={{
              textAlign: "center",
              fontWeight: 700,
              color: "#1a1a2e"
            }}
          >
            The KeyGrow Journey
          </h3>
          
          <div className="journey-grid">
            {journeySteps.map((step, idx) => (
              <React.Fragment key={idx}>
                <div
                  className="journey-step"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "rgba(255,255,255,0.9)",
                    backdropFilter: "blur(10px)",
                    borderRadius: web3Theme.radii.xl,
                    boxShadow: web3Theme.shadows.card,
                    border: "1px solid rgba(0,212,170,0.15)",
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
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{step.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e", marginBottom: 2 }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(26,26,46,0.6)", textAlign: "center" }}>
                    {step.description}
                  </div>
                </div>
                
                {idx < journeySteps.length - 1 && (
                  <div
                    className="journey-arrow"
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
    </>
  );
}
