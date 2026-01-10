"use client";

import React, { useEffect, useRef } from "react";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce } from "./analytics";

interface LandownerCalloutProps {
  page?: 'home' | 'keygrow';
}

export function LandownerCallout({ page = 'home' }: LandownerCalloutProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce(`${page}_module_view`, `landowner_callout_${page}`, { module: 'landowner_callout' });
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
        .landowner-section {
          padding: 32px 16px;
        }
        @media (min-width: 768px) {
          .landowner-section {
            padding: 60px 20px;
          }
        }
        .landowner-callout-grid {
          grid-template-columns: 1fr;
          text-align: center;
          padding: 24px 20px;
          gap: 24px;
        }
        @media (min-width: 768px) {
          .landowner-callout-grid {
            grid-template-columns: 1fr auto;
            text-align: left;
            padding: 48px 40px;
            gap: 40px;
          }
        }
        .landowner-title {
          font-size: 22px;
        }
        @media (min-width: 768px) {
          .landowner-title {
            font-size: 28px;
          }
        }
        .landowner-features {
          justify-content: center;
        }
        @media (min-width: 768px) {
          .landowner-features {
            justify-content: flex-start;
          }
        }
      `}</style>
      <div
        ref={containerRef}
        className="landowner-section"
        style={{
          background: "linear-gradient(135deg, rgba(212,175,55,0.08) 0%, rgba(123,104,238,0.08) 100%)"
        }}
      >
        <div
          className="landowner-callout-grid"
          style={{
          maxWidth: 1000,
          margin: "0 auto",
          background: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(20px)",
          borderRadius: web3Theme.radii.xl,
          border: web3Theme.borders.subtle,
          boxShadow: web3Theme.shadows.card,
          display: "grid",
          alignItems: "center"
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(212,175,55,0.15)",
              padding: "6px 12px",
              borderRadius: 16,
              marginBottom: 12
            }}
          >
            <span style={{ fontSize: 14 }}>🏠</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#d4af37" }}>
              FOR LANDOWNERS
            </span>
          </div>
          
          <h3
            className="landowner-title"
            style={{
              fontWeight: 700,
              color: "#1a1a2e",
              marginBottom: 10,
              lineHeight: 1.3
            }}
          >
            Own Land? Partner With Our Community
          </h3>
          
          <p
            style={{
              fontSize: 14,
              color: "rgba(26,26,46,0.7)",
              lineHeight: 1.6,
              marginBottom: 16,
              maxWidth: 550
            }}
          >
            Submit your property for consideration in our land acquisition program. 
            We work with landowners to create structured deals that benefit both sellers 
            and community buyers through our steward-led evaluation process.
          </p>

          <div
            className="landowner-features"
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#00d4aa", fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, color: "rgba(26,26,46,0.7)" }}>
                No listing fees
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#00d4aa", fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, color: "rgba(26,26,46,0.7)" }}>
                Flexible terms
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: "#00d4aa", fontSize: 16 }}>✓</span>
              <span style={{ fontSize: 13, color: "rgba(26,26,46,0.7)" }}>
                Community buyers
              </span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <a
            href="/landowners/submit"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "14px 24px",
              background: "linear-gradient(135deg, #d4af37 0%, #b8960c 100%)",
              color: "#fff",
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(212,175,55,0.3)",
              transition: "transform 0.2s ease, box-shadow 0.2s ease",
              whiteSpace: "nowrap"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 30px rgba(212,175,55,0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(212,175,55,0.3)";
            }}
          >
            <span style={{ fontSize: 18 }}>📋</span>
            Submit Your Property
          </a>
          <p
            style={{
              fontSize: 11,
              color: "rgba(26,26,46,0.5)",
              marginTop: 8
            }}
          >
            Takes less than 5 minutes
          </p>
        </div>
      </div>
      </div>
    </>
  );
}
