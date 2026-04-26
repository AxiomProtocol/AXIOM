import type { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.NEXT_PUBLIC_ALCHEMY_API_KEY ?? '';
const ALCHEMY_URL = `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

const ERC20_TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const AXIOM_CONTRACTS: Record<string, { name: string; address: string }> = {
  AXAU:  { name: 'AXAU',  address: '0xbcCA4D937d427829914498423aE6E04C846dB0Bb' },
  AXUSD: { name: 'AXUSD', address: '0xD6110F59A978aDa6eF5c0E9D6BaA04455D46Ade7' },
  AXM:   { name: 'AXM',   address: '0x864F9c6f50dC5Bd244F5002F1B0873Cd80e2539D' },
};

async function getLogs(params: {
  address?: string;
  topics?: (string | null)[];
  fromBlock: string;
  toBlock: string;
}) {
  const res = await fetch(ALCHEMY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'eth_getLogs',
      params: [params],
    }),
  });
  if (!res.ok) throw new Error(`Alchemy eth_getLogs error: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message ?? 'eth_getLogs RPC error');
  return json.result as { address: string; topics: string[]; data: string; transactionHash: string; blockNumber: string; logIndex: string }[];
}

function decodeMintRedeem(log: { address: string; topics: string[]; data: string; transactionHash: string; blockNumber: string }) {
  const from = '0x' + log.topics[1]?.slice(26);
  const to   = '0x' + log.topics[2]?.slice(26);
  const rawAmt = log.data !== '0x' ? BigInt(log.data) : 0n;
  const formatted = ethers.formatUnits(rawAmt, 18);
  const isMint    = from.toLowerCase() === ZERO_ADDRESS.toLowerCase();
  const isRedeem  = to.toLowerCase()   === ZERO_ADDRESS.toLowerCase();

  return {
    txHash:    log.transactionHash,
    blockNum:  parseInt(log.blockNumber, 16),
    contract:  log.address,
    from,
    to,
    amount:    formatted,
    rawAmount: rawAmt.toString(),
    type:      isMint ? 'mint' : isRedeem ? 'redeem' : 'transfer',
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const { token = 'AXUSD', fromBlock = '0x0', toBlock = 'latest', eventType } = req.query;

  const tokenKey = typeof token === 'string' ? token.toUpperCase() : 'AXUSD';
  const contractInfo = AXIOM_CONTRACTS[tokenKey];
  if (!contractInfo) {
    return res.status(400).json({ error: `Unknown token. Valid options: ${Object.keys(AXIOM_CONTRACTS).join(', ')}` });
  }

  const fbStr = typeof fromBlock === 'string' ? fromBlock : '0x0';
  const tbStr = typeof toBlock   === 'string' ? toBlock   : 'latest';

  try {
    let topics: (string | null)[] = [ERC20_TRANSFER_TOPIC];

    if (eventType === 'mint') {
      topics = [ERC20_TRANSFER_TOPIC, ethers.zeroPadValue(ZERO_ADDRESS, 32), null];
    } else if (eventType === 'redeem') {
      topics = [ERC20_TRANSFER_TOPIC, null, ethers.zeroPadValue(ZERO_ADDRESS, 32)];
    }

    const logs = await getLogs({
      address: contractInfo.address,
      topics,
      fromBlock: fbStr,
      toBlock: tbStr,
    });

    const events = logs.map(decodeMintRedeem).reverse();

    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(200).json({
      success: true,
      token: tokenKey,
      contract: contractInfo.address,
      eventType: eventType ?? 'all',
      count: events.length,
      events,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    console.error('[api/alchemy/events]', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch events' });
  }
}
