import { useState } from 'react';

interface PanelSection {
  id: string;
  title: string;
  content: string;
}

const SECTIONS: PanelSection[] = [
  { id: 'risk-transitions', title: 'Risk-On / Risk-Off Transitions', content: 'Sentinel shifts between Risk-On (standard deployment) and Risk-Off (capital preservation) based on regime classification. Trend Up enables full allocation. Trend Down reduces by 50%. High Vol Dislocation triggers near-complete capital preservation at 30% maximum deployment. These transitions are deterministic — no discretionary override is permitted during proof-of-concept.' },
  { id: 'control-hierarchy', title: 'Control Hierarchy', content: 'The risk control hierarchy operates in three layers: (1) Regime Engine sets the macro stance; (2) Confirmation Engine validates individual signals; (3) Portfolio Engine enforces position-level constraints. Each layer can only tighten constraints, never loosen them. If any layer flags a concern, the more conservative action prevails.' },
  { id: 'portfolio-exposure', title: 'Portfolio Exposure Controls', content: 'Maximum total deployment is capped at 60% of capital in favorable regimes. Single position size cannot exceed 10% of total capital. Correlated asset class exposure (e.g., all crypto positions combined) is limited to 25%. These hard limits cannot be overridden by signal strength.' },
  { id: 'correlation', title: 'Correlation & Concentration Logic', content: 'Assets are grouped by type (CRYPTO, EQUITY). Total exposure to any single group is capped at 25% of portfolio. When correlated clustering is detected, thresholds tighten further and position sizing is reduced. This prevents concentration risk from accumulating unnoticed.' },
  { id: 'drawdown', title: 'Drawdown Response Mechanics', content: 'Drawdown triggers activate when: NOI falls below projection band, occupancy drops below threshold, expenses overrun contingency, or reserves compress below minimum. Response escalates from reduced deployment → tightened approvals → prioritized reserves → frozen growth allocation. Each trigger is independently monitored.' },
  { id: 'stress-regimes', title: 'Stress Regime Interpretation', content: 'Four real estate stress regimes are defined: Rate Shock (interest rate spike affecting financing), Vacancy Shock (occupancy collapse), Expense Shock (cost overrun beyond contingency), and Liquidity Shock (inability to execute capital calls or distributions). Each triggers risk-off stance with stricter approvals and exposure contraction.' },
];

export function RiskMechanicsPanel() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="border border-dl-border-light">
      <p className="text-xs uppercase tracking-wider text-dl-gray p-4 border-b border-dl-border-light">RISK MECHANICS</p>
      {SECTIONS.map((section, i) => (
        <div key={section.id} className={i < SECTIONS.length - 1 ? 'border-b border-dl-border-light' : ''}>
          <button
            onClick={() => setOpenSection(openSection === section.id ? null : section.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSection(openSection === section.id ? null : section.id); } }}
            className="w-full text-left px-4 py-3 flex items-center justify-between bg-dl-bg"
            aria-expanded={openSection === section.id}
            aria-controls={`risk-panel-${section.id}`}
          >
            <span className="text-sm text-dl-navy font-medium">{section.title}</span>
            <span className="text-dl-gray text-xs font-dl-mono flex-shrink-0">{openSection === section.id ? '−' : '+'}</span>
          </button>
          {openSection === section.id && (
            <div id={`risk-panel-${section.id}`} className="px-4 py-3 bg-dl-bg-alt text-sm text-dl-gray leading-relaxed" role="region">
              {section.content}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
