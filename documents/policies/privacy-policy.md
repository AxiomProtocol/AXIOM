# Axiom Protocol — Privacy Policy

**Effective date:** April 23, 2026
**Operator:** Axiom Nexus, LLC ("Axiom Nexus", "we", "our", "us")
**Contact:** info@axiomprotocol.app
**Status:** Canonical. This document is the source of truth for how Axiom Nexus handles personal and financial data on the Axiom Protocol platform.

This policy is rendered verbatim at `/privacy`. The file at `documents/policies/privacy-policy.md` is the canonical text. Any change to the policy must change this file; the published page reads it at request time so the document and the page can never drift.

---

## 1. Who we are

Axiom Nexus, LLC operates the Axiom Protocol platform ("the Platform"), a governance-first wealth infrastructure focused on land acquisition and on-chain capital tooling. Axiom Nexus is the data controller for personal and financial information collected through the Platform.

If you have questions about this policy, or wish to exercise any of your rights described below, contact us at **info@axiomprotocol.app**.

## 2. Scope

This policy applies to information we collect from you when you visit the Platform, connect a self-custodied wallet, link an external bank account, fund a treasury position, participate in The Wealth Practice, or otherwise interact with any feature of the Platform. It does not cover third-party websites or services you may reach through links from the Platform; those are governed by the privacy policies of their respective operators.

## 3. Information we collect

We collect only the information needed to operate the features you use. Specifically:

### 3.1 Information you provide directly

- Your wallet address and the cryptographic signature you produce to authenticate (Sign-In With Ethereum).
- Your email address, if you elect to receive notifications or contact us.
- Information you submit through forms (for example, an investor questionnaire, a property analysis request, or a syndication application).
- Any documents you upload (for example, accreditation evidence, signed subscription agreements).

### 3.2 Information collected through Plaid

When you choose to link an external bank account in order to fund a treasury position via ACH, you do so through **Plaid Inc.** ("Plaid"), a third-party service that provides regulated bank-account verification. Plaid presents its own consent screen during the link flow.

Through Plaid we receive:

- The verified routing number and account number of the bank account you link, used to originate the corresponding ACH debit through our banking processor.
- The account holder name on the linked account, used to confirm that the originator and the destination are consistent.
- The available and current balance of the linked account at the moment of linking, used solely to confirm that the requested debit is feasible before submission.
- A Plaid `access_token` and `item_id`, which are credentials Plaid issues to us so that we can refresh the above information on your behalf.

We do not request, and we do not retain, your bank login credentials. Those are entered into Plaid's interface and are never seen by Axiom Nexus.

We do not collect transaction history, identity verification documents, investments, liabilities, or income data through Plaid unless you have separately and explicitly consented to a feature that requires it.

### 3.3 Information collected through other regulated processors

When you use the Platform's banking features, we share necessary information with **Increase** (our primary banking rail) and may receive transaction status, settlement timestamps, and identifiers in return. When you use the institutional crypto custody features, we share necessary information with **BitGo**.

### 3.4 Information collected automatically

- Standard server logs (IP address, user agent, request path, response status, timestamp). These are retained for a limited period for security and abuse-prevention purposes.
- Application telemetry necessary to operate the Platform (for example, the version of a policy decision applied to one of your actions). This is recorded in our append-only audit log and is associated with your wallet address.
- On-chain data associated with your wallet, such as token balances and transactions involving Axiom-issued contracts. This information is publicly visible on the underlying blockchain regardless of our involvement.

## 4. How we use your information

We use the information described above only for the following purposes:

- **To provide the features you request.** This includes authenticating you, displaying your positions, executing your requested transactions, originating ACH debits to fund your treasury balance, and generating reports.
- **To verify your bank account.** When you link a bank account through Plaid, we use the routing number, account number, and account holder name returned by Plaid only to originate the corresponding ACH debit through our banking processor.
- **To meet legal and regulatory obligations.** This includes compliance with the Bank Secrecy Act, anti-money-laundering rules, sanctions screening, and applicable securities laws.
- **To operate, secure, and improve the Platform.** This includes monitoring for fraud, abuse, and security incidents; reconciling our records with the records of our banking and custody processors; and improving the reliability and performance of the system.
- **To communicate with you.** Only when you have opted in or when the communication is necessary to operate a feature you have used (for example, a settlement notification).

We do not sell your information. We do not use Plaid-derived information for advertising. We do not share Plaid-derived information with any party other than the processors strictly required to complete the transaction you have requested.

## 5. How we share your information

We share information only as follows:

- **With service providers who process information on our behalf.** These include Plaid (account verification), Increase (banking), Neon (managed database), Replit (application hosting and secret storage), BitGo (institutional crypto custody), Auth0 (identity provider for operators), Resend (transactional email), and Alchemy (blockchain RPC). Each is contractually bound to use the information only for the services they provide to us.
- **With legal authorities.** When required by valid legal process, when necessary to comply with applicable law, or when necessary to protect the safety, rights, or property of Axiom Nexus, our users, or the public.
- **In connection with a corporate transaction.** If Axiom Nexus is involved in a merger, acquisition, financing, or sale of assets, information may be transferred to the successor entity, subject to the protections of this policy.

We do not share Plaid-derived information with any party other than those identified above.

## 6. Plaid end-user disclosures

Axiom Nexus uses Plaid Inc. to provide bank account verification. By electing to link a bank account through Plaid on the Platform, you authorise Plaid to collect the information described in §3.2 above and to share it with Axiom Nexus for the purpose stated. Plaid's own privacy practices are governed by the **Plaid End User Privacy Policy**, available at https://plaid.com/legal/#end-user-privacy-policy. We encourage you to review it.

You may revoke Plaid's authorisation at any time by disconnecting the linked account in the Platform. When you do so, we will call Plaid's `/item/remove` endpoint to revoke the access token and we will delete the corresponding stored credentials within thirty days, subject to any retention required by law (see §8).

## 7. Your choices and rights

You have the following rights with respect to information we hold about you:

- **Access.** Request a copy of the information we hold about you.
- **Correction.** Request that we correct information that is inaccurate.
- **Deletion.** Request that we delete information we hold about you, subject to any retention required by law.
- **Withdrawal of consent.** Withdraw consent for any processing that depends on your consent (for example, by disconnecting a Plaid-linked account).
- **Objection.** Object to processing that is based on our legitimate interests.

To exercise any of these rights, contact us at **info@axiomprotocol.app**. We will respond within thirty days.

You retain control over your self-custodied wallet and the on-chain data associated with it. We cannot reverse on-chain transactions or delete information that has been recorded on a public blockchain.

## 8. Retention

We retain information only as long as needed to provide the features you use and to meet our legal obligations:

- **Plaid `access_token` and `item_id`:** retained for the active life of the linked relationship; revoked through Plaid's `/item/remove` endpoint and removed from our store within thirty days of (a) your deletion request, (b) your disconnection of the linked account, or (c) the end of the funding relationship.
- **Account and routing numbers obtained through Plaid Auth:** retained only as long as needed to originate and reconcile the corresponding ACH debit, and removed from the active store after the resulting Increase transfer reaches a terminal state. Masked references (last four digits only) may be retained on the audit trail to satisfy financial record-keeping obligations.
- **Audit events:** retained for seven years to satisfy financial record-keeping obligations under the Bank Secrecy Act and applicable tax law, then automatically purged.
- **Server logs:** retained for a limited period and then automatically purged.
- **Other information you submit:** retained for the period reasonably necessary for the purpose for which it was collected, then deleted on request or on a defined schedule.

## 9. Security

We protect your information using a combination of administrative, technical, and physical safeguards. These include TLS 1.2 or higher for data in transit, AES-256 encryption at rest, application-layer envelope encryption for high-sensitivity tokens, multi-factor authentication on every system that processes consumer financial data, role-based access control, append-only audit logging of every privileged action, code review on every change merged to production, automated dependency vulnerability scanning, and an annual review of our information security program.

The full Information Security Policy is published at `/disclosure/information-security-policy`.

No system can be made perfectly secure. If you become aware of a security issue, please contact us at **security@axiomprotocol.app** (monitored group address).

## 10. International users

The Platform is operated from the United States. Information you submit will be processed in the United States and in any other jurisdiction in which our service providers operate. By using the Platform you consent to this processing.

## 11. Children

The Platform is not directed to children under the age of eighteen and we do not knowingly collect information from children under eighteen. If you believe a child has provided information to us, please contact us at **info@axiomprotocol.app** so we can delete it.

## 12. Changes to this policy

We may update this policy from time to time. The current version is always available at `/privacy`. The effective date at the top of this document reflects the date of the most recent update. Material changes will be communicated through the Platform or by email where we have an address for you.

## 13. Contact

For any question about this policy, to exercise any of the rights in §7, or to report a security concern, contact:

> Axiom Nexus, LLC
> Attn: Privacy
> info@axiomprotocol.app
