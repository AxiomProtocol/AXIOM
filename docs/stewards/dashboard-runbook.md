# Steward Dashboard Operations Runbook

## Weekly Operations Checklist

### Monday - Week Planning
1. Review previous week's reports from all regions
2. Check for any unresolved incidents
3. Review upcoming drops for the week
4. Verify steward coverage for all regions

### Daily Operations
1. Check dashboard overview for alerts
2. Monitor reservation confirmations
3. Review new participant signups
4. Check land lead pipeline for urgent items

### Drop Day Operations
1. 24 hours before: Send cutoff reminder
2. 12 hours before: Review final reservations
3. At drop time: Open on-site checklist
4. Post-drop: Complete reconciliation within 24 hours

### Weekly Friday - Reporting
1. Each steward submits weekly report
2. Lead reviews regional reports
3. Council reviews zone summaries
4. Archive completed drops

## Role Permissions Matrix

| Action | Coordinator | Lead | Council | Admin |
|--------|------------|------|---------|-------|
| View own region | Yes | Yes | Yes | Yes |
| View all regions | No | Assigned only | Yes | Yes |
| Create drops | Yes | Yes | Yes | Yes |
| Approve stewards | No | Yes | Yes | Yes |
| Assign regions | No | No | Yes | Yes |
| Manage settings | No | No | No | Yes |
| Export reports | Yes | Yes | Yes | Yes |
| Edit templates | No | No | Yes | Yes |

## Common Workflows

### Creating a New Drop
1. Navigate to Dashboard > Drops
2. Click "Create Drop"
3. Select region, date, location
4. Set capacity and time windows
5. Set reservation cutoff
6. Save as draft or publish immediately

### Processing a Land Lead
1. New lead appears in pipeline
2. Move to "Needs Data" and assign tasks
3. Complete qualification checklist
4. If qualified, escalate to council
5. Track decision in log

### Handling No-Shows
1. Mark participant as no-show in reconciliation
2. System updates reliability score
3. If pattern emerges, add participant flag
4. Consider outreach via communications

### Weekly Report Submission
1. Navigate to Dashboard > Reports
2. Click "Generate Weekly Report"
3. Review auto-populated metrics
4. Add issues and resolutions
5. Add next week plan
6. Submit by Friday 5PM

## Escalation Procedures

### Incident Severity Levels
- **Low**: Minor delays, small capacity issues
- **Medium**: Participant disputes, missed pickups
- **High**: Safety concerns, major supply issues
- **Critical**: Legal/compliance, widespread outages

### Escalation Path
1. Coordinator handles Low severity
2. Lead handles Medium severity
3. Council handles High severity
4. Admin handles Critical severity

## Technical Notes

### API Endpoints
- Base path: `/api/stewards/`
- Authentication: Wallet signature (SIWE)
- Rate limits: 100 requests/minute

### Database Tables
- steward_regions
- steward_assignments
- steward_drops
- steward_reservations
- steward_participants
- steward_land_leads
- steward_groups
- steward_tasks
- steward_messages
- steward_incidents
- steward_weekly_reports
- steward_reputation_metrics

### Troubleshooting
1. Dashboard not loading: Check wallet connection
2. Missing data: Check role permissions
3. Cannot create drop: Verify region assignment
4. Report generation fails: Check data completeness
