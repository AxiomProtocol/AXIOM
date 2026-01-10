"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce, trackCta } from "./analytics";

interface RoleCardsProps {
  page?: 'home' | 'keygrow';
}

const roles = [
  { 
    name: "Builder", 
    icon: "🔨", 
    description: "Planning, labor, and operational execution for land projects",
    color: "rgba(0,212,170,0.1)"
  },
  { 
    name: "Capital Contributor", 
    icon: "💰", 
    description: "Funding toward acquisition or development under defined terms",
    color: "rgba(255,215,0,0.1)"
  },
  { 
    name: "Steward", 
    icon: "🔒", 
    description: "Documentation, transparency, and accountability oversight",
    color: "rgba(123,104,238,0.1)"
  },
  { 
    name: "Resource Partner", 
    icon: "🚛", 
    description: "Equipment, materials, logistics, and specialized skills",
    color: "rgba(0,212,170,0.1)"
  },
  { 
    name: "Local Partner", 
    icon: "📍", 
    description: "On-site coordination and local execution support",
    color: "rgba(255,215,0,0.1)"
  }
];

export function RoleCards({ page = 'home' }: RoleCardsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce(`${page}_module_view`, `role_cards_${page}`, { module: 'role_cards' });
          }
        });
      },
      { threshold: 0.3 }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [page]);
  
  const handleCtaClick = (label: string, href: string) => {
    trackCta(page, label, href);
  };
  
  return (
    <>
      <style jsx>{`
        .role-cards-section {
          padding: 32px 16px;
        }
        @media (min-width: 768px) {
          .role-cards-section {
            padding: 60px 20px;
          }
        }
        .role-cards-title {
          font-size: 22px;
        }
        @media (min-width: 768px) {
          .role-cards-title {
            font-size: 28px;
          }
        }
        .role-cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 768px) {
          .role-cards-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
          }
        }
        .role-card {
          padding: 16px;
        }
        @media (min-width: 768px) {
          .role-card {
            padding: 24px;
          }
        }
        .role-cta-container {
          flex-direction: column;
          gap: 12px;
        }
        @media (min-width: 768px) {
          .role-cta-container {
            flex-direction: row;
            gap: 16px;
          }
        }
      `}</style>
      <div ref={containerRef} className="role-cards-section">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h3
            className="role-cards-title"
            style={{
              textAlign: "center",
              fontWeight: 700,
              color: "#1a1a2e",
              marginBottom: 12
            }}
          >
            How People Participate in KeyGrow
          </h3>
          <p
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "rgba(26,26,46,0.7)",
              maxWidth: 600,
              margin: "0 auto 24px"
            }}
          >
            KeyGrow is built on defined roles, not vague membership. Choose your participation path.
          </p>
          
          <div className="role-cards-grid" style={{ marginBottom: 24 }}>
          {roles.map((role, idx) => (
            <div
              key={idx}
              className="role-card"
              style={{
                background: role.color,
                backdropFilter: "blur(10px)",
                borderRadius: web3Theme.radii.lg,
                border: "1px solid rgba(0,212,170,0.15)",
                boxShadow: web3Theme.shadows.card,
                transition: "all 0.3s ease",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = web3Theme.shadows.cardHover;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = web3Theme.shadows.card;
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{role.icon}</div>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: "#1a1a2e", marginBottom: 6 }}>
                {role.name}
              </h4>
              <p style={{ fontSize: 12, color: "rgba(26,26,46,0.7)", lineHeight: 1.4 }}>
                {role.description}
              </p>
            </div>
          ))}
        </div>
        
          <div className="role-cta-container" style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            <Link
              href="/keygrow?section=paths"
              onClick={() => handleCtaClick("Choose Your Participation Path", "/keygrow?section=paths")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 20px",
                background: web3Theme.colors.primary,
                color: "#fff",
                borderRadius: web3Theme.radii.lg,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: web3Theme.shadows.card,
                transition: "all 0.2s ease",
                width: "100%"
              }}
            >
              🛤️ Choose Your Path
            </Link>
            <Link
              href="/keygrow?section=projects"
              onClick={() => handleCtaClick("See Land Projects", "/keygrow?section=projects")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 20px",
                background: "rgba(255,255,255,0.9)",
                color: "#1a1a2e",
                border: `1px solid ${web3Theme.colors.primary}`,
                borderRadius: web3Theme.radii.lg,
                fontWeight: 600,
                fontSize: 14,
                textDecoration: "none",
                boxShadow: web3Theme.shadows.card,
                transition: "all 0.2s ease",
                width: "100%"
              }}
            >
              🌾 See Land Projects
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
