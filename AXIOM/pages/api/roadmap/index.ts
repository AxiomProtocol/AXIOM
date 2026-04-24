import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const ROADMAP_FILE = path.join(process.cwd(), 'data', 'roadmap.json');

function readRoadmap() {
  try {
    const data = fs.readFileSync(ROADMAP_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading roadmap:', error);
    return null;
  }
}

function writeRoadmap(data: any) {
  try {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(ROADMAP_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing roadmap:', error);
    return false;
  }
}

function filterPublishedContent(roadmap: any) {
  if (!roadmap || !roadmap.phases) return { ...roadmap, phases: [] };
  
  const publishedPhases = roadmap.phases
    .filter((phase: any) => phase.status === 'Published')
    .map((phase: any) => ({
      ...phase,
      products: phase.products
        .filter((product: any) => product.status === 'Published')
        .sort((a: any, b: any) => a.order - b.order)
    }))
    .sort((a: any, b: any) => a.order - b.order);
  
  return {
    ...roadmap,
    phases: publishedPhases
  };
}

function verifyAdminAccess(req: NextApiRequest): boolean {
  const adminToken = process.env.ADMIN_EDIT_TOKEN;
  const providedToken = req.query.token || req.headers['x-admin-token'];
  if (adminToken && providedToken === adminToken) {
    return true;
  }
  
  const jwtToken = req.cookies.admin_token;
  if (jwtToken) {
    try {
      const secret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.verify(jwtToken, secret) as any;
        if (decoded && decoded.id) {
          return true;
        }
      }
    } catch (e) {
      // Invalid JWT, fall through
    }
  }
  
  return false;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const roadmap = readRoadmap();
    
    if (!roadmap) {
      return res.status(500).json({ error: 'Failed to load roadmap data' });
    }
    
    const isAdmin = req.query.admin === 'true' && verifyAdminAccess(req);
    
    if (isAdmin) {
      return res.json({ success: true, roadmap, isAdmin: true });
    }
    
    const publicRoadmap = filterPublishedContent(roadmap);
    return res.json({ success: true, roadmap: publicRoadmap, isAdmin: false });
  }
  
  if (req.method === 'POST') {
    if (!verifyAdminAccess(req)) {
      return res.status(401).json({ error: 'Admin access required' });
    }
    
    const { roadmap } = req.body;
    
    if (!roadmap) {
      return res.status(400).json({ error: 'Roadmap data required' });
    }
    
    const success = writeRoadmap(roadmap);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to save roadmap' });
    }
    
    return res.json({ success: true, message: 'Roadmap saved successfully' });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
