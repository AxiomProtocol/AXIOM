import { useState } from 'react';

interface DisclosureBlockProps {
  label?: string;
  text: string;
  defaultOpen?: boolean;
}

export function DisclosureBlock({
  label = 'Risk Disclosure',
  text,
  defaultOpen = false,
}: DisclosureBlockProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-dl-navy underline no-print"
      >
        {label}
      </button>
      {open && (
        <div className="border border-dl-border-light bg-dl-bg-alt p-4 mt-2 text-xs text-dl-gray leading-relaxed">
          {text}
        </div>
      )}
    </div>
  );
}
