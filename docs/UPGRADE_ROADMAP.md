# Axiom Protocol Upgrade Roadmap

**Created:** January 2026  
**Status:** Active  

---

## Phase 1: Personalized Journeys
**Priority:** High | **Status:** Completed

Use onboarding data to customize user experience:
- Dashboard customization based on user interests (Land, SUSU, Governance, Training, DeFi)
- Smart feature recommendations based on experience level
- Progress milestones and achievement celebrations
- Personalized navigation shortcuts
- Interest-based content filtering
- Goal tracking integration

---

## Phase 2: Mobile Dashboard Optimization
**Priority:** High | **Status:** Completed

Optimize for mobile users:
- Touch-friendly interfaces with larger tap targets
- Responsive layouts for all screen sizes
- Offline capability for key features (cached data, queued actions)
- Push notification support
- Bottom navigation for mobile
- Swipe gestures for common actions
- Mobile-optimized charts and data visualizations

---

## Phase 3: Community Coordination Marketplace
**Priority:** Medium | **Status:** Completed

Connect community members and programs:
- SUSU group matching with land opportunities
- Governance proposal matching with user interests
- Steward Corps collaboration tools
- Resource sharing marketplace
- Skill/expertise directory
- Community event coordination
- Cross-program referral system

---

## Phase 4: Cross-Program Contribution Planner
**Priority:** Medium | **Status:** Completed

Unified financial planning across programs:
- Combined view of SUSU, Land, Staking participation
- Suggested contribution schedules based on income
- Goal setting with progress projections
- Cash flow analysis and optimization
- Milestone tracking across programs
- Tax implications calculator
- Automated rebalancing suggestions

---

## Phase 5: Treasury Risk Dashboard
**Priority:** Medium | **Status:** Completed

Real-time treasury health monitoring:
- Treasury health metrics (TVL, utilization, diversification)
- Stress testing scenarios
- Risk alerts and notifications
- Historical performance charts
- Collateral ratio monitoring
- Liquidation risk indicators
- Reserve adequacy tracking

---

## Phase 6: Security Enhancements
**Priority:** Critical | **Status:** Completed

Harden authentication and authorization:
- Short-lived JWT tokens with refresh rotation
- Strengthen Web3 signature validation (SIWE)
- Rate limiting on sensitive endpoints
- Session timeout for high-value actions
- Two-factor authentication option
- IP-based anomaly detection
- Audit logging for all sensitive operations
- Data encryption verification (at rest/in transit)
- Incident response procedures

---

## Phase 7: Smart Contract Monitoring
**Priority:** Critical | **Status:** Completed

On-chain security and monitoring:
- Real-time monitoring for on-chain activity anomalies
- Upgrade guardianship with timelocks
- Multi-sig enforcement for critical operations
- Incident response playbooks
- Automated alerts for unusual transactions
- Contract pause capabilities
- Integration with monitoring services (Forta/Defender)
- Gas optimization tracking

---

## Implementation Notes

### Technical Dependencies
- WebSocket infrastructure (completed)
- Redis caching layer (completed)
- Achievement system (completed)
- Enhanced onboarding with user preferences (completed)

### Data Sources
- User onboarding data: `localStorage` keys `axiom_user_interests`, `axiom_user_name`, `axiom_onboarding_complete`
- WebSocket channels: GOVERNANCE, TREASURY, TRAINING, NOTIFICATIONS, LEADERBOARD, LAND
- Database tables: userAchievements, achievementDefinitions, badges

### Success Metrics
- User engagement increase
- Mobile traffic growth
- Cross-program participation rate
- Security incident reduction
- User satisfaction scores
