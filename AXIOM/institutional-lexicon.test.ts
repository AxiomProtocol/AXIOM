import * as fs from 'fs';
import * as path from 'path';

const TARGET_DIRS = [
  path.join(__dirname, 'pages'),
  path.join(__dirname, 'components'),
  path.join(__dirname, 'public'),
  __dirname, // Root directory for markdown files
];

const EXCLUDED_FILES = [
  'lexicon.test.ts',
  'institutional-lexicon.test.ts',
  'README.md', // Often contains technical terms for developers
];

const FILE_EXTENSIONS = ['.tsx', '.ts', '.js', '.jsx', '.md', '.mdx'];

const LEXICON_MAP = {
  'smart contract': 'automated control layer',
  'smart contracts': 'automated control layers',
  'multi-sig': 'multi-party authorization',
  multisig: 'multi-party authorization',
  wallet: 'account',
  'connect wallet': 'connect account',
  gas: 'network fee',
  dapp: 'application',
  token: 'instrument',
  staking: 'capital lock',
  'yield farming': 'liquidity incentives',
  farming: 'liquidity incentives',
  airdrop: 'distribution',
  mint: 'issue',
  burn: 'retire',
  swap: 'exchange',
  slippage: 'execution variance',
  'decentralized finance': 'on-chain markets',
  defi: 'on-chain markets',
  blockchain: 'settlement network',
};

const TERMS_TO_FLAG = [
  'staking', // Flag because 'capital lock' is only for a specific user action
  'farming',
  'yield farming',
  'airdrop',
  'mint', // Flag if technical
  'burn', // Flag if technical
  'slippage', // Flag if it's a trading interface term
  'contract', // Flag to check if it's protocol logic vs. legal
];

const PROHIBITED_UI_TERMS = [
  'wallet', 'connect wallet', 'gas', 'smart contract', 'dapp',
  'staking', 'farming', 'airdrop', 'token', 'mint', 'burn', 'swap',
  'slippage', 'max', 'trending', 'hot', 'moon', 'ape', 'yield farming',
  'guaranteed', 'winning trades', 'solo developer', 'gemini', 'replit',
  'chatgpt', 'ai coding', 'ai-built'
];


interface Occurrence {
  term: string;
  file: string;
  line: number;
}

function findOccurrences(dir: string, allOccurrences: Occurrence[] = []): Occurrence[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        findOccurrences(fullPath, allOccurrences);
      }
    } else if (FILE_EXTENSIONS.includes(path.extname(entry.name)) && !EXCLUDED_FILES.includes(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((lineContent, lineIndex) => {
        for (const term of Object.keys(LEXICON_MAP)) {
          if (lineContent.toLowerCase().includes(term)) {
            allOccurrences.push({ term, file: fullPath, line: lineIndex + 1 });
          }
        }
      });
    }
  }
  return allOccurrences;
}

describe('Institutional Lexicon Scan', () => {
  it('should identify all occurrences of crypto-native terms', () => {
    const allOccurrences: Occurrence[] = [];
    TARGET_DIRS.forEach(dir => findOccurrences(dir, allOccurrences));
    
    console.log("--- LEXICON SCAN: BEFORE REFACTOR ---");
    console.log(JSON.stringify(allOccurrences, null, 2));
    expect(allOccurrences.length).toBeGreaterThan(0);
  });
});