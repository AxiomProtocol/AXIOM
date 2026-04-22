#!/bin/bash

case "$1" in
  list-operators)
    echo "=== Node Operators (Last 20) ==="
    psql "$DATABASE_URL" -c "SELECT id, SUBSTRING(wallet_address, 1, 12) || '...' as wallet, status, onboarding_phase, created_at::date FROM node_operators ORDER BY created_at DESC LIMIT 20;"
    ;;
  list-notes)
    echo "=== Private Credit Notes (Last 20) ==="
    psql "$DATABASE_URL" -c "SELECT id, note_number, '$' || principal::money as principal, (interest_rate * 100)::numeric(5,2) || '%' as rate, status FROM private_credit_notes ORDER BY created_at DESC LIMIT 20;"
    ;;
  credits-summary)
    echo "=== Credits Ledger Summary ==="
    psql "$DATABASE_URL" -c "SELECT COUNT(*) as operators, COALESCE(SUM(available_balance::numeric), 0) as available, COALESCE(SUM(pending_balance::numeric), 0) as pending, COALESCE(SUM(total_earned::numeric), 0) as earned, COALESCE(SUM(total_redeemed::numeric), 0) as redeemed FROM credits_ledger;"
    ;;
  db-stats)
    echo "=== Database Table Counts ==="
    for table in node_operators operator_rewards credits_ledger credits_transactions private_credit_notes note_payment_events note_covenants note_documents admin_audit_logs; do
      count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
      if [ -n "$count" ]; then
        echo "$table: $count rows"
      else
        echo "$table: (not found)"
      fi
    done
    ;;
  audit-logs)
    limit=${2:-10}
    echo "=== Admin Audit Logs (Last $limit) ==="
    psql "$DATABASE_URL" -c "SELECT created_at::timestamp(0), SUBSTRING(admin_wallet, 1, 12) || '...' as admin, action, target_type, target_id FROM admin_audit_logs ORDER BY created_at DESC LIMIT $limit;"
    ;;
  *)
    echo "AXIOM Admin CLI Commands"
    echo "========================"
    echo ""
    echo "Usage: ./scripts/cli/admin-ops.sh <command> [args]"
    echo ""
    echo "Commands:"
    echo "  list-operators     List recent node operators"
    echo "  list-notes         List recent private credit notes"
    echo "  credits-summary    Show credits ledger summary"
    echo "  db-stats           Show database table row counts"
    echo "  audit-logs [n]     Show last n audit logs (default: 10)"
    echo "  help               Show this help message"
    ;;
esac
