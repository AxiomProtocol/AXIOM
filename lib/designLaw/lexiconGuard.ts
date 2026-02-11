const PROHIBITED_TERMS = [
  'wallet',
  'connect wallet',
  'gas',
  'gas fee',
  'smart contract',
  'dapp',
  'dapps',
  'staking',
  'farming',
  'yield farming',
  'liquidity mining',
  'airdrop',
  'token',
  'tokens',
  'mint',
  'minting',
  'burn',
  'burning',
  'swap',
  'slippage',
  'max',
  'trending',
  'hot',
  'moon',
  'mooning',
  'ape',
  'aping',
  'tvl',
  'total value locked',
  'dao',
  'whitepaper',
  'testnet',
  'finality',
  'slashing',
  'bridge',
  'hash',
  'txid',
  'block explorer',
];

export interface LexiconViolation {
  term: string;
  context: string;
}

const EXCLUDED_COMPOUNDS = [
  'bridge loan',
  'bridge financing',
  'hash map',
  'hash table',
  'hash code',
];

export function checkLexicon(text: string): LexiconViolation[] {
  const violations: LexiconViolation[] = [];
  const lowerText = text.toLowerCase();
  
  for (const term of PROHIBITED_TERMS) {
    const regex = new RegExp(`\\b${term.replace(/\s+/g, '\\s+')}\\b`, 'gi');
    let match;
    while ((match = regex.exec(lowerText)) !== null) {
      const matchStart = match.index;
      const surroundingText = lowerText.slice(
        Math.max(0, matchStart - 15),
        Math.min(lowerText.length, matchStart + match[0].length + 15)
      );
      const isExcluded = EXCLUDED_COMPOUNDS.some(compound => surroundingText.includes(compound));
      if (isExcluded) continue;

      const start = Math.max(0, matchStart - 20);
      const end = Math.min(text.length, matchStart + match[0].length + 20);
      violations.push({
        term,
        context: `...${text.slice(start, end)}...`,
      });
    }
  }
  
  return violations;
}

export function isLexiconClean(text: string): boolean {
  return checkLexicon(text).length === 0;
}

export const APPROVED_REPLACEMENTS: Record<string, string> = {
  'wallet': 'custody account',
  'connect wallet': 'access platform',
  'gas fee': 'network settlement cost',
  'smart contract': 'automated settlement logic',
  'dapp': 'platform',
  'dao': 'governance council',
  'staking': 'capital deployment',
  'farming': 'incentive program',
  'airdrop': 'distribution event',
  'whitepaper': 'technical prospectus',
  'token': 'digital asset',
  'hash': 'settlement reference ID',
  'txid': 'settlement reference ID',
  'block explorer': 'audit trail',
  'finality': 'settlement confirmation',
  'slashing': 'penalty enforcement',
  'bridge': 'interoperability rail',
  'testnet': 'sandbox environment',
  'swap': 'exchange',
  'slippage': 'execution variance',
  'tvl': 'assets under management',
};
