import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  aspectRatio?: 'square' | 'video' | 'wide' | 'portrait' | 'auto';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  blur?: boolean;
}

export function LazyImage({
  src,
  alt,
  placeholder,
  fallback = '/placeholder-image.png',
  aspectRatio = 'auto',
  objectFit = 'cover',
  blur = true,
  className,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    wide: 'aspect-[21/9]',
    portrait: 'aspect-[3/4]',
    auto: ''
  };

  const objectFitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none'
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px',
        threshold: 0.01
      }
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const imageSrc = hasError ? fallback : src;
  const showPlaceholder = !isLoaded && (placeholder || blur);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-gray-100",
        aspectRatioClasses[aspectRatio],
        className
      )}
    >
      {showPlaceholder && (
        <div
          className={cn(
            "absolute inset-0",
            blur ? "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%]" : ""
          )}
          style={placeholder ? { backgroundImage: `url(${placeholder})`, backgroundSize: 'cover', filter: 'blur(10px)' } : {}}
        />
      )}
      
      {isInView && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "w-full h-full transition-opacity duration-500",
            objectFitClasses[objectFit],
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
}

export function OptimizedBackground({
  src,
  fallbackColor = '#f3f4f6',
  children,
  className,
  overlay = false,
  overlayOpacity = 0.5
}: {
  src: string;
  fallbackColor?: string;
  children?: React.ReactNode;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [src]);

  return (
    <div
      ref={containerRef}
      className={cn("relative bg-cover bg-center transition-all duration-500", className)}
      style={{
        backgroundColor: fallbackColor,
        backgroundImage: isLoaded ? `url(${src})` : 'none'
      }}
    >
      {overlay && (
        <div
          className="absolute inset-0 bg-black transition-opacity duration-300"
          style={{ opacity: overlayOpacity }}
        />
      )}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
