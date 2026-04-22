import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FadeTransition, ScaleTransition } from './ui/transitions';
import { cn } from '../lib/utils';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  trigger?: 'hover' | 'click' | 'focus';
  delay?: number;
  className?: string;
  arrow?: boolean;
  maxWidth?: string;
}

/**
 * Smart tooltip component with automatic positioning
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  trigger = 'hover',
  delay = 300,
  className,
  arrow = true,
  maxWidth = '300px'
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Calculate tooltip position
  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current?.getBoundingClientRect();
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    
    let x = 0;
    let y = 0;
    let finalPosition = position;

    // Calculate based on preferred position
    switch (position) {
      case 'top':
        x = triggerRect.left + triggerRect.width / 2;
        y = triggerRect.top - 10;
        // Check if tooltip would be cut off at top
        if (tooltipRect && y - tooltipRect.height < 10) {
          finalPosition = 'bottom';
          y = triggerRect.bottom + 10;
        }
        break;
      case 'bottom':
        x = triggerRect.left + triggerRect.width / 2;
        y = triggerRect.bottom + 10;
        // Check if tooltip would be cut off at bottom
        if (tooltipRect && y + tooltipRect.height > viewport.height - 10) {
          finalPosition = 'top';
          y = triggerRect.top - 10;
        }
        break;
      case 'left':
        x = triggerRect.left - 10;
        y = triggerRect.top + triggerRect.height / 2;
        // Check if tooltip would be cut off at left
        if (tooltipRect && x - tooltipRect.width < 10) {
          finalPosition = 'right';
          x = triggerRect.right + 10;
        }
        break;
      case 'right':
        x = triggerRect.right + 10;
        y = triggerRect.top + triggerRect.height / 2;
        // Check if tooltip would be cut off at right
        if (tooltipRect && x + tooltipRect.width > viewport.width - 10) {
          finalPosition = 'left';
          x = triggerRect.left - 10;
        }
        break;
    }

    setCoords({ x, y });
    setActualPosition(finalPosition);
  };

  // Show tooltip
  const showTooltip = () => {
    if (trigger === 'hover') {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        // Calculate position after tooltip is rendered
        setTimeout(calculatePosition, 10);
      }, delay);
    } else {
      setIsVisible(true);
      setTimeout(calculatePosition, 10);
    }
  };

  // Hide tooltip
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Event handlers
  const handleMouseEnter = () => {
    if (trigger === 'hover') showTooltip();
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') hideTooltip();
  };

  const handleClick = () => {
    if (trigger === 'click') {
      if (isVisible) {
        hideTooltip();
      } else {
        showTooltip();
      }
    }
  };

  const handleFocus = () => {
    if (trigger === 'focus') showTooltip();
  };

  const handleBlur = () => {
    if (trigger === 'focus') hideTooltip();
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        hideTooltip();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible]);

  // Get transform origin for smooth scaling
  const getTransformOrigin = () => {
    switch (actualPosition) {
      case 'top': return 'bottom center';
      case 'bottom': return 'top center';
      case 'left': return 'right center';
      case 'right': return 'left center';
      default: return 'center';
    }
  };

  // Get tooltip transform
  const getTooltipTransform = () => {
    switch (actualPosition) {
      case 'top':
        return 'translate(-50%, -100%)';
      case 'bottom':
        return 'translate(-50%, 0%)';
      case 'left':
        return 'translate(-100%, -50%)';
      case 'right':
        return 'translate(0%, -50%)';
      default:
        return 'translate(-50%, -100%)';
    }
  };

  const tooltip = isVisible && createPortal(
    <ScaleTransition show={isVisible}>
      <div
        ref={tooltipRef}
        className={cn(
          "absolute z-50 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg",
          "border border-gray-700",
          className
        )}
        style={{
          left: `${coords.x}px`,
          top: `${coords.y}px`,
          transform: getTooltipTransform(),
          transformOrigin: getTransformOrigin(),
          maxWidth
        }}
        role="tooltip"
      >
        {content}
        
        {arrow && (
          <div
            className={cn(
              "absolute w-2 h-2 bg-gray-900 border-gray-700 transform rotate-45",
              actualPosition === 'top' && "bottom-[-4px] left-1/2 -translate-x-1/2 border-r border-b",
              actualPosition === 'bottom' && "top-[-4px] left-1/2 -translate-x-1/2 border-l border-t",
              actualPosition === 'left' && "right-[-4px] top-1/2 -translate-y-1/2 border-r border-t",
              actualPosition === 'right' && "left-[-4px] top-1/2 -translate-y-1/2 border-l border-b"
            )}
          />
        )}
      </div>
    </ScaleTransition>,
    document.body
  );

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="inline-block"
      >
        {children}
      </div>
      {tooltip}
    </>
  );
}

/**
 * Help icon with tooltip
 */
interface HelpIconProps {
  content: React.ReactNode;
  className?: string;
  iconSize?: 'sm' | 'md' | 'lg';
}

export function HelpIcon({ content, className, iconSize = 'sm' }: HelpIconProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  return (
    <Tooltip content={content} position="top" trigger="hover">
      <button
        className={cn(
          "text-gray-400 hover:text-gray-600 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded-full",
          className
        )}
        aria-label="Help information"
      >
        <svg
          className={sizeClasses[iconSize]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    </Tooltip>
  );
}

/**
 * Guided tour component for onboarding
 */
interface TourStep {
  target: string; // CSS selector
  title: string;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void;
}

interface GuidedTourProps {
  steps: TourStep[];
  isActive: boolean;
  onComplete: () => void;
  onSkip: () => void;
  className?: string;
}

export function GuidedTour({
  steps,
  isActive,
  onComplete,
  onSkip,
  className
}: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightCoords, setHighlightCoords] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [tooltipCoords, setTooltipCoords] = useState({ x: 0, y: 0 });
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top');

  const updateHighlight = () => {
    const step = steps[currentStep];
    if (!step) return;

    const target = document.querySelector(step.target) as HTMLElement;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    setHighlightCoords({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    });

    // Calculate tooltip position
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    let x = rect.left + rect.width / 2;
    let y = rect.top;
    let position = step.position || 'top';

    // Adjust position based on viewport
    if (position === 'top' && rect.top < 200) {
      position = 'bottom';
      y = rect.bottom;
    } else if (position === 'bottom' && rect.bottom > viewport.height - 200) {
      position = 'top';
      y = rect.top;
    }

    setTooltipCoords({ x, y });
    setTooltipPosition(position);
  };

  // Update highlight when step changes
  useEffect(() => {
    if (isActive) {
      updateHighlight();
      window.addEventListener('resize', updateHighlight);
      return () => window.removeEventListener('resize', updateHighlight);
    }
  }, [currentStep, isActive]);

  // Navigate to next step
  const nextStep = () => {
    const step = steps[currentStep];
    step.action?.(); // Execute step action

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  // Navigate to previous step
  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isActive || !steps[currentStep]) {
    return null;
  }

  const step = steps[currentStep];

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Overlay with highlight */}
      <div className="absolute inset-0 bg-black bg-opacity-50">
        {/* Highlight cutout */}
        <div
          className="absolute bg-white"
          style={{
            left: `${highlightCoords.x - 4}px`,
            top: `${highlightCoords.y - 4}px`,
            width: `${highlightCoords.width + 8}px`,
            height: `${highlightCoords.height + 8}px`,
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.5)',
          }}
        />
      </div>

      {/* Tour tooltip */}
      <div
        className={cn(
          "absolute bg-white rounded-lg shadow-xl max-w-sm p-6 z-10",
          tooltipPosition === 'top' && "-translate-y-full -translate-x-1/2 mb-4",
          tooltipPosition === 'bottom' && "-translate-x-1/2 mt-4",
          tooltipPosition === 'left' && "-translate-x-full -translate-y-1/2 mr-4",
          tooltipPosition === 'right' && "-translate-y-1/2 ml-4",
          className
        )}
        style={{
          left: `${tooltipCoords.x}px`,
          top: `${tooltipCoords.y}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="text-gray-700 mb-6">
          {step.content}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            {currentStep + 1} of {steps.length}
          </div>
          
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <button
                onClick={previousStep}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Previous
              </button>
            )}
            <button
              onClick={nextStep}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
