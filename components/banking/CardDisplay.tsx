import React from 'react';

interface Card {
  id: string;
  unitCardId: string;
  cardType: 'virtual' | 'physical';
  status: 'Active' | 'Inactive' | 'Frozen' | 'ClosedByCustomer' | 'SuspectedFraud' | 'Stolen' | 'Lost';
  maskedNumber?: string;
  expirationDate?: string;
}

interface CardDisplayProps {
  cards: Card[];
  onFreeze?: (cardId: string) => void;
  onUnfreeze?: (cardId: string) => void;
  onIssueVirtual?: () => void;
  loading?: boolean;
}

export function CardDisplay({ cards, onFreeze, onUnfreeze, onIssueVirtual, loading }: CardDisplayProps) {
  if (loading) {
    return (
      <div className="border border-dl-border p-6">
        <div className="h-4 bg-dl-border w-32 animate-pulse mb-4" />
        <div className="h-24 bg-dl-border animate-pulse" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="border border-dl-border p-6">
        <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-2">Debit Card</p>
        <p className="text-sm font-dl-mono text-dl-muted mb-4">No cards issued yet.</p>
        {onIssueVirtual && (
          <button
            onClick={onIssueVirtual}
            className="border border-dl-navy text-dl-navy text-sm font-dl-mono px-4 py-2 hover:bg-dl-navy hover:text-white transition-colors"
          >
            Issue Virtual Card
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cards.map((card) => {
        const isFrozen = card.status === 'Frozen';
        const isActive = card.status === 'Active';

        return (
          <div key={card.id} className="border border-dl-border p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-dl-mono text-dl-muted uppercase tracking-widest mb-1">
                  Axiom {card.cardType === 'virtual' ? 'Virtual' : 'Physical'} Card
                </p>
                <p className="text-lg font-dl-mono text-dl-navy tracking-widest">
                  •••• •••• •••• {card.maskedNumber ?? '••••'}
                </p>
                {card.expirationDate && (
                  <p className="text-xs font-dl-mono text-dl-muted mt-1">Exp: {card.expirationDate}</p>
                )}
              </div>
              <span className={`text-xs font-dl-mono uppercase px-2 py-1 border ${
                isFrozen
                  ? 'border-yellow-500 text-yellow-600'
                  : isActive
                  ? 'border-dl-forest text-dl-forest'
                  : 'border-dl-muted text-dl-muted'
              }`}>
                {card.status}
              </span>
            </div>

            <div className="mt-4 pt-3 border-t border-dl-border flex gap-2">
              {isActive && onFreeze && (
                <button
                  onClick={() => onFreeze(card.unitCardId)}
                  className="text-xs font-dl-mono border border-yellow-500 text-yellow-600 px-3 py-1.5 hover:bg-yellow-50 transition-colors"
                >
                  Freeze Card
                </button>
              )}
              {isFrozen && onUnfreeze && (
                <button
                  onClick={() => onUnfreeze(card.unitCardId)}
                  className="text-xs font-dl-mono border border-dl-forest text-dl-forest px-3 py-1.5 hover:bg-green-50 transition-colors"
                >
                  Unfreeze Card
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
