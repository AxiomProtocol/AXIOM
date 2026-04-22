import { useState, useEffect } from 'react';
import type { EstimateTemplate, PropertyType } from '../../lib/cost-intelligence/types';

interface Props {
  propertyType: PropertyType;
  onApply: (template: EstimateTemplate) => void;
  disabled?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  cosmetic: 'Cosmetic',
  unit_turn: 'Unit Turn',
  value_add: 'Value-Add',
  heavy_rehab: 'Heavy Gut',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  exterior: 'Exterior',
  systems: 'Full Systems',
  custom: 'Custom',
};

export default function TemplateSelector({ propertyType, onApply, disabled }: Props) {
  const [templates, setTemplates] = useState<EstimateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/cost-intelligence/templates?propertyType=${propertyType}`)
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [propertyType]);

  if (loading) return (
    <p className="font-dl-mono text-xs text-dl-muted py-4">Loading templates...</p>
  );

  const byCategory = templates.reduce((acc, t) => {
    const cat = t.rehabCategory || 'custom';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {} as Record<string, EstimateTemplate[]>);

  const chosenTemplate = templates.find(t => t.id === selected);

  return (
    <div>
      <p className="font-dl-mono text-xs text-dl-muted mb-3">
        Select a template to pre-populate your scope. You can remove or modify items after loading.
      </p>

      <div className="space-y-4 mb-4">
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <p className="font-dl-mono text-xs text-dl-muted uppercase mb-1 border-b border-dl-border pb-1">
              {CATEGORY_LABELS[cat] || cat}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {items.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelected(t.id === selected ? null : t.id)}
                  className={`text-left p-3 border font-dl-mono transition-none ${
                    selected === t.id
                      ? 'border-dl-navy bg-blue-50'
                      : 'border-dl-border hover:border-dl-navy'
                  }`}
                >
                  <p className="text-sm font-bold text-dl-navy">{t.templateName}</p>
                  <p className="text-xs text-dl-muted mt-0.5">{t.description}</p>
                  <p className="text-xs text-dl-muted mt-1">{t.scopeItems.length} scope items</p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {chosenTemplate && (
        <div className="border border-dl-border bg-gray-50 p-3 mb-3">
          <p className="font-dl-mono text-xs text-dl-muted uppercase mb-2">Scope Preview</p>
          <div className="space-y-1">
            {chosenTemplate.scopeItems.slice(0, 6).map((s, i) => (
              <div key={i} className="flex items-center justify-between font-dl-mono text-xs text-dl-text">
                <span>{s.itemName}</span>
                <span className="text-dl-muted">{(s.condition || 'medium_rehab').replace(/_/g, ' ')}</span>
              </div>
            ))}
            {chosenTemplate.scopeItems.length > 6 && (
              <p className="font-dl-mono text-xs text-dl-muted">+{chosenTemplate.scopeItems.length - 6} more…</p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => { if (chosenTemplate) onApply(chosenTemplate); }}
        disabled={!chosenTemplate || disabled}
        className="bg-dl-navy text-white px-6 py-2 font-dl-mono text-sm disabled:opacity-40"
      >
        Apply Template
      </button>
    </div>
  );
}
