import type { NextApiRequest, NextApiResponse } from 'next';
import { getUserFromSiweSession } from '../../../../lib/workbook/auth';
import { checkEntitlement } from '../../../../lib/workbook/entitlements';
import { 
  getFamilySearchToken, 
  searchHistoricalRecords, 
  searchRecordCollections,
  isConfigured 
} from '../../../../lib/workbook/familysearch';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await getUserFromSiweSession(req);
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const entitlement = await checkEntitlement(userId);
  if (!entitlement.hasAccess) {
    return res.status(403).json({ error: 'Subscription required' });
  }

  if (!isConfigured()) {
    return res.status(503).json({ 
      error: 'FamilySearch integration not configured',
      configured: false
    });
  }

  const token = await getFamilySearchToken(userId);
  if (!token) {
    return res.status(401).json({ 
      error: 'FamilySearch not connected',
      needsConnection: true
    });
  }

  try {
    const { 
      givenName, 
      surname, 
      birthPlace, 
      birthDateFrom, 
      birthDateTo,
      deathPlace,
      residence,
      searchType = 'records'
    } = req.body;

    const params = {
      givenName,
      surname,
      birthPlace,
      birthDateFrom: birthDateFrom ? parseInt(birthDateFrom) : undefined,
      birthDateTo: birthDateTo ? parseInt(birthDateTo) : undefined,
      deathPlace,
      residence,
      count: 25,
    };

    let results;
    if (searchType === 'tree') {
      results = await searchHistoricalRecords(token, params);
    } else {
      results = await searchRecordCollections(token, params);
    }

    return res.status(200).json({
      success: true,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error('FamilySearch search error:', error);
    
    if (error instanceof Error && error.message.includes('expired')) {
      return res.status(401).json({ 
        error: 'FamilySearch session expired',
        needsConnection: true
      });
    }
    
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Search failed' 
    });
  }
}
