Axiom Financial OS Planning System

Internal Operating Documents
Version: 1.0
Date: March 10, 2026


PURPOSE

This directory contains the execution planning system for the Axiom Financial OS roadmap. These documents govern how the 49-capability roadmap is sequenced, gated, and tracked.

These are internal operating documents. They are not public-facing materials.


DOCUMENT INDEX

01  Capability Map
    File: 01_Capability_Map.md
    Purpose: The authoritative inventory of all 49 capabilities organized by functional domain. This is the strategic blueprint. It defines what the platform will become. It is not an execution schedule.

02  Execution Tracks
    File: 02_Execution_Tracks.md
    Purpose: Separates the roadmap into three staged execution tracks:
      Track A - Institutional Core (foundation, governance, observability)
      Track B - Asset and Capital Execution (distributions, lending, compliance, assets)
      Track C - Consumer Financial Rails (payments, savings, expansion, social)
    Defines purpose, contents, risks, dependencies, and exit gates for each track.

03  90-Day Execution Plan
    File: 03_90_Day_Execution_Plan.md
    Purpose: Time-bound execution roadmap for the current 90-day window (March 10 through June 8, 2026). Defines NOW (active), NEXT (queued), and LATER (deferred) horizons. Caps active work at 10 tasks.

04  Dependency Matrix
    File: 04_Dependency_Matrix.md
    Purpose: Complete dependency reference for all 49 tasks. For each task: track assignment, upstream dependencies, downstream blocks, execution priority, and risk assessment for premature execution.

05  Sequencing Rationale
    File: 05_Sequencing_Rationale.md
    Purpose: Explains in institutional language why the roadmap is staged rather than built simultaneously. Covers seven operational constraints: surface area risk, regression risk, testing burden, operations burden, compliance burden, narrative drift, and founder concentration risk.

06  Execution Gate Framework
    File: 06_Execution_Gate_Framework.md
    Purpose: Defines four sequential gates with specific pass/fail criteria:
      Gate 1 - Platform Integrity (Day 30)
      Gate 2 - Institutional Reliability (Day 60)
      Gate 3 - Capital Execution Readiness (Day 90)
      Gate 4 - Consumer Rails Readiness (Day 120-150)
    Each gate specifies required capabilities, evidence, pass conditions, failure conditions, and what cannot begin before the gate passes.


RELATED DOCUMENTS

  Axiom Financial OS Master Roadmap
    Location: documents/Axiom_Financial_OS_Master_Roadmap.md
    Purpose: The original broad roadmap with detailed task specifications. This remains the authoritative source for individual task scope, files, and acceptance criteria.

  Founder Operations Playbook
    Location: docs/internal/FOUNDER_OPS_PLAYBOOK_v2_1.md

  DeNet Deployment Guide
    Location: docs/internal/DENET_GCLOUD_DEPLOYMENT_GUIDE.md


HOW TO USE THESE DOCUMENTS

  1. Start with the Capability Map (01) to understand the full scope.
  2. Read the Execution Tracks (02) to understand how work is organized.
  3. Check the 90-Day Plan (03) to see what is currently active, queued, and deferred.
  4. Consult the Dependency Matrix (04) before starting any new task.
  5. Reference the Gate Framework (06) before promoting work from NEXT to NOW.
  6. Review the Sequencing Rationale (05) when evaluating whether to accelerate or defer a capability.
