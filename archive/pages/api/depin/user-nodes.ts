import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

const DEPIN_SALES_ADDRESS = '0x876951CaE4Ad48bdBfba547Ef4316Db576A9Edbd';
const ARBITRUM_RPC = 'https://arb1.arbitrum.io/rpc';

const NODE_TIERS = [
  { tierId: 1, name: 'Mobile Light', tier: 'Lite', priceETH: 0.02, icon: '📱' },
  { tierId: 2, name: 'Desktop Standard', tier: 'Standard', priceETH: 0.05, icon: '💻' },
  { tierId: 3, name: 'Desktop Advanced', tier: 'Standard', priceETH: 0.08, icon: '🖥️' },
  { tierId: 4, name: 'Pro Infrastructure', tier: 'Pro', priceETH: 0.15, icon: '🏢' },
  { tierId: 5, name: 'Enterprise Premium', tier: 'Pro', priceETH: 0.25, icon: '🏛️' },
];

const DEPIN_SALES_ABI = [
  "event NodePurchasedWithETH(address indexed buyer, uint256 indexed tierId, uint8 indexed category, uint256 ethPaid, uint256 purchaseId, uint256 timestamp)",
  "event NodePurchasedWithAXM(address indexed buyer, uint256 indexed tierId, uint8 indexed category, uint256 axmPaid, uint256 discountApplied, uint256 purchaseId, uint256 timestamp)"
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;
  
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address is required' });
  }

  try {
    const provider = new ethers.JsonRpcProvider(ARBITRUM_RPC);
    const iface = new ethers.Interface(DEPIN_SALES_ABI);
    
    const ethEventSig = ethers.id("NodePurchasedWithETH(address,uint256,uint8,uint256,uint256,uint256)");
    const axmEventSig = ethers.id("NodePurchasedWithAXM(address,uint256,uint8,uint256,uint256,uint256,uint256)");
    
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = currentBlock - 2000000;

    const paddedAddress = ethers.zeroPadValue(address.toLowerCase(), 32);

    const [ethLogs, axmLogs] = await Promise.all([
      provider.getLogs({
        address: DEPIN_SALES_ADDRESS,
        topics: [ethEventSig, paddedAddress],
        fromBlock: Math.max(fromBlock, 0),
        toBlock: currentBlock
      }),
      provider.getLogs({
        address: DEPIN_SALES_ADDRESS,
        topics: [axmEventSig, paddedAddress],
        fromBlock: Math.max(fromBlock, 0),
        toBlock: currentBlock
      })
    ]);

    const userNodes: any[] = [];

    for (const log of ethLogs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (!parsed) continue;
        
        const tierId = Number(parsed.args[1]);
        const category = Number(parsed.args[2]);
        const ethPaid = parsed.args[3];
        const purchaseId = Number(parsed.args[4]);
        const timestamp = Number(parsed.args[5]);
        
        const nodeInfo = NODE_TIERS.find(t => t.tierId === tierId) || NODE_TIERS[0];
        
        userNodes.push({
          id: purchaseId,
          tierId: tierId,
          nodeType: category,
          nodeName: nodeInfo.name,
          tier: nodeInfo.tier,
          icon: nodeInfo.icon,
          priceETH: ethers.formatEther(ethPaid),
          paymentMethod: 'ETH',
          purchasedAt: new Date(timestamp * 1000).toISOString(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          status: 'active',
          rewards: '0',
          uptime: '99.9%'
        });
      } catch (e) {
        console.error('Error parsing ETH log:', e);
      }
    }

    for (const log of axmLogs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
        if (!parsed) continue;
        
        const tierId = Number(parsed.args[1]);
        const category = Number(parsed.args[2]);
        const axmPaid = parsed.args[3];
        const purchaseId = Number(parsed.args[5]);
        const timestamp = Number(parsed.args[6]);
        
        const nodeInfo = NODE_TIERS.find(t => t.tierId === tierId) || NODE_TIERS[0];
        
        userNodes.push({
          id: purchaseId,
          tierId: tierId,
          nodeType: category,
          nodeName: nodeInfo.name,
          tier: nodeInfo.tier,
          icon: nodeInfo.icon,
          priceAXM: ethers.formatEther(axmPaid),
          paymentMethod: 'AXM',
          purchasedAt: new Date(timestamp * 1000).toISOString(),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          status: 'active',
          rewards: '0',
          uptime: '99.9%'
        });
      } catch (e) {
        console.error('Error parsing AXM log:', e);
      }
    }

    userNodes.sort((a, b) => b.blockNumber - a.blockNumber);

    const formattedNodes = userNodes.map(node => ({
      nodeId: node.id,
      tier: node.tierId - 1,
      nodeType: node.nodeType,
      isActive: node.status === 'active',
      isListed: false,
      nodeName: node.nodeName,
      icon: node.icon,
      purchasedAt: node.purchasedAt,
      transactionHash: node.transactionHash
    }));

    res.status(200).json({
      address,
      nodes: formattedNodes,
      totalNodes: formattedNodes.length
    });

  } catch (error) {
    console.error('Error fetching user nodes:', error);
    res.status(500).json({ error: 'Failed to fetch user nodes' });
  }
}
