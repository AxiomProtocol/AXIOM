import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';
import { computeMetrics, determinePolicyMode } from '../../../lib/solvency';
import {
  ACTIVE_AXUSD,
  CANONICAL_PSM,
  ACTIVE_PSM,
  GOVERNANCE_SAFE_ADDRESS,
  TIMELOCK_ADDRESS,
  ACTIVE_CONTRACTS,
  EVK_OPEN_MARKET_VAULT_ADDRESS,
  EULER_EARN_VAULT_ADDRESS,
  EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
  CREDIT_MARKET_ADDRESS,
  FIXED_LOAN_NFT_ADDRESS,
} from '../../../src/config/activeContracts.generated';
import { ERC3643_CONTRACTS, CLAIM_TOPICS } from '../../../shared/contracts-3643';
import { CLAIM_VALIDITY_DAYS, CLAIM_REFRESH_WARNING_DAYS } from '../../../shared/erc3643Schema';

const PACK_VERSION = '1.0.0';
const PACK_DATE = '2026-03-30';

async function fetchLatestSnapshot() {
  try {
    const result = await pool.query(
      `SELECT id, as_of_utc, payload_json, checksum
       FROM solvency_snapshots
       ORDER BY created_at DESC
       LIMIT 1`
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      payload: typeof row.payload_json === 'string'
        ? JSON.parse(row.payload_json)
        : row.payload_json,
      id: row.id,
      asOfUtc: row.as_of_utc,
      checksum: row.checksum,
    };
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const snapshot = await fetchLatestSnapshot();

    let solvencySection: Record<string, any> = {
      dataStatus: 'empty',
      snapshotId: null,
      asOfUtc: null,
      checksum: null,
      treasuryTotalUsd: 0,
      reservesTotalUsd: 0,
      liabilitiesTotalUsd: 0,
      coverageRatio: 0,
      reserveRatio: 0,
      policyMode: 'BOOTSTRAP',
    };

    if (snapshot) {
      const p = snapshot.payload;
      const treasuryTotalUsd = Math.round(Number(p.treasuryTotalUsd || 0) * 100) / 100;
      const reservesTotalUsd = Math.round(Number(p.reservesTotalUsd || 0) * 100) / 100;
      const liabilitiesTotalUsd = Math.round(Number(p.liabilitiesTotalUsd || 0) * 100) / 100;
      const lossBufferUsd = Math.round(Number(p.lossBufferUsd || 0) * 100) / 100;
      const computed = computeMetrics({
        treasuryTotalUsd,
        treasuryLiquidUsd: Math.round(Number(p.treasuryLiquidUsd || 0) * 100) / 100,
        reservesTotalUsd,
        liabilitiesTotalUsd,
        lossBufferUsd,
      });
      const policyMode = determinePolicyMode(
        computed.coverageRatio,
        computed.reserveRatio,
        String(p.policyMode || '')
      );
      solvencySection = {
        dataStatus: 'ok',
        snapshotId: snapshot.id,
        asOfUtc: new Date(snapshot.asOfUtc).toISOString(),
        checksum: snapshot.checksum,
        treasuryTotalUsd,
        reservesTotalUsd,
        liabilitiesTotalUsd,
        coverageRatio: computed.coverageRatio,
        reserveRatio: computed.reserveRatio,
        policyMode,
        limitations: [
          'Point-in-time snapshot — not a real-time attestation',
          'No independent third-party audit completed',
          'ETH value uses CoinGecko price at snapshot time',
          'Off-chain obligations are founder-attested',
        ],
      };
    }

    const pack = {
      packVersion: PACK_VERSION,
      packDate: PACK_DATE,
      generatedAt: new Date().toISOString(),
      disclaimer: 'This diligence pack is produced by Axiom Protocol for institutional review purposes only. It does not constitute investment advice, legal advice, or a compliance attestation. All values are point-in-time snapshots from Arbitrum One and are not real-time attestations.',

      entity: {
        name: 'Axiom Nexus LLC',
        type: 'Limited Liability Company',
        jurisdiction: 'United States',
        role: 'Protocol operator; off-chain compliance operator for ERC-3643 identity system',
        disclosurePage: '/disclosure',
        documents: {
          reserveMethodology: '/docs/reserve-methodology.md',
          solvencyMethodology: '/docs/solvency-methodology.md',
          adminControlsDisclosure: '/docs/admin-controls-disclosure.md',
          claimTopicRegistry: '/docs/claim-topic-registry.md',
          legalEntityDisclosure: '/docs/legal-entity-disclosure.md',
          whitepaperCorrections: '/docs/whitepaper-v1.1-corrections.md',
          auditReadinessChecklist: '/docs/audit-readiness-checklist.md',
        },
      },

      solvency: solvencySection,

      reserveMethodologySummary: {
        version: '1.0',
        documentUrl: '/docs/reserve-methodology.md',
        canonicalToken: {
          address: ACTIVE_AXUSD,
          standard: 'ERC-3643 (T-REX)',
          network: 'Arbitrum One',
          decimals: 6,
        },
        reserveAssets: [
          {
            category: 'A',
            name: 'Canonical PSM USDC',
            contract: CANONICAL_PSM,
            asset: 'USDC (0xaf88d065e77c8cC2239327C5EDb3A432268e5831)',
            valuation: '1 USDC = 1.00 USD (no market adjustment)',
            status: 'Configured-Inactive — requires addAgent() activation',
            ceiling: '1,000,000 AXUSD',
            fee: '10 bps mint and redeem',
          },
          {
            category: 'B',
            name: 'Legacy GENIUS PSM USDC',
            contract: ACTIVE_PSM,
            asset: 'USDC',
            valuation: '1 USDC = 1.00 USD',
            status: 'Configured-Inactive — no new mint/redeem; reserves valid for solvency accounting pending migration',
            ceiling: '5,000,000 AXUSD (legacy)',
            fee: 'None (inactive)',
          },
          {
            category: 'C',
            name: 'Backstop USDC',
            contract: '0x54438249457694eB5431811f3f19444Af0a01B29',
            asset: 'USDC',
            valuation: '1 USDC = 1.00 USD',
            status: 'Live',
            withdrawalDelay: '24-hour timelock',
          },
        ],
        formulas: {
          totalReserves: 'Category_A_USDC + Category_B_USDC + Category_C_USDC',
          backingRatio: 'totalReserves / totalSupply',
          reserveRatio: 'Designated_Reserves / liabilitiesTotalUsd',
        },
        excludedFromReserves: [
          'AXM token holdings (price-volatile)',
          'ETH in backstop ETH vault (price-volatile)',
          'Euler vault positions (illiquid lending market)',
          'Loan receivables (illiquid, default-risk)',
          'Real estate pipeline (not on-chain liquid)',
        ],
        attestationStatus: 'Pending — no independent reserve attestation completed',
        dataSource: 'Arbitrum One RPC (Alchemy) — on-demand point-in-time snapshots',
      },

      policyThresholds: {
        NORMAL:     { coverageRatio: 1.5, reserveRatio: 0.10 },
        CAUTION:    { coverageRatio: 1.0, reserveRatio: 0.05 },
        RESTRICTED: { coverageRatio: 0.5 },
        EMERGENCY:  { coverageRatio: 0.0 },
        note: 'BOOTSTRAP mode is set explicitly during protocol initialization and is not threshold-based.',
      },

      canonicalContracts: {
        network: 'Arbitrum One',
        chainId: 42161,
        axusd: {
          canonical:   ACTIVE_AXUSD,
          label:       'Unified AXUSD (ERC-3643, T-REX) — canonical production stablecoin',
          status:      'Live',
          arbiscan:    `https://arbiscan.io/address/${ACTIVE_AXUSD}`,
        },
        psmCanonical: {
          address: CANONICAL_PSM,
          label:   'Canonical PSM — ERC-3643 identity-gated (1M AXUSD ceiling, 10 bps fee)',
          status:  'Configured-Inactive (requires addAgent() activation)',
          arbiscan: `https://arbiscan.io/address/${CANONICAL_PSM}`,
        },
        psmLegacy: {
          address: ACTIVE_PSM,
          label:   'Legacy GENIUS PSM — USDC reserves valid; no new mint/redeem intended',
          status:  'Configured-Inactive',
        },
        governanceSafe: {
          address: GOVERNANCE_SAFE_ADDRESS,
          label:   'Governance Safe (3-of-5 Gnosis Safe)',
          status:  'Live',
        },
        timelock: {
          address: TIMELOCK_ADDRESS,
          label:   'Timelock Controller — 24h minimum delay',
          status:  'Live',
        },
        axmToken:        ACTIVE_CONTRACTS.axmToken,
        eulerOpenMarket: EVK_OPEN_MARKET_VAULT_ADDRESS,
        eulerEarn:       EULER_EARN_VAULT_ADDRESS,
        eulerSwapAxusdUsdc: EULER_SWAP_AXUSD_USDC_POOL_ADDRESS,
        eulerSwapAxmAxusd:  EULER_SWAP_AXUSD_AXM_POOL_ADDRESS,
        creditMarket:    CREDIT_MARKET_ADDRESS,
        fixedLoanNFT:    FIXED_LOAN_NFT_ADDRESS,
      },

      erc3643System: {
        axusdToken:               ERC3643_CONTRACTS.AXUSD_TOKEN,
        identityRegistry:         ERC3643_CONTRACTS.IDENTITY_REGISTRY,
        identityRegistryStorage:  ERC3643_CONTRACTS.IDENTITY_REGISTRY_STORAGE,
        trustedIssuersRegistry:   ERC3643_CONTRACTS.TRUSTED_ISSUERS_REGISTRY,
        claimTopicsRegistry:      ERC3643_CONTRACTS.CLAIM_TOPICS_REGISTRY,
        modularCompliance:        ERC3643_CONTRACTS.MODULAR_COMPLIANCE,
        claimIssuer:              ERC3643_CONTRACTS.CLAIM_ISSUER,
        identityFactory:          ERC3643_CONTRACTS.IDENTITY_FACTORY,
        countryAllowModule:       ERC3643_CONTRACTS.COUNTRY_ALLOW_MODULE,
        maxBalanceModule:         ERC3643_CONTRACTS.MAX_BALANCE_MODULE,
        transferLimitModule:      ERC3643_CONTRACTS.TRANSFER_LIMIT_MODULE,
        lendingPlatformModule:    ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
      },

      claimTopics: [
        {
          id:             CLAIM_TOPICS.KYC_VERIFIED,
          name:           'KYC_VERIFIED',
          validityDays:   CLAIM_VALIDITY_DAYS[1],
          refreshWarning: CLAIM_REFRESH_WARNING_DAYS,
          requiredFor:    ['All AXUSD transfers', 'PSM mint/redeem'],
          offChainProcess: 'Operator-reviewed KYC submission. Approval triggers atomic registerIdentity() + issueClaim(topic=1) + issueClaim(topic=3).',
        },
        {
          id:             CLAIM_TOPICS.ACCREDITED_INVESTOR,
          name:           'ACCREDITED_INVESTOR',
          validityDays:   CLAIM_VALIDITY_DAYS[2],
          refreshWarning: CLAIM_REFRESH_WARNING_DAYS,
          requiredFor:    ['Lending Fund participation', 'Future gated products'],
          offChainProcess: 'Operator-reviewed accreditation submission with self-certification and documentation.',
        },
        {
          id:             CLAIM_TOPICS.SANCTIONS_CLEAR,
          name:           'SANCTIONS_CLEAR',
          validityDays:   CLAIM_VALIDITY_DAYS[3],
          refreshWarning: CLAIM_REFRESH_WARNING_DAYS,
          requiredFor:    ['All AXUSD transfers (co-required with KYC_VERIFIED)'],
          offChainProcess: 'Manual OFAC SDN and government sanctions list screening. Issued concurrently with KYC_VERIFIED.',
        },
      ],

      adminControls: {
        deployerEoa: {
          address: '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96',
          currentAuthority: [
            'ERC-3643 AXUSD: mint, burn, freeze, forcedTransfer, recovery, pause, setIdentityRegistry, setCompliance, addAgent',
            'Identity Registry: registerIdentity, deleteIdentity, updateIdentity, updateCountry, addAgent',
            'Claim Issuer: issueClaim (signing key), revokeClaim',
            'Modular Compliance: bindModule, unbindModule',
            'Lending Platform Module: addPlatform, removePlatform',
          ],
          migrationTarget: 'Governance Safe + Timelock (Task #42, in progress)',
          riskNote: 'Single private key. Loss or compromise is a material risk. Migration is highest priority hardening action.',
        },
        governanceSafe: {
          address: GOVERNANCE_SAFE_ADDRESS,
          type: '3-of-5 Gnosis Safe',
          currentAuthority: [
            'Canonical PSM: pause, setDebtCeiling, setMintFee, setRedeemFee, sweepFees',
          ],
          targetAuthority: 'All owner-level functions across ERC-3643 stack upon migration completion',
        },
        timeLock: {
          address: TIMELOCK_ADDRESS,
          delay: '24 hours minimum',
          proposerRole: 'Governance Safe',
        },
        offChainAdminAccess: {
          mechanism: 'x-admin-key header validated against ADMIN_SOLVENCY_KEY environment variable',
          endpoints: [
            'POST /api/erc3643/identity/approve',
            'POST /api/erc3643/identity/revoke',
            'GET  /api/erc3643/identity/compliance-log',
            'POST /api/erc3643/accreditation/submit',
            'POST /api/erc3643/accreditation/approve',
          ],
        },
      },

      legalEntitySummary: {
        documentUrl: '/docs/legal-entity-disclosure.md',
        entityName: 'Axiom Nexus LLC',
        entityType: 'Limited Liability Company',
        jurisdiction: 'United States',
        role: 'Protocol operator; off-chain compliance operator for ERC-3643 identity system; Lending Fund manager',
        registeredAddress: 'Pending founder confirmation — available to verified counterparties on request',
        wireBeneficiary: 'Axiom Nexus LLC — banking details provided under separate cover upon verified request',
        signOffRequired: 'Outside counsel + founder confirmation (registered address field currently pending)',
        affiliates: [
          { entity: 'Axiom Protocol (smart contracts)', relationship: 'Not a legal entity; operated by Axiom Nexus LLC' },
          { entity: 'Deployer EOA (0x8d7892CF…)', relationship: 'Protocol deployment key; held by founding member; migrating to Governance Safe' },
          { entity: 'Governance Safe (0x2Bb2c2A7…)', relationship: '3-of-5 multisig; multi-party control; signers are Axiom Protocol principals' },
        ],
        noSeparateAffiliatedFunds: 'Confirmed as of 2026-03-30',
        tokenClassificationNote: 'AXM and AXUSD have not been the subject of any SEC, CFTC, or state regulatory ruling. No legal conclusion on classification. Independent counsel required.',
      },

      whitepaperCorrectionsSummary: {
        documentUrl: '/docs/whitepaper-v1.1-corrections.md',
        format: 'Each entry: Section Reference, Category, Prior Text, Corrected Text, Effective Date',
        totalCorrections: 14,
        categories: {
          SUPERSEDED: 3,
          CLARIFICATION: 6,
          STATUS_UPDATE: 4,
          RETRACTION: 1,
        },
        keyCorrections: [
          { correction: 'C-01', description: 'Dual-ecosystem model retired; single ERC-3643 AXUSD canonical', category: 'SUPERSEDED' },
          { correction: 'C-03', description: 'eAXUSD-4 deprecated; eAXUSD-6 is canonical Euler vault', category: 'SUPERSEDED' },
          { correction: 'C-08', description: 'CreditMarket v7 canonical addresses replace ACTIVE_CONTRACTS entries', category: 'SUPERSEDED' },
          { correction: 'C-11', description: 'GENIUS Act language standardized — "designed to align with" only', category: 'CLARIFICATION' },
          { correction: 'C-13', description: 'eAXUSD-4 deposit claim retracted — WITHDRAW_ONLY permanently', category: 'RETRACTION' },
        ],
        signOffRequired: 'Protocol operator self-attestation; outside counsel review recommended for §8.1 (GENIUS Act language)',
      },

      auditReadinessSummary: {
        documentUrl: '/docs/audit-readiness-checklist.md',
        signOffRequired: 'Smart contract auditor required — no third-party audit has been completed',
        auditStatus: 'Pre-audit',
        contractsInventoried: 12,
        arbiscanVerified: 11,
        arbiscanPending: 1,
        accessControlReview: 'Partial — Deployer EOA migration to Governance Safe (Task #42) in progress',
        codeQuality: {
          compiler: 'Solidity 0.8.17–0.8.22',
          framework: 'Hardhat + OpenZeppelin',
          testCoverage: 'Partial — unit tests present; no formal coverage report',
          staticAnalysis: 'Not completed',
          proxyPattern: 'No — direct deployments; EIP-1167 minimal proxies via IdentityFactory only',
        },
        knownIssuesCount: 6,
        blockersToAudit: [
          'Deployer EOA → Governance Safe migration (Task #42) should be complete or near-final before audit (KI-001)',
          'Canonical PSM activation requires two Governance Safe transactions before PSM mint/redeem are exercisable (KI-003)',
          'Canonical PSM Arbiscan source verification pending (1 contract)',
        ],
      },

      attestationStatus: {
        thirdPartyAudit:            'Pending — not completed',
        independentReserveAttestation: 'Pending — not completed',
        geniusActCompliance:        'Designed to align with GENIUS Act (Public Law 119-27). No external confirmation of compliance. Posture under ongoing legal evaluation.',
        solvencyDataType:           'Point-in-time on-chain snapshot fetched at request time from Arbitrum One via Alchemy RPC.',
        dataFreshness: {
          source: 'Arbitrum One RPC (Alchemy)',
          derivation: 'On-demand at request time — AXUSD totalSupply(), USDC balanceOf(PSM), ETH price from CoinGecko, policy mode from PostgreSQL solvency_snapshots latest row',
          latencyNote: 'Supply and PSM balance are live on-chain reads. ETH price may lag CoinGecko by up to 60 seconds. Policy mode reflects most recent protocol snapshot.',
          notRealTime: 'This endpoint is not a streaming attestation. Each request generates a fresh point-in-time computation.',
        },
      },

      knownIssues: [
        { id: 'KI-001', description: 'Deployer EOA holds mint authority on ERC-3643 AXUSD — single point of failure', severity: 'High', mitigation: 'Migration to Governance Safe + PSM addAgent() in progress (Task #42)' },
        { id: 'KI-002', description: 'No time-lock delay on ERC-3643 agent functions (freeze, forcedTransfer)', severity: 'Medium', mitigation: 'Agent functions are Deployer EOA only; 3-of-5 Safe migration planned' },
        { id: 'KI-003', description: 'Canonical PSM requires addAgent() + LPM whitelist before activation — not yet executed', severity: 'Medium', mitigation: 'Post-deployment governance transactions pending; PSM is Configured-Inactive' },
        { id: 'KI-004', description: 'eAXUSD-4 vault (0xe3048078…) in WITHDRAW_ONLY mode due to hook config issue', severity: 'Medium', mitigation: 'Deprecated; no new deposits; existing holders may withdraw; use eAXUSD-6' },
        { id: 'KI-005', description: 'Ownership transfer on AXUSD token is single-step (transferOwnership)', severity: 'Low', mitigation: 'Deployer must transfer to Governance Safe promptly; no two-step accept mechanism' },
        { id: 'KI-006', description: 'ERC-3643 Country Allow Module currently only permits US (country code 840)', severity: 'Informational', mitigation: 'Intentional design; geographic expansion requires governance vote' },
      ],
    };

    return res.status(200).json(pack);
  } catch (error: any) {
    console.error('[solvency/diligence-pack] Error:', error);
    return res.status(500).json({ error: 'Failed to generate diligence pack' });
  }
}
