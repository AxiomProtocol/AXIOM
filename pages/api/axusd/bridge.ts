import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../server/db';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { wallet, routeId } = req.query;

    try {
      const routesResult = await pool.query(
        'SELECT * FROM axusd_bridge_routes WHERE is_active = true'
      );

      const routes = routesResult.rows;

      const routesWithDetails = routes.map((route: any) => ({
        id: route.id,
        name: route.name,
        source: {
          chain: route.source_chain,
          chainId: route.source_chain_id
        },
        destination: {
          chain: route.dest_chain,
          chainId: route.dest_chain_id
        },
        provider: route.bridge_provider,
        bridgeContract: route.bridge_contract,
        limits: {
          min: route.min_amount,
          max: route.max_amount
        },
        fees: {
          percent: route.fee_percent,
          flat: route.flat_fee
        },
        estimatedTime: route.estimated_time_minutes,
        isActive: route.is_active
      }));

      let transactions = null;
      if (wallet && typeof wallet === 'string') {
        const txResult = await pool.query(
          `SELECT * FROM axusd_bridge_transactions 
           WHERE wallet_address = $1 
           ORDER BY initiated_at DESC 
           LIMIT 20`,
          [wallet.toLowerCase()]
        );
        transactions = txResult.rows;
      }

      const chainInfo = {
        42161: { name: 'Arbitrum One', logo: '/chains/arbitrum.svg', color: '#28A0F0' },
        1: { name: 'Ethereum', logo: '/chains/ethereum.svg', color: '#627EEA' },
        8453: { name: 'Base', logo: '/chains/base.svg', color: '#0052FF' },
        10: { name: 'Optimism', logo: '/chains/optimism.svg', color: '#FF0420' },
        137: { name: 'Polygon', logo: '/chains/polygon.svg', color: '#8247E5' }
      };

      res.status(200).json({
        success: true,
        data: {
          routes: routesWithDetails,
          userTransactions: transactions,
          supportedChains: chainInfo,
          bridgeProviders: [
            { name: 'LayerZero', description: 'Omnichain interoperability protocol', website: 'https://layerzero.network' },
            { name: 'Axelar', description: 'Cross-chain communication network', website: 'https://axelar.network' },
            { name: 'Wormhole', description: 'Generic message passing protocol', website: 'https://wormhole.com' }
          ],
          info: {
            description: 'Bridge AXUSD between supported chains using trusted bridge providers.',
            warning: 'Bridge transactions are irreversible. Please verify destination addresses carefully.',
            supportedToken: 'AXUSD',
            nativeChain: 'Arbitrum One (42161)'
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('Bridge GET error:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch bridge data', details: error.message });
    }
  } else if (req.method === 'POST') {
    const { routeId, walletAddress, amount, destinationAddress } = req.body;

    if (!routeId || !walletAddress || !amount) {
      return res.status(400).json({ success: false, error: 'routeId, walletAddress, and amount are required' });
    }

    try {
      const routeResult = await pool.query(
        'SELECT * FROM axusd_bridge_routes WHERE id = $1',
        [routeId]
      );

      if (routeResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Bridge route not found' });
      }

      const route = routeResult.rows[0];
      const minAmount = parseFloat(route.min_amount || '0');
      const maxAmount = parseFloat(route.max_amount || '999999999');
      const amountNum = parseFloat(amount);

      if (amountNum < minAmount || amountNum > maxAmount) {
        return res.status(400).json({ 
          success: false, 
          error: `Amount must be between ${minAmount} and ${maxAmount} AXUSD` 
        });
      }

      const feePercent = parseFloat(route.fee_percent || '0');
      const flatFee = parseFloat(route.flat_fee || '0');
      const totalFee = (amountNum * feePercent / 100) + flatFee;

      const txResult = await pool.query(
        `INSERT INTO axusd_bridge_transactions (route_id, wallet_address, amount, fee, status) 
         VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
        [routeId, walletAddress.toLowerCase(), amount.toString(), totalFee.toString()]
      );

      res.status(201).json({
        success: true,
        data: {
          transaction: txResult.rows[0],
          quote: {
            amount: amountNum,
            fee: totalFee.toFixed(4),
            receiveAmount: (amountNum - totalFee).toFixed(4),
            estimatedTime: route.estimated_time_minutes
          },
          nextSteps: [
            'Approve AXUSD spending on source chain',
            'Sign bridge transaction',
            'Wait for confirmation on destination chain'
          ]
        },
        message: 'Bridge transaction initiated'
      });
    } catch (error: any) {
      console.error('Bridge POST error:', error);
      res.status(500).json({ success: false, error: 'Failed to initiate bridge', details: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
