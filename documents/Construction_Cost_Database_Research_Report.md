# Construction Cost & Estimating Database for Real Estate Investors
## Deep Research Report — Axiom Protocol
**Research Date:** March 2026 | **Scope:** Data sources, APIs, open-source tools, methodology, build strategy

---

## Executive Summary

Building a construction cost database that actually empowers real estate investors requires combining three ingredients: a standardized cost taxonomy, real pricing data (commercial or community-sourced), and an AI layer that translates human renovation descriptions into line-item estimates. The research across 25+ sources reveals a clear path:

**The fastest, most cost-effective build strategy is a hybrid model:**
1. **Seed** the database with the `datadrivenconstruction/OpenConstructionEstimate` open-source dataset (55,000 work items, MIT licensed, AI-ready)
2. **Enrich** with the Craftsman NEC REST API — the most accessible commercial pricing API with JSON endpoints, quarterly updates, and a developer-accessible sandbox
3. **Structure** around CSI MasterFormat codes — the universally accepted industry taxonomy used by every tool from RSMeans to Procore
4. **Layer** a community submission system to collect real actuals from Axiom investors
5. **Power** natural language search with Gemini AI for investor-friendly queries like "replace HVAC in 1,400 sqft home"

The addressable market is proven: RSMeans charges $1,019–$5,973/year per user for this data. Axiom can build a proprietary version that combines real investor actuals with commercial seed data, becoming a defensible, differentiated platform asset.

---

## Background

Real estate investors — particularly fix-and-flip operators, BRRRR investors, and community acquisition teams — make capital allocation decisions (the 70% Rule: `MAO = ARV × 0.70 – Rehab Costs`) that live or die on construction cost accuracy. A $15,000 underestimate on a $150,000 rehab can erase the entire projected profit.

Today's tools are fragmented: RSMeans is institutional and expensive, spreadsheets are manual and stale, and per-report estimators (BiggerPockets, PropStream) are generic without local precision. No platform has combined on-chain investment governance with real construction cost intelligence at the community level.

---

## Key Finding 1: Commercial Data Providers — Six Options, One Clear Entry Point

### RSMeans Data (by Gordian) — Industry Gold Standard
**Access:** Subscription + Enterprise REST API
**Pricing:** $1,019/yr (Core) → $5,973/yr (Complete) → Custom (API)
**Data:** 85,000+ line items, 970+ US/Canada locations, quarterly updates
**API:** REST API at `dataapi-sb.gordian.com` — requires enterprise engagement
**Verdict:** Best data quality. Too expensive as a seed source. Target as a premium enrichment layer once Axiom has users.
Source: rsmeans.com/products/services/api

### Craftsman National Estimator (NEC) API — Best Developer Entry Point
**Access:** REST API with JSON responses, API-Key header auth
**Pricing:** $13.99/month (web app), API pricing custom (currently in beta/RC)
**Base URL:** `https://nec-api.craftsman-book.com`
**Data:** 10 costbooks (Construction, Electrical, Plumbing/HVAC, Renovation, Insurance Repair), quarterly material updates, annual labor/equipment updates
**Coverage:** All US locations
**Verdict:** Most accessible API. JSON-native. In active development. **Recommended as Axiom's first commercial data integration.**
Source: nec-api.craftsman-book.com

### Verisk EstimateON — White-Label Capable
**Access:** API, white-label embed, periodic data exports
**Pricing:** Custom enterprise
**Data:** 10,000+ location-specific line items, zip-code granularity, monthly labor updates
**Verdict:** Designed for embedding in real estate platforms. Strong fit for Axiom long-term. Requires enterprise sales engagement.
Source: verisk.com/products/estimateon

### Xactimate (by Verisk) — Insurance Restoration Only
**Access:** Partner-only SOAP/XML API, ~$250-300/month subscription
**Verdict:** Not suitable. Scoped to insurance claims, not investor rehab.

### Altus Group ARGUS — Development-Scale Only
**Access:** Enterprise cloud, machine-to-machine auth
**Data:** Hard costs from 6,200+ active projects, major US/Canada cities
**Verdict:** Too institutional for residential investor use. Relevant for Axiom's SPV/syndication track.

### ProEst (Autodesk) — No Public API
**Access:** Autodesk Construction Cloud, $5,000+/year
**Verdict:** Estimation workflow tool, not a data source. No embeddable API.

---

## Key Finding 2: Free and Public Data — Three Usable Sources

### NAHB 2024 Cost of Construction Survey
**What it provides:** National benchmarks — average construction cost $428,215 ($162/sqft) for 2024. 8 construction stages, 36 components with percentage breakdowns.
**Stage breakdown:**
- Site work + foundations: ~18%
- Framing: ~$71,000 average
- Exterior finishes: ~$58,000 average
- Major systems (MEP): ~$67,000 average
**How to access:** Free download at nahb.org (survey report, not a live API)
**Use case:** Calibrating regional cost benchmarks and confidence intervals in Axiom's estimator

### Census Bureau — Building Permits Survey (BPS) & Construction Cost Data
**What it provides:** Building permit counts, permit values, and cost-per-unit data by city and metro area
**How to access:** Free API at census.gov/construction — structured JSON
**Use case:** Tracking local construction activity and validating cost inputs by market

### HUD / FHA Rehabilitation Cost Estimates
**What it provides:** Cost estimation methodology for HUD-assisted residential rehabilitation projects
**How to access:** HUD website, program-specific guides
**Use case:** Establishing compliance-aware rehab cost floors for Axiom's Land Pipeline and Lending Fund collateral underwriting

---

## Key Finding 3: Real Investor Estimation Methodology — What the Database Must Model

Professional real estate investors use a "funnel" approach — coarser estimates at screening, finer detail at commitment:

### Cost Categories (What to Store)
| Category | % of Total Cost | Key Line Items |
|---|---|---|
| Structural / Foundations | 25–30% | Excavation, concrete, framing, structural repairs |
| Interior Finishes | ~24% | Paint, flooring, cabinetry, countertops, appliances |
| MEP Systems | ~19–20% | HVAC, plumbing, electrical rough-in and fixtures |
| Exterior Finishes | ~13–14% | Roofing, siding, windows, doors |
| Site Work | ~7–8% | Landscaping, driveway, utilities |
| Soft Costs | Variable | Permits, architectural fees, insurance, holding costs |
| Contingency | 5–15% | Mandatory buffer — higher for pre-1980 properties |

### Estimation Tiers (What to Enable)
| Method | Use Case | Accuracy | Axiom Tier |
|---|---|---|---|
| $/sqft range | Deal screening in 60 seconds | ±30% | Free |
| Assembly (system) | Scope-of-work budgeting | ±15% | Base |
| Line-item takeoff | Pre-close budget | ±5–8% | Premium |

**Benchmark $/sqft ranges:**
- Cosmetic Rehab: $10–$15/sqft
- Moderate Rehab: $20–$30/sqft
- Heavy / Full Gut: $40–$60+/sqft

### The 70% Rule Integration
Every cost estimate should surface the Maximum Allowable Offer:
```
MAO = (ARV × 0.70) – Estimated Rehab Cost
```
This is the #1 number investors need. Axiom's estimator should compute this automatically from the property's ARV (from the Property Analysis Tool) and the rehab estimate.

### Location Adjustment Reality
- High-cost metros (NYC, SF, Seattle): labor 2–3× rural rates
- Permit complexity: urban permits add 10–30% to soft costs
- Material logistics: remote markets add 5–15% for material transport
- **Axiom must apply location multipliers** by metro or zip code — CSI cost indices provide the standard mechanism

---

## Key Finding 4: Open-Source GitHub Solutions — A Head Start Exists

### #1 — OpenConstructionEstimate (datadrivenconstruction)
**Repo:** github.com/datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR
**Stars:** 91 | **Last commit:** March 2026 | **License:** MIT / CC BY 4.0
**Tech stack:** Python, Qdrant (Vector DB), n8n, OpenAI Embeddings
**What it contains:** 55,000 construction work items and 27,000 resources in 9 languages — formatted specifically for AI semantic search. An investor can ask "replace water heater" and the system finds the right cost line item.
**Verdict:** This is the seed data. MIT licensed. AI-native architecture. Directly usable. Build on this first.

### #2 — GEstimator (manuvarkey)
**Repo:** github.com/manuvarkey/GEstimator
**Stars:** 63 | **Last commit:** March 2026 | **License:** GPL v3
**Tech stack:** Python, GTK+3, Peewee ORM
**What it contains:** Rate analysis logic + bundled DSR (Delhi Schedule of Rates) 2021/22 SQL databases. The rate analysis engine breaks costs into material, labor, and equipment sub-costs.
**Verdict:** License is GPL (viral for open distribution — acceptable for internal use). The rate analysis logic is the key takeaway: model each line item as `(material cost × qty) + (labor rate × hours) + equipment`.

### #3 — DDC Skills for AI Agents in Construction
**Repo:** github.com/datadrivenconstruction/DDC_Skills_for_AI_Agents_in_Construction
**Stars:** 51 | **Last commit:** March 2026 | **License:** MIT
**Tech stack:** TypeScript, MCP (Model Context Protocol)
**What it contains:** 221 AI skills for construction including cost estimation, BIM analysis, and scheduling — bridges raw cost data to an AI-driven user interface.
**Verdict:** Blueprint for Axiom's AI estimation layer. Shows how to connect a cost database to an LLM-powered interface.

### #4 — ML-construction-cost-prediction (DC-777)
**Repo:** github.com/DC-777/ML-construction-cost-prediction
**Stars:** 12 | **Last commit:** 2024 | **License:** MIT
**Tech stack:** Python, XGBoost, LightGBM
**What it contains:** ML models trained on historical construction datasets to predict costs based on property features.
**Verdict:** Useful for the predictive tier — predicting cost changes due to inflation, material markets, or property characteristics.

---

## Key Finding 5: Database Architecture — The Standard Structure

### Taxonomy: Build Around CSI MasterFormat
The Construction Specifications Institute's MasterFormat is the universal standard used by RSMeans, Procore, Autodesk, and every commercial tool:

```
Division 00 — Procurement Requirements
Division 01 — General Requirements  
Division 02 — Existing Conditions (demolition/remediation)
Division 03 — Concrete
Division 04 — Masonry
Division 05 — Metals
Division 06 — Wood, Plastics & Composites (framing)
Division 07 — Thermal & Moisture Protection (roofing, insulation)
Division 08 — Openings (windows, doors)
Division 09 — Finishes (flooring, paint, drywall)
Division 10 — Specialties (appliances, cabinets)
Division 22 — Plumbing
Division 23 — HVAC
Division 26 — Electrical
Division 32 — Exterior Improvements (landscaping, paving)
Division 33 — Utilities (site utilities connections)
```

**For residential investor use, map to 8 investor-friendly categories** that correspond to these divisions — investors don't speak in CSI codes, but the data can.

### Core Database Schema (PostgreSQL)

```sql
-- Cost line items
cost_items (
  id, csi_division, csi_code, description,
  unit (sqft/lf/ea/hr), 
  material_cost, labor_cost, equipment_cost, total_unit_cost,
  location_base (national_avg),
  data_source (craftsman/rsmeans/community/nahb),
  last_updated, confidence_score
)

-- Location multipliers (zip/metro → cost index)
location_multipliers (
  zip_code, city, state, metro_area,
  material_index, labor_index, equipment_index,
  composite_index, source, effective_date
)

-- Community-submitted actuals from investors
cost_actuals (
  id, submitter_wallet_address, property_address,
  zip_code, project_type (cosmetic/moderate/heavy),
  completion_date, total_sqft, total_cost,
  line_items jsonb, verified boolean,
  axiom_project_id (fk to land pipeline / capital program)
)

-- Estimate sessions
cost_estimates (
  id, user_wallet_address, property_address,
  estimate_type (sqft/assembly/line_item),
  total_estimate, arv_input, mao_computed,
  line_items jsonb, tier_used, created_at
)
```

### Location Adjustment Strategy
- **Phase 1:** Apply RSMeans city cost index multipliers (state-level, publicly available in their free reference)
- **Phase 2:** Layer in Craftsman NEC API location adjustments (zip-code level)
- **Phase 3:** Override with community actuals from completed Axiom projects in that market

---

## Recommendations — Axiom's Build Roadmap

### Phase 1 — Seed & Structure (Week 1–2, No External Cost)
1. Import the `OpenConstructionEstimate-DDC-CWICR` dataset — 55,000 work items, MIT licensed, import to PostgreSQL
2. Map items to CSI MasterFormat codes and Axiom's 8 investor-friendly categories
3. Apply NAHB 2024 national benchmarks as cost calibration anchors
4. Build the core schema: `cost_items`, `location_multipliers`, `cost_estimates`

### Phase 2 — Commercial Enrichment (Month 1, ~$14–$50/mo)
5. Integrate Craftsman NEC API — JSON REST, API-key auth, live pricing
   - Costbooks: Construction, Renovation, Plumbing/HVAC, Electrical
   - Cache results with 90-day TTL to minimize API calls
6. Pull Census BPS data for local construction volume signals

### Phase 3 — Investor UX (Month 2)
7. Build the estimator interface in Deal Intelligence workspace
   - Tier 1 (Free): $/sqft quick estimate → ARV input → MAO output
   - Tier 2 (Base): Assembly estimator by system (roof, HVAC, kitchen)
   - Tier 3 (Premium): Line-item takeoff with Craftsman live pricing
8. Gemini AI layer: natural language → CSI line item matching (based on DDC pattern)
   - "Replace roof on 1,800 sqft ranch home" → Division 07 items

### Phase 4 — Community Data Flywheel (Month 3+)
9. Community submission form: investors submit actual costs from completed projects
   - Auto-link to Axiom Capital Program projects and Land Pipeline acquisitions
   - Build the first proprietary dataset of community real estate rehab actuals
10. Machine learning confidence layer: flag estimates where community actuals diverge from commercial benchmarks by >20%

### Phase 5 — Premium Data Upgrade (When Scale Warrants)
11. Upgrade Craftsman to RSMeans Enterprise API ($1K–$6K/yr) for 85,000-item depth
12. Integrate Verisk EstimateON for white-label zip-code-level precision

---

## Competitive Differentiation

| Feature | RSMeans | BiggerPockets | Axiom (Proposed) |
|---|---|---|---|
| Line-item cost data | ✓ (expensive) | Generic | ✓ via Craftsman API |
| Location adjustment | ✓ | Limited | ✓ zip-level |
| AI natural language | ✗ | ✗ | ✓ Gemini |
| Real investor actuals | ✗ | ✗ | ✓ community submissions |
| MAO auto-calculation | ✗ | ✗ | ✓ |
| On-chain project links | ✗ | ✗ | ✓ (Land Pipeline / Capital Program) |
| Price | $1,000+/yr | Free (generic) | Tiered within Axiom |

---

## Limitations

- RSMeans and Verisk data cannot be redistributed without enterprise licensing — Axiom must use Craftsman API (has developer-friendly terms) or its own community data
- Open-source datasets (OpenConstructionEstimate) use international pricing as a reference — US cost calibration requires Craftsman or NAHB benchmarks
- Material costs are volatile (lumber, copper, concrete spike with supply chain events) — any database needs a 90-day or shorter refresh cycle
- Labor rates vary at the sub-market level (not just city) — community actuals are the only way to capture this granularity long-term
- GEstimator is GPL licensed — don't copy its code directly; use it as a reference for the rate-analysis data model only

---

## Sources

1. RSMeans Data Online — rsmeans.com/products/services/api
2. Gordian Data API Sandbox — dataapi-sb.gordian.com/swagger/ui/index.html
3. Craftsman NEC API — nec-api.craftsman-book.com
4. Craftsman NEC API Sandbox — nec-api-sandbox.craftsman-book.com
5. Verisk EstimateON — verisk.com/products/estimateon
6. Altus Group ARGUS — altusgroup.com/argus/downloads/argus-integration-solutions
7. NAHB 2024 Cost of Construction Survey — nahb.org/news-and-economics/housing-economics-plus/special-studies
8. Census Bureau Building Permits Survey — census.gov/construction
9. OpenConstructionEstimate (DDC-CWICR) — github.com/datadrivenconstruction/OpenConstructionEstimate-DDC-CWICR
10. GEstimator — github.com/manuvarkey/GEstimator
11. DDC Skills for AI Agents — github.com/datadrivenconstruction/DDC_Skills_for_AI_Agents_in_Construction
12. ML Construction Cost Prediction — github.com/DC-777/ML-construction-cost-prediction
13. CSI MasterFormat — csinet.org/masterformat
14. BiggerPockets: How to Estimate Rehab Costs — biggerpockets.com/blog/how-to-estimate-rehab-costs
15. RSMeans Estimating Methods — rsmeans.com/resources/estimating-methods-in-construction
16. NAHB Construction Cost Study 2024 — nahb.org
17. Autodesk Construction Cost Estimating Guide — autodesk.com/blogs/construction/cost-estimating-methods
18. CRETI AI PropTech Trends 2024 — creti.org/insights/ai-powered-proptech-venture-capital-investment-trends-in-2024
