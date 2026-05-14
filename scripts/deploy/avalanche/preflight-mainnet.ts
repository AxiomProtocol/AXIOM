import { ethers } from 'ethers';
const RPC = process.env.AVALANCHE_MAINNET_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc';
const ADDRS = {
  AxiomStable3643:        '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
  IdentityRegistry:       '0x75ed20d260292D869f9Ec4F035Db4B93072D7963',
  ModularCompliance:      '0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66',
  CountryAllowModule:     '0xe15Cf94D324cc8882015ed71C39F002e3709ec54',
  TransferLimitModule:    '0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc',
  TrustedIssuersRegistry: '0x0dF7D62f7Eda24798f6840D5B10E453de097D324',
  ClaimTopicsRegistry:    '0x207BE0EE444c82AC4252284a04e6D9101Dfa570c',
};
const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
const MINTER_ROLE   = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
const DEFAULT_ADMIN = ethers.ZeroHash;
const TOKEN_ABI = [
  'function totalSupply() view returns (uint256)',
  'function paused() view returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function hasRole(bytes32,address) view returns (bool)',
];
const IR_ABI = [
  'function isVerified(address) view returns (bool)',
  'function isAgent(address) view returns (bool)',
  'function contains(address) view returns (bool)',
  'function identity(address) view returns (address)',
];
const CAM_ABI = ['function isCountryAllowed(address,uint16) view returns (bool)'];
const TLM_ABI = ['function getTransferLimit(address) view returns (uint256)'];
const CTR_ABI = ['function getClaimTopics() view returns (uint256[])'];
const TIR_ABI = ['function getTrustedIssuers() view returns (address[])'];
async function main() {
  const p = new ethers.JsonRpcProvider(RPC);
  const { chainId } = await p.getNetwork();
  const block = await p.getBlockNumber();
  const token = new ethers.Contract(ADDRS.AxiomStable3643, TOKEN_ABI, p);
  const ir    = new ethers.Contract(ADDRS.IdentityRegistry, IR_ABI, p);
  const cam   = new ethers.Contract(ADDRS.CountryAllowModule, CAM_ABI, p);
  const tlm   = new ethers.Contract(ADDRS.TransferLimitModule, TLM_ABI, p);
  const ctr   = new ethers.Contract(ADDRS.ClaimTopicsRegistry, CTR_ABI, p);
  const tir   = new ethers.Contract(ADDRS.TrustedIssuersRegistry, TIR_ABI, p);
  const [supply, paused, decimals, minterOk, adminOk, agentOk,
         us840, uk826, limit, topics, issuers,
         deployerBalance, deployerVerified, deployerInIR] = await Promise.all([
    token.totalSupply(), token.paused(), token.decimals(),
    token.hasRole(MINTER_ROLE, DEPLOYER),
    token.hasRole(DEFAULT_ADMIN, DEPLOYER),
    ir.isAgent(DEPLOYER),
    cam.isCountryAllowed(ADDRS.ModularCompliance, 840),
    cam.isCountryAllowed(ADDRS.ModularCompliance, 826),
    tlm.getTransferLimit(ADDRS.ModularCompliance),
    ctr.getClaimTopics(),
    tir.getTrustedIssuers(),
    token.balanceOf(DEPLOYER),
    ir.isVerified(DEPLOYER),
    ir.contains(DEPLOYER),
  ]);
  const identityAddr = deployerInIR ? await ir.identity(DEPLOYER) : ethers.ZeroAddress;
  console.log('CHAIN_ID='     + chainId.toString());
  console.log('BLOCK='        + block);
  console.log('TOTAL_SUPPLY=' + (Number(supply)/1e6).toFixed(6) + ' AXUSD');
  console.log('PAUSED='       + paused);
  console.log('DECIMALS='     + decimals.toString());
  console.log('MINTER_ROLE='  + minterOk);
  console.log('ADMIN_ROLE='   + adminOk);
  console.log('IR_AGENT='     + agentOk);
  console.log('G02_US_840='   + us840);
  console.log('G02_UK_826='   + uk826 + ' (must be false)');
  console.log('G07_LIMIT='    + (Number(limit)/1e6).toFixed(6) + ' AXUSD/day');
  console.log('CLAIM_TOPICS=' + JSON.stringify(topics.map((t:bigint)=>t.toString())));
  console.log('TRUSTED_ISSUERS_COUNT=' + issuers.length);
  console.log('DEPLOYER_IN_IR='       + deployerInIR);
  console.log('DEPLOYER_VERIFIED='    + deployerVerified);
  console.log('DEPLOYER_IDENTITY='    + identityAddr);
  console.log('DEPLOYER_BALANCE='     + (Number(deployerBalance)/1e6).toFixed(6) + ' AXUSD');
}
main().catch(e => { console.error('ERR:' + e.message); process.exit(1); });
