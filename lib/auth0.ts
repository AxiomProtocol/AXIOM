import { getSession } from '@auth0/nextjs-auth0';
import type { NextApiRequest, NextApiResponse } from 'next';

export async function getAuth0Session(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  return session ?? null;
}
