"use client";

import React, { useEffect, useRef } from "react";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce } from "./analytics";

interface MetricItem {
  value: string;
  label: string;
  icon: string;
}

const metrics: MetricItem[] = [
  { value: "6+", label: "Acres (Real Land)", icon: "🌾" },
  { value: "Active", label: "Community", icon: "👥" },
  { value: "5", label: "Participation Paths", icon: "🛤️" },
  { value: "Land +", label: "Infrastructure Focus", icon: "🏗️" }
];

interface MetricsRowProps {
  page?: 'home' | 'keygrow';
}

export function MetricsRow({ page = 'home' }: MetricsRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!rowRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce(`${page}_module_view`, `metrics_row_${page}`, { module: 'metrics_row' });
          }
        });
      },
      { threshold: 0.3 }
    );
    
    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [page]);
  
  return (
    <div
      ref={rowRef}
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 24,
        maxWidth: 1000,
        margin: "0 auto",
        padding: "40px 20px"
      }}
    >
      {metrics.map((metric, idx) => (
        <div
          key={idx}
          style={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(20px)",
            borderRadius: web3Theme.radii.lg,
            padding: 24,
            textAlign: "center",
            boxShadow: web3Theme.shadows.card,
            border: "1px solid rgba(0, 212, 170, 0.15)",
            transition: "all 0.3s ease"
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
          <div style={{ fontSize: 32, marginBottom: 8 }}>{metric.icon}</div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              background: "linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 4
            }}
          >
            {metric.value}
          </div>
          <div style={{ fontSize: 14, color: "rgba(26, 26, 46, 0.7)" }}>{metric.label}</div>
        </div>
      ))}
      <style jsx>{`
        @media (max-width: 768px) {
          div:first-child {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </div>
  );
}
