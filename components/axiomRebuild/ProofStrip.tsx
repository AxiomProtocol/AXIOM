"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { web3Theme } from "./styles/web3Theme";
import { trackOnce, trackCta, trackProofInteraction } from "./analytics";

interface ProofStripProps {
  page?: 'home' | 'keygrow';
}

const proofTiles = [
  { type: 'image', src: '/keygrow-proof/proof-01.jpg', alt: 'Farmland acquisition proof 1' },
  { type: 'image', src: '/keygrow-proof/proof-02.jpg', alt: 'Farmland development proof 2' },
  { type: 'image', src: '/keygrow-proof/proof-03.jpg', alt: 'Community coordination proof 3' },
  { type: 'image', src: '/keygrow-proof/proof-04.jpg', alt: 'Land development progress 4' },
  { type: 'image', src: '/keygrow-proof/proof-05.jpg', alt: 'Stewardship proof 5' },
  { type: 'video', src: '/keygrow-proof/proof-clip-01.mp4', poster: '/keygrow-proof/proof-clip-01-poster.jpg', alt: 'Development video clip' }
];

export function ProofStrip({ page = 'home' }: ProofStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            trackOnce(`${page}_module_view`, `proof_strip_${page}`, { module: 'proof_strip' });
          }
        });
      },
      { threshold: 0.3 }
    );
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [page]);
  
  const scroll = (direction: 'prev' | 'next') => {
    trackProofInteraction(page, `carousel_${direction}`);
    const newIndex = direction === 'next' 
      ? Math.min(currentIndex + 1, proofTiles.length - 1)
      : Math.max(currentIndex - 1, 0);
    setCurrentIndex(newIndex);
    
    if (scrollRef.current) {
      const tileWidth = 280;
      scrollRef.current.scrollTo({
        left: newIndex * tileWidth,
        behavior: 'smooth'
      });
    }
  };
  
  const handleTileClick = (index: number) => {
    trackProofInteraction(page, 'tile_click', { tileIndex: index });
  };
  
  const handleVideoPlay = (index: number) => {
    trackProofInteraction(page, 'video_play', { tileIndex: index });
  };
  
  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set([...prev, index]));
  };
  
  const handleCtaClick = (label: string, href: string) => {
    trackCta(page, label, href);
  };
  
  const renderPlaceholder = (index: number, alt: string) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, rgba(0,212,170,0.1) 0%, rgba(123,104,238,0.1) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: web3Theme.radii.md,
        border: "2px dashed rgba(0,212,170,0.3)"
      }}
    >
      <span style={{ fontSize: 48, marginBottom: 8 }}>🌾</span>
      <span style={{ fontSize: 12, color: "rgba(26,26,46,0.5)", textAlign: "center", padding: "0 12px" }}>
        Proof #{index + 1}
      </span>
    </div>
  );
  
  return (
    <div ref={containerRef} style={{ padding: "60px 20px", background: "rgba(0,212,170,0.03)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h3
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#1a1a2e",
              marginBottom: 12
            }}
          >
            Foundational Land Project Proof
          </h3>
          <p style={{ fontSize: 16, color: "rgba(26,26,46,0.7)", maxWidth: 600, margin: "0 auto 8px" }}>
            Real community coordination, real land acquisition, real development progress. This proof informs the KeyGrow model.
          </p>
          <p style={{ fontSize: 13, color: "rgba(26,26,46,0.5)", fontStyle: "italic" }}>
            Proof of execution, not a promise of results.
          </p>
        </div>
        
        <div style={{ position: "relative" }}>
          <button
            onClick={() => scroll('prev')}
            disabled={currentIndex === 0}
            style={{
              position: "absolute",
              left: -20,
              top: "50%",
              transform: "translateY(-50%)",
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: currentIndex === 0 ? "rgba(26,26,46,0.1)" : web3Theme.colors.primary,
              border: "none",
              color: currentIndex === 0 ? "rgba(26,26,46,0.3)" : "#fff",
              fontSize: 20,
              cursor: currentIndex === 0 ? "not-allowed" : "pointer",
              zIndex: 10,
              boxShadow: web3Theme.shadows.card,
              transition: "all 0.2s ease"
            }}
          >
            ←
          </button>
          
          <div
            ref={scrollRef}
            style={{
              display: "flex",
              gap: 20,
              overflowX: "auto",
              scrollSnapType: "x mandatory",
              scrollBehavior: "smooth",
              padding: "10px 0",
              msOverflowStyle: "none",
              scrollbarWidth: "none"
            }}
          >
            {proofTiles.map((tile, idx) => (
              <div
                key={idx}
                onClick={() => handleTileClick(idx)}
                style={{
                  minWidth: 260,
                  height: 180,
                  borderRadius: web3Theme.radii.lg,
                  overflow: "hidden",
                  boxShadow: web3Theme.shadows.card,
                  scrollSnapAlign: "start",
                  cursor: "pointer",
                  transition: "transform 0.2s ease",
                  background: "#fff"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.02)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {tile.type === 'video' ? (
                  imageErrors.has(idx) ? renderPlaceholder(idx, tile.alt) : (
                    <video
                      poster={tile.poster}
                      controls
                      onPlay={() => handleVideoPlay(idx)}
                      onError={() => handleImageError(idx)}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    >
                      <source src={tile.src} type="video/mp4" />
                    </video>
                  )
                ) : (
                  imageErrors.has(idx) ? renderPlaceholder(idx, tile.alt) : (
                    <img
                      src={tile.src}
                      alt={tile.alt}
                      onError={() => handleImageError(idx)}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )
                )}
              </div>
            ))}
          </div>
          
          <button
            onClick={() => scroll('next')}
            disabled={currentIndex >= proofTiles.length - 1}
            style={{
              position: "absolute",
              right: -20,
              top: "50%",
              transform: "translateY(-50%)",
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: currentIndex >= proofTiles.length - 1 ? "rgba(26,26,46,0.1)" : web3Theme.colors.primary,
              border: "none",
              color: currentIndex >= proofTiles.length - 1 ? "rgba(26,26,46,0.3)" : "#fff",
              fontSize: 20,
              cursor: currentIndex >= proofTiles.length - 1 ? "not-allowed" : "pointer",
              zIndex: 10,
              boxShadow: web3Theme.shadows.card,
              transition: "all 0.2s ease"
            }}
          >
            →
          </button>
        </div>
        
        <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 32 }}>
          <Link
            href="/origin"
            onClick={() => handleCtaClick("See Our Origin Story", "/origin")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: web3Theme.colors.primary,
              color: "#fff",
              borderRadius: web3Theme.radii.lg,
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: web3Theme.shadows.card,
              transition: "all 0.2s ease"
            }}
          >
            🏛️ See Our Origin Story
          </Link>
          <Link
            href="/keygrow"
            onClick={() => handleCtaClick("Explore KeyGrow", "/keygrow")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              background: "rgba(255,255,255,0.9)",
              color: "#1a1a2e",
              border: `1px solid ${web3Theme.colors.primary}`,
              borderRadius: web3Theme.radii.lg,
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
              boxShadow: web3Theme.shadows.card,
              transition: "all 0.2s ease"
            }}
          >
            🌱 Explore KeyGrow
          </Link>
        </div>
      </div>
    </div>
  );
}
