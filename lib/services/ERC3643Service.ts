import { ethers } from 'ethers';
import { db } from '../../server/db';
import { t3Identities, t3Claims, t3ComplianceEvents, t3PlatformWhitelist, CLAIM_VALIDITY_DAYS, CLAIM_REFRESH_WARNING_DAYS, adminActionLog } from '../../shared/erc3643Schema';
import { eq, and, lte, gte, or, isNull, desc } from 'drizzle-orm';
import {
  ERC3643_CONTRACTS,
  CLAIM_TOPICS,
  AXUSD_3643_ABI,
  IDENTITY_REGISTRY_ABI,
  IDENTITY_FACTORY_ABI,
  CLAIM_ISSUER_ABI,
  MODULAR_COMPLIANCE_ABI,
  LENDING_PLATFORM_MODULE_ABI,
} from '../../shared/contracts-3643';
import { GOVERNANCE_SAFE, SAFE_MINT_THRESHOLD_AXUSD } from '../../src/config/adminRoles';

function getProvider() {
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getSigner() {
  const provider = getProvider();
  if (!process.env.DEPLOYER_PRIVATE_KEY) throw new Error('DEPLOYER_PRIVATE_KEY not set');
  return new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
}

async function writeAdminLog(params: {
  actionType: string;
  callerAddress: string;
  targetAddress?: string;
  amount?: string;
  txHash?: string;
  role?: string;
  status?: 'success' | 'failed' | 'pending_safe';
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(adminActionLog).values({
      actionType: params.actionType,
      callerAddress: params.callerAddress.toLowerCase(),
      targetAddress: params.targetAddress?.toLowerCase(),
      amount: params.amount,
      txHash: params.txHash,
      role: params.role,
      status: params.status ?? 'success',
      errorMessage: params.errorMessage,
      metadata: params.metadata ? JSON.stringify(params.metadata) : undefined,
    });
  } catch (err) {
    console.error('[ERC3643Service] Failed to write admin log:', err);
  }
}

export class ERC3643Service {
  static async getIdentityStatus(wallet: string) {
    const provider = getProvider();
    const identityRegistry = new ethers.Contract(
      ERC3643_CONTRACTS.IDENTITY_REGISTRY,
      IDENTITY_REGISTRY_ABI,
      provider
    );

    const [isVerified, hasIdentity] = await Promise.all([
      identityRegistry.isVerified(wallet).catch(() => false),
      identityRegistry.contains(wallet).catch(() => false),
    ]);

    let identityAddr = null;
    let country = 0;
    if (hasIdentity) {
      [identityAddr, country] = await Promise.all([
        identityRegistry.identity(wallet),
        identityRegistry.investorCountry(wallet),
      ]);
    }

    const dbIdentity = await db.select().from(t3Identities).where(eq(t3Identities.wallet, wallet.toLowerCase())).limit(1);
    const claims = dbIdentity.length > 0
      ? await db.select().from(t3Claims).where(eq(t3Claims.identityId, dbIdentity[0].id))
      : [];

    return {
      wallet,
      isVerified,
      hasIdentity,
      identityAddress: identityAddr,
      country: Number(country),
      verificationLevel: dbIdentity[0]?.verificationLevel ?? 0,
      status: dbIdentity[0]?.status ?? 'unregistered',
      claims: claims.map(c => ({
        topic: c.topic,
        issuer: c.issuerAddress,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        expiresAt: c.expiresAt,
        refreshRequiredBy: c.refreshRequiredBy,
        revoked: c.revoked,
      })),
    };
  }

  static async isCompliant(from: string, to: string, amount: string) {
    const provider = getProvider();
    const compliance = new ethers.Contract(
      ERC3643_CONTRACTS.MODULAR_COMPLIANCE,
      MODULAR_COMPLIANCE_ABI,
      provider
    );

    const amountWei = ethers.parseEther(amount);
    const canTransfer = await compliance.canTransfer(from, to, amountWei).catch(() => false);

    const identityRegistry = new ethers.Contract(
      ERC3643_CONTRACTS.IDENTITY_REGISTRY,
      IDENTITY_REGISTRY_ABI,
      provider
    );
    const receiverVerified = await identityRegistry.isVerified(to).catch(() => false);

    return {
      compliant: canTransfer && receiverVerified,
      complianceCheck: canTransfer,
      receiverVerified,
    };
  }

  static async registerIdentity(wallet: string, countryCode: number = 840) {
    const signer = getSigner();

    const factory = new ethers.Contract(
      ERC3643_CONTRACTS.IDENTITY_FACTORY,
      IDENTITY_FACTORY_ABI,
      signer
    );

    const tx = await factory.createIdentity(wallet, wallet);
    const receipt = await tx.wait();
    const identityAddr = await factory.getIdentity(wallet);

    const registry = new ethers.Contract(
      ERC3643_CONTRACTS.IDENTITY_REGISTRY,
      IDENTITY_REGISTRY_ABI,
      signer
    );
    const regTx = await registry.registerIdentity(wallet, identityAddr, countryCode);
    await regTx.wait();

    const [inserted] = await db.insert(t3Identities).values({
      wallet: wallet.toLowerCase(),
      onchainIdAddress: identityAddr.toLowerCase(),
      countryCode,
      verificationLevel: 1,
      status: 'active',
    }).returning();

    await writeAdminLog({
      actionType: 'registerIdentity',
      callerAddress: await signer.getAddress(),
      targetAddress: wallet,
      txHash: tx.hash,
      role: 'COMPLIANCE_ROLE',
      metadata: { identityAddr, countryCode, registryTxHash: regTx.hash },
    });

    return {
      identityId: inserted.id,
      wallet,
      onchainIdAddress: identityAddr,
      countryCode,
      txHash: tx.hash,
      registryTxHash: regTx.hash,
    };
  }

  static async issueClaim(wallet: string, topic: number, data: string = '') {
    const signer = getSigner();
    const dbIdentity = await db.select().from(t3Identities).where(eq(t3Identities.wallet, wallet.toLowerCase())).limit(1);
    if (dbIdentity.length === 0) throw new Error('Identity not found for wallet');

    const identityAddr = dbIdentity[0].onchainIdAddress;
    const validityDays = CLAIM_VALIDITY_DAYS[topic] || 365;
    const validityMs = validityDays * 24 * 3600 * 1000;
    const refreshWarningMs = CLAIM_REFRESH_WARNING_DAYS * 24 * 3600 * 1000;

    const claimData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'uint256'],
      [wallet, topic, Math.floor(Date.now() / 1000) + validityDays * 24 * 3600]
    );

    const dataHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bytes'],
        [identityAddr, topic, claimData]
      )
    );
    const signature = await signer.signMessage(ethers.getBytes(dataHash));

    const now = new Date();
    const expiresAt = new Date(now.getTime() + validityMs);
    const refreshRequiredBy = new Date(expiresAt.getTime() - refreshWarningMs);

    const [inserted] = await db.insert(t3Claims).values({
      identityId: dbIdentity[0].id,
      topic,
      issuerAddress: ERC3643_CONTRACTS.CLAIM_ISSUER.toLowerCase(),
      claimData: ethers.hexlify(claimData),
      signature,
      validFrom: now,
      validUntil: expiresAt,
      expiresAt,
      refreshRequiredBy,
      revoked: false,
    }).returning();

    await writeAdminLog({
      actionType: 'issueClaim',
      callerAddress: await signer.getAddress(),
      targetAddress: wallet,
      role: 'COMPLIANCE_ROLE',
      metadata: { topic, claimId: inserted.id, expiresAt: expiresAt.toISOString() },
    });

    return {
      claimId: inserted.id,
      topic,
      signature,
      identityAddress: identityAddr,
      expiresAt,
      refreshRequiredBy,
    };
  }

  static async getExpiringClaims() {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + CLAIM_REFRESH_WARNING_DAYS * 24 * 3600 * 1000);

    const expiringSoon = await db.select({
      claim: t3Claims,
      wallet: t3Identities.wallet,
    })
      .from(t3Claims)
      .innerJoin(t3Identities, eq(t3Claims.identityId, t3Identities.id))
      .where(
        and(
          eq(t3Claims.revoked, false),
          or(
            and(
              lte(t3Claims.expiresAt, thirtyDaysFromNow),
              gte(t3Claims.expiresAt, now)
            ),
            lte(t3Claims.expiresAt, now)
          )
        )
      );

    const expiring: typeof expiringSoon = [];
    const expired: typeof expiringSoon = [];

    for (const row of expiringSoon) {
      if (row.claim.expiresAt && row.claim.expiresAt <= now) {
        expired.push(row);
      } else {
        expiring.push(row);
      }
    }

    return { expiring, expired };
  }

  static async renewClaim(claimId: string, adminWallet: string) {
    const [existing] = await db.select()
      .from(t3Claims)
      .where(eq(t3Claims.id, claimId))
      .limit(1);

    if (!existing) throw new Error('Claim not found');

    const [identity] = await db.select()
      .from(t3Identities)
      .where(eq(t3Identities.id, existing.identityId))
      .limit(1);

    if (!identity) throw new Error('Identity not found for claim');

    await db.update(t3Claims)
      .set({ revoked: true })
      .where(eq(t3Claims.id, claimId));

    const result = await this.issueClaim(identity.wallet, existing.topic);

    await writeAdminLog({
      actionType: 'renewClaim',
      callerAddress: adminWallet,
      targetAddress: identity.wallet,
      role: 'OPERATOR_ROLE',
      metadata: { oldClaimId: claimId, newClaimId: result.claimId, topic: existing.topic },
    });

    return {
      oldClaimId: claimId,
      newClaimId: result.claimId,
      topic: existing.topic,
      wallet: identity.wallet,
      expiresAt: result.expiresAt,
      refreshRequiredBy: result.refreshRequiredBy,
    };
  }

  static async whitelistPlatform(contractAddress: string, platformName: string) {
    const signer = getSigner();
    const lpm = new ethers.Contract(
      ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
      LENDING_PLATFORM_MODULE_ABI,
      signer
    );

    const tx = await lpm.addPlatform(ERC3643_CONTRACTS.MODULAR_COMPLIANCE, contractAddress);
    await tx.wait();

    const [inserted] = await db.insert(t3PlatformWhitelist).values({
      contractAddress: contractAddress.toLowerCase(),
      platformName,
      addedBy: await signer.getAddress(),
      active: true,
    }).returning();

    await writeAdminLog({
      actionType: 'whitelistPlatform',
      callerAddress: await signer.getAddress(),
      targetAddress: contractAddress,
      txHash: tx.hash,
      role: 'COMPLIANCE_ROLE',
      metadata: { platformName },
    });

    return {
      id: inserted.id,
      contractAddress,
      platformName,
      txHash: tx.hash,
    };
  }

  static async freezeAddress(wallet: string, freeze: boolean) {
    const signer = getSigner();
    const token = new ethers.Contract(
      ERC3643_CONTRACTS.AXUSD_TOKEN,
      AXUSD_3643_ABI,
      signer
    );

    const tx = await token.freezeAddress(wallet, freeze);
    await tx.wait();

    await db.update(t3Identities)
      .set({ status: freeze ? 'frozen' : 'active', updatedAt: new Date() })
      .where(eq(t3Identities.wallet, wallet.toLowerCase()));

    await writeAdminLog({
      actionType: freeze ? 'freezeAddress' : 'unfreezeAddress',
      callerAddress: await signer.getAddress(),
      targetAddress: wallet,
      txHash: tx.hash,
      role: 'OPERATOR_ROLE',
      metadata: { freeze },
    });

    return { wallet, frozen: freeze, txHash: tx.hash };
  }

  /**
   * Mint AXUSD via Safe proposal (amounts >= SAFE_MINT_THRESHOLD) or direct EOA signing.
   *
   * For amounts below the threshold, the deployer EOA signs directly.
   * For amounts at or above the threshold, a Safe transaction proposal is created
   * that must be approved by Safe owners at app.safe.global before execution.
   *
   * NOTE: On-chain minting requires the caller to hold MINTER_ROLE on the AXUSD token.
   * The ERC-3643 T-REX token exposes mint(address,uint256) gated by MINTER_ROLE.
   */
  static async mintAXUSD(params: {
    toAddress: string;
    amountAxusd: string;
    callerAddress: string;
    reason?: string;
  }) {
    const { toAddress, amountAxusd, callerAddress, reason } = params;
    const amountFloat = parseFloat(amountAxusd);
    const requiresSafe = amountFloat >= SAFE_MINT_THRESHOLD_AXUSD;

    if (requiresSafe) {
      await writeAdminLog({
        actionType: 'mint',
        callerAddress,
        targetAddress: toAddress,
        amount: amountAxusd,
        role: 'MINTER_ROLE',
        status: 'pending_safe',
        metadata: {
          reason,
          safeAddress: GOVERNANCE_SAFE,
          note: `Amount ${amountAxusd} AXUSD >= threshold ${SAFE_MINT_THRESHOLD_AXUSD}. Safe proposal required at app.safe.global`,
        },
      });

      return {
        status: 'pending_safe',
        message: `Amount ${amountAxusd} AXUSD meets or exceeds the ${SAFE_MINT_THRESHOLD_AXUSD} AXUSD Safe-proposal threshold. A multisig transaction must be proposed and executed at app.safe.global/arb1:${GOVERNANCE_SAFE}`,
        safeUrl: `https://app.safe.global/transactions/queue?safe=arb1:${GOVERNANCE_SAFE}`,
        requiresSafe: true,
        amountAxusd,
        toAddress,
      };
    }

    const signer = getSigner();
    const MINT_ABI = ['function mint(address to, uint256 amount) external'];
    const token = new ethers.Contract(
      ERC3643_CONTRACTS.AXUSD_TOKEN,
      MINT_ABI,
      signer
    );

    const amountWei = ethers.parseUnits(amountAxusd, 18);
    const tx = await token.mint(toAddress, amountWei);
    await tx.wait();

    await writeAdminLog({
      actionType: 'mint',
      callerAddress,
      targetAddress: toAddress,
      amount: amountAxusd,
      txHash: tx.hash,
      role: 'MINTER_ROLE',
      status: 'success',
      metadata: { reason },
    });

    return {
      status: 'success',
      txHash: tx.hash,
      amountAxusd,
      toAddress,
      requiresSafe: false,
    };
  }

  /**
   * Burn AXUSD (forcedTransfer-equivalent for compliance-gated recovery).
   * All burns are logged to the admin action log.
   */
  static async burnAXUSD(params: {
    fromAddress: string;
    amountAxusd: string;
    callerAddress: string;
    reason?: string;
  }) {
    const { fromAddress, amountAxusd, callerAddress, reason } = params;
    const signer = getSigner();

    const BURN_ABI = ['function burn(address from, uint256 amount) external'];
    const token = new ethers.Contract(
      ERC3643_CONTRACTS.AXUSD_TOKEN,
      BURN_ABI,
      signer
    );

    const amountWei = ethers.parseUnits(amountAxusd, 18);
    const tx = await token.burn(fromAddress, amountWei);
    await tx.wait();

    await writeAdminLog({
      actionType: 'burn',
      callerAddress,
      targetAddress: fromAddress,
      amount: amountAxusd,
      txHash: tx.hash,
      role: 'MINTER_ROLE',
      status: 'success',
      metadata: { reason },
    });

    return {
      status: 'success',
      txHash: tx.hash,
      amountAxusd,
      fromAddress,
    };
  }

  static async getComplianceModules() {
    const provider = getProvider();
    const compliance = new ethers.Contract(
      ERC3643_CONTRACTS.MODULAR_COMPLIANCE,
      MODULAR_COMPLIANCE_ABI,
      provider
    );

    const modules = await compliance.getModules();
    const tokenBound = await compliance.getTokenBound();

    const platforms = await db.select().from(t3PlatformWhitelist).where(eq(t3PlatformWhitelist.active, true));

    return {
      tokenBound,
      modules: modules.map((addr: string) => addr),
      knownModules: {
        countryAllow: ERC3643_CONTRACTS.COUNTRY_ALLOW_MODULE,
        maxBalance: ERC3643_CONTRACTS.MAX_BALANCE_MODULE,
        transferLimit: ERC3643_CONTRACTS.TRANSFER_LIMIT_MODULE,
        lendingPlatform: ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
      },
      whitelistedPlatforms: platforms,
    };
  }

  static async logComplianceEvent(event: {
    txHash?: string;
    fromAddress: string;
    toAddress: string;
    amount: string;
    moduleChecked: string;
    result: 'pass' | 'fail';
    reason?: string;
  }) {
    const [inserted] = await db.insert(t3ComplianceEvents).values({
      txHash: event.txHash,
      fromAddress: event.fromAddress.toLowerCase(),
      toAddress: event.toAddress.toLowerCase(),
      amount: event.amount,
      moduleChecked: event.moduleChecked,
      result: event.result,
      reason: event.reason,
    }).returning();
    return inserted;
  }

  static async getAdminActionLog(limit = 50) {
    return db.select()
      .from(adminActionLog)
      .orderBy(desc(adminActionLog.createdAt))
      .limit(limit);
  }
}
