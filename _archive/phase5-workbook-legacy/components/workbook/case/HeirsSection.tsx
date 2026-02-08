import React, { useState } from 'react';

interface HeirsSectionProps {
  caseId: string;
}

interface Heir {
  id: string;
  name: string;
  relationship: string;
  generation: number;
  fraction: { numerator: number; denominator: number };
  deceased: boolean;
  hasChildren: boolean;
  children: Heir[];
}

const INHERITANCE_RULES = {
  spouse_only: 'Spouse inherits 100% if no children or parents',
  spouse_children: 'Spouse typically gets 1/3 to 1/2, children split remainder',
  children_only: 'Children split equally per stirpes',
  per_stirpes: 'Deceased heir\'s share passes to their children',
  no_will: 'Property passes by intestate succession laws',
};

export default function HeirsSection({ caseId }: HeirsSectionProps) {
  const [propertyValue, setPropertyValue] = useState('');
  const [decedentName, setDecedentName] = useState('');
  const [hasSpouse, setHasSpouse] = useState(false);
  const [spouseName, setSpouseName] = useState('');
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [showAddHeir, setShowAddHeir] = useState(false);
  const [newHeirName, setNewHeirName] = useState('');
  const [calculationDone, setCalculationDone] = useState(false);

  const addHeir = () => {
    if (!newHeirName.trim()) return;

    const newHeir: Heir = {
      id: `heir-${Date.now()}`,
      name: newHeirName,
      relationship: 'child',
      generation: 1,
      fraction: { numerator: 0, denominator: 1 },
      deceased: false,
      hasChildren: false,
      children: [],
    };

    setHeirs(prev => [...prev, newHeir]);
    setNewHeirName('');
    setShowAddHeir(false);
    setCalculationDone(false);
  };

  const toggleDeceased = (heirId: string) => {
    setHeirs(prev => prev.map(h => 
      h.id === heirId ? { ...h, deceased: !h.deceased, hasChildren: !h.deceased ? h.hasChildren : false } : h
    ));
    setCalculationDone(false);
  };

  const toggleHasChildren = (heirId: string) => {
    setHeirs(prev => prev.map(h => 
      h.id === heirId ? { ...h, hasChildren: !h.hasChildren } : h
    ));
    setCalculationDone(false);
  };

  const addGrandchild = (parentId: string, name: string) => {
    setHeirs(prev => prev.map(h => {
      if (h.id === parentId) {
        return {
          ...h,
          children: [...h.children, {
            id: `grandchild-${Date.now()}`,
            name,
            relationship: 'grandchild',
            generation: 2,
            fraction: { numerator: 0, denominator: 1 },
            deceased: false,
            hasChildren: false,
            children: [],
          }],
        };
      }
      return h;
    }));
    setCalculationDone(false);
  };

  const removeHeir = (heirId: string) => {
    setHeirs(prev => prev.filter(h => h.id !== heirId));
    setCalculationDone(false);
  };

  const calculateShares = () => {
    const livingChildren = heirs.filter(h => !h.deceased);
    const deceasedWithChildren = heirs.filter(h => h.deceased && h.hasChildren && h.children.length > 0);
    
    const totalShares = livingChildren.length + deceasedWithChildren.length;
    
    if (totalShares === 0) {
      if (hasSpouse) {
        return;
      }
      return;
    }

    let spouseShare = { numerator: 0, denominator: 1 };
    let childrenPool = { numerator: 1, denominator: 1 };

    if (hasSpouse && totalShares > 0) {
      spouseShare = { numerator: 1, denominator: 3 };
      childrenPool = { numerator: 2, denominator: 3 };
    }

    const updatedHeirs = heirs.map(heir => {
      if (!heir.deceased) {
        return {
          ...heir,
          fraction: {
            numerator: childrenPool.numerator,
            denominator: childrenPool.denominator * totalShares,
          },
        };
      } else if (heir.hasChildren && heir.children.length > 0) {
        const childShare = {
          numerator: childrenPool.numerator,
          denominator: childrenPool.denominator * totalShares,
        };
        return {
          ...heir,
          fraction: { numerator: 0, denominator: 1 },
          children: heir.children.map(child => ({
            ...child,
            fraction: {
              numerator: childShare.numerator,
              denominator: childShare.denominator * heir.children.length,
            },
          })),
        };
      }
      return { ...heir, fraction: { numerator: 0, denominator: 1 } };
    });

    setHeirs(updatedHeirs);
    setCalculationDone(true);
  };

  const formatFraction = (f: { numerator: number; denominator: number }) => {
    if (f.numerator === 0) return '0';
    
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const g = gcd(f.numerator, f.denominator);
    const num = f.numerator / g;
    const den = f.denominator / g;
    
    if (den === 1) return `${num}`;
    return `${num}/${den}`;
  };

  const fractionToPercent = (f: { numerator: number; denominator: number }) => {
    if (f.denominator === 0) return '0%';
    return ((f.numerator / f.denominator) * 100).toFixed(2) + '%';
  };

  const fractionToValue = (f: { numerator: number; denominator: number }) => {
    if (!propertyValue || f.denominator === 0) return '$0';
    const value = (f.numerator / f.denominator) * parseFloat(propertyValue.replace(/,/g, ''));
    return '$' + value.toLocaleString('en-US', { maximumFractionDigits: 0 });
  };

  const spouseShare = hasSpouse && heirs.length > 0 ? { numerator: 1, denominator: 3 } : { numerator: 0, denominator: 1 };

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-800">
          <strong>Important:</strong> This calculator provides estimates based on common intestate succession rules. 
          Actual inheritance depends on state law, wills, and court determinations. Consult an attorney for legal advice.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Property Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Original Owner (Decedent)</label>
                <input
                  type="text"
                  value={decedentName}
                  onChange={(e) => setDecedentName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Name of deceased property owner"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Property Value</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="text"
                    value={propertyValue}
                    onChange={(e) => setPropertyValue(e.target.value.replace(/[^0-9,]/g, ''))}
                    className="w-full pl-7 pr-3 py-2 border rounded-lg"
                    placeholder="100,000"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasSpouse}
                    onChange={(e) => setHasSpouse(e.target.checked)}
                    className="rounded text-amber-500"
                  />
                  <span className="text-sm text-gray-700">Surviving spouse?</span>
                </label>
                {hasSpouse && (
                  <input
                    type="text"
                    value={spouseName}
                    onChange={(e) => setSpouseName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg mt-2"
                    placeholder="Spouse name"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-gray-900">Children / Heirs</h2>
              <button
                onClick={() => setShowAddHeir(true)}
                className="text-amber-600 hover:text-amber-700 text-sm font-medium"
              >
                + Add Heir
              </button>
            </div>

            {heirs.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">
                Add children/heirs of the original property owner
              </p>
            ) : (
              <div className="space-y-3">
                {heirs.map(heir => (
                  <div key={heir.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{heir.name}</span>
                      <button
                        onClick={() => removeHeir(heir.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={heir.deceased}
                          onChange={() => toggleDeceased(heir.id)}
                          className="rounded text-gray-500"
                        />
                        Deceased
                      </label>
                      
                      {heir.deceased && (
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={heir.hasChildren}
                            onChange={() => toggleHasChildren(heir.id)}
                            className="rounded text-purple-500"
                          />
                          Has children (grandchildren)
                        </label>
                      )}
                    </div>

                    {heir.deceased && heir.hasChildren && (
                      <div className="mt-3 ml-4 border-l-2 border-purple-200 pl-3">
                        <p className="text-xs text-gray-500 mb-2">Grandchildren (inherit per stirpes):</p>
                        {heir.children.map(child => (
                          <div key={child.id} className="text-sm text-gray-700 py-1">
                            {child.name}
                            {calculationDone && (
                              <span className="text-purple-600 ml-2">
                                ({formatFraction(child.fraction)} = {fractionToPercent(child.fraction)})
                              </span>
                            )}
                          </div>
                        ))}
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Add grandchild name"
                            className="text-sm px-2 py-1 border rounded"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && (e.target as HTMLInputElement).value) {
                                addGrandchild(heir.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {calculationDone && !heir.deceased && (
                      <div className="mt-2 text-sm text-green-600">
                        Share: {formatFraction(heir.fraction)} = {fractionToPercent(heir.fraction)}
                        {propertyValue && <span className="ml-2">({fractionToValue(heir.fraction)})</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {showAddHeir && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={newHeirName}
                  onChange={(e) => setNewHeirName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg mb-2"
                  placeholder="Heir's full name"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={addHeir}
                    className="px-3 py-1 bg-amber-500 text-white rounded text-sm"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddHeir(false); setNewHeirName(''); }}
                    className="px-3 py-1 text-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={calculateShares}
            disabled={heirs.length === 0}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Calculate Shares
          </button>
        </div>

        <div className="space-y-6">
          {calculationDone && (
            <div className="bg-white rounded-xl border p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Calculation Results</h2>
              
              <div className="space-y-4">
                {hasSpouse && spouseName && (
                  <div className="flex justify-between items-center p-3 bg-pink-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{spouseName}</span>
                      <span className="text-sm text-gray-500 ml-2">(Spouse)</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-pink-600">{formatFraction(spouseShare)}</div>
                      <div className="text-sm text-gray-500">{fractionToPercent(spouseShare)}</div>
                      {propertyValue && (
                        <div className="text-sm text-gray-700">{fractionToValue(spouseShare)}</div>
                      )}
                    </div>
                  </div>
                )}

                {heirs.filter(h => !h.deceased).map(heir => (
                  <div key={heir.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">{heir.name}</span>
                      <span className="text-sm text-gray-500 ml-2">(Living)</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">{formatFraction(heir.fraction)}</div>
                      <div className="text-sm text-gray-500">{fractionToPercent(heir.fraction)}</div>
                      {propertyValue && (
                        <div className="text-sm text-gray-700">{fractionToValue(heir.fraction)}</div>
                      )}
                    </div>
                  </div>
                ))}

                {heirs.filter(h => h.deceased && h.hasChildren).map(heir => (
                  <div key={heir.id} className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-gray-500 text-sm mb-2">
                      {heir.name}'s share (deceased) passes to:
                    </div>
                    {heir.children.map(child => (
                      <div key={child.id} className="flex justify-between items-center ml-4 py-1">
                        <span className="font-medium text-gray-900">{child.name}</span>
                        <div className="text-right">
                          <span className="font-semibold text-purple-600">{formatFraction(child.fraction)}</span>
                          <span className="text-sm text-gray-500 ml-2">{fractionToPercent(child.fraction)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Inheritance Rules</h2>
            <div className="space-y-3 text-sm">
              {Object.entries(INHERITANCE_RULES).map(([key, desc]) => (
                <div key={key} className="flex gap-2">
                  <span className="text-amber-500">•</span>
                  <span className="text-gray-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h3 className="font-semibold text-blue-800 mb-2">What is Per Stirpes?</h3>
            <p className="text-sm text-blue-700">
              "Per stirpes" means that if an heir dies before the property owner, 
              their share passes down to their children (the grandchildren). 
              Each branch of the family tree gets an equal portion, divided among 
              the living members of that branch.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
