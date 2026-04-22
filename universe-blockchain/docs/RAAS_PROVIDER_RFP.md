# Universe Blockchain - RaaS Provider Request for Proposal (RFP)

**Issued:** November 23, 2025  
**Response Deadline:** December 5, 2025  
**Project:** Axiom Smart City - Universe Blockchain L3 Deployment  
**Contact:** partnerships@axiomsmartcity.com

---

## Executive Summary

Axiom Smart City is deploying **Universe Blockchain**, a custom Arbitrum Orbit Layer 3 chain that will power America's first on-chain sovereign smart city economy. We are seeking a Rollup-as-a-Service (RaaS) provider to deploy, manage, and maintain our production blockchain infrastructure.

### Project Overview
- **Chain Name:** Universe Blockchain
- **Technology:** Arbitrum Orbit (Rollup mode)
- **Parent Chain:** Arbitrum One (L2)
- **Native Gas Token:** AXM (ERC-20 on Arbitrum One)
- **Target Launch:** May 2026 (Testnet: March 2026)
- **Use Case:** Real estate tokenization, DePIN infrastructure, digital banking, smart city services
- **Expected TPS:** 500-2,000 TPS initially, scaling to 5,000+ TPS
- **Business Model:** 8+ revenue streams including real estate rent, trucking, energy, parking, IoT, property tax, retail leases

---

## Technical Requirements

### Chain Configuration

| Specification | Requirement | Notes |
|---------------|-------------|-------|
| **Chain Type** | Arbitrum Orbit Rollup | NOT AnyTrust (security critical for banking/real estate) |
| **Parent Chain** | Arbitrum One | L2 settlement, NOT direct to Ethereum L1 |
| **Native Gas Token** | AXM (custom ERC-20) | 18 decimals, deployed on Arbitrum One |
| **Block Time** | 250ms (default) → 100ms (optimized) | Performance tuning required |
| **Gas Limit** | 32M (default) → 64M (target) | Support high-throughput periods |
| **Finality** | <2 seconds (soft) / 7 days (fraud proof window) | Maintain Rollup security model |
| **Data Availability** | Rollup mode (full on-chain data) | Regulatory compliance requirement |
| **Fraud Proofs** | Active from day 1 | Non-negotiable security requirement |

### Infrastructure Requirements

#### Sequencer
- **Uptime SLA:** 99.95% minimum (43 minutes downtime/month max)
- **Failover:** Automatic failover <60 seconds
- **Geographic Distribution:** Multi-region (US-East, US-West minimum)
- **Monitoring:** Real-time alerting (Prometheus/Grafana or equivalent)
- **Batch Posting:** Automated ETH liquidity management for L2 posting

#### RPC Endpoints
- **Public RPC:** WebSocket + HTTPS, rate-limited (10k req/min)
- **Premium RPC:** Dedicated endpoints for Axiom infrastructure (unlimited)
- **Archive Node:** Full historical state access for analytics
- **Load Balancing:** Geographic routing, auto-scaling
- **Uptime SLA:** 99.99% for premium endpoints

#### Block Explorer
- **Provider:** Blockscout or equivalent
- **Features:** Contract verification, token tracking, advanced search
- **Custom Branding:** Universe Blockchain theme
- **API Access:** GraphQL + REST APIs

#### Bridge Infrastructure
- **Token Bridge:** Canonical Orbit gateway (AXM, USDC, WETH)
- **Message Passing:** Cross-chain governance and treasury operations
- **Security:** Multi-sig controls, time-delays, circuit breakers
- **UI/UX:** Custom bridge interface (or white-label solution)

### Gas Token Management

**Critical Requirement:** AXM as native gas token requires automatic treasury conversion.

**Required Capabilities:**
1. **Fee Collection:** All transaction fees collected in AXM
2. **Auto-Swap:** Treasury wallet automatically swaps AXM → ETH on DEX
3. **Batch Posting:** Sequencer uses swapped ETH to post batches to Arbitrum One
4. **Burn Mechanism:** Excess AXM burned or sent to treasury (configurable)
5. **Liquidity Monitoring:** Alerts if treasury ETH balance <threshold

**Provider Responsibility:**
- [ ] Design and implement AXM→ETH swap automation
- [ ] Integrate with DEX aggregators (1inch, Uniswap, etc.)
- [ ] Provide slippage protection and MEV resistance
- [ ] Real-time treasury balance monitoring and alerting

### Security Requirements

| Category | Requirement |
|----------|-------------|
| **Infrastructure Security** | SOC 2 Type II compliance (or equivalent) |
| **Key Management** | HSM or KMS for validator/sequencer keys |
| **Access Control** | Multi-sig for critical operations (min 3-of-5) |
| **Incident Response** | 24/7 on-call, <15 min response time for critical issues |
| **DDoS Protection** | Layer 3/4/7 protection on all public endpoints |
| **Penetration Testing** | Annual third-party audits (provider covers cost) |
| **Insurance** | Cyber liability insurance ($5M+ coverage) |

### Monitoring & Observability

**Required Dashboards:**
- Chain health (block production, finality, reorg monitoring)
- Sequencer performance (uptime, batch posting status)
- Treasury balances (AXM, ETH, warning thresholds)
- RPC metrics (request volume, error rates, latency)
- Bridge activity (deposits, withdrawals, queue status)

**Alerting:**
- Slack/Discord webhooks for real-time alerts
- Email + SMS for critical incidents
- Customizable alert thresholds

### Developer Tools

- **Testnet Environment:** Fully functional testnet with faucet
- **SDK Support:** viem, ethers.js, wagmi compatibility
- **Documentation:** Chain connection guides, contract deployment
- **Support:** Dedicated Slack channel or Discord forum

---

## Service Level Agreement (SLA) Requirements

### Uptime Guarantees

| Service | Target SLA | Penalty if Breached |
|---------|-----------|---------------------|
| **Sequencer Uptime** | 99.95% | 10% monthly fee credit per 0.1% below |
| **Public RPC Uptime** | 99.9% | 5% monthly fee credit per 0.1% below |
| **Premium RPC Uptime** | 99.99% | 15% monthly fee credit per 0.01% below |
| **Block Explorer** | 99.5% | No penalty (best-effort) |

### Performance Guarantees

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Block Production** | 250ms average (100ms stretch goal) | 30-day rolling average |
| **RPC Latency** | <100ms (p95) | US-based requests |
| **Batch Posting Frequency** | Every 5-15 minutes | During normal operations |
| **Failover Time** | <60 seconds | Measured during incidents |

### Support Commitments

| Severity Level | Response Time | Resolution Target |
|----------------|---------------|-------------------|
| **Critical** (chain halted) | <15 minutes | <2 hours |
| **High** (degraded performance) | <1 hour | <8 hours |
| **Medium** (non-critical issues) | <4 hours | <24 hours |
| **Low** (questions/feature requests) | <24 hours | Best effort |

---

## Cost Structure & Pricing

### Requested Pricing Breakdown

Please provide detailed pricing for the following:

#### 1. One-Time Setup Costs
- [ ] Initial deployment and configuration
- [ ] Testnet environment setup
- [ ] Custom gas token integration (AXM)
- [ ] Bridge deployment and configuration
- [ ] Block explorer setup and branding
- [ ] Documentation and training

**Estimated Total:** $_______ (please itemize)

#### 2. Monthly Recurring Costs

| Service | Estimated Usage | Provider Cost |
|---------|-----------------|---------------|
| **Sequencer Operations** | 24/7 uptime | $_______ |
| **RPC Infrastructure** | 10M requests/month (growing to 100M) | $_______ |
| **Archive Node** | Full historical data | $_______ |
| **Batch Posting Gas** | 500-2,000 TPS average | $_______ (estimate) |
| **Block Explorer** | Unlimited usage | $_______ |
| **Premium Support** | 24/7 on-call | $_______ |
| **Monitoring & Alerting** | Included or separate? | $_______ |
| **Managed Treasury (AXM swap)** | Included or separate? | $_______ |

**Estimated Monthly Total:** $_______

#### 3. Variable Costs
- [ ] Batch posting gas (ETH on Arbitrum One) - Pass-through or markup?
- [ ] Additional RPC requests beyond base tier - Per million rate?
- [ ] Additional storage beyond base allocation - Per TB/month?
- [ ] Custom development/integrations - Hourly rate?

#### 4. Annual Contract Discounts
- [ ] 12-month commitment discount: _____%
- [ ] Prepayment discount: _____%
- [ ] Volume growth discounts (e.g., at 100M RPC requests/month): _____%

### Payment Terms
- Preferred payment terms: Net 30
- Accepted payment methods: USD wire transfer, USDC stablecoin, or crypto
- Billing cycle: Monthly in arrears (first month prorated)

---

## Migration & Onboarding

### Timeline Expectations

| Phase | Deliverable | Target Date |
|-------|-------------|-------------|
| **RFP Response** | Proposal submission | December 5, 2025 |
| **Vendor Selection** | Contract signed | December 20, 2025 |
| **Testnet Deployment** | Fully functional testnet | February 15, 2026 |
| **Testnet Beta** | Public testing phase | March 1 - April 30, 2026 |
| **Mainnet Launch** | Production deployment | May 15, 2026 |

### Onboarding Requirements
- [ ] Dedicated technical account manager
- [ ] Initial architecture review session (2-4 hours)
- [ ] Smart contract review and optimization recommendations
- [ ] Load testing and performance benchmarking
- [ ] Security audit coordination (provider assists, Axiom pays for external audit)
- [ ] Go-live checklist and runbook development

---

## Evaluation Criteria

RFP responses will be scored on the following weighted criteria:

| Criterion | Weight | Description |
|-----------|--------|-------------|
| **Technical Capabilities** | 30% | Orbit expertise, custom gas token experience, infrastructure robustness |
| **Pricing & Cost Structure** | 25% | Total cost of ownership, transparency, predictability |
| **SLA & Reliability** | 20% | Uptime guarantees, incident response, track record |
| **Security & Compliance** | 15% | SOC 2, insurance, key management, audit history |
| **Support & Onboarding** | 10% | Responsiveness, documentation, training, dedicated resources |

### Reference Checks
Please provide:
- [ ] 3 references from existing Orbit chain customers
- [ ] Case studies of similar custom gas token implementations
- [ ] Publicly verifiable uptime statistics (last 6 months)
- [ ] Security incident history and resolution (if applicable)

---

## RaaS Provider Candidates

### Primary Candidates (Please Respond)

#### 1. Caldera
- **Website:** https://caldera.xyz
- **Strengths:** Leading Orbit RaaS provider, custom gas token expertise
- **Known Customers:** Arbitrum ecosystem projects, gaming chains

#### 2. Conduit
- **Website:** https://conduit.xyz
- **Strengths:** Enterprise-grade infrastructure, strong SLAs
- **Known Customers:** Multiple L2/L3 deployments

#### 3. QuickNode
- **Website:** https://quicknode.com/rollup
- **Strengths:** RPC excellence, global infrastructure
- **Known Customers:** Major blockchain projects

#### 4. Gelato
- **Website:** https://gelato.network
- **Strengths:** Automation expertise (good for AXM gas swaps)
- **Known Customers:** DeFi protocols

#### 5. AltLayer
- **Website:** https://altlayer.io
- **Strengths:** Multi-chain rollup expertise
- **Known Customers:** Restaking ecosystem

---

## Proposal Submission Guidelines

### Required Documents
1. **Technical Proposal** (10-20 pages)
   - Architecture overview
   - Custom gas token implementation plan
   - Security measures and compliance certifications
   - Disaster recovery and business continuity plan

2. **Pricing Proposal** (see Cost Structure section above)
   - Itemized setup costs
   - Monthly recurring cost breakdown
   - Variable cost structure
   - Contract terms and discounts

3. **Company Information**
   - Team background and expertise
   - Current infrastructure scale (# of nodes, chains supported)
   - Financial stability (funding history, runway)
   - Insurance and legal compliance documents

4. **References & Case Studies**
   - 3 customer references with contact information
   - 1-2 case studies of similar deployments
   - Uptime statistics and incident reports

### Submission Details
- **Deadline:** December 5, 2025, 11:59 PM PST
- **Format:** PDF or Google Docs (shared with view access)
- **Delivery:** Email to partnerships@axiomsmartcity.com
- **Subject Line:** "Universe Blockchain RFP Response - [Company Name]"

### Evaluation Timeline
- **December 6-10:** Internal review and shortlisting
- **December 11-13:** Finalist interviews and technical deep-dives
- **December 16:** Final decision and vendor notification
- **December 20:** Contract signing

---

## Questions & Clarifications

### Pre-Submission Q&A
- **Q&A Deadline:** November 30, 2025
- **Submit Questions:** partnerships@axiomsmartcity.com
- **Answers Published:** December 2, 2025 (shared with all candidates)

### Common Questions (Pre-Answered)

**Q: Can we propose AnyTrust instead of Rollup mode?**  
A: No. Rollup mode is required for regulatory compliance and security. AnyTrust may be considered for future sidechains but not for the main Universe chain.

**Q: Is self-custody of sequencer keys acceptable?**  
A: No. Multi-sig or managed HSM/KMS solution required. Axiom will hold 2-of-5 keys minimum.

**Q: What is the expected transaction volume?**  
A: Launch: 500-2,000 TPS | Year 1: 2,000-5,000 TPS | Year 2: 5,000-10,000 TPS

**Q: Will Axiom manage the AXM→ETH swaps or provider?**  
A: Prefer provider-managed automation, but open to collaboration. Must be included in proposal.

**Q: Is there a budget range?**  
A: We have allocated $150k for setup and $50-75k/month for ongoing operations, but exceptional proposals may exceed this.

---

## Appendix

### A. Axiom Smart City Background
- **Founded:** 2024
- **Vision:** America's first on-chain sovereign smart city (1,000 acres)
- **Token:** AXM (15 billion hard cap) on Arbitrum One
- **TGE:** January 1, 2026
- **Smart Contracts Deployed:** 22 on Arbitrum One
- **Revenue Streams:** Real estate, trucking, energy, parking, IoT, property tax, retail leases, reserve oracle
- **Website:** [axiomsmartcity.com] (to be updated)

### B. Technical Stack Overview
- **Blockchain:** Arbitrum One (current) → Universe Blockchain (future)
- **Smart Contracts:** Solidity, OpenZeppelin, Hardhat
- **Backend:** Node.js, Express, PostgreSQL
- **Frontend:** React, TypeScript, Tailwind CSS
- **Integrations:** Stripe, SendGrid, MetaMask, LayerZero

### C. Regulatory Considerations
- **KYC/AML:** Identity registry and compliance modules deployed
- **Securities Compliance:** Legal review in progress (not a security token)
- **Data Privacy:** GDPR/CCPA compliant user data handling
- **Jurisdiction:** Operating under US law (Delaware DAO LLC)

### D. Contact Information
- **Primary Contact:** CTO, Axiom Smart City
- **Email:** partnerships@axiomsmartcity.com
- **Discord:** [Axiom Community Server]
- **GitHub:** github.com/axiom-smart-city (private during development)

---

**END OF RFP**

*This document is confidential and intended only for qualified RaaS providers responding to this RFP. Do not distribute without permission.*
