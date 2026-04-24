/**
 * Operator-only manual re-trigger for the card-deposit drain archive
 * (task #250). Recovery path for when CARD_DEPOSITS_ARCHIVE_EMAIL was
 * unset at drain time. Idempotent via the once-only marker.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { isValidOperatorKey, readOperatorCookie } from '../../../../../../lib/capinfra/operatorAuth';
import { maybeEmitDrainArchiveEmail } from '../../../../../../lib/capinfra/cardDeposits/drainArchive';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const cookieKey = readOperatorCookie(req);
  if (!isValidOperatorKey(cookieKey)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const result = await maybeEmitDrainArchiveEmail();
  return res.status(200).json(result);
}
