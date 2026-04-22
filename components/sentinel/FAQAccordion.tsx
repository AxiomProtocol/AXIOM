import { useState } from 'react';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  { question: 'What is Sentinel?', answer: 'Sentinel is the unified capital decision and risk authorization layer for all Axiom Protocol products. It converts market intelligence signals into authorized capital actions with cryptographic audit trails.' },
  { question: 'How does Sentinel classify market regimes?', answer: 'Sentinel uses a regime engine that analyzes moving average slopes, volatility ratios, and breadth scores to classify the market into four states: Trend Up, Trend Down, Range/Low Vol, and High Volatility Dislocation.' },
  { question: 'What happens when a signal is denied?', answer: 'Denial is a feature, not a failure. When Sentinel denies an action, it means the risk criteria were not met. This prevents capital deployment in unfavorable conditions and preserves capital for better opportunities.' },
  { question: 'What is the difference between raw and calibrated probability?', answer: 'Raw probability comes directly from the signal model. Calibrated probability adjusts this using Platt scaling to better reflect actual historical outcomes, making confidence scores more reliable.' },
  { question: 'How does the hash chain audit trail work?', answer: 'Every Sentinel decision is recorded as an immutable entry in a cryptographic hash chain. Each entry contains a SHA-256 hash computed from the previous entry, creating a tamper-evident record. If any entry is modified, the chain breaks and verification fails.' },
  { question: 'Can Sentinel execute trades automatically?', answer: 'No. During the proof-of-concept phase, Sentinel operates in advisory mode only. All outputs are informational. No automated trades are permitted until post-public governance vote grants execution authority (Guard Rail #5).' },
  { question: 'What is the circuit breaker?', answer: 'The circuit breaker monitors Sentinel health and automatically transitions between operational states (Normal, Safe Mode, Defensive Mode, Recovery Pending) to ensure the system degrades gracefully rather than failing catastrophically.' },
  { question: 'How are position sizes calculated?', answer: 'Position sizing uses volatility-targeting: the target portfolio volatility is divided by individual asset volatility to determine weight, then capped by single-position and correlated-exposure limits. Regime adjustments further scale sizing.' },
  { question: 'What does the confirmation score measure?', answer: 'The confirmation score evaluates multi-factor agreement: timeframe alignment (moving averages in agreement), signal persistence (consecutive bars confirming direction), volume confirmation, risk/reward ratio, and liquidity adequacy.' },
  { question: 'How does Sentinel govern real estate capital actions?', answer: 'For the Pilot Program, Sentinel acts as the deterministic capital governance layer. Every capital-impacting action (acquisitions, capital calls, distributions) requires Sentinel authorization before execution, enforcing reserve discipline and preventing concentration risk.' },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="border border-dl-border-light">
      <p className="text-xs uppercase tracking-wider text-dl-gray p-4 border-b border-dl-border-light">FREQUENTLY ASKED QUESTIONS</p>
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className={i < FAQ_ITEMS.length - 1 ? 'border-b border-dl-border-light' : ''}>
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenIndex(openIndex === i ? null : i); } }}
            className="w-full text-left px-4 py-3 flex items-center justify-between bg-dl-bg hover:bg-dl-bg-alt"
            aria-expanded={openIndex === i}
            aria-controls={`faq-answer-${i}`}
          >
            <span className="text-sm text-dl-navy font-medium pr-4">{item.question}</span>
            <span className="text-dl-gray text-xs font-dl-mono flex-shrink-0">{openIndex === i ? '−' : '+'}</span>
          </button>
          {openIndex === i && (
            <div id={`faq-answer-${i}`} className="px-4 py-3 bg-dl-bg-alt text-sm text-dl-gray leading-relaxed" role="region">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
