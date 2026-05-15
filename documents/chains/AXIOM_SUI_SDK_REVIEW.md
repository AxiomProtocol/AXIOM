# AXIOM SUI — SDK REVIEW

**Document type:** SDK Review Record  
**Phase:** Phase 5 — Testnet Claim Contract Prototype Design  
**Chain:** Sui (non-EVM, Move VM)  
**Date:** 2026-05-15  
**G02 Status:** REVIEW_COMPLETE / INSTALL_DEFERRED  
**Classification:** Internal — architecture record  

---

## 1. Package Under Review

| Property | Value |
|---|---|
| Package name | `@mysten/sui` |
| npm URL | https://www.npmjs.com/package/@mysten/sui |
| GitHub | https://github.com/MystenLabs/sui |
| Maintained by | Mysten Labs (Sui core team) |
| License | Apache-2.0 |
| Current stable version | ~1.x (verify at install time) |
| Replaces | `@mysten/sui.js` (deprecated — do not install the .js variant) |

---

## 2. Installation Check

**Is @mysten/sui currently installed?** NO

Verification: `package.json` contains no `@mysten/sui` entry.
The Axiom project has no Sui SDK as of Phase 5 design.

**Install command (when authorized):**
```
npm install @mysten/sui
```

---

## 3. Intended Use

When installed, `@mysten/sui` would be used for:

| Use Case | Module | Phase |
|---|---|---|
| Build and sign claim transactions | `Transaction` | Phase 6 |
| Query shared objects (claim registry) | `SuiClient` | Phase 6 |
| Read coin balances | `SuiClient.getBalance()` | Phase 6 |
| Submit admin operations (operator) | `Transaction` | Phase 6 |
| Testnet faucet requests | `requestSuiFromFaucetV1` | Phase 6 |
| Merkle proof verification (off-chain) | Custom + SDK | Phase 6 |

**Phase 5 use:** None. Phase 5 is design-only. The SDK is not required for
writing specification documents, gate tracker, or operator status page.

---

## 4. Dependency Risk Assessment

### 4.1 Bundle Size
`@mysten/sui` is a TypeScript/Node package. When imported in Next.js:
- Server components / API routes: imported server-side only — no browser bundle impact
- Client components: would add to browser bundle — must be restricted to server-side imports only

**Mitigation:** All Sui SDK usage must be confined to:
- `/lib/sui/` server-side service files
- `/app/api/sui/` route handlers
- Never imported directly by client components

### 4.2 Build Compatibility
- Pure TypeScript/ESM package
- Compatible with Node.js 18+ (Axiom's runtime)
- Compatible with Next.js 14+ (Axiom's framework)
- No native bindings — pure JS, no Rust/WASM required for basic operations
- Does NOT conflict with ethers.js, viem, or any existing Axiom dependency

### 4.3 Transitive Dependencies
Key transitive dependencies to note:
- `@noble/curves` — cryptography (ed25519/secp256k1) — well-audited
- `@noble/hashes` — hashing — well-audited
- `bcs` — Binary Canonical Serialization — Mysten Labs internal

No known conflicts with existing Axiom dependencies at time of review.
Verify with `npm ls @mysten/sui` after install to confirm no peer conflicts.

### 4.4 Security Considerations
- Do NOT import private key handling into client components
- Do NOT log private keys or mnemonics
- All signing operations must be server-side only
- Keypair objects must not be serialized to JSON logs

### 4.5 Runtime Implications
- No new required environment variables at install time
- `SUI_RPC_URL` (already defined in Phase 4) is used at runtime, not at build time
- Missing `SUI_RPC_URL` falls back to public endpoint — does not break build

---

## 5. Is the SDK Needed for Phase 5 Design?

**No.** Phase 5 is entirely document and design work:
- Distribution model decision record (no SDK needed)
- Move capability plan (no SDK needed)
- Testnet wallet plan (no SDK needed)
- Claim contract specification (no SDK needed)
- Operator status page (static data, no SDK needed)
- Gate tracker (no SDK needed)

The SDK is needed for Phase 6 (testnet build), when the first TypeScript
integration layer is written to interact with a deployed Move package.

---

## 6. Recommendation

**INSTALL_DEFERRED — do not install in Phase 5.**

Rationale:
1. Phase 5 is design-only — no SDK calls are made in any Phase 5 deliverable
2. Installing an unexercised dependency creates an unreviewed surface area
3. The SDK should be installed at the start of Phase 6, when it is immediately used
4. Installing now with no active code paths makes the dependency harder to audit

**When to install:** Beginning of Phase 6 (testnet build), after G06
(testnet deployment authorization) is signed.

**Install checklist for Phase 6:**
- [ ] Verify latest stable version of `@mysten/sui` at install time
- [ ] Run `npm install @mysten/sui`
- [ ] Run `npm run build` and confirm no errors
- [ ] Run `npx tsc --noEmit` and confirm no type errors
- [ ] Confirm no client-side bundle bloat (check Next.js build output)
- [ ] Update this document: set G02 to INSTALL_COMPLETE

---

## 7. Install Deferred — Detailed Decision Record

**Install deferred until Phase 6 authorization (G06) is signed.**

### 7.1 Why install is deferred

  1. Phase 5 is design-only. No SDK calls exist in any Phase 5 deliverable.
     Installing an unexercised dependency creates unreviewed surface area.
  2. The SDK should be installed at the start of Phase 6 when it is
     immediately exercised by new TypeScript integration code.
  3. Installing now with no active code paths makes the dependency harder
     to audit and creates a stale-dependency risk.
  4. The Phase 6 authorization document (G06) must be signed first to
     confirm scope, deployer, Move developer, and reviewer are all named.

### 7.2 Exact package to install (Phase 6)

Do not guess the version at install time — check npm for the latest stable:

  Package:         @mysten/sui
  Do NOT install:  @mysten/sui.js  (deprecated — use @mysten/sui instead)
  npm registry:    https://www.npmjs.com/package/@mysten/sui
  Install command: npm install @mysten/sui

Verify the version before installing:
```
npm view @mysten/sui version
```

Record the installed version in this document (Section 7.5) after install.

### 7.3 Server-side usage requirement

All @mysten/sui imports must be server-side only. No client bundle imports.

Permitted import locations:
  lib/sui/          — server-side Sui service modules
  pages/api/sui/    — API route handlers
  pages/operator/   — getServerSideProps functions (not component body)
  scripts/          — one-off admin scripts

Prohibited import locations:
  Any file that renders in the browser (client components)
  Any file imported by pages/_app.js without a server guard
  Any file in components/ that does not have a server-only guard

Enforcement mechanism:
  Add `import 'server-only'` at the top of all lib/sui/ modules.
  This causes a build error if a client component imports the module.

### 7.4 No client bundle import rule

Do NOT import @mysten/sui into any Next.js client component.

Violations will cause:
  - Increased browser bundle size (the SDK is not tree-shaken in client context)
  - Potential exposure of server-side configuration to the browser
  - Next.js build warnings about server-only packages in client bundles

Verification at install time:
  Run `npm run build` and inspect the build output for any @mysten/sui
  references in client bundle chunks. If found, trace the import and move
  to server-side only.

### 7.5 Install validation steps (execute at Phase 6 start)

These steps must be completed in order after G06 is signed:

[ ] Step 1  Verify G06 (testnet authorization) is signed before running npm install
[ ] Step 2  Check latest stable version: `npm view @mysten/sui version`
[ ] Step 3  Install: `npm install @mysten/sui`
[ ] Step 4  Record installed version here: ________________________________
[ ] Step 5  Build check: `npm run build` — confirm no errors
[ ] Step 6  Type check: `npx tsc --noEmit` — confirm no errors
[ ] Step 7  Bundle check: inspect Next.js build output for client-bundle leakage
[ ] Step 8  Confirm `import 'server-only'` added to all lib/sui/ modules
[ ] Step 9  Update G02 status to INSTALL_COMPLETE in Phase 6 gate tracker
[ ] Step 10 Update this document Section 8 with install date and version

---

## 8. G02 Status

**G02: SDK Review — REVIEW_COMPLETE / INSTALL_DEFERRED**

Review completed: 2026-05-15
Install decision: Deferred — do not install until G06 is signed
Install authorized by: [To be named in AXIOM_SUI_PHASE6_TESTNET_AUTHORIZATION.md Section 6.3]
Install completed: PENDING
Installed version: PENDING
Install date: PENDING
