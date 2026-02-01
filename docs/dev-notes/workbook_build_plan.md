# Land Reclamation Workbook - Build Plan

## Platform Analysis

### A. Stack and Architecture

| Component | Technology | Details |
|-----------|------------|---------|
| Framework | Next.js 14 | Pages Router, standalone output |
| Backend API | Next.js API Routes | pages/api directory |
| Database | PostgreSQL (Neon) | Drizzle ORM |
| ORM | Drizzle | shared/schema.ts (~5200 lines) |
| Auth | Session-based | express-session, connect-pg-simple |
| User Model | Serial ID | shared/schema.ts users table |
| File Storage | Replit Object Storage | Google Cloud Storage client via server/objectStorage.js |
| Payments | Stripe | server/stripe-payments.js |
| AI Integration | Gemini | lib/server/gemini.ts (chat, generateText) |
| PDF Generation | PDFKit | pages/api/reports/generate-pdf.js pattern |

### B. Existing Relevant Modules

| Module | Location | Pattern |
|--------|----------|---------|
| User Profiles | shared/schema.ts users table | Serial ID, session-based auth |
| File Uploads | server/objectStorage.js | GCS client, ACL policies |
| Rate Limiting | utils/rateLimiter.js | Per-key rate limiting |
| Admin Panel | pages/api/admin, pages/admin | Session-based admin check |
| AI Chat | lib/server/gemini.ts | chat() function with history |
| PDF Export | pages/api/reports/generate-pdf.js | PDFKit streaming |

### C. Styling and UI Patterns

- TailwindCSS for styling
- Inline styles for custom components
- Theme colors: primary (#00D4AA), secondary (#FFD700), accent (#7B68EE)
- No emojis in professional UI per user preferences

---

## Implementation Plan

### New Files to Create

#### Schema Additions (shared/schema.ts)
- workbookCases table
- workbookSectionStates table
- evidenceItems table
- factClaims table
- taskItems table
- timelineEvents table
- dispossessionEvents table
- resourceDirectoryItems table
- subscriptionEntitlements table
- staffInteractionLogs table
- recordDestructionEntries table
- assumptionEntries table
- dossierSnapshots table
- outcomeLogs table
- aiUsageMeters table
- Enums for status values

#### API Routes (pages/api/workbook/)
- cases/index.ts - CRUD for cases
- cases/[caseId].ts - Single case operations
- sections/[caseId]/[sectionKey].ts - Section state management
- evidence/index.ts - Evidence CRUD
- evidence/[evidenceId].ts - Single evidence operations
- evidence/upload.ts - File upload handling
- facts/index.ts - Fact claims CRUD
- tasks/index.ts - Tasks CRUD
- timeline/index.ts - Timeline events
- dispossession/index.ts - Dispossession events
- ai/research-planner.ts - Research planning mode
- ai/evidence-clerk.ts - Evidence analysis mode
- ai/dossier-drafter.ts - Draft generation mode
- exports/workbook-pdf.ts - Workbook PDF generation
- exports/checklist-pdf.ts - Readiness checklist
- exports/intake-memo.ts - Attorney intake memo
- exports/institutional.ts - Institutional handoff variants
- snapshots/index.ts - Dossier snapshots
- snapshots/[snapshotId].ts - Snapshot retrieval
- resources/index.ts - Resource directory
- outcomes/index.ts - Outcome logging
- staff-log/index.ts - Staff interaction log
- destruction-registry/index.ts - Record destruction entries
- assumptions/index.ts - Assumption entries
- subscription/status.ts - Subscription status
- subscription/checkout.ts - Create checkout session
- subscription/webhook.ts - Stripe webhook handler
- admin/cases.ts - Admin case view
- admin/resources.ts - Resource CRUD for admins
- admin/ai-usage.ts - AI usage dashboard data

#### Page Components (pages/workbook/)
- index.tsx - Workbook home with case list
- [caseId]/index.tsx - Case overview dashboard
- [caseId]/section/[sectionKey].tsx - Section forms
- [caseId]/evidence.tsx - Evidence vault
- [caseId]/tasks.tsx - Tasks board
- [caseId]/timeline.tsx - Timeline view
- [caseId]/exports.tsx - Export center
- [caseId]/outcomes.tsx - Outcome tracking
- [caseId]/courthouse.tsx - Field mode checklist
- resources.tsx - Resource directory view
- subscribe.tsx - Subscription page

#### Admin Pages (pages/admin/workbook/)
- index.tsx - Admin dashboard
- cases.tsx - Case management
- resources.tsx - Resource editor
- ai-usage.tsx - AI usage monitoring

#### Components (components/workbook/)
- WorkbookLayout.tsx - Layout wrapper
- CaseCard.tsx - Case list item
- SectionNav.tsx - Section navigation
- EvidenceCard.tsx - Evidence display
- EvidenceForm.tsx - Evidence entry form
- FactClaimCard.tsx - Fact claim display
- TaskCard.tsx - Task item
- TimelineEntry.tsx - Timeline event
- UsageMeter.tsx - Usage transparency widget
- SubscriptionBadge.tsx - Subscription status
- CollisionWarning.tsx - Identity collision alert
- AssumptionPanel.tsx - Assumptions display
- ConfidenceBadge.tsx - Evidence confidence indicator
- PrintableChecklist.tsx - Printable courthouse checklist
- ExportPreview.tsx - Export confirmation screen
- EthicalUseAgreement.tsx - Agreement modal
- FrictionStep.tsx - Deliberate delay component
- ResourceCard.tsx - Resource directory item
- StaffLogEntry.tsx - Staff interaction entry
- DestructionEntry.tsx - Destruction registry entry

#### Services (lib/workbook/)
- billing.ts - BillingProvider abstraction
- entitlements.ts - Entitlement checking
- ai-assistant.ts - AI mode implementations
- identity-collision.ts - Collision detection
- pdf-generator.ts - PDF generation utilities
- usage-meter.ts - Usage tracking
- export-utils.ts - Export helpers

---

## Database Schema Summary

### Enums to Create
- workbook_case_status: active, archived
- section_completion_status: not_started, in_progress, complete, blocked
- record_type: census, deed, tax, probate, map, court, other
- source_type: primary, secondary
- confidence_level: unsupported, partially_supported, primary_supported
- claim_type: birth, death, residency, ownership_indicator, acquisition, transfer, dispossession, current_owner, other
- claim_confidence: user_asserted, supported, verified
- task_status: open, done
- dispossession_mechanism: tax_sale, sheriff_sale, partition, fraud, probate_gap, unknown
- dispossession_authority: court, sheriff, private, unknown
- subscription_status: active, past_due, canceled
- outcome_type: attorney_contacted, action_filed, negotiation_started, case_closed, other

### Tables (15 total)
1. workbook_cases
2. workbook_section_states
3. evidence_items
4. fact_claims
5. task_items
6. timeline_events
7. dispossession_events
8. resource_directory_items
9. subscription_entitlements
10. staff_interaction_logs
11. record_destruction_entries
12. assumption_entries
13. dossier_snapshots
14. outcome_logs
15. ai_usage_meters

---

## Environment Variables Required

```
BILLING_PROVIDER_KEY - Stripe secret key (use existing STRIPE_SECRET_KEY)
BILLING_PRICE_ID_WORKBOOK_MONTHLY - Stripe price ID for $20/month plan
BILLING_WEBHOOK_SECRET - Stripe webhook signing secret
AI_MONTHLY_LIMITS_JSON - JSON config for AI usage limits
```

---

## Navigation Integration

Add to components/navigation/SiteNavModel.ts:
- Workbook entry under Tools section
- Link to /workbook

---

## Security Considerations

1. Row-level access checks on all case/evidence queries
2. Rate limiting on AI endpoints
3. Subscription validation middleware
4. Webhook signature verification
5. No PII in logs
6. User data export capability
7. Deliberate friction on irreversible actions

---

## Implementation Order

1. Database schema additions
2. Core API routes (cases, sections, evidence)
3. Subscription and billing integration
4. Basic UI pages (home, case overview, sections)
5. Evidence vault with file upload
6. AI assistant modes
7. Export generation (PDFs, snapshots)
8. Admin tools
9. Resource directory with seeding
10. Final polish and testing
