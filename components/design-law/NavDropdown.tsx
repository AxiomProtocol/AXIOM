import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { NavItem } from './navItems';

export function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 hover:underline text-dl-navy text-sm min-h-[44px] min-w-[44px] justify-center"
      >
        {item.label}
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="1.5" className={open ? 'rotate-180' : ''}>
          <polyline points="1,1 5,5 9,1" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 lg:left-0 lg:right-auto mt-2 min-w-[180px] max-w-[calc(100vw-2rem)] border border-dl-border bg-dl-bg z-50 shadow-sm">
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className="block px-4 min-h-[44px] flex items-center text-sm text-dl-navy border-b border-dl-border last:border-b-0 hover:bg-gray-50"
              onClick={() => setOpen(false)}
            >
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
