import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../lib/utils';

/**
 * Fade transition component
 */
interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
  appear?: boolean;
  onEnter?: () => void;
  onExit?: () => void;
}

export function FadeTransition({
  show,
  children,
  duration = 300,
  className,
  appear = true,
  onEnter,
  onExit
}: FadeTransitionProps) {
  const [isVisible, setIsVisible] = useState(show && appear);
  const [shouldRender, setShouldRender] = useState(show);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // Small delay to ensure DOM is ready
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        onEnter?.();
      }, 10);
    } else {
      setIsVisible(false);
      onExit?.();
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, duration, onEnter, onExit]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "transition-opacity ease-in-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ transitionDuration: `${duration}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Slide transition component
 */
interface SlideTransitionProps {
  show: boolean;
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
  className?: string;
  distance?: string;
}

export function SlideTransition({
  show,
  children,
  direction = 'up',
  duration = 300,
  className,
  distance = '20px'
}: SlideTransitionProps) {
  const [isVisible, setIsVisible] = useState(show);
  const [shouldRender, setShouldRender] = useState(show);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const getTransform = (visible: boolean) => {
    if (visible) return 'translate3d(0, 0, 0)';
    
    switch (direction) {
      case 'up':
        return `translate3d(0, ${distance}, 0)`;
      case 'down':
        return `translate3d(0, -${distance}, 0)`;
      case 'left':
        return `translate3d(${distance}, 0, 0)`;
      case 'right':
        return `translate3d(-${distance}, 0, 0)`;
      default:
        return `translate3d(0, ${distance}, 0)`;
    }
  };

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 10);
    } else {
      setIsVisible(false);
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "transition-all ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transform: getTransform(isVisible)
      }}
    >
      {children}
    </div>
  );
}

/**
 * Scale transition component
 */
interface ScaleTransitionProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
  scale?: number;
}

export function ScaleTransition({
  show,
  children,
  duration = 200,
  className,
  scale = 0.95
}: ScaleTransitionProps) {
  const [isVisible, setIsVisible] = useState(show);
  const [shouldRender, setShouldRender] = useState(show);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, 10);
    } else {
      setIsVisible(false);
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false);
      }, duration);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [show, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "transition-all ease-out origin-center",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transform: isVisible ? 'scale(1)' : `scale(${scale})`
      }}
    >
      {children}
    </div>
  );
}

/**
 * Page transition wrapper for route changes
 */
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  type?: 'fade' | 'slide' | 'scale';
}

export function PageTransition({
  children,
  className,
  type = 'fade'
}: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [children]);

  const transitionClasses = {
    fade: {
      enter: "opacity-100",
      exit: "opacity-0"
    },
    slide: {
      enter: "opacity-100 translate-y-0",
      exit: "opacity-0 translate-y-4"
    },
    scale: {
      enter: "opacity-100 scale-100",
      exit: "opacity-0 scale-95"
    }
  };

  return (
    <div
      className={cn(
        "transition-all duration-300 ease-out",
        isVisible ? transitionClasses[type].enter : transitionClasses[type].exit,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Staggered animation for lists
 */
interface StaggeredListProps {
  children: React.ReactNode[];
  delay?: number;
  className?: string;
  show?: boolean;
}

export function StaggeredList({
  children,
  delay = 100,
  className,
  show = true
}: StaggeredListProps) {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    new Array(children.length).fill(!show)
  );

  useEffect(() => {
    if (show) {
      children.forEach((_, index) => {
        setTimeout(() => {
          setVisibleItems(prev => {
            const newState = [...prev];
            newState[index] = true;
            return newState;
          });
        }, index * delay);
      });
    } else {
      setVisibleItems(new Array(children.length).fill(false));
    }
  }, [children.length, delay, show]);

  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn(
            "transition-all duration-500 ease-out",
            visibleItems[index] 
              ? "opacity-100 translate-y-0" 
              : "opacity-0 translate-y-4"
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Accordion transition component
 */
interface AccordionTransitionProps {
  isOpen: boolean;
  children: React.ReactNode;
  duration?: number;
  className?: string;
}

export function AccordionTransition({
  isOpen,
  children,
  duration = 300,
  className
}: AccordionTransitionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | 'auto'>(isOpen ? 'auto' : 0);

  useEffect(() => {
    if (contentRef.current) {
      const contentHeight = contentRef.current.scrollHeight;
      
      if (isOpen) {
        setHeight(contentHeight);
        // After animation completes, set to auto for responsive behavior
        const timer = setTimeout(() => {
          setHeight('auto');
        }, duration);
        return () => clearTimeout(timer);
      } else {
        setHeight(contentHeight);
        // Force reflow
        void contentRef.current.offsetHeight;
        setHeight(0);
      }
    }
  }, [isOpen, duration]);

  return (
    <div
      className={cn("overflow-hidden transition-all ease-in-out", className)}
      style={{
        height: height === 'auto' ? 'auto' : `${height}px`,
        transitionDuration: `${duration}ms`
      }}
    >
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
}

/**
 * Floating action button with entrance animation
 */
interface FloatingButtonProps {
  show: boolean;
  onClick: () => void;
  children: React.ReactNode;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export function FloatingButton({
  show,
  onClick,
  children,
  position = 'bottom-right',
  className
}: FloatingButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6'
  };

  return (
    <ScaleTransition show={show}>
      <button
        onClick={onClick}
        className={cn(
          "fixed z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4",
          "shadow-lg hover:shadow-xl transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          positionClasses[position],
          className
        )}
      >
        {children}
      </button>
    </ScaleTransition>
  );
}

/**
 * Modal transition wrapper
 */
interface ModalTransitionProps {
  show: boolean;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function ModalTransition({
  show,
  children,
  onClose,
  className
}: ModalTransitionProps) {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <FadeTransition show={show}>
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
      </FadeTransition>

      {/* Modal content */}
      <div className="flex min-h-full items-center justify-center p-4">
        <ScaleTransition show={show}>
          <div className={cn(
            "relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-auto",
            className
          )}>
            {children}
          </div>
        </ScaleTransition>
      </div>
    </div>
  );
}
