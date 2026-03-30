import { ethers } from 'ethers';
import { db } from '../../server/db';
import { t3Identities, t3Claims, t3ComplianceEvents, t3PlatformWhitelist, t3AccreditationSubmissions, t3ComplianceOpsLog, t3KycSubmissions, CLAIM_VALIDITY_DAYS, CLAIM_REFRESH_WARNING_DAYS, adminActionLog } from '../../shared/erc3643Schema';
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
import { GOVERNANCE_SAFE, SAFE_MINT_THRESHOLD_AXUSD, DEPLOYER_EOA } from '../../src/config/adminRoles';

type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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
      metadata: params.metadata ?? null,
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
        id: c.id,
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

  private static async _buildAndInsertClaim(
    tx: DbTx,
    wallet: string,
    topic: number,
    identityRecord: { id: string; onchainIdAddress: string },
    signer: ethers.Signer,
    now: Date
  ) {
    const validityDays = CLAIM_VALIDITY_DAYS[topic] || 365;
    const validityMs = validityDays * 24 * 3600 * 1000;
    const refreshWarningMs = CLAIM_REFRESH_WARNING_DAYS * 24 * 3600 * 1000;
    const expiresAt = new Date(now.getTime() + validityMs);
    const refreshRequiredBy = new Date(expiresAt.getTime() - refreshWarningMs);
    const claimData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'uint256'],
      [wallet, topic, Math.floor(now.getTime() / 1000) + validityDays * 24 * 3600]
    );
    const dataHash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bytes'],
        [identityRecord.onchainIdAddress, topic, claimData]
      )
    );
    const signature = await signer.signMessage(ethers.getBytes(dataHash));
    const [inserted] = await tx.insert(t3Claims).values({
      identityId: identityRecord.id,
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
    return { inserted, expiresAt, refreshRequiredBy, signature };
  }

  static async issueClaim(wallet: string, topic: number, data: string = '', opts?: { tx?: DbTx }) {
    const signer = getSigner();
    const dbIdentity = await db.select().from(t3Identities).where(eq(t3Identities.wallet, wallet.toLowerCase())).limit(1);
    if (dbIdentity.length === 0) throw new Error('Identity not found for wallet');

    const isRenewal = opts?.tx
      ? false
      : (await db.select({ id: t3Claims.id })
          .from(t3Claims)
          .where(and(
            eq(t3Claims.identityId, dbIdentity[0].id),
            eq(t3Claims.topic, topic),
            eq(t3Claims.revoked, false),
            gte(t3Claims.expiresAt, new Date()),
          ))
          .limit(1)).length > 0;

    const identityAddr = dbIdentity[0].onchainIdAddress;
    const now = new Date();
    const buildClaim = (tx: DbTx) => ERC3643Service._buildAndInsertClaim(
      tx, wallet, topic, { id: dbIdentity[0].id, onchainIdAddress: identityAddr ?? '' }, signer, now
    );
    const { inserted, expiresAt, refreshRequiredBy, signature } = opts?.tx
      ? await buildClaim(opts.tx)
      : await db.transaction(async (tx) => buildClaim(tx));

    const callerAddress = await signer.getAddress();

    await writeAdminLog({
      actionType: isRenewal ? 'renewClaim' : 'issueClaim',
      callerAddress,
      targetAddress: wallet,
      role: 'COMPLIANCE_ROLE',
      metadata: { topic, claimId: inserted.id, expiresAt: expiresAt.toISOString(), isRenewal },
    });

    if (isRenewal) {
      await db.insert(t3ComplianceOpsLog).values({
        wallet: wallet.toLowerCase(),
        action: 'renewal',
        topic,
        claimId: inserted.id,
        operatorAddress: callerAddress.toLowerCase(),
        result: 'success',
        notes: `Topic ${topic} claim renewed — new expiry: ${expiresAt.toISOString()}`,
        metadata: { expiresAt: expiresAt.toISOString(), refreshRequiredBy: refreshRequiredBy.toISOString() },
      }).catch((e) => {
        console.error('[issueClaim] renewal compliance log insert failed (non-fatal):', e);
      });
    }

    return {
      claimId: inserted.id,
      topic,
      isRenewal,
      txHash: undefined as string | undefined,
      signature,
      identityAddress: identityAddr,
      expiresAt,
      refreshRequiredBy,
    };
  }

  // KYC approval flow: mark approved, bridge on-chain identity, then finalize DB claims/status atomically.
  static async atomicKycApproval(params: {
    submissionId: string;
    walletAddress: string;
    countryCode?: number;
    reviewNote?: string;
  }) {
    const { submissionId, walletAddress, countryCode = 840, reviewNote } = params;
    const now = new Date();

    await db.update(t3KycSubmissions)
      .set({ status: 'approved', reviewedAt: now, reviewNote: reviewNote ?? null, updatedAt: now })
      .where(eq(t3KycSubmissions.id, submissionId));

    const existingIdentity = await db.select()
      .from(t3Identities)
      .where(eq(t3Identities.wallet, walletAddress.toLowerCase()))
      .limit(1);

    let regResult: Awaited<ReturnType<typeof ERC3643Service.registerIdentity>>;
    if (existingIdentity.length > 0) {
      const id = existingIdentity[0];
      regResult = {
        identityId: id.id,
        wallet: id.wallet,
        onchainIdAddress: id.onchainIdAddress ?? '',
        countryCode: id.countryCode ?? countryCode,
        txHash: 'IDEMPOTENT_SKIP',
        registryTxHash: 'IDEMPOTENT_SKIP',
      };
    } else {
      try {
        regResult = await ERC3643Service.registerIdentity(walletAddress, countryCode);
      } catch (regErr: unknown) {
        const errMsg = regErr instanceof Error ? regErr.message : String(regErr);
        await db.update(t3KycSubmissions)
          .set({ status: 'failed_bridge', bridgeError: `registerIdentity failed: ${errMsg}`, updatedAt: new Date() })
          .where(eq(t3KycSubmissions.id, submissionId))
          .catch(() => {});
        throw new Error(`Identity registration failed: ${errMsg}`);
      }
    }

    const signer = getSigner();
    const [dbIdentity] = await db.select()
      .from(t3Identities)
      .where(eq(t3Identities.wallet, walletAddress.toLowerCase()))
      .limit(1);
    if (!dbIdentity) throw new Error('Identity record not found after registration');

    let t1Claim!: { id: string; [key: string]: unknown };
    let t3Claim!: { id: string; [key: string]: unknown };
    let t1ExpiresAt!: Date;
    let t3ExpiresAt!: Date;

    try {
      const txResult = await db.transaction(async (tx) => {
        const t1 = await ERC3643Service.issueClaim(walletAddress, 1, '', { tx });
        const t3 = await ERC3643Service.issueClaim(walletAddress, 3, '', { tx });
        await tx.update(t3KycSubmissions)
          .set({ status: 'bridged', bridgedAt: now, bridgeError: null, updatedAt: now })
          .where(eq(t3KycSubmissions.id, submissionId));
        return { t1, t3 };
      });

      t1Claim = { id: txResult.t1.claimId } as typeof t1Claim;
      t3Claim = { id: txResult.t3.claimId } as typeof t3Claim;
      t1ExpiresAt = txResult.t1.expiresAt;
      t3ExpiresAt = txResult.t3.expiresAt;
    } catch (txErr: unknown) {
      const errMsg = txErr instanceof Error ? txErr.message : String(txErr);
      await db.update(t3KycSubmissions)
        .set({
          status: 'partial_bridge',
          bridgeError: `registerIdentity succeeded (on-chain) but claim/status DB transaction failed: ${errMsg}`,
          updatedAt: now,
        })
        .where(eq(t3KycSubmissions.id, submissionId))
        .catch(() => {});
      throw new Error(`Claim issuance DB transaction failed after on-chain identity registration: ${errMsg}`);
    }

    const callerAddress = (await signer.getAddress()).toLowerCase();

    await db.insert(t3ComplianceOpsLog).values([
      {
        wallet: walletAddress,
        action: 'issuance',
        topic: 1,
        claimId: t1Claim.id,
        operatorAddress: callerAddress,
        result: 'success',
        notes: 'Topic 1 (KYC) issued — atomic KYC approval; ERC-3643 off-chain claim (ClaimIssuer signature, verified by IdentityRegistry on transfer)',
        metadata: { identityAddress: regResult.onchainIdAddress, registryTxHash: regResult.registryTxHash, expiresAt: t1ExpiresAt, claimScheme: 'erc3643_offchain_sig' },
      },
      {
        wallet: walletAddress,
        action: 'issuance',
        topic: 3,
        claimId: t3Claim.id,
        operatorAddress: callerAddress,
        result: 'success',
        notes: 'Topic 3 (Sanctions) issued — atomic KYC approval; ERC-3643 off-chain claim',
        metadata: { expiresAt: t3ExpiresAt, claimScheme: 'erc3643_offchain_sig' },
      },
    ]).catch((e) => {
      console.error('[atomicKycApproval] compliance log insert failed (non-fatal):', e);
    });

    return {
      identityAddress: regResult.onchainIdAddress,
      registerIdentityTxHash: regResult.txHash === 'IDEMPOTENT_SKIP' ? undefined : regResult.txHash,
      registryTxHash: regResult.registryTxHash === 'IDEMPOTENT_SKIP' ? undefined : regResult.registryTxHash,
      t1Claim: { claimId: t1Claim.id, expiresAt: t1ExpiresAt },
      t3Claim: { claimId: t3Claim.id, expiresAt: t3ExpiresAt },
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

    await db.insert(t3ComplianceOpsLog).values({
      wallet: identity.wallet.toLowerCase(),
      action: 'renewal',
      topic: existing.topic,
      claimId: result.claimId,
      operatorAddress: adminWallet.toLowerCase(),
      result: 'success',
      notes: `Topic ${existing.topic} claim renewed — old claim ${claimId} revoked, new claim ${result.claimId} issued`,
      metadata: { oldClaimId: claimId, expiresAt: result.expiresAt, refreshRequiredBy: result.refreshRequiredBy },
    }).catch((e) => {
      console.error('[renewClaim] compliance log insert failed (non-fatal):', e);
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
   * For amounts at or above the threshold, a real Safe transaction proposal is created
   * and submitted to the Safe Transaction Service (Arbitrum One) via @safe-global/api-kit.
   * The proposal appears in app.safe.global for the remaining owners to sign and execute.
   *
   * NOTE: On-chain minting requires the caller to hold MINTER_ROLE on the AXUSD token.
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
      const pk = process.env.DEPLOYER_PRIVATE_KEY;
      if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set');

      const provider = getProvider();
      const signer = new ethers.Wallet(pk, provider);
      const signerAddress = await signer.getAddress();

      const MINT_ABI = ['function mint(address to, uint256 amount) external'];
      const tokenInterface = new ethers.Interface(MINT_ABI);
      const mintData = tokenInterface.encodeFunctionData('mint', [
        toAddress,
        ethers.parseUnits(amountAxusd, 18),
      ]);

      let safeTxHash: string | undefined;
      let proposalError: string | undefined;

      try {
        const Safe = (await import('@safe-global/protocol-kit')).default;
        const SafeApiKit = (await import('@safe-global/api-kit')).default;

        const protocolKit = await Safe.init({
          provider: process.env.ALCHEMY_API_KEY
            ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
            : 'https://arb1.arbitrum.io/rpc',
          signer: pk,
          safeAddress: GOVERNANCE_SAFE,
        });

        const safeTransaction = await protocolKit.createTransaction({
          transactions: [{
            to: ERC3643_CONTRACTS.AXUSD_TOKEN,
            value: '0',
            data: mintData,
          }],
        });

        safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
        const signature = await protocolKit.signHash(safeTxHash);

        const apiKit = new SafeApiKit({ chainId: 42161n });
        await apiKit.proposeTransaction({
          safeAddress: GOVERNANCE_SAFE,
          safeTransactionData: safeTransaction.data,
          safeTxHash,
          senderAddress: signerAddress,
          senderSignature: signature.data,
        });
      } catch (err) {
        proposalError = err instanceof Error ? err.message : String(err);
        console.error('[ERC3643Service] Safe proposal failed:', proposalError);
      }

      const logStatus = proposalError ? 'failed' : 'pending_safe';
      await writeAdminLog({
        actionType: 'mint',
        callerAddress,
        targetAddress: toAddress,
        amount: amountAxusd,
        txHash: safeTxHash,
        role: 'MINTER_ROLE',
        status: logStatus,
        errorMessage: proposalError,
        metadata: {
          reason,
          safeAddress: GOVERNANCE_SAFE,
          safeTxHash,
          note: `Amount ${amountAxusd} AXUSD >= threshold ${SAFE_MINT_THRESHOLD_AXUSD}. Safe proposal path.`,
        },
      });

      if (proposalError) {
        throw new Error(`Safe proposal failed: ${proposalError}`);
      }

      return {
        status: 'pending_safe',
        message: 'Safe transaction proposal submitted. Navigate to app.safe.global for remaining signatures.',
        safeUrl: `https://app.safe.global/transactions/queue?safe=arb1:${GOVERNANCE_SAFE}`,
        safeTxHash,
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
   * Burn AXUSD via Safe proposal (all amounts).
   * Burns require MINTER_ROLE held by the Governance Safe.
   * The deployer EOA proposes the Safe transaction; 3-of-5 signers execute.
   */
  static async burnAXUSD(params: {
    fromAddress: string;
    amountAxusd: string;
    callerAddress: string;
    reason?: string;
  }) {
    const { fromAddress, amountAxusd, callerAddress, reason } = params;

    const pk = process.env.DEPLOYER_PRIVATE_KEY;
    if (!pk) throw new Error('DEPLOYER_PRIVATE_KEY not set');

    const BURN_ABI = ['function burn(address from, uint256 amount) external'];
    const burnInterface = new ethers.Interface(BURN_ABI);
    const amountWei = ethers.parseUnits(amountAxusd, 18);
    const burnData = burnInterface.encodeFunctionData('burn', [fromAddress, amountWei]);

    let safeTxHash: string | undefined;
    let proposalError: string | undefined;

    try {
      const Safe = (await import('@safe-global/protocol-kit')).default;
      const SafeApiKit = (await import('@safe-global/api-kit')).default;

      const rpcUrl = process.env.ALCHEMY_API_KEY
        ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : 'https://arb1.arbitrum.io/rpc';

      const protocolKit = await Safe.init({
        provider: rpcUrl,
        signer: pk,
        safeAddress: GOVERNANCE_SAFE,
      });

      const safeTransaction = await protocolKit.createTransaction({
        transactions: [{
          to: ERC3643_CONTRACTS.AXUSD_TOKEN,
          value: '0',
          data: burnData,
        }],
      });

      safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
      const signature = await protocolKit.signHash(safeTxHash);

      const signerAddress = new ethers.Wallet(pk).address;
      const apiKit = new SafeApiKit({ chainId: 42161n });
      await apiKit.proposeTransaction({
        safeAddress: GOVERNANCE_SAFE,
        safeTransactionData: safeTransaction.data,
        safeTxHash,
        senderAddress: signerAddress,
        senderSignature: signature.data,
      });
    } catch (err) {
      proposalError = err instanceof Error ? err.message : String(err);
      console.error('[ERC3643Service] burnAXUSD Safe proposal failed:', proposalError);
    }

    const logStatus = proposalError ? 'failed' : 'pending_safe';
    await writeAdminLog({
      actionType: 'burn',
      callerAddress,
      targetAddress: fromAddress,
      amount: amountAxusd,
      txHash: safeTxHash,
      role: 'MINTER_ROLE',
      status: logStatus,
      errorMessage: proposalError,
      metadata: {
        reason,
        safeAddress: GOVERNANCE_SAFE,
        safeTxHash,
        note: 'All AXUSD burns route through Governance Safe proposal.',
      },
    });

    if (proposalError) {
      throw new Error(`burnAXUSD Safe proposal failed: ${proposalError}`);
    }

    return {
      status: 'pending_safe',
      message: 'Safe burn proposal submitted. Navigate to app.safe.global for remaining signatures.',
      safeUrl: `https://app.safe.global/transactions/queue?safe=arb1:${GOVERNANCE_SAFE}`,
      safeTxHash,
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

  static async revokeClaim(claimId: string, adminWallet: string) {
    const signer = getSigner();

    const [claim] = await db.select()
      .from(t3Claims)
      .where(eq(t3Claims.id, claimId))
      .limit(1);
    if (!claim) throw new Error('Claim not found');
    if (claim.revoked) throw new Error('Claim is already revoked');
    if (!claim.signature) throw new Error('Claim has no stored signature — cannot revoke on-chain');

    const [identity] = await db.select()
      .from(t3Identities)
      .where(eq(t3Identities.id, claim.identityId))
      .limit(1);
    if (!identity) throw new Error('Identity not found for claim');

    const claimIssuer = new ethers.Contract(
      ERC3643_CONTRACTS.CLAIM_ISSUER,
      CLAIM_ISSUER_ABI,
      signer
    );

    const tx = await claimIssuer.revokeClaimBySignature(claim.signature);
    await tx.wait();

    await db.update(t3Claims)
      .set({ revoked: true })
      .where(eq(t3Claims.id, claimId));

    await db.insert(t3ComplianceOpsLog).values({
      wallet: identity.wallet,
      action: 'revocation',
      topic: claim.topic,
      claimId,
      operatorAddress: adminWallet.toLowerCase(),
      txHash: tx.hash,
      result: 'success',
      notes: `Claim topic ${claim.topic} revoked by ${adminWallet}`,
    });

    await writeAdminLog({
      actionType: 'revokeClaim',
      callerAddress: adminWallet,
      targetAddress: identity.wallet,
      txHash: tx.hash,
      role: 'COMPLIANCE_ROLE',
      metadata: { claimId, topic: claim.topic },
    });

    return { claimId, wallet: identity.wallet, topic: claim.topic, txHash: tx.hash };
  }

  static async submitAccreditation(params: {
    walletAddress: string;
    selfCertification: boolean;
    accreditationBasis: string;
    documentUrls?: string;
    notes?: string;
  }) {
    const existing = await db.select()
      .from(t3AccreditationSubmissions)
      .where(and(
        eq(t3AccreditationSubmissions.walletAddress, params.walletAddress.toLowerCase()),
        eq(t3AccreditationSubmissions.status, 'submitted')
      ))
      .limit(1);

    if (existing.length > 0) throw new Error('A pending accreditation submission already exists for this wallet');

    const [inserted] = await db.insert(t3AccreditationSubmissions).values({
      walletAddress: params.walletAddress.toLowerCase(),
      selfCertification: params.selfCertification,
      accreditationBasis: params.accreditationBasis,
      documentUrls: params.documentUrls ?? null,
      notes: params.notes ?? null,
      status: 'submitted',
    }).returning();

    return { id: inserted.id, walletAddress: inserted.walletAddress, status: inserted.status, createdAt: inserted.createdAt };
  }

  static async approveAccreditation(submissionId: string, adminWallet: string) {
    const [submission] = await db.select()
      .from(t3AccreditationSubmissions)
      .where(eq(t3AccreditationSubmissions.id, submissionId))
      .limit(1);
    if (!submission) throw new Error('Accreditation submission not found');
    if (!['submitted', 'under_review'].includes(submission.status)) {
      throw new Error(`Cannot approve submission in status: ${submission.status}`);
    }

    const claimResult = await this.issueClaim(submission.walletAddress, CLAIM_TOPICS.ACCREDITED_INVESTOR);

    await db.update(t3AccreditationSubmissions)
      .set({
        status: 'approved',
        reviewedBy: adminWallet.toLowerCase(),
        reviewedAt: new Date(),
        claimId: claimResult.claimId,
        updatedAt: new Date(),
      })
      .where(eq(t3AccreditationSubmissions.id, submissionId));

    await db.insert(t3ComplianceOpsLog).values({
      wallet: submission.walletAddress,
      action: 'issuance',
      topic: CLAIM_TOPICS.ACCREDITED_INVESTOR,
      claimId: claimResult.claimId,
      operatorAddress: adminWallet.toLowerCase(),
      result: 'success',
      notes: `Accreditation (Topic 2) approved for ${submission.walletAddress}`,
    });

    return {
      submissionId,
      walletAddress: submission.walletAddress,
      claimId: claimResult.claimId,
      topic: CLAIM_TOPICS.ACCREDITED_INVESTOR,
      expiresAt: claimResult.expiresAt,
    };
  }

  static async rejectAccreditation(submissionId: string, adminWallet: string, reviewNote?: string) {
    const [submission] = await db.select()
      .from(t3AccreditationSubmissions)
      .where(eq(t3AccreditationSubmissions.id, submissionId))
      .limit(1);
    if (!submission) throw new Error('Accreditation submission not found');

    await db.update(t3AccreditationSubmissions)
      .set({
        status: 'rejected',
        reviewedBy: adminWallet.toLowerCase(),
        reviewedAt: new Date(),
        reviewNote: reviewNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(t3AccreditationSubmissions.id, submissionId));

    await db.insert(t3ComplianceOpsLog).values({
      wallet: submission.walletAddress,
      action: 'rejection',
      topic: CLAIM_TOPICS.ACCREDITED_INVESTOR,
      operatorAddress: adminWallet.toLowerCase(),
      result: 'rejected',
      notes: reviewNote ?? 'Accreditation rejected',
    });

    return { submissionId, walletAddress: submission.walletAddress, status: 'rejected' };
  }

  static async getComplianceOpsLog(limit = 100) {
    return db.select()
      .from(t3ComplianceOpsLog)
      .orderBy(desc(t3ComplianceOpsLog.createdAt))
      .limit(limit);
  }
}
