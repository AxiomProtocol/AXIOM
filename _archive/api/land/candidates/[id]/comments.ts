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
        `SELECT c.*, 
          (SELECT COUNT(*) FROM land_comments r WHERE r.parent_comment_id = c.id AND r.is_deleted = false) as reply_count
         FROM land_comments c
         WHERE c.land_candidate_id = $1 AND c.is_deleted = false AND c.parent_comment_id IS NULL
         ORDER BY c.created_at DESC`,
        [candidateId]
      );

      const comments = await Promise.all(result.rows.map(async (row) => {
        const replies = await pool.query(
          `SELECT * FROM land_comments WHERE parent_comment_id = $1 AND is_deleted = false ORDER BY created_at ASC`,
          [row.id]
        );

        return {
          id: row.id,
          userAddress: row.user_address,
          userName: row.user_name,
          content: row.content,
          isEdited: row.is_edited,
          upvotes: row.upvotes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          replyCount: parseInt(row.reply_count),
          replies: replies.rows.map(r => ({
            id: r.id,
            userAddress: r.user_address,
            userName: r.user_name,
            content: r.content,
            isEdited: r.is_edited,
            upvotes: r.upvotes,
            createdAt: r.created_at
          }))
        };
      }));

      return res.status(200).json({
        success: true,
        data: comments,
        total: comments.length
      });
    } catch (error) {
      console.error('Comments fetch error:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch comments' });
    }
  }

  if (req.method === 'POST') {
    const { content, userAddress, userName, parentCommentId } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Comment content required' });
    }

    try {
      const result = await pool.query(
        `INSERT INTO land_comments (land_candidate_id, user_address, user_name, content, parent_comment_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [candidateId, userAddress || null, userName || 'Anonymous Member', content.trim(), parentCommentId || null]
      );

      await pool.query(
        `INSERT INTO land_history (land_candidate_id, event_type, event_title, event_description, actor_address, actor_name)
         VALUES ($1, 'comment_added', 'New Discussion Comment', $2, $3, $4)`,
        [candidateId, parentCommentId ? 'Reply added to discussion' : 'New comment added to discussion', userAddress, userName || 'Anonymous Member']
      );

      return res.status(201).json({
        success: true,
        data: {
          id: result.rows[0].id,
          userAddress: result.rows[0].user_address,
          userName: result.rows[0].user_name,
          content: result.rows[0].content,
          createdAt: result.rows[0].created_at,
          upvotes: 0,
          replies: []
        }
      });
    } catch (error) {
      console.error('Comment create error:', error);
      return res.status(500).json({ success: false, error: 'Failed to create comment' });
    }
  }

  if (req.method === 'PATCH') {
    const { commentId, content, action } = req.body;

    if (!commentId) {
      return res.status(400).json({ success: false, error: 'Comment ID required' });
    }

    try {
      if (action === 'upvote') {
        await pool.query(
          'UPDATE land_comments SET upvotes = upvotes + 1 WHERE id = $1',
          [commentId]
        );
        return res.status(200).json({ success: true, message: 'Upvoted' });
      }

      if (content) {
        await pool.query(
          'UPDATE land_comments SET content = $1, is_edited = true, updated_at = NOW() WHERE id = $2',
          [content.trim(), commentId]
        );
        return res.status(200).json({ success: true, message: 'Comment updated' });
      }

      return res.status(400).json({ success: false, error: 'No valid action specified' });
    } catch (error) {
      console.error('Comment update error:', error);
      return res.status(500).json({ success: false, error: 'Failed to update comment' });
    }
  }

  if (req.method === 'DELETE') {
    const { commentId } = req.body;

    if (!commentId) {
      return res.status(400).json({ success: false, error: 'Comment ID required' });
    }

    try {
      await pool.query(
        'UPDATE land_comments SET is_deleted = true, updated_at = NOW() WHERE id = $1',
        [commentId]
      );

      return res.status(200).json({ success: true, message: 'Comment deleted' });
    } catch (error) {
      console.error('Comment delete error:', error);
      return res.status(500).json({ success: false, error: 'Failed to delete comment' });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
