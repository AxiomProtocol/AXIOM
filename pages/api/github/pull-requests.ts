import type { NextApiRequest, NextApiResponse } from 'next';
import { Octokit } from '@octokit/rest';

const OWNER = 'AxiomProtocol';
const REPO = 'AXIOM';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN,
    });

    const data = await octokit.paginate(octokit.pulls.list, {
      owner: OWNER,
      repo: REPO,
      state: 'open',
      per_page: 100,
    });

    const pullRequests = data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      url: pr.html_url,
      author: pr.user?.login ?? null,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      draft: pr.draft ?? false,
    }));

    return res.status(200).json({
      success: true,
      count: pullRequests.length,
      pullRequests,
    });
  } catch (err: any) {
    console.error('[github/pull-requests] Error fetching pull requests:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to fetch pull requests' });
  }
}
