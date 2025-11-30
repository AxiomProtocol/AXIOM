# Universe Blockchain - RaaS Provider Comparison Matrix

**Last Updated:** November 23, 2025  
**Purpose:** Structured evaluation of RaaS providers for Universe Blockchain deployment

---

## Scoring Framework

**Total Score:** 100 points weighted across 5 categories

| Category | Weight | Max Points |
|----------|--------|------------|
| Technical Capabilities | 30% | 30 |
| Pricing & Value | 25% | 25 |
| SLA & Reliability | 20% | 20 |
| Security & Compliance | 15% | 15 |
| Support & Experience | 10% | 10 |

**Scoring Scale:**
- **Excellent (5):** Exceeds requirements significantly
- **Good (4):** Meets all requirements with some extras
- **Adequate (3):** Meets minimum requirements
- **Poor (2):** Partially meets requirements
- **Unacceptable (1):** Does not meet requirements

---

## Provider Comparison Matrix

### 1. Technical Capabilities (Max: 30 points)

| Criteria | Weight | Caldera | Conduit | QuickNode | Gelato | AltLayer |
|----------|--------|---------|---------|-----------|--------|----------|
| **Orbit Rollup Expertise** | 25% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Custom Gas Token Experience** | 25% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **AXM→ETH Swap Automation** | 20% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Infrastructure Scale** | 15% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Block Explorer Quality** | 10% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Developer Tools** | 5% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Subtotal** | 30% | ___ / 30 | ___ / 30 | ___ / 30 | ___ / 30 | ___ / 30 |

**Evaluation Notes:**
- **Orbit Rollup Expertise:** Number of Orbit chains deployed, mainnet experience
- **Custom Gas Token:** Previous implementations, complexity handling
- **Swap Automation:** Proposed architecture, fail-safe mechanisms, MEV protection
- **Infrastructure Scale:** Global presence, node count, bandwidth capacity
- **Block Explorer:** Blockscout or custom, branding support, API features
- **Developer Tools:** SDK support, documentation, testnet faucet

---

### 2. Pricing & Value (Max: 25 points)

| Criteria | Weight | Caldera | Conduit | QuickNode | Gelato | AltLayer |
|----------|--------|---------|---------|-----------|--------|----------|
| **Setup Cost** | 20% | $____ | $____ | $____ | $____ | $____ |
| **Monthly Base Fee** | 30% | $____ | $____ | $____ | $____ | $____ |
| **Batch Posting Markup** | 25% | ____% | ____% | ____% | ____% | ____% |
| **RPC Pricing Model** | 15% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Total Cost (Year 1)** | 10% | $____ | $____ | $____ | $____ | $____ |
| **Subtotal** | 25% | ___ / 25 | ___ / 25 | ___ / 25 | ___ / 25 | ___ / 25 |

**Pricing Benchmarks:**
- **Setup Cost:** Target <$50k (Excellent: <$30k, Poor: >$75k)
- **Monthly Base:** Target $40-60k (Excellent: <$40k, Poor: >$75k)
- **Batch Posting:** Target 0-10% markup (Excellent: 0%, Poor: >20%)
- **RPC Pricing:** Predictable tiers, transparent overages

**Year 1 TCO Formula:**
```
Setup + (Monthly Base × 8 months) + (Est. Batch Gas × 8 months × Markup)
= $____ + ($____ × 8) + ($15k × 8 × ___%)
```

---

### 3. SLA & Reliability (Max: 20 points)

| Criteria | Weight | Caldera | Conduit | QuickNode | Gelato | AltLayer |
|----------|--------|---------|---------|-----------|--------|----------|
| **Sequencer Uptime SLA** | 30% | ____% | ____% | ____% | ____% | ____% |
| **Historical Uptime** | 25% | ____% | ____% | ____% | ____% | ____% |
| **Incident Response Time** | 20% | ___ min | ___ min | ___ min | ___ min | ___ min |
| **Failover Mechanism** | 15% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **SLA Credits/Penalties** | 10% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Subtotal** | 20% | ___ / 20 | ___ / 20 | ___ / 20 | ___ / 20 | ___ / 20 |

**SLA Scoring:**
- **Sequencer Uptime:** 99.99%+ (5pts), 99.95%+ (4pts), 99.9%+ (3pts), <99.9% (1pt)
- **Historical Uptime:** Verify with references and public stats
- **Response Time:** <15min (5pts), <30min (4pts), <1hr (3pts), >1hr (1pt)
- **Failover:** Automatic <60s (5pts), Manual <5min (3pts), None (1pt)
- **SLA Credits:** Strong penalties (5pts), Weak (3pts), None (1pt)

---

### 4. Security & Compliance (Max: 15 points)

| Criteria | Weight | Caldera | Conduit | QuickNode | Gelato | AltLayer |
|----------|--------|---------|---------|-----------|--------|----------|
| **SOC 2 Type II** | 30% | ☐ Yes ☐ No | ☐ Yes ☐ No | ☐ Yes ☐ No | ☐ Yes ☐ No | ☐ Yes ☐ No |
| **Key Management (HSM/KMS)** | 25% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Multi-Sig Support** | 15% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Cyber Insurance** | 15% | $__M | $__M | $__M | $__M | $__M |
| **Security Audits** | 10% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Incident History** | 5% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Subtotal** | 15% | ___ / 15 | ___ / 15 | ___ / 15 | ___ / 15 | ___ / 15 |

**Security Evaluation:**
- **SOC 2:** Yes = 30% points, In-Progress = 15%, No = 0%
- **Key Management:** HSM (5pts), KMS (4pts), Secure Enclave (3pts), Software (1pt)
- **Multi-Sig:** 3-of-5+ (5pts), 2-of-3+ (4pts), Basic (2pts), None (0pts)
- **Insurance:** $5M+ (5pts), $1-5M (3pts), <$1M (1pt), None (0pts)
- **Audits:** Annual third-party (5pts), Internal only (2pts), None (0pts)
- **Incidents:** No major incidents (5pts), Resolved quickly (3pts), Multiple (1pt)

---

### 5. Support & Experience (Max: 10 points)

| Criteria | Weight | Caldera | Conduit | QuickNode | Gelato | AltLayer |
|----------|--------|---------|---------|-----------|--------|----------|
| **Orbit Chain Deployments** | 30% | ___ chains | ___ chains | ___ chains | ___ chains | ___ chains |
| **Custom Gas Token Chains** | 25% | ___ chains | ___ chains | ___ chains | ___ chains | ___ chains |
| **Dedicated Account Manager** | 20% | ☐ Yes ☐ No | ☐ Yes ☐ No | ☐ Yes ☐ No | ☐ Yes ☐ No | ☐ Yes ☐ No |
| **24/7 Support** | 15% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Reference Quality** | 10% | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 | ___ / 5 |
| **Subtotal** | 10% | ___ / 10 | ___ / 10 | ___ / 10 | ___ / 10 | ___ / 10 |

**Experience Scoring:**
- **Orbit Chains:** 5+ (5pts), 3-4 (4pts), 1-2 (3pts), 0 (1pt)
- **Custom Gas:** 2+ (5pts), 1 (4pts), 0 but planned (2pts), No experience (0pts)
- **Account Manager:** Dedicated (20% points), Shared (10%), None (0%)
- **24/7 Support:** Phone+Chat (5pts), Email only (3pts), Business hours (1pt)
- **References:** Glowing (5pts), Positive (4pts), Mixed (2pts), Negative (0pts)

---

## Final Score Summary

| Provider | Technical | Pricing | SLA | Security | Support | **TOTAL** | Rank |
|----------|-----------|---------|-----|----------|---------|-----------|------|
| **Caldera** | ___ / 30 | ___ / 25 | ___ / 20 | ___ / 15 | ___ / 10 | **___ / 100** | ___ |
| **Conduit** | ___ / 30 | ___ / 25 | ___ / 20 | ___ / 15 | ___ / 10 | **___ / 100** | ___ |
| **QuickNode** | ___ / 30 | ___ / 25 | ___ / 20 | ___ / 15 | ___ / 10 | **___ / 100** | ___ |
| **Gelato** | ___ / 30 | ___ / 25 | ___ / 20 | ___ / 15 | ___ / 10 | **___ / 100** | ___ |
| **AltLayer** | ___ / 30 | ___ / 25 | ___ / 20 | ___ / 15 | ___ / 10 | **___ / 100** | ___ |

**Minimum Passing Score:** 70 / 100  
**Recommended Selection:** Top 2 providers advance to finalist interviews

---

## Qualitative Analysis

### Caldera
**Strengths:**
- 

**Weaknesses:**
- 

**Overall Impression:**
- 

---

### Conduit
**Strengths:**
- 

**Weaknesses:**
- 

**Overall Impression:**
- 

---

### QuickNode
**Strengths:**
- 

**Weaknesses:**
- 

**Overall Impression:**
- 

---

### Gelato
**Strengths:**
- 

**Weaknesses:**
- 

**Overall Impression:**
- 

---

### AltLayer
**Strengths:**
- 

**Weaknesses:**
- 

**Overall Impression:**
- 

---

## Decision Matrix

### Must-Have Requirements (Disqualifiers if missing)
- [ ] Arbitrum Orbit Rollup support (not just AnyTrust)
- [ ] Custom gas token (AXM) implementation capability
- [ ] 99.95%+ sequencer uptime SLA
- [ ] Multi-sig key management
- [ ] SOC 2 Type II (or in progress with timeline)
- [ ] <$150k setup + <$75k/month ongoing

### Nice-to-Have Features (Bonus points)
- [ ] Existing Orbit chain in production (reference-able)
- [ ] Previous custom gas token deployment
- [ ] Sub-100ms block time support
- [ ] Integrated DEX for AXM→ETH swaps
- [ ] White-label bridge UI
- [ ] Governance tools integration

---

## Finalist Interview Questions

### Technical Deep-Dive
1. **Custom Gas Token Architecture**
   - Walk us through your AXM→ETH swap automation design
   - How do you handle slippage and MEV protection?
   - What happens if DEX liquidity is insufficient?
   - How do you monitor treasury balances and alert on low ETH?

2. **Disaster Recovery**
   - What is your backup and recovery strategy for sequencer failure?
   - How quickly can you restore from a catastrophic failure?
   - Do you support state snapshots for rapid recovery?

3. **Scaling & Performance**
   - Current largest chain you manage (TPS, storage, RPC volume)?
   - How do you handle traffic spikes (10x normal load)?
   - Can you support 100ms block times and 64M gas limits?

4. **Security Posture**
   - Describe your key management architecture (HSM/KMS)
   - Multi-sig configuration options and best practices?
   - Incident response playbook - can we see a sanitized version?

### Business & Pricing
5. **Cost Transparency**
   - Breakdown of monthly fees vs. pass-through costs?
   - How do you charge for batch posting (markup or flat fee)?
   - What triggers additional charges beyond base pricing?

6. **Contract Terms**
   - Termination clauses and data portability?
   - SLA credit calculation examples?
   - Lock-in period and exit costs?

### Support & Onboarding
7. **Onboarding Process**
   - Typical timeline from contract signing to testnet?
   - Who is on the onboarding team (roles, availability)?
   - What training and documentation do you provide?

8. **Ongoing Support**
   - Dedicated account manager or shared support queue?
   - Response time examples for previous critical incidents?
   - How do you handle feature requests and customizations?

---

## References Verification Checklist

For each reference provided, verify:

- [ ] **Contact Information:** Name, title, email, best time to call
- [ ] **Project Details:** Chain name, TPS, custom features (gas token?)
- [ ] **Uptime Experience:** Any major outages? How handled?
- [ ] **Support Quality:** Responsiveness, expertise, helpfulness (1-5 rating)
- [ ] **Cost Predictability:** Surprises in billing? Overages?
- [ ] **Would Recommend?** Yes / No / With Reservations (explain)

**Reference Call Script:** Available in `RAAS_REFERENCE_QUESTIONS.md`

---

## Final Recommendation Template

**Date:** ____________  
**Evaluators:** ____________  
**Recommended Provider:** ____________  
**Runner-Up:** ____________

**Justification:**

[2-3 paragraphs explaining why the recommended provider best fits Universe Blockchain's needs, addressing key decision factors: technical capability, cost, reliability, timeline, and strategic alignment]

**Key Strengths:**
1. 
2. 
3. 

**Concerns & Mitigations:**
1. 
2. 

**Contract Negotiation Priorities:**
1. 
2. 
3. 

**Approval Signatures:**
- [ ] CTO: ____________ Date: ______
- [ ] CFO: ____________ Date: ______ (budget approval)
- [ ] CEO: ____________ Date: ______ (final authorization)

---

**END OF COMPARISON MATRIX**

*Use this document during RFP evaluation period (Dec 6-16, 2025) to ensure objective, structured vendor selection.*
