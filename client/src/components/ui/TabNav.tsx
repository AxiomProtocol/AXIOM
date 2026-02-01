import React from 'react';

interface TabItem {
  key: string;
  label: string;
}

interface TabNavProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
}

export const TabNav: React.FC<TabNavProps> = ({ items, value, onChange }) => {
  return (
    <nav dir="ltr" className="border-b border-blue-200 mb-8">
      <div 
        className="flex flex-nowrap gap-2 overflow-x-auto snap-x snap-mandatory py-2 px-2"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={value === item.key}
            onClick={() => onChange(item.key)}
            className={`px-4 py-2 md:px-6 md:py-3 rounded-lg whitespace-nowrap snap-start font-medium transition-all ${
              value === item.key
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
};
