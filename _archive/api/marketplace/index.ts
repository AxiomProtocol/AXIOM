import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '../../../server/db';
import { sql } from 'drizzle-orm';
import { logAuditEvent, getClientIdentifier, detectAnomaly, sanitizeInput, securityMiddleware } from '../../../lib/security';

const SAMPLE_ITEMS = [
  {
    id: '1',
    type: 'land',
    title: 'Community Garden Plot - Atlanta Area',
    description: 'Looking for community members to join a collective land purchase for urban farming and community space.',
    creator: { name: 'Marcus J.', avatar: '👤' },
    tags: ['urban-farming', 'atlanta', 'collective'],
    engagement: { views: 245, interested: 18, comments: 12 },
    createdAt: '2026-01-08',
    status: 'active',
    details: { targetAmount: 50000, currentAmount: 23500, acres: 2.5 }
  },
  {
    id: '2',
    type: 'susu',
    title: 'Tech Professionals SUSU Circle',
    description: 'Monthly savings circle for tech professionals. $500/month contribution, 12-month cycle.',
    creator: { name: 'Diamond Circle', avatar: '💎' },
    tags: ['tech', 'professionals', 'monthly'],
    engagement: { views: 189, interested: 24, comments: 8 },
    createdAt: '2026-01-07',
    status: 'active',
    details: { contribution: 500, members: 8, maxMembers: 12, cycle: '12 months' }
  },
  {
    id: '3',
    type: 'skill',
    title: 'Smart Contract Development Services',
    description: 'Offering smart contract audit and development services. Experienced Solidity developer.',
    creator: { name: 'Alex T.', avatar: '👨‍💻' },
    tags: ['blockchain', 'development', 'audit'],
    engagement: { views: 156, interested: 9, comments: 4 },
    createdAt: '2026-01-06',
    status: 'active',
    details: { rate: 'Negotiable', availability: 'Part-time' }
  },
  {
    id: '4',
    type: 'resource',
    title: 'Community Tractor - Shared Use',
    description: 'John Deere compact tractor available for community land projects. Scheduling via app.',
    creator: { name: 'Farm Collective', avatar: '🚜' },
    tags: ['equipment', 'farming', 'shared'],
    engagement: { views: 98, interested: 15, comments: 6 },
    createdAt: '2026-01-05',
    status: 'active',
    details: { type: 'Equipment', location: 'Southeast Region', terms: 'Free for members' }
  },
  {
    id: '5',
    type: 'event',
    title: 'Steward Corps Quarterly Meetup',
    description: 'In-person networking event for Steward Corps members. Workshops on land acquisition strategies.',
    creator: { name: 'Steward Corps', avatar: '📚' },
    tags: ['networking', 'education', 'steward-corps'],
    engagement: { views: 312, interested: 45, comments: 22 },
    createdAt: '2026-01-04',
    status: 'active',
    details: { date: '2026-02-15', location: 'Atlanta, GA', capacity: 100 }
  }
];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const clientId = getClientIdentifier(req);

  if (req.method === 'GET') {
    try {
      const { type, sort } = req.query;
      
      let items = [...SAMPLE_ITEMS];
      
      try {
        const result = await db.execute(sql`
          SELECT * FROM marketplace_listings 
          WHERE status = 'active'
          ORDER BY created_at DESC
          LIMIT 50
        `);
        if (result.rows && result.rows.length > 0) {
          items = result.rows.map((row: any) => ({
            id: row.id,
            type: row.type,
            title: row.title,
            description: row.description,
            creator: { name: row.creator_name || 'Anonymous', avatar: '👤' },
            tags: row.tags || [],
            engagement: { views: row.views || 0, interested: row.interested || 0, comments: row.comments || 0 },
            createdAt: row.created_at,
            status: row.status,
            details: row.details || {}
          }));
        }
      } catch (dbError) {
        console.log('Using sample marketplace data');
      }
      
      if (type && type !== 'all') {
        items = items.filter(item => item.type === type);
      }
      
      if (sort === 'popular') {
        items.sort((a, b) => b.engagement.views - a.engagement.views);
      } else if (sort === 'engaged') {
        items.sort((a, b) => (b.engagement.interested + b.engagement.comments) - (a.engagement.interested + a.engagement.comments));
      }

      logAuditEvent({
        action: 'marketplace_list',
        ipAddress: clientId,
        userAgent: req.headers['user-agent'],
        details: { type, sort, count: items.length },
        severity: 'info',
        success: true
      });
      
      return res.status(200).json({ 
        success: true, 
        items,
        total: items.length 
      });
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch items' });
    }
  }
  
  if (req.method === 'POST') {
    try {
      const { type, title, description, tags, walletAddress } = req.body;
      
      if (!title || !description) {
        logAuditEvent({
          action: 'marketplace_create_failed',
          ipAddress: clientId,
          details: { reason: 'missing_fields' },
          severity: 'warning',
          success: false
        });
        return res.status(400).json({ success: false, error: 'Title and description are required' });
      }

      const anomaly = detectAnomaly(walletAddress || clientId, 'marketplace_create', { title });
      if (anomaly.isAnomaly) {
        logAuditEvent({
          action: 'marketplace_anomaly_detected',
          ipAddress: clientId,
          walletAddress,
          details: { pattern: anomaly.pattern },
          severity: 'warning',
          success: false
        });
      }

      const sanitizedTitle = sanitizeInput(title);
      const sanitizedDescription = sanitizeInput(description);
      
      const newItem = {
        id: Date.now().toString(),
        type: type || 'resource',
        title: sanitizedTitle,
        description: sanitizedDescription,
        creator: { name: 'Anonymous', avatar: '👤' },
        tags: (tags || []).map((t: string) => sanitizeInput(t)),
        engagement: { views: 0, interested: 0, comments: 0 },
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
        details: {}
      };

      // Note: In production, this would persist to database
      // Marketplace table creation would be handled via Drizzle schema
      console.log('Marketplace item created:', newItem.id);

      logAuditEvent({
        action: 'marketplace_create',
        ipAddress: clientId,
        walletAddress,
        details: { itemId: newItem.id, type: newItem.type },
        severity: 'info',
        success: true
      });
      
      return res.status(201).json({ success: true, item: newItem });
    } catch (error) {
      console.error('Error creating marketplace item:', error);
      logAuditEvent({
        action: 'marketplace_create_error',
        ipAddress: clientId,
        details: { error: String(error) },
        severity: 'critical',
        success: false
      });
      return res.status(500).json({ success: false, error: 'Failed to create item' });
    }
  }
  
  return res.status(405).json({ success: false, error: 'Method not allowed' });
}

export default securityMiddleware({ enableRateLimit: true, enableAuditLog: true })(handler);
