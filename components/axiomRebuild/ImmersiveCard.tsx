"use client";

import React, { useState } from "react";

interface ImmersiveCardProps {
  children: React.ReactNode;
  variant?: "glass" | "gradient" | "solid" | "glow";
  className?: string;
  hover3D?: boolean;
  glowColor?: string;
}

export function ImmersiveCard({
  children,
  variant = "glass",
  className = "",
  hover3D = true,
  glowColor = "rgba(0, 212, 170, 0.2)"
}: ImmersiveCardProps) {
  const [transform, setTransform] = useState("perspective(1000px) rotateX(0deg) rotateY(0deg)");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hover3D) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  };

  const handleMouseLeave = () => {
    setTransform("perspective(1000px) rotateX(0deg) rotateY(0deg)");
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    glass: {
      background: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(20px)",
      border: "1px solid rgba(0, 0, 0, 0.06)",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)"
    },
    gradient: {
      background: "linear-gradient(135deg, rgba(0, 212, 170, 0.05) 0%, rgba(123, 104, 238, 0.05) 100%)",
      border: "1px solid rgba(0, 212, 170, 0.15)",
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.06), 0 0 0 1px ${glowColor}`
    },
    solid: {
      background: "#FFFFFF",
      border: "1px solid rgba(0, 0, 0, 0.08)",
      boxShadow: "0 4px 24px rgba(0, 0, 0, 0.06)"
    },
    glow: {
      background: "rgba(255, 255, 255, 0.98)",
      border: "1px solid rgba(0, 212, 170, 0.2)",
      boxShadow: `0 8px 32px rgba(0, 0, 0, 0.08), 0 0 40px ${glowColor}`
    }
  };

  return (
    <div
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...variantStyles[variant],
        borderRadius: "20px",
        padding: "28px",
        transform,
        transition: "transform 0.15s ease-out, box-shadow 0.3s ease",
        transformStyle: "preserve-3d"
      }}
    >
      {children}
    </div>
  );
}
