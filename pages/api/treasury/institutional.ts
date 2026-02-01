import type { NextApiRequest, NextApiResponse } from 'next';
import { institutionalTreasuryService, TREASURY_PRODUCTS } from '../../../server/services/treasury/InstitutionalTreasuryService';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    const { action, product, address } = req.query;

    try {
      if (action === 'products') {
        const products = await institutionalTreasuryService.getAllProducts();
        return res.status(200).json({
          success: true,
          data: products
        });
      }

      if (action === 'product' && product) {
        const productKey = product as keyof typeof TREASURY_PRODUCTS;
        if (!TREASURY_PRODUCTS[productKey]) {
          return res.status(400).json({
            success: false,
            error: `Invalid product. Valid: ${Object.keys(TREASURY_PRODUCTS).join(', ')}`
          });
        }
        const info = await institutionalTreasuryService.getProductInfo(productKey);
        return res.status(200).json({
          success: true,
          data: info
        });
      }

      if (action === 'balance' && product && address) {
        const productKey = product as keyof typeof TREASURY_PRODUCTS;
        if (!TREASURY_PRODUCTS[productKey]) {
          return res.status(400).json({
            success: false,
            error: `Invalid product. Valid: ${Object.keys(TREASURY_PRODUCTS).join(', ')}`
          });
        }
        const balance = await institutionalTreasuryService.getBalance(
          productKey,
          address as string
        );
        return res.status(200).json({
          success: true,
          data: balance
        });
      }

      if (action === 'allocation' && address) {
        const allocation = await institutionalTreasuryService.getTreasuryAllocation(
          address as string
        );
        return res.status(200).json({
          success: true,
          data: allocation
        });
      }

      if (action === 'market') {
        const overview = await institutionalTreasuryService.getMarketOverview();
        return res.status(200).json({
          success: true,
          data: overview
        });
      }

      if (action === 'status') {
        const status = institutionalTreasuryService.getIntegrationStatus();
        return res.status(200).json({
          success: true,
          data: status
        });
      }

      const overview = await institutionalTreasuryService.getMarketOverview();
      const status = institutionalTreasuryService.getIntegrationStatus();
      
      return res.status(200).json({
        success: true,
        data: {
          overview,
          integrationStatus: status,
          availableActions: [
            'GET ?action=products - List all treasury products',
            'GET ?action=product&product=BUIDL - Get specific product info',
            'GET ?action=balance&product=USDY&address=0x... - Check balance',
            'GET ?action=allocation&address=0x... - Get treasury allocation',
            'GET ?action=market - Get market overview',
            'GET ?action=status - Get integration status'
          ]
        }
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
