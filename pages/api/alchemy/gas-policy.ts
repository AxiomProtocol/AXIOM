import type { NextApiRequest, NextApiResponse } from 'next';

const ALCHEMY_KEY    = process.env.ALCHEMY_API_KEY ?? '';
const ADMIN_KEY      = process.env.ADMIN_SOLVENCY_KEY ?? '';
const GAS_MGMT_BASE  = 'https://manage.g.alchemy.com/api';

const ERC3643_IDENTITY_REGISTRY = '0x' + '0'.repeat(40);

async function createGasPolicy(name: string, maxSpendPerDay: string) {
  const res = await fetch(`${GAS_MGMT_BASE}/gas-manager/policy`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ALCHEMY_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      policyName: name,
      policyType: 'SPONSORSHIP',
      appId: '',
      rules: [
        {
          ruleType: 'CONTRACT_ALLOWLIST',
          contractAddresses: [ERC3643_IDENTITY_REGISTRY],
        },
        {
          ruleType: 'GAS_LIMIT',
          maxGasPerUserOperation: '500000',
          maxGasPerPolicy: maxSpendPerDay,
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gas Manager API error: ${res.status} — ${body}`);
  }
  return res.json();
}

async function listGasPolicies() {
  const res = await fetch(`${GAS_MGMT_BASE}/gas-manager/policy`, {
    headers: { 'Authorization': `Bearer ${ALCHEMY_KEY}` },
  });
  if (!res.ok) throw new Error(`Gas Manager API error: ${res.status}`);
  return res.json();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!ALCHEMY_KEY) return res.status(503).json({ error: 'Alchemy API key not configured' });

  const authHeader = req.headers['x-operator-key'];
  if (!ADMIN_KEY || authHeader !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Operator authentication required' });
  }

  if (req.method === 'GET') {
    try {
      const data = await listGasPolicies();
      return res.status(200).json({ success: true, data });
    } catch (err: unknown) {
      console.error('[api/alchemy/gas-policy GET]', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to list gas policies' });
    }
  }

  if (req.method === 'POST') {
    const { name = 'Axiom Identity Registration', maxSpendPerDay = '1000000' } = req.body ?? {};

    try {
      const data = await createGasPolicy(name, maxSpendPerDay);
      return res.status(201).json({ success: true, policy: data });
    } catch (err: unknown) {
      console.error('[api/alchemy/gas-policy POST]', err);
      return res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to create gas policy' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
