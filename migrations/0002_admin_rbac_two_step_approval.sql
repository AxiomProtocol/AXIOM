-- Migration: 0002_admin_rbac_two_step_approval
-- Description: Create tables for admin RBAC and two-step approval system
-- Date: 2025-12-26

-- User Roles table - assigns roles to Supabase auth users
CREATE TABLE IF NOT EXISTS user_roles (
  user_id UUID PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'finance', 'moderator')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by_admin_id UUID
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS user_roles_role_idx ON user_roles(role);
--> statement-breakpoint
-- Admin Proposals table - two-step approval workflow
CREATE TABLE IF NOT EXISTS admin_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  amount NUMERIC(20, 6),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'rejected', 'cancelled', 'expired')),
  reason TEXT NOT NULL,
  approval_reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP,
  approved_by UUID,
  approved_at TIMESTAMP,
  executed_by UUID,
  executed_at TIMESTAMP,
  rejected_by UUID,
  rejected_at TIMESTAMP,
  cancelled_by UUID,
  cancelled_at TIMESTAMP,
  request_id TEXT NOT NULL,
  unique_key TEXT NOT NULL UNIQUE,
  execution_result JSONB
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_proposals_status_idx ON admin_proposals(status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_proposals_action_type_idx ON admin_proposals(action_type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_proposals_created_by_idx ON admin_proposals(created_by);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_proposals_target_idx ON admin_proposals(target_type, target_id);
--> statement-breakpoint
-- Admin Proposal Events table - append-only event stream
CREATE TABLE IF NOT EXISTS admin_proposal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES admin_proposals(id),
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'approved', 'executed', 'rejected', 'cancelled', 'expired')),
  actor_user_id UUID NOT NULL,
  actor_role TEXT NOT NULL,
  request_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  event_payload JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_proposal_events_proposal_id_idx ON admin_proposal_events(proposal_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_proposal_events_event_type_idx ON admin_proposal_events(event_type);
--> statement-breakpoint
-- Admin Audit Log table - append-only audit trail
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  request_id TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  before_state JSONB,
  after_state JSONB,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_audit_log_actor_idx ON admin_audit_log(actor_user_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_audit_log_action_idx ON admin_audit_log(action);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON admin_audit_log(target_type, target_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS admin_audit_log_created_at_idx ON admin_audit_log(created_at);
--> statement-breakpoint
-- Payout State History table - tracks payout status transitions
CREATE TABLE IF NOT EXISTS payout_state_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL,
  proposal_id UUID REFERENCES admin_proposals(id),
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS payout_state_history_payout_id_idx ON payout_state_history(payout_id);
--> statement-breakpoint
-- Transaction Reversals table - tracks reversed transactions
CREATE TABLE IF NOT EXISTS transaction_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_transaction_id TEXT NOT NULL,
  reversal_transaction_id TEXT NOT NULL,
  created_by UUID NOT NULL,
  proposal_id UUID REFERENCES admin_proposals(id),
  reason TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS transaction_reversals_original_tx_idx ON transaction_reversals(original_transaction_id);
