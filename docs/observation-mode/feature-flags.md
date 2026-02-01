# Feature Flags - Observation Mode Configuration

**Generated:** 2026-01-27  
**Status:** OBSERVATION WINDOW ACTIVE

---

## Overview

This document defines the feature flag system for controlling observation mode and module activation. All flags are enforced at multiple layers: environment, API middleware, and UI rendering.

---

## Flag Definitions

### Master Control

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `OBSERVATION_MODE` | boolean | `true` | Master gate for observation window |

When `OBSERVATION_MODE=true`:
- All investment/deposit flows are blocked
- Public "invest" CTAs are hidden
- Investor onboarding is disabled
- Admin-only access to financial modules

### Module Activation Flags

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `TREASURY_INTERNAL_ENABLED` | boolean | `true` | Enable internal ledger module |
| `PRIVATE_CREDIT_SELF_FUNDED_ENABLED` | boolean | `true` | Enable self-funded notes |

### Module Deactivation Flags (MUST REMAIN FALSE)

| Flag | Type | Default | Description |
|------|------|---------|-------------|
| `REG_CF_ENABLED` | boolean | `false` | Reg CF crowdfunding (BLOCKED) |
| `INSTITUTIONAL_LP_ENABLED` | boolean | `false` | Institutional LP (BLOCKED) |
| `EXTERNAL_DEPOSITS_ENABLED` | boolean | `false` | External fund acceptance (BLOCKED) |
| `INVESTOR_ONBOARDING_ENABLED` | boolean | `false` | Investor signup (BLOCKED) |

---

## Implementation Locations

### 1. Environment Variables

Location: `.env` / Replit Secrets

```env
OBSERVATION_MODE=true
TREASURY_INTERNAL_ENABLED=true
PRIVATE_CREDIT_SELF_FUNDED_ENABLED=true
REG_CF_ENABLED=false
INSTITUTIONAL_LP_ENABLED=false
EXTERNAL_DEPOSITS_ENABLED=false
INVESTOR_ONBOARDING_ENABLED=false
```

### 2. Server-Side Config

Location: `server/config/featureFlags.ts` (NEW)

```typescript
export const featureFlags = {
  observationMode: process.env.OBSERVATION_MODE === 'true',
  treasuryInternalEnabled: process.env.TREASURY_INTERNAL_ENABLED === 'true',
  privateCreditSelfFundedEnabled: process.env.PRIVATE_CREDIT_SELF_FUNDED_ENABLED === 'true',
  regCfEnabled: process.env.REG_CF_ENABLED === 'true',
  institutionalLpEnabled: process.env.INSTITUTIONAL_LP_ENABLED === 'true',
  externalDepositsEnabled: process.env.EXTERNAL_DEPOSITS_ENABLED === 'true',
  investorOnboardingEnabled: process.env.INVESTOR_ONBOARDING_ENABLED === 'true',
};

export function isInObservationMode(): boolean {
  return featureFlags.observationMode;
}

export function canAcceptExternalFunds(): boolean {
  return !featureFlags.observationMode && featureFlags.externalDepositsEnabled;
}
```

### 3. API Middleware

Location: `middleware/observationGuard.ts` (NEW)

```typescript
export function observationGuard(handler, options = {}) {
  return async (req, res) => {
    if (isInObservationMode()) {
      // Block external deposit routes
      if (options.blockExternalFunds) {
        return res.status(403).json({ 
          error: 'OBSERVATION_MODE_ACTIVE',
          message: 'External fund operations are disabled during observation window'
        });
      }
      
      // Require admin for all writes
      if (options.requireAdmin && req.method !== 'GET') {
        const session = await getSession(req);
        if (!session?.user?.isAdmin) {
          return res.status(403).json({ error: 'ADMIN_REQUIRED' });
        }
      }
    }
    return handler(req, res);
  };
}
```

### 4. UI Components

Location: Components that render CTAs

```tsx
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

function InvestButton() {
  const { observationMode } = useFeatureFlags();
  
  if (observationMode) {
    return null; // Hide during observation
  }
  
  return <button>Invest Now</button>;
}
```

### 5. React Context

Location: `contexts/FeatureFlagContext.tsx` (NEW)

```tsx
export const FeatureFlagProvider = ({ children }) => {
  const [flags, setFlags] = useState({
    observationMode: true,
    treasuryInternalEnabled: true,
    privateCreditSelfFundedEnabled: true,
    regCfEnabled: false,
    institutionalLpEnabled: false,
  });
  
  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
};
```

---

## Enforcement Points

### Routes to Block During Observation

| Route Pattern | Block Condition |
|---------------|-----------------|
| `POST /api/investor/*` | Always in observation mode |
| `POST /api/land-funds/subscribe` | Always in observation mode |
| `POST /api/*/deposit` | Always in observation mode |
| `POST /api/*/invest` | Always in observation mode |

### Routes to Allow (Admin-Only)

| Route Pattern | Requirement |
|---------------|-------------|
| `POST /api/internal/ledger/*` | Admin + TREASURY_INTERNAL_ENABLED |
| `POST /api/internal/notes/*` | Admin + PRIVATE_CREDIT_SELF_FUNDED_ENABLED |
| `GET /api/internal/*` | Admin |
| `GET /api/observer/*` | Public read-only |

---

## How to Toggle Flags

### Development
1. Edit `.env` file directly
2. Restart workflow

### Production (Replit)
1. Go to Secrets panel
2. Update environment variable
3. Redeploy

### Admin Override (Future)
- Admin dashboard toggle (not implemented in observation mode)
- Requires 24h delay simulation for safety

---

## Validation Checklist

Before going live, verify:

- [ ] `OBSERVATION_MODE=true` is set
- [ ] `REG_CF_ENABLED=false` is set
- [ ] `INSTITUTIONAL_LP_ENABLED=false` is set
- [ ] `EXTERNAL_DEPOSITS_ENABLED=false` is set
- [ ] `INVESTOR_ONBOARDING_ENABLED=false` is set
- [ ] All deposit routes return 403
- [ ] All investor onboarding routes return 403
- [ ] Admin-only routes validate session
- [ ] UI hides investment CTAs
- [ ] FAQ page is accessible

---

*Feature flags are the primary enforcement mechanism for observation mode.*
