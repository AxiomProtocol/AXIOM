/**
 * Bridge allow-list proposal comments — list (public) + post (public,
 * rate-limited by IP via NextApiRequest headers).
 *
 *   GET ?proposalId=<id>  → all comments on that proposal.
 *   POST { proposalId, commenter, body } → adds a comment.
 *
 * Public posting: any visitor can comment. Validation is enforced by
 * the service. There is no spam protection in this Phase 1; if the
 * comment volume warrants, a captcha can be added.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { addComment, listComments } from '../../../../lib/capinfra/bridgeAllowlist/service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    const proposalId = (req.query.proposalId as string | undefined)?.trim();
    if (!proposalId) return res.status(400).json({ ok: false, error: 'proposalId required' });
    try {
      const items = await listComments(proposalId);
      return res.status(200).json({ ok: true, items });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as {
      proposalId?: string;
      commenter?: string;
      body?: string;
    };
    if (!body.proposalId || !body.commenter || !body.body) {
      return res.status(400).json({ ok: false, error: 'proposalId, commenter, body are required' });
    }
    try {
      const comment = await addComment({
        proposalId: body.proposalId,
        commenter: body.commenter,
        body: body.body,
      });
      return res.status(201).json({ ok: true, comment });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'unknown' });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
}
