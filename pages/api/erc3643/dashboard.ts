import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import {
  ERC3643_CONTRACTS,
  AXUSD_3643_ABI,
  IDENTITY_REGISTRY_ABI,
  MODULAR_COMPLIANCE_ABI,
  LENDING_PLATFORM_MODULE_ABI,
} from '../../../shared/contracts-3643';
import { db } from '../../../server/db';
import { t3Identities, t3ComplianceEvents, t3PlatformWhitelist } from '../../../shared/erc3643Schema';
import { sql, eq, desc } from 'drizzle-orm';

function getProvider() {
  const rpcUrl = process.env.ALCHEMY_API_KEY
    ? `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    : 'https://arb1.arbitrum.io/rpc';
  return new ethers.JsonRpcProvider(rpcUrl);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const provider = getProvider();

    const token = new ethers.Contract(ERC3643_CONTRACTS.AXUSD_TOKEN, AXUSD_3643_ABI, provider);
    const registry = new ethers.Contract(ERC3643_CONTRACTS.IDENTITY_REGISTRY, IDENTITY_REGISTRY_ABI, provider);
    const compliance = new ethers.Contract(ERC3643_CONTRACTS.MODULAR_COMPLIANCE, MODULAR_COMPLIANCE_ABI, provider);
    const lpm = new ethers.Contract(ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE, LENDING_PLATFORM_MODULE_ABI, provider);

    const [
      name,
      symbol,
      decimals,
      totalSupply,
      tokenBound,
      modules,
      identityRegistryAddr,
      complianceAddr,
    ] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      compliance.getTokenBound(),
      compliance.getModules(),
      token.identityRegistry(),
      token.compliance(),
    ]);

    const moduleDetails = modules.map((addr: string) => {
      if (addr.toLowerCase() === ERC3643_CONTRACTS.COUNTRY_ALLOW_MODULE.toLowerCase()) return { address: addr, name: 'Country Allow', type: 'CountryAllowModule' };
      if (addr.toLowerCase() === ERC3643_CONTRACTS.MAX_BALANCE_MODULE.toLowerCase()) return { address: addr, name: 'Max Balance', type: 'MaxBalanceModule' };
      if (addr.toLowerCase() === ERC3643_CONTRACTS.TRANSFER_LIMIT_MODULE.toLowerCase()) return { address: addr, name: 'Transfer Limit', type: 'TransferLimitModule' };
      if (addr.toLowerCase() === ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE.toLowerCase()) return { address: addr, name: 'Lending Platform', type: 'LendingPlatformModule' };
      return { address: addr, name: 'Unknown', type: 'unknown' };
    });

    const [identityCount, complianceEventCount, platforms, recentEvents] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(t3Identities),
      db.select({ count: sql<number>`count(*)` }).from(t3ComplianceEvents),
      db.select().from(t3PlatformWhitelist).where(eq(t3PlatformWhitelist.active, true)),
      db.select().from(t3ComplianceEvents).orderBy(desc(t3ComplianceEvents.createdAt)).limit(20),
    ]);

    const { wallet: queryWallet } = req.query;
    let walletStatus = null;
    if (queryWallet && typeof queryWallet === 'string' && /^0x[a-fA-F0-9]{40}$/.test(queryWallet)) {
      const [isVerified, hasIdentity, balance, isFrozen, frozenTokens] = await Promise.all([
        registry.isVerified(queryWallet).catch(() => false),
        registry.contains(queryWallet).catch(() => false),
        token.balanceOf(queryWallet),
        token.isFrozen(queryWallet).catch(() => false),
        token.getFrozenTokens(queryWallet).catch(() => 0n),
      ]);

      let identityAddr = null;
      let country = 0;
      if (hasIdentity) {
        [identityAddr, country] = await Promise.all([
          registry.identity(queryWallet),
          registry.investorCountry(queryWallet),
        ]);
      }

      walletStatus = {
        wallet: queryWallet,
        isVerified,
        hasIdentity,
        identityAddress: identityAddr,
        country: Number(country),
        balance: ethers.formatEther(balance),
        isFrozen,
        frozenTokens: ethers.formatEther(frozenTokens),
      };
    }

    return res.status(200).json({
      success: true,
      data: {
        token: {
          name,
          symbol,
          decimals: Number(decimals),
          totalSupply: ethers.formatEther(totalSupply),
          address: ERC3643_CONTRACTS.AXUSD_TOKEN,
          chainId: ERC3643_CONTRACTS.CHAIN_ID,
          network: ERC3643_CONTRACTS.NETWORK,
        },
        compliance: {
          address: complianceAddr,
          tokenBound,
          modules: moduleDetails,
          moduleCount: modules.length,
        },
        identity: {
          registryAddress: identityRegistryAddr,
          registeredIdentities: Number(identityCount[0]?.count ?? 0),
        },
        platforms: platforms.map(p => ({
          address: p.contractAddress,
          name: p.platformName,
          addedAt: p.addedAt,
        })),
        activity: {
          totalComplianceEvents: Number(complianceEventCount[0]?.count ?? 0),
          recentEvents: recentEvents.map(e => ({
            id: e.id,
            from: e.fromAddress,
            to: e.toAddress,
            amount: e.amount,
            module: e.moduleChecked,
            result: e.result,
            reason: e.reason,
            timestamp: e.createdAt,
          })),
        },
        contracts: {
          token: ERC3643_CONTRACTS.AXUSD_TOKEN,
          identityRegistry: ERC3643_CONTRACTS.IDENTITY_REGISTRY,
          identityRegistryStorage: ERC3643_CONTRACTS.IDENTITY_REGISTRY_STORAGE,
          trustedIssuersRegistry: ERC3643_CONTRACTS.TRUSTED_ISSUERS_REGISTRY,
          claimTopicsRegistry: ERC3643_CONTRACTS.CLAIM_TOPICS_REGISTRY,
          modularCompliance: ERC3643_CONTRACTS.MODULAR_COMPLIANCE,
          claimIssuer: ERC3643_CONTRACTS.CLAIM_ISSUER,
          identityFactory: ERC3643_CONTRACTS.IDENTITY_FACTORY,
          modules: {
            countryAllow: ERC3643_CONTRACTS.COUNTRY_ALLOW_MODULE,
            maxBalance: ERC3643_CONTRACTS.MAX_BALANCE_MODULE,
            transferLimit: ERC3643_CONTRACTS.TRANSFER_LIMIT_MODULE,
            lendingPlatform: ERC3643_CONTRACTS.LENDING_PLATFORM_MODULE,
          },
        },
        walletStatus,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
