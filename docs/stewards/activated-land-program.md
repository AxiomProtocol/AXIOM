# Steward-Activated Land Program

## Program Definition

The Steward-Activated Land Program is a flagship acquisition track for activating underutilized land through community stewardship. Landowners retain full ownership while trained stewards coordinate productive community activities on their property.

**Key Principle**: Activation is NOT a sale, lease, or investment. Landowners maintain 100% ownership and control.

## Compliance Language

### Approved Terms
- Land activation
- Community stewardship
- Coordination
- Participation
- Access
- Productive use

### Prohibited Terms
- Yield / ROI / Returns
- Profit share / Dividends
- Investment opportunity
- Guaranteed appreciation
- Tokenized deeds
- Ownership via token

### Key Disclosures
1. Landowners retain full legal ownership at all times
2. Activation is voluntary and can be stopped anytime
3. No financial returns are promised or implied
4. Future acquisition discussions are optional and separate
5. This is not an investment or securities offering

## Operational Flow

### For Landowners
1. **Application**: Submit interest via `/landowners/apply`
2. **Intake**: Steward gathers property details
3. **Site Visit**: Assessment of land readiness
4. **Plan Review**: Review and approve stewardship plan
5. **Activation**: Community activities begin
6. **Ongoing**: Regular updates and ability to pause/stop

### For Stewards
1. **Lead Generation**: Identify underutilized land
2. **Qualification**: Quick assessment of suitability
3. **Outreach**: Contact landowner using compliant scripts
4. **Onboarding**: Complete intake and site visit
5. **Planning**: Create stewardship plan with owner
6. **Launch**: Open activation cycle
7. **Operations**: Weekly logs and owner updates
8. **Optional**: Document any conversion discussions

## Dashboard Usage

### Activated Land Leads
- Lead Type: `activated_land`
- Tracked in the Land Pipeline
- Additional metadata fields for owner info, access terms, activation stage

### Activation Stages
1. `intake` - Initial information gathering
2. `site_readiness` - Site assessment complete
3. `plan_drafted` - Stewardship plan created
4. `active_cycle` - Community activities ongoing
5. `paused` - Activities temporarily stopped
6. `completed` - Cycle finished

### Key Actions
- Create Activated Land Lead
- Generate Stewardship Plan
- Update Owner Agreement Checklist
- Open Activation Cycle
- Submit Weekly Logs
- Record Conversion Options (owner-initiated only)

## Steward Metrics

### Success Metrics
- 5+ landowner contacts per month
- 50% intake to site visit conversion
- 3+ active cycles per region
- 90%+ landowner satisfaction rating

### Reputation Impact
- Activated Land leads contribute to Land Quality Score
- Successful cycles increase Reliability Score
- Weekly log submissions improve Reporting Score

## Landowner Experience

### What They Keep
- Full legal ownership
- Decision-making authority
- Right to access property
- Ability to stop anytime
- Control over future sale/transfer

### What We Provide
- Community coordination
- Participant management
- Activity scheduling
- Regular reporting
- Insurance coordination

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/landowners/apply` | POST | Submit landowner application |
| `/api/landowners/applications` | GET | List applications (admin only) |
| `/api/stewards/activated-land/lead` | POST | Create activated land lead |
| `/api/stewards/activated-land/plan` | POST/GET | Create/view stewardship plans |
| `/api/stewards/activated-land/cycle/open` | POST | Start activation cycle |
| `/api/stewards/activated-land/cycle/log` | POST | Submit weekly activity log |
| `/api/stewards/activated-land/checklist/update` | POST | Update owner agreement checklist |

## Database Tables

- `landowner_applications` - Inbound applications from landowners
- `activated_land_stewardship_plans` - Activity plans per lead
- `activated_land_cycles` - Active/completed activation cycles
- `activated_land_weekly_logs` - Weekly activity documentation
- `activated_land_owner_checklists` - Owner agreement items
- `activated_land_conversion_options` - Optional future discussions

## Resources

- **Landowner Pages**: `/landowners/*`
- **Steward Playbook**: `/stewards/activated-land/*`
- **Scripts**: `lib/stewards/outreachScripts.ts`
- **Analytics**: `lib/stewards/activatedLandAnalytics.ts`
