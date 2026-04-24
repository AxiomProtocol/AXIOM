import type { NextApiRequest, NextApiResponse } from 'next';
import { pool } from '../../../../server/db';
import { isAdminWallet } from '../../../../lib/admin/config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const adminWallet = req.headers['x-admin-wallet'] as string;
  if (!isAdminWallet(adminWallet)) {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { status } = req.query;

  try {
    let query = `
      SELECT 
        operator_id,
        wallet_address,
        display_name,
        email,
        role,
        status,
        onboarding_phase,
        total_earnings,
        attestation_count,
        created_at,
        activated_at
      FROM node_operators
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      if (status === 'pending') {
        query += " WHERE status = 'APPLIED'";
      } else if (status === 'active') {
        query += " WHERE status = 'ACTIVE'";
      } else if (status === 'onboarding') {
        query += " WHERE status NOT IN ('APPLIED', 'ACTIVE', 'REJECTED')";
      } else {
        query += ' WHERE status = $1';
        params.push(status);
      }
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    const headers = [
      'Operator ID',
      'Wallet Address',
      'Display Name',
      'Email',
      'Role',
      'Status',
      'Onboarding Phase',
      'Total Earnings',
      'Attestation Count',
      'Created At',
      'Activated At'
    ];

    const csvRows = [headers.join(',')];

    for (const row of result.rows) {
      const values = [
        row.operator_id,
        row.wallet_address,
        `"${(row.display_name || '').replace(/"/g, '""')}"`,
        row.email,
        row.role,
        row.status,
        row.onboarding_phase,
        row.total_earnings || 0,
        row.attestation_count || 0,
        row.created_at ? new Date(row.created_at).toISOString() : '',
        row.activated_at ? new Date(row.activated_at).toISOString() : ''
      ];
      csvRows.push(values.join(','));
    }

    const csv = csvRows.join('\n');
    const filename = `operators-${status || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error: any) {
    console.error('Error exporting operators:', error);
    res.status(500).json({ message: 'Failed to export operators' });
  }
}
