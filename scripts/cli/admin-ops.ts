#!/usr/bin/env npx tsx

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000 
});

const commands: Record<string, (args: string[]) => Promise<void>> = {
  'list-operators': async () => {
    const result = await pool.query(`
      SELECT id, wallet_address, roles, status, onboarding_phase, created_at 
      FROM node_operators 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    console.log('\n=== Node Operators (Last 20) ===\n');
    if (result.rows.length === 0) {
      console.log('No operators found.');
    } else {
      console.table(result.rows.map(r => ({
        ID: r.id,
        Wallet: `${r.wallet_address?.slice(0, 10)}...`,
        Roles: JSON.stringify(r.roles),
        Status: r.status,
        Phase: r.onboarding_phase,
        Created: new Date(r.created_at).toLocaleDateString()
      })));
    }
  },

  'list-notes': async () => {
    const result = await pool.query(`
      SELECT id, note_number, principal, interest_rate, status, created_at 
      FROM private_credit_notes 
      ORDER BY created_at DESC 
      LIMIT 20
    `);
    console.log('\n=== Private Credit Notes (Last 20) ===\n');
    if (result.rows.length === 0) {
      console.log('No notes found.');
    } else {
      console.table(result.rows.map(r => ({
        ID: r.id,
        Number: r.note_number,
        Principal: `$${parseFloat(r.principal).toLocaleString()}`,
        Rate: `${(parseFloat(r.interest_rate) * 100).toFixed(2)}%`,
        Status: r.status,
        Created: new Date(r.created_at).toLocaleDateString()
      })));
    }
  },

  'credits-summary': async () => {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as operator_count,
        COALESCE(SUM(available_balance), 0) as total_available,
        COALESCE(SUM(pending_balance), 0) as total_pending,
        COALESCE(SUM(total_earned), 0) as total_earned,
        COALESCE(SUM(total_redeemed), 0) as total_redeemed,
        COALESCE(SUM(total_slashed), 0) as total_slashed
      FROM credits_ledger
    `);
    const row = result.rows[0];
    console.log('\n=== Credits Ledger Summary ===\n');
    console.log(`Operators: ${row.operator_count}`);
    console.log(`Total Available: ${parseFloat(row.total_available).toLocaleString()} credits`);
    console.log(`Total Pending: ${parseFloat(row.total_pending).toLocaleString()} credits`);
    console.log(`Total Earned: ${parseFloat(row.total_earned).toLocaleString()} credits`);
    console.log(`Total Redeemed: ${parseFloat(row.total_redeemed).toLocaleString()} credits`);
    console.log(`Total Slashed: ${parseFloat(row.total_slashed).toLocaleString()} credits`);
  },

  'db-stats': async () => {
    const tables = [
      'node_operators',
      'operator_rewards',
      'credits_ledger',
      'credits_transactions',
      'private_credit_notes',
      'note_payment_events',
      'note_covenants',
      'note_documents',
      'admin_audit_logs'
    ];
    console.log('\n=== Database Table Counts ===\n');
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`${table}: ${result.rows[0].count} rows`);
      } catch {
        console.log(`${table}: (not found)`);
      }
    }
  },

  'audit-logs': async (args) => {
    const limit = parseInt(args[0]) || 10;
    const result = await pool.query(`
      SELECT admin_wallet, action, target_type, target_id, details, created_at 
      FROM admin_audit_logs 
      ORDER BY created_at DESC 
      LIMIT $1
    `, [limit]);
    console.log(`\n=== Admin Audit Logs (Last ${limit}) ===\n`);
    if (result.rows.length === 0) {
      console.log('No audit logs found.');
    } else {
      result.rows.forEach(r => {
        console.log(`[${new Date(r.created_at).toISOString()}] ${r.admin_wallet?.slice(0, 10)}... ${r.action} ${r.target_type}:${r.target_id}`);
      });
    }
  },

  help: async () => {
    console.log(`
AXIOM Admin CLI Commands
========================

Usage: npx tsx scripts/cli/admin-ops.ts <command> [args]

Commands:
  list-operators     List recent node operators
  list-notes         List recent private credit notes
  credits-summary    Show credits ledger summary
  db-stats           Show database table row counts
  audit-logs [n]     Show last n audit logs (default: 10)
  help               Show this help message
`);
  }
};

async function main() {
  const [, , command = 'help', ...args] = process.argv;
  
  if (commands[command]) {
    await commands[command](args);
  } else {
    console.error(`Unknown command: ${command}`);
    await commands.help([]);
  }
  
  await pool.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
