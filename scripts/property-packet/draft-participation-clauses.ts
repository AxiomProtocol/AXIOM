#!/usr/bin/env npx ts-node
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data', 'property-packets');

function generateClauseHash(content: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(content);
  return `sha256:${hash.digest('hex')}`;
}

function generateTrackAClauses(packet: Record<string, unknown>): string {
  const underwriting = packet.underwriting as Record<string, unknown>;
  const participationAmount = underwriting?.participationAmount as number || 0;
  const purchasePrice = underwriting?.purchasePrice as number || 0;
  const participationPct = ((participationAmount / purchasePrice) * 100).toFixed(1);
  
  return `# Participation Agreement Clauses - Track A (Performing)

**Document Type:** Draft Participation Terms (NOT LEGAL ADVICE)
**Packet ID:** ${packet.packetId}
**Generated:** ${new Date().toISOString()}
**Property:** ${packet.propertyAddress}

---

## DISCLAIMER

This document contains draft clause language for internal review only. It does not constitute legal advice and should not be relied upon as a binding agreement. All terms are subject to legal review and modification before execution.

---

## 1. Participation Percentage and Cap

**Participation Interest:** ${participationPct}% undivided beneficial interest

**Capital Contribution:** $${participationAmount.toLocaleString()} USD

**Maximum Participation Cap:** The Participant's interest shall not exceed ${participationPct}% of all distributions from the underlying Note regardless of future amendments or modifications to the Note terms.

**Priority:** Distributions shall be made pari passu with all other participation interest holders, with no subordination or preference.

---

## 2. Payment Waterfall and Reporting Cadence

**Distribution Waterfall:**
1. Servicer fees and approved expenses
2. Pro-rata distribution to all Participation Interest holders
3. Excess to Lead Participant (if applicable)

**Payment Frequency:** Monthly, within 15 business days of servicer remittance

**Reporting Schedule:**
- Monthly: Payment status, principal and interest breakdown
- Quarterly: Delinquency status (if any), property condition updates
- Annually: Full loan tape with current balances and valuations

**Reporting Format:** Standardized JSON or CSV with CID/hash reference for audit trail

---

## 3. Representations and Warranties

The Lead Participant represents and warrants that:

1. **Note Ownership:** Lead Participant is the legal owner of the underlying Note with full authority to sell participation interests
2. **Lien Position:** The Note is secured by a ${packet.lienPosition === 1 ? 'first' : 'second'} lien position mortgage on the subject property
3. **Payment History:** The Note has ${packet.paymentHistoryMonths || 0} months of verified payment history with no payments more than 30 days past due
4. **Servicer Status:** The Note is currently being serviced by ${packet.servicerName} in good standing
5. **No Material Defects:** There are no known material defects in the Note documentation that would impair enforceability
6. **Compliance:** All origination and servicing activities have been conducted in compliance with applicable laws

---

## 4. Default Handling and Dispute Process

**Default Definition:** A default occurs when the underlying borrower fails to make any payment within 60 days of due date.

**Default Notification:** Lead Participant shall notify all Participation Interest holders within 5 business days of a default event.

**Workout Authority:** Lead Participant shall have authority to pursue workout options including:
- Reinstatement
- Loan modification
- Forbearance agreement

**Major Decision Consent:** The following actions require consent from holders of >50% of participation interests:
- Sale of the Note at less than 80% of UPB
- Forgiveness of principal exceeding 10% of UPB
- Deed-in-lieu acceptance
- Foreclosure initiation

**Dispute Resolution:** Any disputes shall be resolved through binding arbitration under AAA Commercial Rules.

---

## 5. Servicing and Communication Obligations

**Primary Servicer:** ${packet.servicerName}

**Servicer Oversight:** Lead Participant shall:
- Monitor servicer compliance with servicing agreement
- Provide quarterly servicer performance reports
- Notify participants of any servicer changes within 10 business days

**Communication Requirements:**
- All participant communications shall be in writing
- Emergency notifications (default, foreclosure) within 24 hours
- Routine updates within monthly reporting cycle

**Record Retention:** All documents shall be retained for minimum 7 years with hash/CID references maintained on-chain

---

## 6. Transfer Restrictions

**No Public Solicitation:** Participation interests may only be offered through private placement. No public solicitation, advertising, or general announcement is permitted.

**Transfer Approval:** Any transfer of participation interest requires:
- Written consent of Lead Participant
- Verification of transferee accreditation (if applicable)
- Compliance with applicable securities laws

**Right of First Refusal:** Lead Participant shall have 30-day right of first refusal on any proposed transfer at the offered price.

**Minimum Transfer:** No transfer of less than $25,000 in participation interest value permitted.

---

## 7. Audit Trail Requirement

**Document Integrity:** All critical documents shall maintain:
- SHA256 hash for content verification
- CID (Content Identifier) for decentralized storage reference
- Timestamp of creation/modification
- Signer address (where applicable)

**On-Chain Attestation:** Settlement authorization requires dual attestation with on-chain signature verification.

**Audit Access:** All Participation Interest holders shall have read-only access to:
- Artifact index with all document CIDs
- Underwriting hash verification
- Attestation records

---

## Hash Reference

This draft clause document hash: [TO BE COMPUTED ON FINALIZATION]

---

**END OF DRAFT CLAUSES - TRACK A**
`;
}

function generateTrackBClauses(packet: Record<string, unknown>): string {
  const underwriting = packet.underwriting as Record<string, unknown>;
  const participationAmount = underwriting?.participationAmount as number || 0;
  const purchasePrice = underwriting?.purchasePrice as number || 0;
  const participationPct = ((participationAmount / purchasePrice) * 100).toFixed(1);
  const delinquencyStatus = packet.delinquencyStatus as Record<string, unknown>;
  const missedPayments = delinquencyStatus?.missedPaymentCount as number || 0;
  
  return `# Participation Agreement Clauses - Track B (Light NPL)

**Document Type:** Draft Participation Terms (NOT LEGAL ADVICE)
**Packet ID:** ${packet.packetId}
**Generated:** ${new Date().toISOString()}
**Property:** ${packet.propertyAddress}

---

## DISCLAIMER

This document contains draft clause language for internal review only. It does not constitute legal advice and should not be relied upon as a binding agreement. All terms are subject to legal review and modification before execution.

**NPL RISK NOTICE:** This participation involves a non-performing loan with ${missedPayments} missed payments. Returns are contingent on successful workout outcomes. Capital loss is possible.

---

## 1. Participation Percentage and Cap

**Participation Interest:** ${participationPct}% undivided beneficial interest

**Capital Contribution:** $${participationAmount.toLocaleString()} USD

**Maximum Participation Cap:** The Participant's interest shall not exceed ${participationPct}% of all recoveries from the underlying Note regardless of workout outcome.

**Priority:** Distributions shall be made pari passu with all other participation interest holders after recovery of workout costs.

**Workout Cost Allocation:** Reasonable workout costs (legal, servicing, property preservation) shall be deducted from gross recovery before distribution.

---

## 2. Payment Waterfall and Reporting Cadence

**Distribution Waterfall:**
1. Approved workout costs and expenses (capped at $15,000 unless approved)
2. Servicer fees and special servicing premiums
3. Pro-rata distribution to all Participation Interest holders
4. Performance bonus to Lead Participant (if recovery exceeds 110% of purchase price)

**Payment Frequency:** Upon material workout events, not less than quarterly during active workout

**Reporting Schedule:**
- Weekly: During active borrower contact period
- Monthly: Workout status, servicer event log
- Upon Event: Any legal filing, borrower response, or property status change

**Reporting Format:** Standardized JSON with CID/hash reference for audit trail

---

## 3. Representations and Warranties

The Lead Participant represents and warrants that:

1. **Note Ownership:** Lead Participant is the legal owner of the underlying Note with full authority to sell participation interests
2. **Lien Position:** The Note is secured by a ${packet.lienPosition === 1 ? 'first' : 'second'} lien position mortgage on the subject property
3. **Delinquency Status:** The Note has ${missedPayments} missed payments as disclosed in the delinquency summary
4. **No Active Bankruptcy:** The borrower is not currently in active bankruptcy proceedings (Chapter 7 or 13)
5. **Foreclosure Status:** ${delinquencyStatus?.currentLegalStatus === 'FORECLOSURE_FILED' ? 'Foreclosure has been filed' : 'No foreclosure has been filed'} as of packet creation date
6. **Property Access:** Lead Participant has ability to inspect or order inspection of subject property
7. **Workout Authority:** Lead Participant has full authority to pursue all available workout options

**NPL-SPECIFIC WARRANTY:** Lead Participant does NOT warrant successful workout outcome or any specific recovery amount.

---

## 4. Default Handling and Dispute Process

**Workout Authority:** Lead Participant shall have broad authority to pursue workout options including:
- Reinstatement negotiation
- Loan modification (rate, term, principal)
- Forbearance agreement
- Discounted payoff
- Deed-in-lieu
- Foreclosure

**Foreclosure Initiation:** Lead Participant may initiate foreclosure without participant consent if:
- Borrower unresponsive for 90+ days
- All workout options exhausted
- Property value declining

**Major Decision Consent:** The following actions require consent from holders of >50% of participation interests:
- Sale of the Note at less than 70% of current UPB
- Principal forgiveness exceeding 20% of UPB
- Settlement with borrower at less than 60% of UPB

**Dispute Resolution:** Any disputes shall be resolved through binding arbitration under AAA Commercial Rules with expedited procedures.

---

## 5. Servicing and Communication Obligations

**Special Servicer:** ${packet.servicerName}

**Servicer Oversight:** Lead Participant shall:
- Maintain active engagement with special servicer
- Provide weekly workout status during active period
- Document all borrower contact attempts in servicing event log

**Communication Requirements:**
- All participant communications shall be in writing
- Workout milestone notifications within 24 hours
- Monthly summary regardless of activity

**Servicing Event Log:** Lead Participant shall maintain standardized servicing event log with:
- Date and type of each event
- Outcome and next action
- CID reference for supporting documents

---

## 6. Transfer Restrictions

**No Public Solicitation:** Participation interests may only be offered through private placement. No public solicitation, advertising, or general announcement is permitted.

**Lock-Up Period:** No transfer of participation interest permitted within first 6 months of acquisition.

**Transfer Approval:** Any transfer of participation interest requires:
- Written consent of Lead Participant
- Verification of transferee accreditation (required for NPL participation)
- Full disclosure of workout status and risks to transferee

**Right of First Refusal:** Lead Participant shall have 15-day right of first refusal on any proposed transfer at the offered price.

**Minimum Transfer:** No transfer of less than $10,000 in participation interest value permitted.

---

## 7. Audit Trail Requirement

**Document Integrity:** All critical documents shall maintain:
- SHA256 hash for content verification
- CID (Content Identifier) for decentralized storage reference
- Timestamp of creation/modification
- Signer address (where applicable)

**Servicing Event Attestation:** Each servicing event shall be logged with hash reference within 48 hours.

**On-Chain Attestation:** Settlement authorization requires dual attestation with on-chain signature verification.

**Audit Access:** All Participation Interest holders shall have read-only access to:
- Artifact index with all document CIDs
- Underwriting hash verification
- Servicing event log
- Attestation records
- Workout options matrix

---

## 8. Downside Disclosure

**Capital at Risk:** Participant acknowledges that the entire capital contribution is at risk and may result in total loss if:
- Property value declines below loan balance
- Workout fails and foreclosure costs exceed recovery
- Borrower files bankruptcy with successful cramdown
- Title defects discovered post-acquisition

**No Guarantee:** Lead Participant makes no guarantee of any return, positive or negative.

---

## Hash Reference

This draft clause document hash: [TO BE COMPUTED ON FINALIZATION]

---

**END OF DRAFT CLAUSES - TRACK B (LIGHT NPL)**
`;
}

async function main() {
  console.log('='.repeat(60));
  console.log('PARTICIPATION CLAUSE DRAFTING');
  console.log('='.repeat(60));
  console.log();
  
  const trackAPath = path.join(DATA_DIR, 'track-a-performing.packet.json');
  const trackBPath = path.join(DATA_DIR, 'track-b-light-npl.packet.json');
  
  if (!fs.existsSync(trackAPath) || !fs.existsSync(trackBPath)) {
    console.error('Packet files not found. Run create-packets.ts and finalize-underwriting.ts first.');
    process.exit(1);
  }
  
  console.log('--- Drafting Track A Clauses ---');
  const trackAPacket = JSON.parse(fs.readFileSync(trackAPath, 'utf-8'));
  const trackAClauses = generateTrackAClauses(trackAPacket);
  const trackAClauseHash = generateClauseHash(trackAClauses);
  
  const trackAClausePath = path.join(DATA_DIR, 'track-a-performing.participation-clauses.md');
  const trackAClausesWithHash = trackAClauses.replace(
    '[TO BE COMPUTED ON FINALIZATION]',
    trackAClauseHash
  );
  fs.writeFileSync(trackAClausePath, trackAClausesWithHash);
  console.log(`Created: ${trackAClausePath}`);
  console.log(`  Hash: ${trackAClauseHash.substring(0, 40)}...`);
  console.log();
  
  console.log('--- Drafting Track B Clauses ---');
  const trackBPacket = JSON.parse(fs.readFileSync(trackBPath, 'utf-8'));
  const trackBClauses = generateTrackBClauses(trackBPacket);
  const trackBClauseHash = generateClauseHash(trackBClauses);
  
  const trackBClausePath = path.join(DATA_DIR, 'track-b-light-npl.participation-clauses.md');
  const trackBClausesWithHash = trackBClauses.replace(
    '[TO BE COMPUTED ON FINALIZATION]',
    trackBClauseHash
  );
  fs.writeFileSync(trackBClausePath, trackBClausesWithHash);
  console.log(`Created: ${trackBClausePath}`);
  console.log(`  Hash: ${trackBClauseHash.substring(0, 40)}...`);
  console.log();
  
  if (trackAPacket.artifactIndex?.participationAgreement) {
    trackAPacket.artifactIndex.participationAgreement.sha256 = trackAClauseHash.replace('sha256:', '');
    trackAPacket.artifactIndex.participationAgreement.filename = 'track-a-performing.participation-clauses.md';
    fs.writeFileSync(trackAPath, JSON.stringify(trackAPacket, null, 2));
    console.log('Updated Track A packet with clause hash reference');
  }
  
  if (trackBPacket.artifactIndex?.participationAgreement) {
    trackBPacket.artifactIndex.participationAgreement.sha256 = trackBClauseHash.replace('sha256:', '');
    trackBPacket.artifactIndex.participationAgreement.filename = 'track-b-light-npl.participation-clauses.md';
    fs.writeFileSync(trackBPath, JSON.stringify(trackBPacket, null, 2));
    console.log('Updated Track B packet with clause hash reference');
  }
  
  console.log();
  console.log('='.repeat(60));
  console.log('CLAUSE DRAFTING COMPLETE');
  console.log('='.repeat(60));
  console.log();
  console.log('Next Steps:');
  console.log('  Run: npx ts-node scripts/property-packet/prevalidate-settlement-artifacts.ts');
}

main().catch(console.error);
