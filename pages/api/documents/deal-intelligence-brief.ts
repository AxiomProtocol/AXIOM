import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
      bufferPages: true,
      info: {
        Title: 'Deal Intelligence — Institutional Brief & Executive Summary',
        Author: 'Axiom Protocol',
        Subject: 'Institutional Viability & Capital Efficiency Engine',
        Creator: 'Axiom Protocol Deal Intelligence',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const NAVY = '#1e3a5f';
    const DARK = '#1a1a2e';
    const MUTED = '#64748b';
    const GOLD = '#8b7355';
    const pageWidth = 468;

    function drawLine(y?: number) {
      const yPos = y ?? doc.y;
      doc.moveTo(72, yPos).lineTo(540, yPos).strokeColor(NAVY).lineWidth(0.5).stroke();
      doc.moveDown(0.5);
    }

    function drawThickLine(y?: number) {
      const yPos = y ?? doc.y;
      doc.moveTo(72, yPos).lineTo(540, yPos).strokeColor(NAVY).lineWidth(2).stroke();
      doc.moveDown(0.5);
    }

    function sectionTitle(text: string) {
      checkPageBreak(60);
      doc.moveDown(1);
      doc.fontSize(14).font('Times-Bold').fillColor(NAVY).text(text.toUpperCase(), { characterSpacing: 1.5 });
      drawLine();
      doc.moveDown(0.3);
    }

    function subSection(text: string) {
      checkPageBreak(40);
      doc.moveDown(0.5);
      doc.fontSize(11).font('Times-Bold').fillColor(DARK).text(text);
      doc.moveDown(0.3);
    }

    function body(text: string) {
      doc.fontSize(10).font('Times-Roman').fillColor(DARK).text(text, {
        lineGap: 4,
        align: 'justify',
        width: pageWidth,
      });
      doc.moveDown(0.4);
    }

    function bullet(text: string) {
      checkPageBreak(20);
      doc.fontSize(10).font('Times-Roman').fillColor(DARK);
      const xStart = 84;
      doc.text('\u2022', 72, doc.y, { continued: false, width: 12 });
      doc.text(text, xStart, doc.y - 14, { lineGap: 3, width: pageWidth - 12, align: 'left' });
      doc.moveDown(0.15);
    }

    function labeledItem(label: string, value: string) {
      checkPageBreak(20);
      doc.fontSize(10).font('Times-Bold').fillColor(DARK).text(label + ': ', { continued: true });
      doc.font('Times-Roman').text(value, { lineGap: 3, width: pageWidth });
      doc.moveDown(0.15);
    }

    function checkPageBreak(neededSpace: number) {
      if (doc.y + neededSpace > 700) {
        doc.addPage();
      }
    }

    function pageNumber() {
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Courier').fillColor(MUTED);
        doc.text(
          `AXIOM PROTOCOL  |  DEAL INTELLIGENCE BRIEF  |  PAGE ${i + 1}`,
          72, 740,
          { width: pageWidth, align: 'center' }
        );
      }
    }

    // ========================================
    // COVER PAGE
    // ========================================
    doc.moveDown(6);
    doc.fontSize(11).font('Courier').fillColor(GOLD).text('AXIOM PROTOCOL', { align: 'center', characterSpacing: 3 });
    doc.moveDown(0.5);
    drawThickLine(doc.y);
    doc.moveDown(1.5);
    doc.fontSize(26).font('Times-Bold').fillColor(NAVY).text('Deal Intelligence', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(14).font('Times-Roman').fillColor(DARK).text('Institutional Brief & Executive Summary', { align: 'center' });
    doc.moveDown(0.5);
    drawThickLine(doc.y);
    doc.moveDown(2);
    doc.fontSize(10).font('Courier').fillColor(MUTED).text('DOCUMENT CLASSIFICATION: INTERNAL', { align: 'center' });
    doc.moveDown(0.3);
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`PREPARED: ${dateStr.toUpperCase()}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.text('VERSION 1.0', { align: 'center' });
    doc.moveDown(4);
    doc.fontSize(9).font('Times-Italic').fillColor(MUTED).text(
      'This document is prepared for internal use by Axiom Protocol stakeholders. It does not constitute an offer of securities, investment advice, or a solicitation. All projections and analyses described herein are subject to market conditions and carry inherent uncertainty. Past performance does not guarantee future results. Variable rates apply to all yield references.',
      { align: 'center', width: pageWidth, lineGap: 3 }
    );

    // ========================================
    // TABLE OF CONTENTS
    // ========================================
    doc.addPage();
    doc.fontSize(14).font('Times-Bold').fillColor(NAVY).text('TABLE OF CONTENTS', { characterSpacing: 1.5 });
    drawLine();
    doc.moveDown(1);

    const tocItems = [
      ['I.', 'Executive Summary'],
      ['II.', 'System Overview'],
      ['III.', 'Core Underwriting Engine'],
      ['IV.', 'Comparable Sales Intelligence'],
      ['V.', 'Risk Classification Framework'],
      ['VI.', 'Acquisition Advisory (AI-Powered)'],
      ['VII.', 'IVCEE — Institutional Viability & Capital Efficiency Engine'],
      ['VIII.', 'Decision Logging & Audit Trail'],
      ['IX.', 'Technical Architecture'],
      ['X.', 'Data Integrity & Governance'],
      ['XI.', 'Regulatory Considerations'],
      ['XII.', 'Roadmap & Strategic Outlook'],
    ];

    tocItems.forEach(([num, title]) => {
      doc.fontSize(11).font('Times-Roman').fillColor(DARK);
      doc.text(`${num}   ${title}`, 84);
      doc.moveDown(0.4);
    });

    // ========================================
    // I. EXECUTIVE SUMMARY
    // ========================================
    doc.addPage();
    sectionTitle('I. Executive Summary');

    body('Axiom Protocol Deal Intelligence is an institutional-grade real estate underwriting and analysis platform that transforms property acquisition from subjective decision-making into deterministic, auditable capital allocation. The system provides end-to-end deal evaluation — from initial property discovery through financial modeling, risk assessment, and actionable acquisition strategy — with full transparency at every decision point.');

    body('Deal Intelligence was designed to serve the informational needs of capital allocators, institutional participants, and governance stakeholders who require disclosure-grade analytics before committing capital to physical asset acquisitions. The system operates on the principle that every number must be traceable, every assumption visible, and every recommendation auditable.');

    subSection('Core Capabilities');
    bullet('Deterministic financial underwriting with configurable assumptions across acquisition, financing, income, and expense parameters');
    bullet('Automated comparable sales analysis with radius-based geographic matching and per-unit normalization');
    bullet('Multi-factor risk classification producing actionable risk scores with identified mitigation pathways');
    bullet('AI-powered acquisition advisory delivering specific offer prices, negotiation strategies, creative financing structures, and risk management plans');
    bullet('Institutional Viability and Capital Efficiency Engine (IVCEE) providing six-module probabilistic and stress-based analysis');
    bullet('Immutable decision logging preserving the complete analytical audit trail for governance review');

    subSection('Key Design Principles');
    bullet('Non-custodial: Deal Intelligence does not hold, manage, or direct capital. It produces analysis for human decision-makers.');
    bullet('Deterministic: All computations are repeatable with identical inputs. No stochastic elements in core underwriting.');
    bullet('Transparent: Every assumption, formula, and data source is disclosed. No black-box scoring.');
    bullet('Additive: The system layers progressively deeper analysis without requiring users to repeat prior steps.');

    // ========================================
    // II. SYSTEM OVERVIEW
    // ========================================
    sectionTitle('II. System Overview');

    body('Deal Intelligence operates as an integrated analytical pipeline within the Axiom Protocol ecosystem. Properties enter the system through address resolution and geocoding, after which they become available for financial modeling across multiple deal strategies.');

    subSection('Analytical Pipeline');
    body('The system follows a structured progression from property discovery to capital decision:');
    bullet('Property Resolution: Address normalization, geocoding, and property data enrichment via external data providers including assessed values, square footage, lot size, year built, and zoning classification.');
    bullet('Deal Configuration: Users define acquisition parameters (purchase price, ARV estimate, rehab budget, closing costs, hold period), financing terms (down payment, interest rate, loan term), income assumptions (monthly rent, vacancy rate), and operating expenses (property tax, insurance, maintenance, management fee, HOA).');
    bullet('Underwriting Execution: The engine computes over 20 financial metrics including DSCR, cap rate, cash-on-cash return, total ROI, break-even occupancy, operating expense ratio, and GRM.');
    bullet('Risk Assessment: A multi-factor risk model identifies material risks and generates a composite risk classification (LOW, MODERATE, HIGH, CRITICAL).');
    bullet('Comparable Sales: Geographic matching produces valuation benchmarks from actual closed transactions.');
    bullet('IVCEE Analysis: Six deterministic analytical modules stress-test the deal from multiple institutional perspectives.');
    bullet('Acquisition Advisory: AI-powered synthesis of all preceding data into actionable acquisition strategy with specific pricing, negotiation tactics, and financing recommendations.');
    bullet('Decision Logging: Every analytical action is recorded with timestamps, parameters, and results for governance audit.');

    // ========================================
    // III. CORE UNDERWRITING ENGINE
    // ========================================
    doc.addPage();
    sectionTitle('III. Core Underwriting Engine');

    body('The underwriting engine is the computational foundation of Deal Intelligence. It accepts a complete set of financial assumptions and produces a deterministic metrics output covering profitability, leverage, and cash flow adequacy.');

    subSection('Input Parameters');
    body('The engine accepts four categories of assumptions:');
    labeledItem('Acquisition', 'Purchase price, after-repair value (ARV) estimate, rehabilitation budget, closing cost percentage, and hold period in months');
    labeledItem('Financing', 'Down payment percentage, annual interest rate, and loan term in years. Debt service is computed using standard amortization formulas');
    labeledItem('Income', 'Gross monthly rent and vacancy rate. Effective gross income is derived as annual rent adjusted for vacancy');
    labeledItem('Expenses', 'Annual property tax, insurance, maintenance reserve, property management fee (as percentage of gross rent), and HOA fees');

    subSection('Output Metrics');
    body('The engine produces the following computed metrics from the input assumptions:');
    bullet('Net Operating Income (NOI): Effective gross income minus total operating expenses');
    bullet('Debt Service Coverage Ratio (DSCR): NOI divided by annual debt service. Values below 1.0 indicate negative cash flow');
    bullet('Capitalization Rate: NOI divided by purchase price, expressed as a percentage');
    bullet('Cash-on-Cash Return: Annual pre-tax cash flow divided by total cash invested');
    bullet('Total Return on Investment: Total profit (including equity gain) divided by total cash invested');
    bullet('Break-Even Occupancy: Minimum occupancy rate required to cover all expenses and debt service');
    bullet('Operating Expense Ratio: Total operating expenses as a percentage of effective gross income');
    bullet('Gross Rent Multiplier: Purchase price divided by annual gross rent');
    bullet('Monthly Cash Flow: Net monthly income after all expenses, debt service, and vacancy allowance');
    bullet('Equity Position: Difference between after-repair value and total loan amount');
    bullet('Loan-to-Value Ratio: Loan amount divided by purchase price');

    subSection('Scenario Modeling');
    body('Each property can support multiple underwriting scenarios with different assumption sets. Users can model various strategies (buy-and-hold, BRRRR, wholesale) against the same property to compare outcomes. Scenarios are persisted independently, enabling historical comparison and strategy refinement.');

    // ========================================
    // IV. COMPARABLE SALES INTELLIGENCE
    // ========================================
    sectionTitle('IV. Comparable Sales Intelligence');

    body('The comparable sales module provides market-grounded valuation context by identifying recently closed transactions within a defined geographic radius of the subject property. This data serves as an independent check on the user-supplied ARV estimate and purchase price assumptions.');

    subSection('Data Acquisition');
    body('Comparable sales data is sourced from external property data providers. The system queries transactions closed within the preceding 12 months and within a configurable radius (default: 1 mile) of the subject property coordinates. Results include sale price, sale date, square footage, lot size, bedrooms, bathrooms, year built, and property type.');

    subSection('Normalization and Analysis');
    body('Each comparable sale is normalized to a per-square-foot basis to enable direct comparison regardless of property size. The system computes median, mean, minimum, and maximum price-per-square-foot across the comparable set. These statistics provide a distribution range that contextualizes the subject property valuation.');

    subSection('Institutional Application');
    body('Allocators use comparable sales data to validate ARV assumptions before capital commitment. A purchase price significantly above the comparable median per-square-foot value represents elevated acquisition risk. Conversely, a purchase price below comparable benchmarks may indicate value opportunity — contingent on property condition, location micro-factors, and rehabilitation scope.');

    // ========================================
    // V. RISK CLASSIFICATION FRAMEWORK
    // ========================================
    doc.addPage();
    sectionTitle('V. Risk Classification Framework');

    body('Deal Intelligence incorporates a multi-factor risk classification model that evaluates each deal across several dimensions and produces a composite risk score. The framework is designed to surface material risks early in the evaluation process, enabling informed capital allocation decisions.');

    subSection('Risk Factors Assessed');
    bullet('DSCR Adequacy: Deals with DSCR below 1.25 receive elevated risk flags. DSCR below 1.0 is classified as critical, indicating the property cannot service its debt from operating income alone.');
    bullet('Leverage Exposure: High loan-to-value ratios (above 80%) increase sensitivity to market corrections and reduce equity cushion.');
    bullet('Cash Flow Sufficiency: Negative monthly cash flow indicates structural deficit requiring capital infusion beyond operating income.');
    bullet('Vacancy Sensitivity: Properties with break-even occupancy above 90% have minimal margin for vacancy before entering negative cash flow.');
    bullet('Expense Ratio: Operating expense ratios above 60% indicate high fixed-cost burden relative to income generation.');
    bullet('Capitalization Rate: Cap rates below market benchmarks may indicate overpayment relative to income stream.');

    subSection('Classification Tiers');
    labeledItem('LOW', 'Deal metrics are within acceptable ranges across all risk factors. DSCR above 1.25, positive cash flow, LTV below 75%');
    labeledItem('MODERATE', 'One or two risk factors outside preferred ranges but no critical deficiencies. Deal may proceed with additional scrutiny');
    labeledItem('HIGH', 'Multiple risk factors outside acceptable ranges. Negative cash flow or DSCR below 1.0. Requires material restructuring');
    labeledItem('CRITICAL', 'Fundamental structural problems. Unable to service debt, extreme leverage, or negative equity position');

    // ========================================
    // VI. ACQUISITION ADVISORY
    // ========================================
    sectionTitle('VI. Acquisition Advisory (AI-Powered)');

    body('The Acquisition Advisory module synthesizes all preceding analytical outputs — underwriting metrics, comparable sales data, risk classification, and IVCEE analysis — into a comprehensive acquisition strategy. This module leverages Gemini AI to produce contextual, deal-specific recommendations that go beyond numerical analysis.');

    subSection('Advisory Outputs');
    bullet('Verdict Classification: Each deal receives a primary verdict — STRONG BUY, CONDITIONAL PROCEED, HOLD FOR BETTER TERMS, or DO NOT PURSUE — with a confidence score and detailed rationale.');
    bullet('Recommended Offer Price: A specific dollar amount derived from comparable analysis, risk profile, and target return thresholds, with justification for the recommended price point.');
    bullet('Negotiation Strategy: Tactical guidance for price negotiation including opening position, concession thresholds, key leverage points, and walkaway triggers.');
    bullet('Creative Financing Options: Alternative deal structures such as seller financing, subject-to arrangements, lease-option hybrids, and partnership structures with analysis of how each affects returns.');
    bullet('Risk Management Plan: Specific mitigation strategies for each identified risk factor, including insurance requirements, reserve allocations, contingency planning, and exit strategy options.');

    subSection('Data Grounding');
    body('All advisory recommendations are grounded in the actual data pipeline — real comparable sales, computed metrics, and identified risks. The AI model receives structured analytical context rather than raw property data, ensuring recommendations reflect the institutional analysis already performed. Advisory results can be saved and automatically loaded on subsequent visits, preserving institutional context without requiring re-analysis.');

    // ========================================
    // VII. IVCEE
    // ========================================
    doc.addPage();
    sectionTitle('VII. IVCEE — Institutional Viability & Capital Efficiency Engine');

    body('The Institutional Viability and Capital Efficiency Engine (IVCEE) is the most analytically dense module within Deal Intelligence. It consists of six independent analytical engines, each examining the deal from a distinct institutional perspective. All six modules are deterministic — they use pure mathematical functions with no randomness, producing identical results for identical inputs.');

    subSection('Module 1: Viability Probability Model');
    body('Computes a Bayesian-style probability score representing the likelihood that a deal will achieve positive cash flow and maintain debt service coverage throughout the hold period. The model weights four factors: DSCR contribution (40%), cash flow adequacy (25%), cap rate positioning (20%), and a confidence modifier (15%). Each factor is processed through a sigmoid normalization function that maps raw metrics to a 0-1 probability scale. The dominant risk factor is identified based on which component contributes the lowest score.');

    subSection('Module 2: Sensitivity Matrix Engine');
    body('Generates a comprehensive sensitivity analysis by varying three key inputs — purchase price, monthly rent, and interest rate — across five delta values each (ranging from -20% to +20%). This produces 124 unique scenario combinations (5 x 5 x 5 minus the baseline). For each scenario, the engine recomputes debt service, net operating income, DSCR, monthly cash flow, and cap rate. The output matrix allows allocators to visualize how deal viability responds to simultaneous changes in acquisition cost, income, and financing terms.');

    subSection('Module 3: Stress Scenario Simulator');
    body('Applies four predefined macroeconomic stress scenarios to the deal and evaluates survival probability:');
    bullet('Recession: Rent declines 10%, vacancy increases by 8 percentage points, operating expenses rise 5%');
    bullet('Rate Shock: Interest rate increases 200 basis points, simulating refinance risk in rising rate environments');
    bullet('Rent Drop: Gross rent declines 15% from baseline, testing resilience to market rental compression');
    bullet('Vacancy Shock: Vacancy rate increases to 20%, simulating extended tenant turnover or market softening');
    body('Each scenario produces a stressed DSCR, stressed monthly cash flow, and a binary survival classification (SURVIVE or FAIL). Deals that fail all four stress scenarios carry material resilience risk.');

    subSection('Module 4: Refinance Risk Model');
    body('Projects the refinance environment after the rehabilitation period, computing post-rehab loan-to-value ratio (using ARV as the denominator), projected DSCR at refinance, extractable equity, and refinance probability. The probability score accounts for both leverage positioning and debt service adequacy, as lenders typically require minimum DSCR thresholds for refinance approval.');

    subSection('Module 5: Downside Protection Metrics');
    body('Calculates critical break-even thresholds that define the margin of safety:');
    bullet('Break-Even Rent: The minimum monthly rent required to cover all expenses and debt service at current occupancy');
    bullet('Break-Even Price: The maximum purchase price at which the deal achieves positive cash flow with current income and expense assumptions');
    bullet('Maximum Safe LTV: The highest loan-to-value ratio that maintains a DSCR above 1.0');
    bullet('Margin of Safety: The monthly dollar cushion between actual cash flow and break-even — positive values indicate headroom, negative values indicate structural deficit');

    subSection('Module 6: Capital Efficiency Score');
    body('Computes a risk-adjusted efficiency metric that ranks capital deployment effectiveness across all analyzed deals. The score adjusts raw return on investment by applying volatility penalties (derived from sensitivity matrix variance) and leverage penalties (based on LTV positioning). Capital efficiency rankings are recomputed globally after each new analysis, providing a relative comparison across the portfolio of evaluated opportunities.');

    // ========================================
    // VIII. DECISION LOGGING
    // ========================================
    sectionTitle('VIII. Decision Logging & Audit Trail');

    body('Every analytical action within Deal Intelligence is recorded in an immutable decision log. Each entry captures the timestamp, action type, parameters used, and results produced. This creates a complete audit trail that governance stakeholders can review to understand the analytical basis for any capital allocation decision.');

    subSection('Logged Actions');
    bullet('Underwriting runs with full assumption sets and computed metrics');
    bullet('Scenario modifications showing parameter changes and resulting metric deltas');
    bullet('Risk assessments with identified risk factors and composite classifications');
    bullet('IVCEE module executions with all input parameters and output results');
    bullet('Advisory requests and responses with verdict, confidence, and recommendations');
    bullet('Manual notes and governance annotations added by authorized participants');

    body('The decision log serves as the institutional memory of each deal evaluation. It enables governance participants to trace any recommendation back to its analytical inputs, supporting the transparency standards required for institutional capital deployment.');

    // ========================================
    // IX. TECHNICAL ARCHITECTURE
    // ========================================
    doc.addPage();
    sectionTitle('IX. Technical Architecture');

    body('Deal Intelligence is built on a modern, serverless-compatible architecture designed for reliability, auditability, and progressive enhancement.');

    subSection('Compute Layer');
    body('The core underwriting engine and IVCEE modules are implemented as pure functions with no side effects. This design ensures deterministic behavior, enables comprehensive unit testing, and allows computation to be verified independently of the persistence layer. The IVCEE compute engine has 30 unit tests validating mathematical correctness across all six modules.');

    subSection('Persistence Layer');
    body('All analytical results are persisted in PostgreSQL using raw SQL operations. The schema includes dedicated tables for deal assumptions, computed metrics, comparable sales, risk assessments, decision logs, and all six IVCEE module outputs. Tables are created automatically on system initialization using idempotent DDL statements, ensuring zero-downtime deployment.');

    subSection('API Layer');
    body('The system exposes RESTful API endpoints following a consistent request/response pattern. Each IVCEE module can be invoked independently or orchestrated through a unified endpoint that executes all six modules in sequence. All endpoints validate inputs, handle errors with structured error responses, and enforce HTTP method restrictions.');

    subSection('Integration Points');
    bullet('Property data enrichment via external property data APIs (assessed values, property characteristics, rental estimates)');
    bullet('Comparable sales sourced from transaction databases within configurable geographic radius');
    bullet('AI advisory powered by Gemini integration with structured prompting and grounded context');
    bullet('Blockchain network connectivity for on-chain governance actions and token-gated access');

    // ========================================
    // X. DATA INTEGRITY
    // ========================================
    sectionTitle('X. Data Integrity & Governance');

    body('Deal Intelligence enforces strict data integrity principles at every layer:');
    bullet('No placeholder or mock data in production paths. All values are sourced from external providers, user inputs, or deterministic computation.');
    bullet('Percentage field normalization ensures consistent handling across the database layer (stored as whole numbers) and compute layer (processed as decimals).');
    bullet('All saved analysis results use upsert semantics, preventing duplicate entries while preserving the latest state.');
    bullet('Decision log entries are append-only, creating an immutable audit trail.');
    bullet('API keys and secrets are managed through secure integration channels — never exposed in client-side code or logs.');

    // ========================================
    // XI. REGULATORY CONSIDERATIONS
    // ========================================
    sectionTitle('XI. Regulatory Considerations');

    body('Deal Intelligence is an analytical tool that produces informational outputs for human decision-makers. It does not constitute investment advice, securities recommendations, or fiduciary guidance. Key regulatory positioning:');
    bullet('The system does not hold, manage, direct, or custody capital in any form.');
    bullet('All outputs are clearly labeled as analytical results, not guarantees or promises of financial outcomes.');
    bullet('Variable rates apply to all yield or return references. No fixed APY or guaranteed return claims are made.');
    bullet('The Lending Fund referenced within the broader Axiom Protocol ecosystem operates under SEC Reg D 506(c) parameters and is separate from Deal Intelligence analytical outputs.');
    bullet('GENIUS Act alignment is described as "designed to align with" — no compliance claims are asserted.');

    // ========================================
    // XII. ROADMAP
    // ========================================
    sectionTitle('XII. Roadmap & Strategic Outlook');

    body('Deal Intelligence is positioned for progressive enhancement along several vectors:');
    bullet('Portfolio-Level Analytics: Aggregate IVCEE scoring across multiple deals to identify optimal capital deployment across a portfolio of acquisition opportunities.');
    bullet('Historical Performance Tracking: Longitudinal comparison of projected versus actual performance for deals that proceed to acquisition, creating a feedback loop that improves future analysis accuracy.');
    bullet('Expanded Asset Classes: Extension beyond single-family residential to include multi-family, commercial, and mixed-use property types with asset-class-specific underwriting models.');
    bullet('Governance Integration: Direct integration with on-chain governance mechanisms, enabling token-weighted voting on capital allocation decisions informed by Deal Intelligence outputs.');
    bullet('Cross-Chain Data Bridging: Leveraging the planned Universe Blockchain (L3) migration to create on-chain attestations of analytical results for institutional verification.');

    // ========================================
    // CLOSING
    // ========================================
    doc.addPage();
    doc.moveDown(6);
    drawThickLine(doc.y);
    doc.moveDown(2);
    doc.fontSize(18).font('Times-Bold').fillColor(NAVY).text('Build Wealth Together, On-Chain.', { align: 'center' });
    doc.moveDown(1);
    doc.fontSize(10).font('Times-Roman').fillColor(MUTED).text('Axiom Protocol', { align: 'center' });
    doc.text('Governance-First Wealth Infrastructure', { align: 'center' });
    doc.moveDown(0.5);
    doc.text('Arbitrum One', { align: 'center' });
    doc.moveDown(2);
    drawThickLine(doc.y);
    doc.moveDown(2);
    doc.fontSize(8).font('Times-Italic').fillColor(MUTED).text(
      'This document is classified as INTERNAL and is intended solely for Axiom Protocol stakeholders, governance participants, and authorized institutional counterparties. Distribution outside authorized channels requires written approval. The information contained herein is provided "as is" without warranty of any kind. Axiom Protocol makes no representations regarding the accuracy, completeness, or suitability of this information for any particular purpose. This document does not constitute an offer to sell, a solicitation of an offer to buy, or a recommendation of any security, investment product, or financial instrument. All references to yields, returns, or financial outcomes are variable and subject to market conditions.',
      { align: 'center', width: pageWidth, lineGap: 3 }
    );

    pageNumber();
    doc.end();

    const pdfBuffer = await pdfReady;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Axiom_Deal_Intelligence_Institutional_Brief.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.setHeader('Cache-Control', 'no-cache');
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('[deal-intelligence-brief] PDF generation error:', err);
    res.status(500).json({ error: { message: 'Failed to generate document', detail: err.message } });
  }
}
