"use client";

import React, { useEffect, useRef, useState } from "react";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce } from "./analytics";

interface MetricItem {
  value: string;
  label: string;
  icon: string;
  highlight?: boolean;
}

const staticMetrics: MetricItem[] = [
  { value: "6+", label: "Acres (Real Land)", icon: "🌾" },
  { value: "Active", label: "Community", icon: "👥" }
];

interface MetricsRowProps {
  page?: 'home' | 'keygrow';
}

export function MetricsRow({ page = 'home' }: MetricsRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [crowdfundingMetrics, setCrowdfundingMetrics] = useState<MetricItem[]>([
    { value: "2", label: "Live Projects", icon: "📍", highlight: true },
    { value: "$173K+", label: "Community Raised", icon: "💰", highlight: true }
  ]);

  useEffect(() => {
    async function fetchCrowdfundingStats() {
      try {
        const res = await fetch('/api/land-acquisition/campaigns');
        const data = await res.json();
        if (data.success && data.data?.stats) {
          const stats = data.data.stats;
          const totalRaised = parseFloat(stats.total_raised || '0');
          const formattedRaised = totalRaised >= 1000000 
            ? `$${(totalRaised / 1000000).toFixed(1)}M` 
            : totalRaised >= 1000 
              ? `$${Math.floor(totalRaised / 1000)}K+`
              : `$${totalRaised}`;
          
          setCrowdfundingMetrics([
            { value: String(stats.active || 0), label: "Live Projects", icon: "📍", highlight: true },
            { value: formattedRaised, label: "Community Raised", icon: "💰", highlight: true }
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch crowdfunding stats:', err);
      }
    }
    fetchCrowdfundingStats();
  }, []);
  
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

  const allMetrics = [...staticMetrics, ...crowdfundingMetrics];
  
  return (
    <>
      <style jsx>{`
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          max-width: 1000px;
          margin: 0 auto;
          padding: 40px 20px;
        }
        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
      <div ref={rowRef} className="metrics-grid">
        {allMetrics.map((metric, idx) => (
          <div
            key={idx}
            style={{
              background: metric.highlight 
                ? "linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(123,104,238,0.08) 100%)"
                : "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px)",
              borderRadius: web3Theme.radii.lg,
              padding: 24,
              textAlign: "center",
              boxShadow: web3Theme.shadows.card,
              border: metric.highlight 
                ? "1px solid rgba(0, 212, 170, 0.3)"
                : "1px solid rgba(0, 212, 170, 0.15)",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden"
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
            {metric.highlight && (
              <div
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#00d4aa",
                  animation: "pulse 2s infinite"
                }}
              />
            )}
            <div style={{ fontSize: 32, marginBottom: 8 }}>{metric.icon}</div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                background: metric.highlight 
                  ? "linear-gradient(135deg, #00D4AA 0%, #00b894 100%)"
                  : "linear-gradient(135deg, #00D4AA 0%, #7B68EE 100%)",
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
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
      `}</style>
    </>
  );
}
