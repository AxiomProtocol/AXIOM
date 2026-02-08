import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  const candidateId = parseInt(id as string);

  if (isNaN(candidateId)) {
    return res.status(400).json({ success: false, error: 'Invalid candidate ID' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        `SELECT * FROM land_history 
         WHERE land_candidate_id = $1 
         ORDER BY created_at DESC`,
        [candidateId]
      );

      const events = result.rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        eventTitle: row.event_title,
        eventDescription: row.event_description,
        oldValue: row.old_value,
        newValue: row.new_value,
        actorAddress: row.actor_address,
        actorName: row.actor_name,
        metadata: row.metadata,
        createdAt: row.created_at
      }));

      const eventTypeIcons: Record<string, string> = {
        stage_change: '📋',
        checklist_generated: '✅',
        checklist_item_completed: '☑️',
        comment_added: '💬',
        document_uploaded: '📄',
        proposal_created: '🗳️',
        property_created: '🏠',
        property_updated: '✏️',
        notification_sent: '🔔'
      };

      return res.status(200).json({
        success: true,
        data: events.map(e => ({
          ...e,
          icon: eventTypeIcons[e.eventType] || '📌'
        })),
        total: events.length
      });
    } catch (error) {
      console.error('History fetch error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
  }

  if (req.method === 'POST') {
    const { eventType, eventTitle, eventDescription, oldValue, newValue, actorAddress, actorName, metadata } = req.body;

    if (!eventType || !eventTitle) {
      return res.status(400).json({ success: false, error: 'Event type and title required' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO land_history (land_candidate_id, event_type, event_title, event_description, old_value, new_value, actor_address, actor_name, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [candidateId, eventType, eventTitle, eventDescription, oldValue, newValue, actorAddress, actorName, metadata ? JSON.stringify(metadata) : null]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('History add error:', error);
      return res.status(500).json({ success: false, error: 'Failed to add history event' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
