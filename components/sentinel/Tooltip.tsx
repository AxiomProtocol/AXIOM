import { useState, useRef } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
}

export function Tooltip({ content, children, position = 'bottom' }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`absolute z-50 w-64 p-3 bg-dl-bg border border-dl-border text-xs text-dl-gray leading-relaxed ${
            position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          } left-0`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
