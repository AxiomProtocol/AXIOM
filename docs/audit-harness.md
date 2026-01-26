# Axiom Protocol - Audit & Regression Harness

## Overview

This document describes the safety audit harness for the Axiom Protocol smart contracts. The harness ensures treasury and governance behavior remains correct as features scale, without changing production logic.

## Test Framework

**Primary:** Hardhat + Mocha/Chai  
**Static Analysis:** Slither  
**CI Integration:** npm scripts with JSON output

## Quick Start

```bash
# Install dependencies
npm install

# Run all invariant tests
npm run test:invariants

# Run regression scenarios
npm run test:scenarios

# Run full audit suite with reports
npm run audit:full

# Run Slither static analysis
npm run slither

# Generate all reports
npm run audit:report
```

## Directory Structure

```
/test
├── invariants/           # Property-based invariant tests
│   ├── Treasury.invariant.test.ts
│   ├── Governance.invariant.test.ts
│   ├── Liquidity.invariant.test.ts
│   └── AssetRegistry.invariant.test.ts
├── scenarios/            # Regression scenario tests
│   ├── income-routing.scenario.test.ts
│   ├── maintenance-reserve.scenario.test.ts
│   ├── emergency-pause.scenario.test.ts
│   └── parameter-update.scenario.test.ts
├── helpers/              # Test utilities
│   └── TestReporter.ts
└── mocks/                # Mock contracts for testing

/reports
├── audit-report.json     # Machine-readable report
├── audit-report.md       # Human-readable report
└── permissions-diff.md   # Role/permission analysis
```

## Invariant Tests

### Module Mapping

Each invariant test ties back to a module requirement from `/docs/modules.md`:

| Invariant Category | Module Reference | File |
|-------------------|------------------|------|
| Treasury No-Underflow | Module 1: Treasury Core | Treasury.invariant.test.ts |
| Allocation Caps | Module 2: Budget Router | Treasury.invariant.test.ts |
| Routing Determinism | Module 1.2: Routing | Treasury.invariant.test.ts |
| Admin-Only Functions | Module 5: Admin Role Separation | All tests |
| Emergency Pause | Module 6: Emergency Controls | All tests |
| Parameter Events | Module 4: Governance Parameter Registry | Governance.invariant.test.ts |
| Role Enforcement | Module 5: Admin Role Separation | Governance.invariant.test.ts |
| Timelock Delay | Module 4.2: Timelock Updates | Governance.invariant.test.ts |
| Liquidity Buckets | Module 7: Liquidity Deployment | Liquidity.invariant.test.ts |
| Exposure Limits | Module 9: Drawdown Protection | Liquidity.invariant.test.ts |
| Registry Auth | Module 10: Asset Registry | AssetRegistry.invariant.test.ts |
| Revenue Attribution | Module 11: Revenue Attribution | AssetRegistry.invariant.test.ts |

### Running Individual Tests

```bash
# Treasury invariants only
npx hardhat test test/invariants/Treasury.invariant.test.ts

# Governance invariants only
npx hardhat test test/invariants/Governance.invariant.test.ts

# With verbose output
npx hardhat test test/invariants/*.test.ts --verbose
```

## Regression Scenarios

### Scenario 1: Income Intake → Routing → Weekly Draw
**Module:** 1.1 Intake, 1.2 Routing, 2.1 Draw Schedules  
**File:** `income-routing.scenario.test.ts`

Tests realistic flow of:
1. Revenue deposits from multiple sources
2. Automatic routing to designated vaults
3. Weekly draw schedule execution

### Scenario 2: Maintenance Reserve Accumulation
**Module:** 3.2 Maintenance Reserve  
**File:** `maintenance-reserve.scenario.test.ts`

Tests:
1. Reserve accumulation over time
2. Maintenance expense withdrawal
3. Threshold enforcement

### Scenario 3: Emergency Pause During Stress
**Module:** 6.1 Pause, 6.2 Intervene  
**File:** `emergency-pause.scenario.test.ts`

Tests:
1. Pause during high-activity period
2. Verify all state-changing functions blocked
3. Resume and verify normal operation

### Scenario 4: Parameter Updates → Observed Effects
**Module:** 4.1 Parameter Storage, 4.2 Timelock Updates  
**File:** `parameter-update.scenario.test.ts`

Tests:
1. Parameter change proposal
2. Event emission verification
3. Effect on routing/allocation

## Static Analysis

### Slither Configuration

```bash
# Run with default detectors
npm run slither

# Generate JSON report
slither . --json reports/slither-output.json

# Specific detector categories
slither . --detect reentrancy-eth,reentrancy-no-eth,unprotected-upgrade
```

### Key Detectors Enabled

- `reentrancy-eth`: Reentrancy vulnerabilities
- `unprotected-upgrade`: Unsafe upgrade patterns
- `arbitrary-send`: Arbitrary ETH send
- `controlled-delegatecall`: Dangerous delegatecall
- `suicidal`: Unprotected selfdestruct
- `unchecked-transfer`: Unchecked ERC20 transfers

## CI Integration

### GitHub Actions (example)

```yaml
name: Audit Harness
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:invariants
      - run: npm run test:scenarios
      - run: npm run slither
      - run: npm run audit:report
      - uses: actions/upload-artifact@v4
        with:
          name: audit-reports
          path: reports/
```

### npm Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test:invariants": "hardhat test test/invariants/*.test.ts --config hardhat.config.ts",
    "test:scenarios": "hardhat test test/scenarios/*.test.ts --config hardhat.config.ts",
    "slither": "slither contracts/ --exclude-dependencies --json reports/slither-output.json",
    "audit:full": "npm run test:invariants && npm run test:scenarios && npm run slither",
    "audit:report": "node scripts/generate-audit-report.js"
  }
}
```

## Report Format

### audit-report.json Schema

```json
{
  "timestamp": "ISO-8601",
  "summary": {
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0
  },
  "invariants": {
    "treasury": [],
    "governance": [],
    "liquidity": [],
    "asset_registry": []
  },
  "scenarios": [],
  "static_analysis": {
    "high": 0,
    "medium": 0,
    "low": 0,
    "informational": 0,
    "findings": []
  },
  "attack_surface": {
    "admin_keys": [],
    "pause_powers": [],
    "upgrade_capabilities": []
  },
  "gaps": [],
  "recommendations": []
}
```

## Extending the Harness

### Adding New Invariants

1. Identify module requirement in `/docs/modules.md`
2. Create test in appropriate invariant file
3. Add description comment with module reference
4. Update this documentation

### Adding New Scenarios

1. Create file: `test/scenarios/{name}.scenario.test.ts`
2. Include module mapping in test description
3. Add to scenario list in this document

## Limitations

- Tests run against local Hardhat network fork
- Production contract addresses used for reference only
- No actual mainnet state modification
- Invariant tests use property-based approach with bounded iterations
