import { useEffect, useState } from 'react';

interface Logo3DProps {
  size?: number;
  className?: string;
}

export default function Logo3D({ size = 96, className = '' }: Logo3DProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return (
    <div 
      className={`logo-3d-container ${className}`}
      style={{ 
        width: size, 
        height: size,
        perspective: '1000px',
      }}
    >
      <div 
        className={`logo-3d-inner ${reducedMotion ? '' : 'animate-spin-slow'}`}
        style={{
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          position: 'relative',
        }}
      >
        <div className="logo-glow" />
        
        <div className="orbital-ring ring-1" />
        <div className="orbital-ring ring-2" />
        
        <div className="logo-sphere">
          <img 
            src="/axiom-logo.png" 
            alt="AXM Token"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
          <div className="logo-highlight" />
          <div className="logo-shadow" />
        </div>

        <div className="particle p1" />
        <div className="particle p2" />
        <div className="particle p3" />
      </div>

      <style jsx>{`
        @keyframes spin-slow-3d {
          0% {
            transform: rotateY(0deg) rotateX(5deg);
          }
          50% {
            transform: rotateY(180deg) rotateX(-5deg);
          }
          100% {
            transform: rotateY(360deg) rotateX(5deg);
          }
        }

        @keyframes pulse-glow {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.05);
          }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }

        @keyframes orbit {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .animate-spin-slow {
          animation: spin-slow-3d 25s ease-in-out infinite;
          will-change: transform;
        }

        .logo-3d-container {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-glow {
          position: absolute;
          width: 120%;
          height: 120%;
          top: -10%;
          left: -10%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(139, 90, 43, 0.5) 0%, rgba(139, 90, 43, 0.2) 40%, transparent 70%);
          animation: pulse-glow 4s ease-in-out infinite;
          pointer-events: none;
        }

        .logo-sphere {
          position: relative;
          width: 80%;
          height: 80%;
          margin: 10%;
          border-radius: 50%;
          box-shadow: 
            0 0 30px rgba(139, 90, 43, 0.6),
            0 0 60px rgba(139, 90, 43, 0.3),
            inset 0 -5px 20px rgba(0, 0, 0, 0.4),
            inset 0 5px 20px rgba(255, 255, 255, 0.2),
            0 10px 30px rgba(0, 0, 0, 0.4);
          transform: translateZ(20px);
        }

        .logo-highlight {
          position: absolute;
          top: 8%;
          left: 15%;
          width: 35%;
          height: 25%;
          background: linear-gradient(135deg, rgba(255,255,255,0.5) 0%, transparent 60%);
          border-radius: 50%;
          pointer-events: none;
        }

        .logo-shadow {
          position: absolute;
          bottom: 0;
          left: 10%;
          width: 80%;
          height: 20%;
          background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%);
          border-radius: 50%;
          pointer-events: none;
          transform: translateZ(-10px);
        }

        .orbital-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid;
          pointer-events: none;
        }

        .ring-1 {
          width: 110%;
          height: 40%;
          top: 30%;
          left: -5%;
          border-color: rgba(245, 158, 11, 0.3);
          transform: rotateX(75deg) rotateZ(-20deg);
          animation: orbit 30s linear infinite;
        }

        .ring-2 {
          width: 120%;
          height: 35%;
          top: 32%;
          left: -10%;
          border-color: rgba(212, 165, 116, 0.2);
          transform: rotateX(70deg) rotateZ(25deg);
          animation: orbit 40s linear infinite reverse;
        }

        .particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(1px);
        }

        .p1 {
          width: 6px;
          height: 6px;
          top: 15%;
          left: 10%;
          background: #F59E0B;
          box-shadow: 0 0 10px #F59E0B;
          animation: twinkle 3s ease-in-out infinite;
        }

        .p2 {
          width: 4px;
          height: 4px;
          top: 20%;
          right: 15%;
          background: #D4A574;
          box-shadow: 0 0 8px #D4A574;
          animation: twinkle 2.5s ease-in-out infinite 0.5s;
        }

        .p3 {
          width: 3px;
          height: 3px;
          bottom: 25%;
          right: 10%;
          background: #F59E0B;
          box-shadow: 0 0 6px #F59E0B;
          animation: twinkle 4s ease-in-out infinite 1s;
        }

        @media print {
          .animate-spin-slow {
            animation: none;
            transform: none;
          }
          .logo-glow,
          .orbital-ring,
          .particle {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
