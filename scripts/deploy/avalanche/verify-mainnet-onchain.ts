import { ethers, keccak256 } from 'ethers';

const MAINNET_RPC = process.env.AVALANCHE_MAINNET_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc';
const FUJI_RPC    = process.env.AVALANCHE_FUJI_RPC_URL ?? process.env.AVALANCHE_RPC_URL ?? 'https://api.avax-test.network/ext/bc/C/rpc';

const ADDRS: Record<string, string> = {
  IdentityRegistryStorage: '0xB66e7Ed8e0b9A1cE5928b5E562c44413d385e215',
  TrustedIssuersRegistry:  '0x0dF7D62f7Eda24798f6840D5B10E453de097D324',
  ClaimTopicsRegistry:     '0x207BE0EE444c82AC4252284a04e6D9101Dfa570c',
  IdentityRegistry:        '0x75ed20d260292D869f9Ec4F035Db4B93072D7963',
  ModularCompliance:       '0x67F6d464F66BFa988FC8a03Ae3711EDaD582CF66',
  CountryAllowModule:      '0xe15Cf94D324cc8882015ed71C39F002e3709ec54',
  TransferLimitModule:     '0x8D550a2ff71b7b92E98377452A34D3cE56B687Bc',
  AxiomStable3643:         '0x5Cd7c15C32e0630239eDE74241Ad65f3302BcAF8',
};

const TOKEN_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function paused() view returns (bool)',
  'function identityRegistry() view returns (address)',
  'function compliance() view returns (address)',
];
const IR_ABI = [
  'function issuersRegistry() view returns (address)',
  'function topicsRegistry() view returns (address)',
  'function identityStorage() view returns (address)',
  'function isAgent(address) view returns (bool)',
];
const MC_ABI = [
  'function getTokenBound() view returns (address)',
  'function isModuleBound(address) view returns (bool)',
];
const CAM_ABI = [
  'function isCountryAllowed(address, uint16) view returns (bool)',
  'function isComplianceBound(address) view returns (bool)',
];
const TLM_ABI = [
  'function getTransferLimit(address) view returns (uint256)',
  'function isComplianceBound(address) view returns (bool)',
];

async function main() {
  const mainnet = new ethers.JsonRpcProvider(MAINNET_RPC);
  const fuji    = new ethers.JsonRpcProvider(FUJI_RPC);

  const [mainnetNet, fujiNet] = await Promise.all([mainnet.getNetwork(), fuji.getNetwork()]);
  const mainnetBlock = await mainnet.getBlockNumber();
  const DEPLOY_BLOCK = 85375788;

  console.log('CHAIN_ID_MAINNET=' + mainnetNet.chainId.toString());
  console.log('CHAIN_ID_FUJI='    + fujiNet.chainId.toString());
  console.log('CURRENT_BLOCK='    + mainnetBlock);
  console.log('DEPLOY_BLOCK='     + DEPLOY_BLOCK);
  console.log('BLOCKS_SINCE_DEPLOY=' + (mainnetBlock - DEPLOY_BLOCK));

  // Phase B — bytecode
  console.log('\n--- BYTECODE ---');
  for (const [name, addr] of Object.entries(ADDRS)) {
    const [mCode, fCode] = await Promise.all([mainnet.getCode(addr), fuji.getCode(addr)]);
    const hasM = mCode !== '0x' && mCode.length > 2;
    const hasF = fCode !== '0x' && fCode.length > 2;
    const lenBytes = hasM ? Math.floor((mCode.length - 2) / 2) : 0;
    const hashShort = hasM ? keccak256(ethers.getBytes(mCode)).slice(0, 18) : 'N/A';
    const codesMatch = hasM && hasF && mCode === fCode;
    console.log(`BYTECODE|${name}|mainnet=${hasM}|fuji=${hasF}|bytes=${lenBytes}|hash=${hashShort}|match=${codesMatch}`);
  }

  // Phase C — wiring
  console.log('\n--- WIRING ---');
  const DEPLOYER = '0x8d7892CF226B43d48B6e3ce988A1274e6D114C96';
  const MC_ADDR  = ADDRS.ModularCompliance;

  const token = new ethers.Contract(ADDRS.AxiomStable3643,    TOKEN_ABI, mainnet);
  const ir    = new ethers.Contract(ADDRS.IdentityRegistry,   IR_ABI,    mainnet);
  const mc    = new ethers.Contract(MC_ADDR,                   MC_ABI,    mainnet);
  const cam   = new ethers.Contract(ADDRS.CountryAllowModule,  CAM_ABI,   mainnet);
  const tlm   = new ethers.Contract(ADDRS.TransferLimitModule, TLM_ABI,   mainnet);

  const [
    tName, tSymbol, tDecimals, tSupply, tPaused, tIR, tMC,
    irTIR, irCTR, irIRS, deployerAgent,
    mcToken, camAttached, tlmAttached,
    countryUS, countryUK, countryDE,
    transferLimit,
    [mainnetNonce, fujiNonce],
  ] = await Promise.all([
    token.name(), token.symbol(), token.decimals(), token.totalSupply(), token.paused(),
    token.identityRegistry(), token.compliance(),
    ir.issuersRegistry(), ir.topicsRegistry(), ir.identityStorage(), ir.isAgent(DEPLOYER),
    mc.getTokenBound(), mc.isModuleBound(ADDRS.CountryAllowModule), mc.isModuleBound(ADDRS.TransferLimitModule),
    cam.isCountryAllowed(MC_ADDR, 840), cam.isCountryAllowed(MC_ADDR, 826), cam.isCountryAllowed(MC_ADDR, 276),
    tlm.getTransferLimit(MC_ADDR),
    Promise.all([mainnet.getTransactionCount(DEPLOYER), fuji.getTransactionCount(DEPLOYER)]),
  ]);

  const limitNorm = Number(transferLimit) / 1_000_000;

  console.log('TOKEN_NAME='     + tName);
  console.log('TOKEN_SYMBOL='   + tSymbol);
  console.log('TOKEN_DECIMALS=' + tDecimals.toString());
  console.log('TOTAL_SUPPLY='   + tSupply.toString());
  console.log('PAUSED='         + tPaused);
  console.log('TOKEN_IR_OK='    + (tIR.toLowerCase() === ADDRS.IdentityRegistry.toLowerCase()));
  console.log('TOKEN_MC_OK='    + (tMC.toLowerCase() === MC_ADDR.toLowerCase()));
  console.log('IR_TIR_OK='      + (irTIR.toLowerCase() === ADDRS.TrustedIssuersRegistry.toLowerCase()));
  console.log('IR_CTR_OK='      + (irCTR.toLowerCase() === ADDRS.ClaimTopicsRegistry.toLowerCase()));
  console.log('IR_IRS_OK='      + (irIRS.toLowerCase() === ADDRS.IdentityRegistryStorage.toLowerCase()));
  console.log('DEPLOYER_AGENT=' + deployerAgent);
  console.log('MC_TOKEN_OK='    + (mcToken.toLowerCase() === ADDRS.AxiomStable3643.toLowerCase()));
  console.log('CAM_ATTACHED='   + camAttached);
  console.log('TLM_ATTACHED='   + tlmAttached);
  console.log('G02_US_840='     + countryUS);
  console.log('G02_UK_826='     + countryUK + '  (must be false)');
  console.log('G02_DE_276='     + countryDE + '  (must be false)');
  console.log('G07_LIMIT_RAW='  + transferLimit.toString());
  console.log('G07_LIMIT_AXUSD='+ limitNorm.toFixed(6));
  console.log('G07_CORRECT='    + (limitNorm === 5000));
  console.log('NONCE_MAINNET='  + mainnetNonce);
  console.log('NONCE_FUJI='     + fujiNonce);
  console.log('NONCE_EQUAL_AT_DEPLOY=' + (mainnetNonce === fujiNonce ? 'LIKELY — explains identical addresses' : 'DIFFERENT — review address derivation'));
}

main().catch(e => { console.error('VERIFY_ERROR: ' + e.message); process.exit(1); });
