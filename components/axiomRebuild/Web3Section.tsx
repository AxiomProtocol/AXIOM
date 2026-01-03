"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { sectionIcons } from "./styles/web3Theme";

interface Web3SectionProps {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  variant?: "default" | "highlight" | "gradient" | "dark";
  index?: number;
  image?: string;
  imageAlt?: string;
}

export function Web3Section({
  id,
  title,
  body,
  bullets,
  primaryCta,
  secondaryCta,
  variant = "default",
  index = 0,
  image,
  imageAlt
}: Web3SectionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);
  const iconData = sectionIcons[id as keyof typeof sectionIcons] || { icon: "✨", emoji: "🔮", label: "Feature" };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const isEven = index % 2 === 0;
  const isHighlight = variant === "highlight" || id === "keygrow";
  const isDark = variant === "dark" || id === "start";

  const paragraphs = body.split("\n\n");

  return (
    <section
      ref={sectionRef}
      id={id}
      style={{
        padding: "80px 0",
        background: isDark 
          ? "linear-gradient(180deg, #0A0F1C 0%, #141B2D 100%)"
          : isHighlight
            ? "linear-gradient(135deg, rgba(0, 212, 170, 0.03) 0%, rgba(123, 104, 238, 0.02) 100%)"
            : "#FFFFFF",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {isHighlight && (
        <div style={{
          position: "absolute",
          top: "50%",
          right: isEven ? "-10%" : "auto",
          left: isEven ? "auto" : "-10%",
          width: "300px",
          height: "300px",
          background: "radial-gradient(circle, rgba(0, 212, 170, 0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          filter: "blur(40px)",
          pointerEvents: "none",
          transform: "translateY(-50%)"
        }} />
      )}

      <div style={{ 
        maxWidth: 1200, 
        margin: "0 auto", 
        padding: "0 24px",
        position: "relative"
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: image ? "1fr 1fr" : "1fr",
          gap: "48px",
          alignItems: "center"
        }}>
          <div style={{
            order: isEven ? 1 : 2,
            transform: isVisible ? "translateY(0)" : "translateY(30px)",
            opacity: isVisible ? 1 : 0,
            transition: "all 0.8s ease"
          }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px"
            }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "44px",
                height: "44px",
                background: isHighlight 
                  ? "linear-gradient(135deg, rgba(0, 212, 170, 0.15) 0%, rgba(123, 104, 238, 0.1) 100%)"
                  : isDark
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.04)",
                borderRadius: "12px",
                fontSize: "24px",
                border: isHighlight ? "1px solid rgba(0, 212, 170, 0.2)" : "none"
              }}>
                {iconData.emoji}
              </span>
              <span style={{
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(10, 15, 28, 0.5)"
              }}>
                {iconData.label}
              </span>
            </div>

            <h2 style={{
              fontSize: "clamp(28px, 4vw, 40px)",
              fontWeight: 700,
              lineHeight: 1.2,
              margin: "0 0 20px 0",
              color: isDark ? "#FFFFFF" : "#0A0F1C"
            }}>
              {title}
            </h2>

            <div style={{ 
              color: isDark ? "rgba(255, 255, 255, 0.75)" : "rgba(10, 15, 28, 0.7)"
            }}>
              {paragraphs.map((p, i) => (
                <p key={i} style={{ 
                  fontSize: "17px", 
                  lineHeight: 1.7, 
                  margin: i === 0 ? 0 : "16px 0 0 0"
                }}>
                  {p}
                </p>
              ))}
            </div>

            {bullets && bullets.length > 0 && (
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "10px",
                marginTop: "24px"
              }}>
                {bullets.map((bullet, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      background: isDark 
                        ? "rgba(255, 255, 255, 0.05)"
                        : isHighlight 
                          ? "linear-gradient(135deg, rgba(0, 212, 170, 0.06) 0%, rgba(255, 255, 255, 0.8) 100%)"
                          : "rgba(0, 0, 0, 0.02)",
                      padding: "14px 18px",
                      borderRadius: "12px",
                      border: isDark
                        ? "1px solid rgba(255, 255, 255, 0.08)"
                        : isHighlight
                          ? "1px solid rgba(0, 212, 170, 0.12)"
                          : "1px solid rgba(0, 0, 0, 0.04)",
                      transform: isVisible ? "translateX(0)" : "translateX(-20px)",
                      opacity: isVisible ? 1 : 0,
                      transition: `all 0.5s ease ${0.1 * i}s`
                    }}
                  >
                    <span style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "24px",
                      height: "24px",
                      background: isHighlight
                        ? "linear-gradient(135deg, #00D4AA 0%, #00A389 100%)"
                        : isDark
                          ? "rgba(0, 212, 170, 0.3)"
                          : "rgba(0, 212, 170, 0.15)",
                      borderRadius: "6px",
                      fontSize: "12px",
                      color: isHighlight ? "white" : isDark ? "#00D4AA" : "#00A389"
                    }}>
                      ✓
                    </span>
                    <span style={{ 
                      fontSize: "15px", 
                      fontWeight: 500,
                      color: isDark ? "rgba(255, 255, 255, 0.9)" : "#0A0F1C"
                    }}>
                      {bullet}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {(primaryCta || secondaryCta) && (
              <div style={{ 
                display: "flex", 
                gap: "14px", 
                flexWrap: "wrap",
                marginTop: "28px"
              }}>
                {primaryCta && (
                  <Link
                    href={primaryCta.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: isHighlight || isDark
                        ? "linear-gradient(135deg, #00D4AA 0%, #00A389 100%)"
                        : "#0A0F1C",
                      color: "white",
                      padding: "14px 24px",
                      borderRadius: "12px",
                      fontSize: "15px",
                      fontWeight: 600,
                      textDecoration: "none",
                      boxShadow: isHighlight || isDark
                        ? "0 4px 20px rgba(0, 212, 170, 0.25)"
                        : "0 4px 12px rgba(0, 0, 0, 0.15)",
                      transition: "all 0.3s ease"
                    }}
                  >
                    {primaryCta.label} <span style={{ marginLeft: "4px" }}>→</span>
                  </Link>
                )}
                {secondaryCta && (
                  <Link
                    href={secondaryCta.href}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      background: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                      border: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid rgba(0, 0, 0, 0.08)",
                      color: isDark ? "rgba(255, 255, 255, 0.9)" : "#0A0F1C",
                      padding: "14px 24px",
                      borderRadius: "12px",
                      fontSize: "15px",
                      fontWeight: 500,
                      textDecoration: "none",
                      transition: "all 0.3s ease"
                    }}
                  >
                    {secondaryCta.label}
                  </Link>
                )}
              </div>
            )}
          </div>

          {image && (
            <div style={{
              order: isEven ? 2 : 1,
              position: "relative",
              transform: isVisible ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
              opacity: isVisible ? 1 : 0,
              transition: "all 0.9s ease 0.2s"
            }}>
              <div style={{
                position: "relative",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: isDark 
                  ? "0 25px 80px rgba(0, 212, 170, 0.15), 0 10px 30px rgba(0, 0, 0, 0.3)"
                  : "0 25px 60px rgba(0, 0, 0, 0.12), 0 10px 20px rgba(0, 0, 0, 0.08)",
                border: isDark 
                  ? "1px solid rgba(255, 255, 255, 0.1)"
                  : "1px solid rgba(0, 0, 0, 0.05)"
              }}>
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: isHighlight
                    ? "linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, transparent 50%)"
                    : "linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 50%)",
                  zIndex: 1,
                  pointerEvents: "none"
                }} />
                <Image
                  src={image}
                  alt={imageAlt || title}
                  width={600}
                  height={400}
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    objectFit: "cover"
                  }}
                />
              </div>
              <div style={{
                position: "absolute",
                bottom: "-20px",
                left: "10%",
                right: "10%",
                height: "40px",
                background: isHighlight
                  ? "radial-gradient(ellipse, rgba(0, 212, 170, 0.2) 0%, transparent 70%)"
                  : "radial-gradient(ellipse, rgba(0, 0, 0, 0.15) 0%, transparent 70%)",
                filter: "blur(15px)",
                zIndex: -1
              }} />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          section > div > div {
            grid-template-columns: 1fr !important;
          }
          section > div > div > div {
            order: unset !important;
          }
        }
      `}</style>
    </section>
  );
}
