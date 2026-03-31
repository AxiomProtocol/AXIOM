import type { NextApiRequest, NextApiResponse } from 'next';
import registerHandler from './register';

// Alias for /api/banking/participant/register — canonical onboarding endpoint
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  return registerHandler(req, res);
}
